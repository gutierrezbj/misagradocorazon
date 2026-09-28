// Protección ante abusos de la API (además de los límites propios de Better Auth en /api/auth).
// - Por usuario cuando hay sesión (Bearer), por IP si no: en móvil, muchos fieles comparten la IP
//   de su operadora (CGNAT) y un límite solo por IP les afectaría a todos a la vez.
// - Generosos para un uso normal; frenan scripts. Con pagos simulados, sin esto un script podría
//   encender velas sin fin e inflar las cifras públicas de transparencia.
// - Memoria del proceso: vale con una instancia de la API. Con varias, pasar a un almacén compartido.
import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const MINUTE = 60_000;

function clientKey(req: Request) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return `u:${createHash("sha256").update(auth).digest("hex").slice(0, 32)}`;
  return `ip:${ipKeyGenerator(req.ip ?? "")}`;
}

const tooMany = (_req: Request, res: Response) =>
  res.status(429).json({ data: null, error: { code: "rate_limited", message: "Demasiadas peticiones. Espera un momento." } });

const common = { windowMs: MINUTE, keyGenerator: clientKey, handler: tooMany, standardHeaders: "draft-8" as const, legacyHeaders: false };

/** Todas las peticiones a la API. */
export const apiLimiter = () => rateLimit({ ...common, limit: 300 });

/** Escrituras (POST, PUT, PATCH, DELETE): velas, votos, intenciones, contenido... */
export const writeLimiter = () => rateLimit({ ...common, limit: 30, skip: (req) => req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS" });

// Better Auth saca la IP de una cabecera. Con X-Forwarded-For, si el cliente añade la suya propia
// llegan varias direcciones y Better Auth no se fía de ninguna: todos esos intentos de login
// comparten un solo contador y cualquiera podría bloquear el login a los demás.
// Se le pasa la IP que resuelve Express ("trust proxy": el salto del proxy de Railway), que el
// cliente no puede falsear, y se sobrescribe lo que venga en esta cabecera.
export const CLIENT_IP_HEADER = "x-msc-client-ip";
export function clientIpForAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.ip) req.headers[CLIENT_IP_HEADER] = req.ip.replace(/^::ffff:/, "");
  else delete req.headers[CLIENT_IP_HEADER];
  next();
}

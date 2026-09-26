import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

// Respuesta estándar (SDD-06): { data, error }.
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data, error: null });
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, "not_found", `${what} no encontrado`);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      data: null,
      error: { code: "invalid_input", message: "Datos no válidos", issues: err.issues },
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ data: null, error: { code: err.code, message: err.message } });
  }
  console.error(err);
  return res.status(500).json({ data: null, error: { code: "internal", message: "Error interno" } });
}

// Parámetro de ruta como string validado (Express tipa params como string | string[]).
export function pathParam(req: Request, name: string): string {
  const v = req.params[name];
  if (typeof v !== "string" || v.length === 0) throw new HttpError(400, "invalid_input", `Parámetro ${name} no válido`);
  return v;
}

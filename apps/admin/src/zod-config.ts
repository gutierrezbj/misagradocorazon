// Sin compilación JIT de Zod: la CSP del panel no permite eval (apps/admin/Caddyfile).
// Debe importarse antes que cualquier esquema (@msc/shared), porque Zod lo decide al crearlos.
import { z } from "zod";

z.config({ jitless: true });

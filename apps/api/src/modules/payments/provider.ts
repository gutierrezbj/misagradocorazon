// Capa de pagos intercambiable (ADR-003). Hoy: simulada o "beta gratis". Con la sociedad constituida:
// RevenueCat (IAP). Con IAP el cobro lo hace la store en el dispositivo; el servidor solo confirma la compra.
import { randomUUID } from "node:crypto";

import { env } from "../../env.ts";

export type PurchaseInput = {
  userId: string;
  productId: string;
  amountCents: number;
  // Justificante de la store (RevenueCat). Ausente en modo simulado.
  receipt?: string;
};
// chargedCents: lo que se cobró de verdad. Solo lo cobrado entra en el libro de movimientos.
export type PurchaseResult = { ref: string; chargedCents: number };

export interface PaymentProvider {
  readonly name: string;
  confirmPurchase(input: PurchaseInput): Promise<PurchaseResult>;
}

// No cobra nada: devuelve una referencia única para trazar la operación en el libro de movimientos.
export const simulatedPayments: PaymentProvider = {
  name: "simulated",
  async confirmPurchase(input) {
    return { ref: `sim_${randomUUID()}`, chargedCents: input.amountCents };
  },
};

// Beta abierta (SDD-05 US-28, 23-nov-2026): la vela es gratis. No hay compra, así que no entra nada
// en el libro ni se aparta el 20 %: la transparencia no muestra dinero que no existe (US-29).
export const betaFreePayments: PaymentProvider = {
  name: "beta_free",
  async confirmPurchase() {
    return { ref: `beta_${randomUUID()}`, chargedCents: 0 };
  },
};

let current: PaymentProvider = env.PAYMENTS_MODE === "beta_free" ? betaFreePayments : simulatedPayments;

export const payments = () => current;
export const candlesFree = () => current.name === betaFreePayments.name;

/** Solo para tests: cambia el proveedor sin reiniciar el proceso. */
export function setPaymentProvider(provider: PaymentProvider) {
  current = provider;
}

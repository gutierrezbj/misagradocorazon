// Capa de pagos intercambiable (ADR-003). Hoy: simulada. Con la sociedad constituida: RevenueCat (IAP).
// Con IAP el cobro lo hace la store en el dispositivo; el servidor solo confirma la compra.
import { randomUUID } from "node:crypto";

export type PurchaseInput = {
  userId: string;
  productId: string;
  amountCents: number;
  // Justificante de la store (RevenueCat). Ausente en modo simulado.
  receipt?: string;
};
export type PurchaseResult = { ref: string };

export interface PaymentProvider {
  readonly name: string;
  confirmPurchase(input: PurchaseInput): Promise<PurchaseResult>;
}

// No cobra nada: devuelve una referencia única para trazar la operación en el libro de movimientos.
export const simulatedPayments: PaymentProvider = {
  name: "simulated",
  async confirmPurchase() {
    return { ref: `sim_${randomUUID()}` };
  },
};

export const payments: PaymentProvider = simulatedPayments;

// Consentimiento explícito para los datos de creencias (RGPD art. 9.2.a). El santo patrón, las
// velas, las intenciones, "Rezo por ti" y el historial de oración revelan la fe de la persona: sin
// este consentimiento la API no guarda ninguno, lo diga o no la pantalla.
import { BELIEF_CONSENT_VERSION } from "@msc/shared";

import { prisma } from "../db.ts";
import { env } from "../env.ts";
import { HttpError } from "../http.ts";
import { audit } from "./audit.ts";
import { encryptText } from "./crypto.ts";

export function hasBeliefConsent(user: { beliefConsentAt: Date | null }) {
  return user.beliefConsentAt !== null;
}

export function assertBeliefConsent(user: { beliefConsentAt: Date | null }) {
  if (!hasBeliefConsent(user)) {
    throw new HttpError(403, "belief_consent_required", "Falta el consentimiento para los datos de fe");
  }
}

// Datos que se guardan al dar el consentimiento: cuándo y con qué versión del texto.
export function beliefConsentStamp() {
  return { beliefConsentAt: new Date(), beliefConsentVersion: BELIEF_CONSENT_VERSION };
}

// Retirar el consentimiento borra los datos de creencias y deja la cuenta. La persona vuelve al
// onboarding y no puede usar el altar hasta darlo de nuevo. Las velas se conservan sin el texto de
// la intención, igual que al borrar la cuenta. Todo en una transacción: o se borra entero o nada.
export async function withdrawBeliefConsent(userId: string) {
  await prisma.$transaction(async (tx) => {
    const byUser = { where: { userId } };
    await tx.privateIntention.deleteMany(byUser);
    await tx.intentionPrayer.deleteMany(byUser);
    await tx.intention.deleteMany(byUser); // sus oraciones recibidas caen en cascada
    await tx.prayerLog.deleteMany(byUser);
    const empty = encryptText("", env.INTENTIONS_KEY);
    await tx.candle.updateMany({ where: { userId }, data: { intentionEncrypted: empty } });
    await tx.user.update({
      where: { id: userId },
      data: { beliefConsentAt: null, beliefConsentVersion: null, patronSaintId: null, secondarySaintIds: [], onboarded: false },
    });
    // Sin datos personales: solo que ocurrió y cuándo.
    await audit(tx, userId, "belief_consent.withdraw", "user", userId);
  });
}

// Borrado de cuenta desde la app (SDD-02, transversal; Apple 5.1.1(v); GDPR art. 17).
// Se borra todo lo personal y la fila del usuario queda anonimizada. Se conservan, sin vínculo con
// la persona, las velas (sin el texto de la intención), el libro de movimientos y los votos:
// son contabilidad y transparencia. Todo en una transacción: o se borra entero o nada.
import { prisma } from "../../db.ts";
import { env } from "../../env.ts";
import { audit } from "../../lib/audit.ts";
import { encryptText } from "../../lib/crypto.ts";
import { HttpError } from "../../http.ts";

export const deletedEmail = (userId: string) => `deleted-${userId}@users.invalid`;

export async function deleteAccount(userId: string) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new HttpError(404, "not_found", "Cuenta no encontrada");
    if (user.role === "superadmin") {
      const others = await tx.user.count({ where: { role: "superadmin", blocked: false, id: { not: userId } } });
      if (others === 0) throw new HttpError(409, "last_superadmin", "Debe quedar al menos un superadmin activo");
    }

    const byUser = { where: { userId } };
    await tx.session.deleteMany(byUser);
    await tx.account.deleteMany(byUser);
    await tx.pushToken.deleteMany(byUser);
    await tx.pushDelivery.deleteMany(byUser);
    await tx.privateIntention.deleteMany(byUser);
    await tx.intentionPrayer.deleteMany(byUser);
    await tx.intention.deleteMany(byUser); // sus oraciones recibidas caen en cascada
    await tx.chatMessage.deleteMany(byUser);
    await tx.prayerLog.deleteMany(byUser);
    await tx.verification.deleteMany({ where: { OR: [{ identifier: { contains: user.email } }, { value: userId }] } });

    // La vela se queda (libro de movimientos), pero sin el texto de la intención.
    const empty = encryptText("", env.INTENTIONS_KEY);
    await tx.candle.updateMany({ where: { userId }, data: { intentionEncrypted: empty } });

    await tx.user.update({
      where: { id: userId },
      data: {
        name: "",
        email: deletedEmail(userId),
        emailVerified: false,
        image: null,
        role: "user",
        blocked: true,
        deletedAt: new Date(),
        onboarded: false,
        patronSaintId: null,
        secondarySaintIds: [],
        notifyMorning: false,
        notifyNight: false,
        notifySaint: false,
        notifyCommunity: false,
      },
    });
    // Sin datos personales: solo que ocurrió y cuándo.
    await audit(tx, userId, "account.delete", "user", userId);
  });
}

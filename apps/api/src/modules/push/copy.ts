// Textos de las notificaciones (ES/EN), según el idioma del fiel. Copys de SDD Documentación, flujos 1, 2 y 4.
// Nunca incluyen contenido de intenciones (GDPR art. 9).
type Locale = "es" | "en";
type Text = { title: string; body: string };

export const pushCopy = {
  morning: (l: Locale): Text =>
    l === "en"
      ? { title: "Morning prayer", body: "Good morning. Your morning prayer is ready." }
      : { title: "Oración de la mañana", body: "Buenos días. Tu oración de la mañana está lista." },
  night: (l: Locale): Text =>
    l === "en"
      ? { title: "Night prayer", body: "Time to give thanks. Your night prayer is ready." }
      : { title: "Oración de la noche", body: "Hora de dar gracias. Tu oración de la noche está lista." },
  saintOfDay: (l: Locale, saint: string): Text =>
    l === "en"
      ? { title: "Saint of the day", body: `Today we celebrate ${saint}. Discover their story.` }
      : { title: "Santo del día", body: `Hoy celebramos a ${saint}. Conoce su historia.` },
  votingResult: (l: Locale, cause: string): Text =>
    l === "en"
      ? { title: "This month's cause", body: `The community has chosen: ${cause}.` }
      : { title: "La causa de este mes", body: `La comunidad ha elegido: ${cause}.` },
};

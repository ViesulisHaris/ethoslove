import { Text } from "@react-email/components";
import { EmailLayout, P, Quiet } from "./layout";

type L = "en" | "es";
type Kind = "date" | "trip";

export type ReminderStop = { time: string | null; name: string };

/** A date saved without a name is "your date" (both of yours: it goes to the two of them). */
const UNTITLED: Record<Kind, Record<L, string>> = { date: { en: "your date", es: "vuestra cita" }, trip: { en: "your trip", es: "vuestro viaje" } };

export function dateReminderSubject(locale: L, kind: Kind, title: string | null): string {
  const name = title ?? UNTITLED[kind][locale];
  return locale === "es" ? `Mañana: ${name}` : `Tomorrow: ${name}`;
}

function heading(locale: L, kind: Kind, title: string | null): string {
  if (!title) return locale === "es" ? `${kind === "trip" ? "Vuestro viaje empieza" : "Vuestra cita es"} mañana.` : `${kind === "trip" ? "Your trip starts" : "Your date is"} tomorrow.`;
  return locale === "es" ? `«${title}» es mañana.` : `${title} is tomorrow.`;
}

/**
 * The day before a saved date (members only; docs/MEMBERSHIP.md 5.1): the stops in order with
 * their times, the note, and the plan one tap away. Sent to both people who share it, each in their
 * own language. It says "tomorrow" because the job runs the morning before, and a date is a day,
 * not a time, so there is no time zone to get wrong.
 */
export function DateReminderEmail({ locale, kind, title, stops, note, days, openUrl, offUrl }: { locale: L; kind: Kind; title: string | null; stops: ReminderStop[]; note: string | null; days: number | null; openUrl: string; offUrl: string }) {
  const es = locale === "es";
  const said = heading(locale, kind, title);
  return (
    <EmailLayout
      preview={kind === "trip" ? (es ? "Mañana os vais." : "You're off tomorrow.") : es ? "El plan de mañana, parada a parada." : "Tomorrow's plan, stop by stop."}
      heading={said}
      cta={{ label: kind === "trip" ? (es ? "Abrir el viaje" : "Open the trip") : es ? "Abrir el plan" : "Open the plan", href: openUrl }}
      footer={es ? "Recibes esto porque los avisos están activados para esta cita." : "You get this because reminders are on for this date."}
      footerLink={{ label: es ? "Desactivarlos" : "Turn them off", href: offUrl }}
    >
      {kind === "trip" ? (
        <P>{days ? (es ? `${days} ${days === 1 ? "día" : "días"} para los dos, a partir de mañana.` : `${days} ${days === 1 ? "day" : "days"} for the two of you, starting tomorrow.`) : es ? "Mañana empieza el viaje." : "Your trip starts tomorrow."}</P>
      ) : (
        stops.map((stop, i) => (
          <Text key={`${i}-${stop.name}`} style={{ margin: "0 0 8px", fontSize: 16, lineHeight: 1.5 }}>
            {stop.time ? <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{stop.time} · </span> : null}
            {stop.name}
          </Text>
        ))
      )}
      {note ? <Quiet>{note}</Quiet> : null}
    </EmailLayout>
  );
}

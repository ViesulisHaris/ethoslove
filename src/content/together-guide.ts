import type { GiftLocale } from "@/lib/gift/schema";

/**
 * "How long have we been together?": a free counter people search for by that question ("…calculator",
 * "how many days have we been together", "cuántos días llevamos juntos"), and link to without being
 * asked. Its milestones lead to the gifts made for a date. The counter's own words are in the
 * messages ("together"); the page's are here. Every claim matches src/lib/together/dates.ts.
 */
export const TOGETHER_PATH = "/tools/how-long-have-we-been-together";

/** Gifts for a date: the one that opens at a chosen minute first, the free one last. */
export const TOGETHER_TEMPLATES = ["midnight-countdown", "our-timeline", "jar-of-reasons", "the-letter"] as const;

/** Posts for the day itself. */
export const TOGETHER_READING = ["monthiversary-ideas", "6-month-anniversary-ideas", "first-anniversary-ideas-for-boyfriend", "anniversary-ideas-at-home", "long-distance-anniversary-ideas"] as const;

export type TogetherGuide = {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  milestonesTitle: string;
  milestones: { heading: string; body: string }[];
  giftsTitle: string;
  giftsIntro: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  readTitle: string;
};

export const TOGETHER_GUIDE: Record<GiftLocale, TogetherGuide> = {
  en: {
    title: "How Long Have We Been Together? Free Calculator",
    description: "Count the days you've been together, to the second, and see the date of every milestone ahead: 100 days, 1,000 days, your next monthiversary and anniversary.",
    eyebrow: "Free calculator",
    h1: "How long have we been together?",
    intro:
      "Put in the day you got together. You'll see how long it's been, down to the second, and the date of every milestone still ahead: 100 days, 1,000 days, the next monthiversary and the next anniversary.",
    milestonesTitle: "The days worth marking",
    milestones: [
      {
        heading: "100 days",
        body: "In South Korea couples celebrate their 100th day (baegil) with a small gift or a dinner, and many keep going: 200 days, 300, then 1,000. They count the day they got together as day 1, so the 100th day comes 99 days after it. Tick the box above to count that way.",
      },
      {
        heading: "Monthiversaries",
        body: "The same date every month, usually only in the first year, while every month still feels like news. Started on the 29th, 30th or 31st? A month too short for your date gets its last day instead, so 31 January leads to 28 February.",
      },
      {
        heading: "1,000 days",
        body: "Two years and nine months, give or take, and a date almost nobody sees coming, which is the fun of it. The counter shows which day of the week it falls on, so you can plan the evening around it.",
      },
      {
        heading: "Anniversaries",
        body: "The one everyone remembers, on the date you got together. If that was 29 February, this calculator puts it on 28 February in common years so it stays in February; some couples pick 1 March instead.",
      },
    ],
    giftsTitle: "Make the day itself",
    giftsIntro:
      "A milestone lands better with something to open. These open on their phone with your photos and your words, and Midnight Countdown waits for the exact minute you pick.",
    faqTitle: "Questions",
    faq: [
      {
        q: "How do you count how long you've been together?",
        a: "Count the calendar days from the day you got together to today: the day itself is zero and the next day is one. This calculator counts from midnight on your date in your own time zone, and its months follow the calendar, so 31 January to the last day of February is one month.",
      },
      {
        q: "Does the first day count?",
        a: "It depends who's counting. Most calculators start at zero, so you reach 100 days a hundred days after you got together. Couples in South Korea count the first day as day 1, so their 100th day comes a day sooner. The box above switches between the two.",
      },
      {
        q: "When is our 100-day anniversary?",
        a: "A hundred days after the day you got together, or 99 days after it if you count the first day as day 1. Put your date in above to see the exact date and weekday, along with 200, 300, 500 and 1,000 days.",
      },
      {
        q: "What is a monthiversary?",
        a: "The same date every month, kept by couples who mark the months, usually in the first year. If you got together on the 29th, 30th or 31st, a month too short for that date gets its last day instead: start on 31 January and the first one is 28 February, or the 29th in a leap year.",
      },
      {
        q: "We got together on 29 February. When is our anniversary?",
        a: "On 29 February in leap years. In the other three this calculator puts it on 28 February, so it stays in February, though some couples prefer 1 March. Your day counts, like 100 and 1,000 days, don't change.",
      },
      {
        q: "How long is 1,000 days?",
        a: "Two years and 269 or 270 days, depending on whether a 29 February falls in between: close to two years and nine months. Put your date in above and it shows the exact day and its weekday.",
      },
      {
        q: "Do you keep our date?",
        a: "No. The date stays in your browser, which remembers it on this device so the counter is there next time. If you copy the link, the date goes into it, so whoever opens it sees your count too.",
      },
    ],
    readTitle: "Ideas for the day",
  },
  es: {
    title: "¿Cuántos días llevamos juntos? Calculadora gratis",
    description: "Cuenta los días que lleváis juntos, al segundo, y mira la fecha de cada hito que viene: 100 días, 1.000 días, el próximo mesiversario y vuestro aniversario.",
    eyebrow: "Calculadora gratis",
    h1: "¿Cuánto tiempo llevamos juntos?",
    intro:
      "Pon el día en que empezasteis. Verás cuánto tiempo lleváis, al segundo, y la fecha de cada hito que viene: los 100 días, los 1.000 días, el próximo mesiversario y el próximo aniversario.",
    milestonesTitle: "Los días que vale la pena celebrar",
    milestones: [
      {
        heading: "100 días",
        body: "En Corea del Sur las parejas celebran su día 100 (baegil) con un pequeño regalo o una cena, y muchas siguen: 200 días, 300 y luego 1.000. Cuentan el día en que empezaron como el día 1, así que el día 100 llega 99 días después. Marca la casilla de arriba para contar así.",
      },
      {
        heading: "Mesiversarios",
        body: "La misma fecha cada mes, casi siempre solo el primer año, mientras cada mes todavía es noticia. ¿Empezasteis un 29, 30 o 31? El mes que no tiene ese día lo celebra en su último día: del 31 de enero se pasa al 28 de febrero.",
      },
      {
        heading: "1.000 días",
        body: "Dos años y nueve meses, más o menos, y una fecha que casi nadie ve venir, y ahí está la gracia. El contador te dice qué día de la semana cae, para que podáis organizar la noche con tiempo.",
      },
      {
        heading: "Aniversarios",
        body: "El que nadie olvida, en la fecha en que empezasteis. Si fue un 29 de febrero, esta calculadora lo pone el 28 de febrero los años que no son bisiestos, para que siga en febrero; hay parejas que prefieren el 1 de marzo.",
      },
    ],
    giftsTitle: "Para el día en sí",
    giftsIntro:
      "Un hito se celebra mejor con algo que abrir. Estos se abren en su móvil con vuestras fotos y vuestras palabras, y Cuenta atrás de medianoche espera hasta el minuto exacto que elijas.",
    faqTitle: "Preguntas",
    faq: [
      {
        q: "¿Cómo se cuenta cuánto tiempo lleváis juntos?",
        a: "Se cuentan los días del calendario desde el día en que empezasteis hasta hoy: ese mismo día es cero y el siguiente, uno. Esta calculadora cuenta desde la medianoche de vuestra fecha, en vuestra zona horaria, y sus meses siguen el calendario, así que del 31 de enero al último día de febrero va un mes.",
      },
      {
        q: "¿El primer día cuenta?",
        a: "Depende de quién cuente. La mayoría de calculadoras empiezan en cero, así que llegáis a los 100 días cien días después de empezar. En Corea del Sur las parejas cuentan el primer día como el día 1, así que su día 100 llega un día antes. La casilla de arriba cambia entre las dos formas.",
      },
      {
        q: "¿Cuándo son nuestros 100 días?",
        a: "Cien días después del día en que empezasteis, o 99 si contáis el primer día como el día 1. Pon vuestra fecha arriba y verás el día exacto y de la semana, junto con los 200, 300, 500 y 1.000 días.",
      },
      {
        q: "¿Qué es un mesiversario?",
        a: "La misma fecha cada mes, para las parejas que celebran los meses, casi siempre durante el primer año. Si empezasteis un 29, 30 o 31, el mes que no tiene ese día lo celebra en su último día: si empezasteis el 31 de enero, el primero cae el 28 de febrero, o el 29 si el año es bisiesto.",
      },
      {
        q: "Empezamos un 29 de febrero. ¿Cuándo es nuestro aniversario?",
        a: "El 29 de febrero los años bisiestos. Los otros tres, esta calculadora lo pone el 28 de febrero, para que siga en febrero, aunque hay parejas que prefieren el 1 de marzo. Las cuentas de días, como los 100 o los 1.000, no cambian.",
      },
      {
        q: "¿Cuánto son 1.000 días?",
        a: "Dos años y 269 o 270 días, según haya o no un 29 de febrero por medio: casi dos años y nueve meses. Pon vuestra fecha arriba y verás el día exacto y de la semana en que cae.",
      },
      {
        q: "¿Guardáis nuestra fecha?",
        a: "No. La fecha se queda en tu navegador, que la recuerda en este dispositivo para que el contador siga ahí la próxima vez. Si copias el enlace, la fecha va dentro, así que quien lo abra verá también vuestra cuenta.",
      },
    ],
    readTitle: "Ideas para ese día",
  },
};

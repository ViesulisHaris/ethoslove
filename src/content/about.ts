import type { GiftLocale } from "@/lib/gift/schema";
import { BRAND } from "@/config/brand";
import { LEGAL_ENTITY } from "@/content/legal";

/**
 * The About page (/about): who makes Ethos, how paying works, what happens to a gift's photos and
 * how to reach us. It exists because people check before they pay, and so do the assistants they
 * ask: on 20 Nov 2026 ChatGPT answered "what is tryethos" correctly, then added an "Is it
 * legitimate?" paragraph built on scamadviser.com and the privacy policy, because the site had no
 * page of its own that said who runs it (/about answered 404).
 *
 * Every statement here is already made, and binding, somewhere else on the site: the company's
 * details come from LEGAL_ENTITY, the guarantee and the reply time from the Terms (sections 10 and
 * 16), deletion and photo metadata from the Terms and the Privacy Policy, the price from the
 * catalogue. Nothing is said here that those pages don't say; change them first, then this.
 */

/** The day these words last changed, for the sitemap (content/page-dates.ts). */
export const ABOUT_UPDATED = "2026-11-20";
export const ABOUT_PATH = "/about";

/** Where else Ethos is, by name, for the page's last section. Each is in BRAND.socials too. */
export const ABOUT_PROFILES: readonly { name: string; href: string }[] = [
  { name: "Etsy", href: BRAND.socials.etsy },
  { name: "Pinterest", href: BRAND.socials.pinterest },
  { name: "TikTok", href: BRAND.socials.tiktok },
  { name: "YouTube", href: BRAND.socials.youtube },
];

export type AboutLink = { href: string; label: string };
export type AboutSection = { id: string; heading: string; paragraphs: string[]; links?: AboutLink[] };
export type AboutCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: AboutSection[];
  company: { heading: string; regNo: string; vat: string; address: string; registered: string; email: string };
  /** The registration day, written out in the page's language. */
  registeredOn: string;
  profilesHeading: string;
  reactionsHeading: string;
  reactionsNote: string;
};

/** The company's registration day in each language; LEGAL_ENTITY keeps the English one. */
const REGISTERED: Record<GiftLocale, string> = { en: LEGAL_ENTITY.registeredAt, es: "27 de marzo de 2026" };
/** The same day for machines (the page's structured data). */
export const ABOUT_FOUNDED = "2026-03-27";

/**
 * LEGAL_ENTITY.address in the parts a PostalAddress has. tests/unit/about.test.ts holds every part
 * to the one address the legal pages print, so the two can't drift.
 */
export const ABOUT_ADDRESS = {
  streetAddress: '"Reķu sala 4", Upesciems',
  addressLocality: "Garkalnes pagasts",
  addressRegion: "Ropažu novads",
  postalCode: "LV-2137",
  addressCountry: "LV",
} as const;

const E = LEGAL_ENTITY;

/**
 * The page's words. `templates` is how many templates there are today, `single` a premium
 * template's price in the visitor's currency, both worked out by the page from the catalogue.
 */
export function aboutCopy(locale: GiftLocale, facts: { templates: number; single: string }): AboutCopy {
  if (locale === "es") {
    return {
      metaTitle: "Sobre Ethos: quién lo hace, cómo se paga y cómo escribirnos",
      metaDescription: `Ethos lo hace ${E.name}, una empresa registrada en Letonia. Quiénes somos, cómo funcionan el pago y los reembolsos, qué pasa con tus fotos y cómo escribirnos.`,
      eyebrow: "Sobre Ethos",
      title: "Quién hace Ethos",
      subtitle: "Ethos lo hace una empresa pequeña de Letonia. Aquí está quiénes somos, cómo se paga, qué pasa con tus fotos y cómo escribirnos.",
      sections: [
        {
          id: "what",
          heading: "Qué es Ethos",
          paragraphs: [
            `Ethos es una web para hacer un regalo personal que se abre en el móvil. Eliges una de ${facts.templates} plantillas (una carta de amor con sello de lacre, un ramo que montas flor a flor, un álbum de recortes, un juego pequeño sobre vosotros dos), pones su nombre, tus palabras, vuestras fotos y una canción, y lo envías como un enlace o como un código QR impreso. Para abrirlo no hay que instalar nada.`,
            "Alrededor de los regalos hay ideas para citas en un mapa, viajes ya planeados y juegos para dos. Todo está en español y en inglés.",
          ],
        },
        {
          id: "company",
          heading: "La empresa que hay detrás",
          paragraphs: [
            `Ethos lo hace y lo gestiona ${E.name}, una sociedad de responsabilidad limitada registrada en Letonia, en la Unión Europea, el ${REGISTERED.es}. Su número de registro es ${E.regNo} y su número de IVA es ${E.vat}; el registro mercantil de Letonia es público y permite comprobarlo.`,
            "La web se hace en Riga.",
          ],
        },
        {
          id: "paying",
          heading: "Cómo se paga",
          paragraphs: [
            `Algunos regalos se pueden enviar gratis en una versión más corta. Una plantilla premium cuesta ${facts.single} y se paga una sola vez: el precio se ve antes de pagar y no hay ninguna suscripción que cancelar. La única suscripción que vendemos, Ethos for Two, es opcional y lo dice en su propia página.`,
            "Pagas en la página de pago de Stripe, con tarjeta, Apple Pay o Google Pay. Los pagos los procesa Stripe; nunca vemos ni guardamos los datos completos de tu tarjeta.",
            "Nuestras plantillas también se venden en nuestra tienda de Etsy, TryEthos. Allí cobra Etsy, con sus propias condiciones.",
          ],
          links: [{ href: "/pricing", label: "Precios" }],
        },
        {
          id: "guarantee",
          heading: "Si algo sale mal",
          paragraphs: [
            "Si un regalo que has pagado no se abre o no se reproduce bien en el móvil o el ordenador de quien lo recibe y no conseguimos arreglarlo, dínoslo en los 30 días siguientes a la compra y te devolvemos todo el dinero. También devolvemos una compra duplicada.",
            "Si vives en la UE o en el Reino Unido, además tienes derecho a desistir de algunas compras en 14 días. Los Términos del servicio dicen exactamente cuándo, y la página «Desistir de una compra» lo pone en marcha en un paso.",
          ],
          links: [
            { href: "/legal/terms", label: "Términos del servicio" },
            { href: "/legal/withdraw", label: "Desistir de una compra" },
          ],
        },
        {
          id: "privacy",
          heading: "Tus fotos y tus palabras",
          paragraphs: [
            "Un regalo guarda lo que tú pones en él. Las fotos se reducen en tu propio dispositivo antes de subirse, y con eso pierden sus metadatos, como el lugar donde se hicieron. Cualquiera que tenga el enlace puede abrir un regalo, así que a un regalo de pago le puedes poner contraseña.",
            "Puedes borrar un regalo cuando quieras, y tu cuenta entera desde la página de tu cuenta: tus regalos y lo que subiste se borran en el momento, y las copias de seguridad caducan en 30 días.",
          ],
          links: [{ href: "/legal/privacy", label: "Política de privacidad" }],
        },
        {
          id: "contact",
          heading: "Cómo escribirnos",
          paragraphs: [
            `Escríbenos a ${E.email} por lo que sea: un regalo que no se abre, un pago, tus datos. Si es una reclamación, procuramos responder en 14 días.`,
          ],
        },
      ],
      company: { heading: "Datos de la empresa", regNo: "N.º de registro", vat: "IVA", address: "Domicilio social", registered: "Registrada el", email: "Correo" },
      registeredOn: REGISTERED.es,
      profilesHeading: "Dónde más encontrarnos",
      reactionsHeading: "Lo que respondieron",
      reactionsNote: "Reacciones reales, compartidas por quienes recibieron los regalos. Sin nombres.",
    };
  }
  return {
    metaTitle: "About Ethos: who makes it, how paying works, how to reach us",
    metaDescription: `Ethos is made by ${E.name}, a company registered in Latvia. Who we are, how payment and refunds work, what happens to your photos, and how to reach us.`,
    eyebrow: "About Ethos",
    title: "Who makes Ethos",
    subtitle: "A small company in Latvia makes Ethos. Here is who we are, how paying works, what happens to your photos and how to reach us.",
    sections: [
      {
        id: "what",
        heading: "What Ethos is",
        paragraphs: [
          `Ethos is a website for making a personal gift that opens on a phone. You pick one of ${facts.templates} templates (a love letter with a wax seal, a bouquet you build stem by stem, a scrapbook, a small game about the two of you), add their name, your words, your photos and a song, and send it as a link or a printed QR code. Nobody installs anything to open it.`,
          "Around the gifts there are date ideas on a map, ready-made trips and games for two. Everything is in English and Spanish.",
        ],
      },
      {
        id: "company",
        heading: "The company behind it",
        paragraphs: [
          `Ethos is made and run by ${E.name}, a limited company registered in Latvia, in the European Union, on ${REGISTERED.en}. Its registration number is ${E.regNo} and its VAT number is ${E.vat}; Latvia’s Enterprise Register is public, so anyone can check them.`,
          "The site itself is made in Riga.",
        ],
      },
      {
        id: "paying",
        heading: "How paying works",
        paragraphs: [
          `Some gifts can be sent free in a shorter version. A premium template costs ${facts.single}, paid once: the price is shown before you pay, and there is no subscription to cancel. The one subscription we sell, Ethos for Two, is optional and says so on its own page.`,
          "You pay on Stripe’s checkout page, with a card, Apple Pay or Google Pay. Payments are processed by Stripe; we never see or store your full card details.",
          "Our templates are also sold in our Etsy shop, TryEthos. There Etsy takes the payment, under its own terms.",
        ],
        links: [{ href: "/pricing", label: "Pricing" }],
      },
      {
        id: "guarantee",
        heading: "If something goes wrong",
        paragraphs: [
          "If a gift you paid for won’t open or play properly on the recipient’s phone or computer and we can’t fix it, tell us within 30 days of buying and we refund you in full. We also refund a duplicate purchase.",
          "If you live in the EU or the UK you also have the right to withdraw from some purchases within 14 days. The Terms of Service say exactly when, and the “Withdraw from a purchase” page starts it in one step.",
        ],
        links: [
          { href: "/legal/terms", label: "Terms of Service" },
          { href: "/legal/withdraw", label: "Withdraw from a purchase" },
        ],
      },
      {
        id: "privacy",
        heading: "Your photos and words",
        paragraphs: [
          "A gift holds what you put in it. Photos are resized on your own device before upload, which removes their metadata, such as where they were taken. Anyone with the link can open a gift, so a gift you have paid for can have a password.",
          "You can delete a gift at any time, and your whole account from your account page: your gifts and uploads are deleted at once, and backup copies expire within 30 days.",
        ],
        links: [{ href: "/legal/privacy", label: "Privacy Policy" }],
      },
      {
        id: "contact",
        heading: "Reaching us",
        paragraphs: [`Write to ${E.email} about anything: a gift that won’t open, a payment, your data. For a complaint we aim to reply within 14 days.`],
      },
    ],
    company: { heading: "Company details", regNo: "Reg. no.", vat: "VAT", address: "Registered address", registered: "Registered on", email: "Email" },
    registeredOn: REGISTERED.en,
    profilesHeading: "Where else to find us",
    reactionsHeading: "What came back",
    reactionsNote: "Real reactions, shared by the people who got the gifts. Names left out.",
  };
}

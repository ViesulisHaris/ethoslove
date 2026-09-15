import type { GiftLocale } from "@/lib/gift/schema";
import { BRAND } from "@/config/brand";

/** Operator of the service — from the Latvian Enterprise Register (Lursoft, reg. no. 40203733943). */
export const LEGAL_ENTITY = {
  name: 'SIA "MIGLAI"',
  shortName: "MIGLAI",
  regNo: "40203733943",
  vat: "LV40203733943",
  address: '"Reķu sala 4", Upesciems, Garkalnes pagasts, Ropažu novads, LV-2137, Latvia',
  country: "Latvia",
  email: BRAND.supportEmail,
  registeredAt: "27 March 2026",
} as const;

export const LEGAL_UPDATED = "2026-09-15";

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

const E = LEGAL_ENTITY;
const B = BRAND.name;

const termsEn: LegalDoc = {
  title: "Terms of Service",
  intro: `These terms govern your use of ${B} (the "Service"), operated by ${E.name}, registration number ${E.regNo}, VAT ${E.vat}, ${E.address}. By creating an account, publishing a gift or making a purchase you agree to them. If you don't agree, please don't use the Service.`,
  sections: [
    {
      heading: "1. What the Service is",
      paragraphs: [
        `${B} lets you build a personalised, animated web page (a "gift") from a template, add your own photos, music and words, and share it with a recipient through a link or QR code. Some templates and features are free; others are unlocked with a one-time payment.`,
        "We may change, add or retire templates and features over time. Gifts you have already published keep working with the template version they were published on.",
      ],
    },
    {
      heading: "2. Eligibility and accounts",
      paragraphs: [
        "You must be at least 16 years old to create an account. You can build a gift without an account, but publishing requires one. Accounts are personal: keep your sign-in email secure and tell us at once if you believe someone else has used your account.",
        "You're responsible for everything published from your account, including gifts created by anyone you let use it.",
      ],
    },
    {
      heading: "3. Your content",
      paragraphs: [
        "You keep every right you have in the photos, audio, video and text you upload ('Your Content'). You grant us a worldwide, non-exclusive, royalty-free licence to host, store, resize, transcode, display and transmit Your Content solely to operate the Service — that is, to show your gift to the people you share it with, and to show it back to you in your dashboard. The licence ends when you delete the content or your account, except for copies in routine backups, which are purged on their normal schedule.",
        "You confirm that you own or have permission to use Your Content, including any music, and that it doesn't infringe anyone's rights or privacy. Where you upload a photo or recording of another person, you're responsible for having their consent.",
        "Library music we provide inside the editor is licensed for use within gifts made on the Service. You may not extract it or use it elsewhere.",
      ],
    },
    {
      heading: "4. Acceptable use",
      paragraphs: [
        "Don't use the Service to publish content that is unlawful, defamatory, harassing, hateful, sexually explicit, that depicts minors inappropriately, that infringes intellectual property, or that is designed to deceive (for example phishing pages dressed up as gifts). Don't attempt to break, overload, scrape or reverse-engineer the Service, or to access other people's gifts, accounts or data.",
        "We may remove content, suspend or terminate accounts, and report to authorities where we reasonably believe these rules have been broken.",
      ],
    },
    {
      heading: "5. Purchases, prices and taxes",
      paragraphs: [
        "Template unlocks are one-time purchases: you pay once and the unlock stays on your account. There are no subscriptions and no automatic renewals. Prices are shown before you pay, in your currency where available, and include VAT where it applies. Payments are processed by Stripe; we never see or store your full card details.",
        "Because unlocks are digital content delivered immediately, by completing a purchase you expressly agree that delivery starts straight away and acknowledge that you lose the statutory 14-day right of withdrawal for that purchase. This doesn't affect your rights if the product is faulty or materially not as described — contact us and we'll fix it or refund you.",
        "Promotional codes are one use per account unless stated otherwise and can't be exchanged for cash.",
      ],
    },
    {
      heading: "6. Gift links, scheduling and availability",
      paragraphs: [
        "A published gift is reachable by anyone who has its link. Links are unguessable but not secret: treat them like a private letter you've handed to someone. If you set a password, the recipient will need it. Scheduled gifts are held until the time you choose.",
        "We aim to keep gift links working indefinitely, but we can't promise uninterrupted availability. We may take a gift offline if it breaches these terms, if you delete it, or if your account is closed. If we ever discontinue the Service, we'll give published gifts at least 90 days' notice by email.",
      ],
    },
    {
      heading: "7. Recipients and reactions",
      paragraphs: [
        "Recipients don't need an account. When a recipient sends a reaction (an emoji, a note or a short voice message), it is delivered only to the sender of that gift. Recipients should not send content that would breach section 4.",
      ],
    },
    {
      heading: "8. Our intellectual property",
      paragraphs: [
        `The Service, its templates, animations, code, design, brand and library assets belong to ${E.name} or its licensors. Publishing a gift doesn't give you any ownership of a template. You may not copy templates or resell access to the Service. The "${BRAND.watermark.en}" footer shown on free gifts may be removed only by unlocking the template.`,
      ],
    },
    {
      heading: "9. Ending the relationship",
      paragraphs: [
        "You can delete individual gifts at any time and delete your account from your account page. Deleting your account removes your gifts, uploads and reactions within 30 days. We may suspend or close accounts that breach these terms, with notice where reasonable.",
      ],
    },
    {
      heading: "10. Warranties and liability",
      paragraphs: [
        "The Service is provided as-is. To the extent the law allows, we exclude implied warranties and are not liable for indirect or consequential loss, or for loss of data you haven't backed up. Our total liability to you for any claim connected to the Service is limited to the amount you paid us in the twelve months before the claim arose, or €100 if you paid nothing.",
        "Nothing in these terms limits liability for death, personal injury, fraud, or anything that can't be limited under the law that applies to you. If you're a consumer in the EU, you keep all the protections of the mandatory law of the country where you live.",
      ],
    },
    {
      heading: "11. Governing law and disputes",
      paragraphs: [
        "These terms are governed by the laws of the Republic of Latvia. Disputes go to the courts of Latvia, except that consumers may also bring proceedings in their own country of residence. EU consumers can use the European Commission's online dispute resolution platform at ec.europa.eu/consumers/odr. We'd rather sort things out directly: write to us first.",
      ],
    },
    {
      heading: "12. Changes to these terms",
      paragraphs: [
        "We may update these terms. For material changes we'll email account holders at least 14 days before they take effect. Continuing to use the Service after that date means you accept the new terms.",
      ],
    },
    {
      heading: "13. Contact",
      paragraphs: [`${E.name} · Reg. no. ${E.regNo} · ${E.address} · ${E.email}`],
    },
  ],
};

const termsEs: LegalDoc = {
  title: "Términos del servicio",
  intro: `Estos términos regulan el uso de ${B} (el «Servicio»), operado por ${E.name}, número de registro ${E.regNo}, IVA ${E.vat}, ${E.address.replace("Latvia", "Letonia")}. Al crear una cuenta, publicar un regalo o realizar una compra, los aceptas. Si no estás de acuerdo, por favor no uses el Servicio.`,
  sections: [
    {
      heading: "1. Qué es el Servicio",
      paragraphs: [
        `${B} te permite crear una página web personalizada y animada (un «regalo») a partir de una plantilla, añadir tus fotos, música y palabras, y compartirla con un destinatario mediante un enlace o un código QR. Algunas plantillas y funciones son gratuitas; otras se desbloquean con un pago único.`,
        "Podemos cambiar, añadir o retirar plantillas y funciones con el tiempo. Los regalos ya publicados siguen funcionando con la versión de la plantilla con la que se publicaron.",
      ],
    },
    {
      heading: "2. Requisitos y cuentas",
      paragraphs: [
        "Debes tener al menos 16 años para crear una cuenta. Puedes crear un regalo sin cuenta, pero publicarlo requiere una. Las cuentas son personales: protege tu correo de acceso y avísanos de inmediato si crees que alguien más ha usado tu cuenta.",
        "Eres responsable de todo lo que se publique desde tu cuenta, incluidos los regalos creados por cualquier persona a la que permitas usarla.",
      ],
    },
    {
      heading: "3. Tu contenido",
      paragraphs: [
        "Conservas todos los derechos sobre las fotos, el audio, el vídeo y los textos que subas («Tu Contenido»). Nos concedes una licencia mundial, no exclusiva y gratuita para alojar, almacenar, redimensionar, transcodificar, mostrar y transmitir Tu Contenido únicamente para operar el Servicio: es decir, para mostrar tu regalo a las personas con las que lo compartes y para mostrártelo en tu panel. La licencia termina cuando borras el contenido o tu cuenta, salvo por las copias de seguridad rutinarias, que se eliminan según su calendario habitual.",
        "Confirmas que eres titular de Tu Contenido o tienes permiso para usarlo, incluida la música, y que no vulnera derechos ni la privacidad de nadie. Si subes una foto o grabación de otra persona, eres responsable de contar con su consentimiento.",
        "La música de biblioteca que ofrecemos en el editor tiene licencia para usarse dentro de los regalos creados en el Servicio. No puedes extraerla ni usarla en otro lugar.",
      ],
    },
    {
      heading: "4. Uso aceptable",
      paragraphs: [
        "No uses el Servicio para publicar contenido ilegal, difamatorio, acosador, de odio, sexualmente explícito, que muestre a menores de forma inapropiada, que infrinja la propiedad intelectual o que esté diseñado para engañar (por ejemplo, páginas de phishing disfrazadas de regalo). No intentes romper, sobrecargar, extraer datos de ni realizar ingeniería inversa del Servicio, ni acceder a regalos, cuentas o datos de otras personas.",
        "Podemos retirar contenido, suspender o cancelar cuentas e informar a las autoridades cuando creamos razonablemente que se han incumplido estas normas.",
      ],
    },
    {
      heading: "5. Compras, precios e impuestos",
      paragraphs: [
        "Los desbloqueos de plantillas son compras únicas: pagas una vez y el desbloqueo permanece en tu cuenta. No hay suscripciones ni renovaciones automáticas. Los precios se muestran antes de pagar, en tu moneda cuando está disponible, e incluyen el IVA cuando corresponde. Los pagos los procesa Stripe; nunca vemos ni almacenamos los datos completos de tu tarjeta.",
        "Como los desbloqueos son contenido digital que se entrega de inmediato, al completar una compra aceptas expresamente que la entrega comience en ese momento y reconoces que pierdes el derecho legal de desistimiento de 14 días para esa compra. Esto no afecta a tus derechos si el producto es defectuoso o no se corresponde sustancialmente con lo descrito: contáctanos y lo arreglaremos o te reembolsaremos.",
        "Los códigos promocionales son de un solo uso por cuenta salvo que se indique lo contrario y no pueden canjearse por dinero.",
      ],
    },
    {
      heading: "6. Enlaces, programación y disponibilidad",
      paragraphs: [
        "Cualquiera que tenga el enlace de un regalo publicado puede abrirlo. Los enlaces no son adivinables, pero tampoco secretos: trátalos como una carta privada que entregas en mano. Si estableces una contraseña, el destinatario la necesitará. Los regalos programados permanecen bloqueados hasta la hora que elijas.",
        "Nuestro objetivo es que los enlaces funcionen indefinidamente, pero no podemos prometer disponibilidad ininterrumpida. Podemos retirar un regalo si incumple estos términos, si lo borras o si se cierra tu cuenta. Si alguna vez dejamos de ofrecer el Servicio, avisaremos por correo a los regalos publicados con al menos 90 días de antelación.",
      ],
    },
    {
      heading: "7. Destinatarios y reacciones",
      paragraphs: [
        "Los destinatarios no necesitan cuenta. Cuando un destinatario envía una reacción (un emoji, una nota o un mensaje de voz breve), esta se entrega únicamente al remitente del regalo. Los destinatarios no deben enviar contenido que incumpla la sección 4.",
      ],
    },
    {
      heading: "8. Nuestra propiedad intelectual",
      paragraphs: [
        `El Servicio, sus plantillas, animaciones, código, diseño, marca y recursos de biblioteca pertenecen a ${E.name} o a sus licenciantes. Publicar un regalo no te otorga ninguna propiedad sobre una plantilla. No puedes copiar plantillas ni revender el acceso al Servicio. El pie «${BRAND.watermark.es}» de los regalos gratuitos solo puede eliminarse desbloqueando la plantilla.`,
      ],
    },
    {
      heading: "9. Fin de la relación",
      paragraphs: [
        "Puedes borrar regalos individuales en cualquier momento y eliminar tu cuenta desde la página de cuenta. Al eliminar tu cuenta se borran tus regalos, archivos y reacciones en un plazo de 30 días. Podemos suspender o cerrar cuentas que incumplan estos términos, avisando cuando sea razonable.",
      ],
    },
    {
      heading: "10. Garantías y responsabilidad",
      paragraphs: [
        "El Servicio se ofrece «tal cual». En la medida en que la ley lo permita, excluimos las garantías implícitas y no respondemos por pérdidas indirectas o consecuentes ni por la pérdida de datos de los que no tengas copia. Nuestra responsabilidad total frente a ti por cualquier reclamación relacionada con el Servicio se limita al importe que nos hayas pagado en los doce meses anteriores a la reclamación, o a 100 € si no has pagado nada.",
        "Nada en estos términos limita la responsabilidad por muerte, daños personales, fraude o cualquier otra que no pueda limitarse según la ley que te sea aplicable. Si eres consumidor en la UE, conservas todas las protecciones de la normativa imperativa del país en el que resides.",
      ],
    },
    {
      heading: "11. Ley aplicable y conflictos",
      paragraphs: [
        "Estos términos se rigen por las leyes de la República de Letonia. Los conflictos se someten a los tribunales de Letonia, salvo que los consumidores también pueden acudir a los de su país de residencia. Los consumidores de la UE pueden usar la plataforma de resolución de litigios en línea de la Comisión Europea en ec.europa.eu/consumers/odr. Preferimos resolverlo directamente: escríbenos primero.",
      ],
    },
    {
      heading: "12. Cambios en estos términos",
      paragraphs: [
        "Podemos actualizar estos términos. Para cambios relevantes avisaremos por correo a los titulares de cuentas con al menos 14 días de antelación. Seguir usando el Servicio después de esa fecha implica aceptar los nuevos términos.",
      ],
    },
    {
      heading: "13. Contacto",
      paragraphs: [`${E.name} · N.º de registro ${E.regNo} · ${E.address.replace("Latvia", "Letonia")} · ${E.email}`],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  intro: `${E.name} ("we"), registration number ${E.regNo}, ${E.address}, is the data controller for personal data processed through ${B}. This policy explains what we collect, why, and the rights you have under the General Data Protection Regulation (GDPR). Questions: ${E.email}.`,
  sections: [
    {
      heading: "1. Data we collect from senders",
      paragraphs: [
        "Account data: your email address, your name if you give it, your chosen language, sign-in tokens, and — if you sign in with Google or Apple — the identifier and basic profile those providers share.",
        "Gift content: the names, messages, photos, audio, video, captions, dates and settings you add to a gift. Photos are resized and re-encoded on your device before upload; we don't keep the originals or their metadata (EXIF, location).",
        "Purchase data: what you bought, when, the amount and currency, the link that brought you to us (such as a gift you received or one of our posts), and Stripe's identifiers for the transaction. Your card details go directly to Stripe; we never receive them.",
        "Technical and usage data: IP address, browser and device type, pages visited and actions taken, error reports. Product analytics are collected only with your consent (see Cookies).",
      ],
    },
    {
      heading: "2. Data we collect from recipients",
      paragraphs: [
        "When a gift is opened we record an anonymous identifier (a one-way hash that isn't linked to your name or exact IP address), the device type, the time and how far the gift was watched, so the sender can see it was received. If you send a reaction, the emoji, text or voice recording you submit is stored and shown to the sender only. We don't ask recipients for their name or email.",
      ],
    },
    {
      heading: "3. Why we process it and on what legal basis",
      paragraphs: [
        "To provide the Service — creating and hosting gifts, delivering them to recipients, showing reactions and statistics to senders, processing purchases: performance of a contract (Art. 6(1)(b) GDPR).",
        "To keep the Service secure, prevent abuse, and enforce our terms: our legitimate interests (Art. 6(1)(f)).",
        "To send transactional email — sign-in links, receipts, 'your gift was opened', 'you received a reaction', scheduled-gift reminders: performance of a contract. You can switch notification emails off in your account.",
        "Product analytics and any marketing email: your consent (Art. 6(1)(a)), which you can withdraw at any time.",
        "To meet legal obligations such as accounting and tax rules: Art. 6(1)(c).",
      ],
    },
    {
      heading: "4. Who we share data with",
      paragraphs: [
        "We use service providers who process data on our behalf under data-processing agreements: Supabase (database, authentication and file storage), Vercel (hosting and delivery), Stripe (payments), Resend (transactional email), PostHog (product analytics, only with consent), Sentry (error monitoring) and Anthropic (the optional 'help me write it' feature — only the facts you type into that dialog are sent, and only when you use it). Some providers process data in the United States; transfers rely on the EU–US Data Privacy Framework or the European Commission's Standard Contractual Clauses. When you search for a place in a template's place picker, our servers send what you type to Photon, komoot's public place search built on OpenStreetMap data, to find matching towns; only the search text is sent, never your name or your gift. If a gift includes a song link, opening it loads the song's cover image from YouTube, Spotify or Apple, which then receive the viewer's IP address; tapping the link opens that service under its own privacy policy.",
        "We don't sell personal data. We disclose data to authorities only where the law requires it.",
      ],
    },
    {
      heading: "5. How long we keep it",
      paragraphs: [
        "Gifts and their content stay until you delete them or your account. After a live gift has been opened, we may remove unused upload versions that are no longer referenced by the published gift; scheduled gifts are not pruned before their unlock time. Deleted accounts and gifts have active Supabase Storage files, including images, videos, voice notes and reaction recordings, removed as part of deletion; routine backups expire within 30 days. View statistics are kept for as long as the gift exists. Purchase records are kept for the period Latvian accounting law requires (currently five years). Sign-in logs and security data are kept for up to 12 months.",
      ],
    },
    {
      heading: "6. Your rights",
      paragraphs: [
        "You can access, correct, export (in a portable format) or delete your data, restrict or object to certain processing, and withdraw consent, from your account page or by emailing us. We answer within one month. You can also complain to the Latvian Data State Inspectorate (Datu valsts inspekcija, dvi.gov.lv) or the supervisory authority where you live.",
        "Recipients who want a reaction or view record removed can write to us with the gift link; we'll remove it and tell the sender it was withdrawn.",
      ],
    },
    {
      heading: "7. Cookies and similar technologies",
      paragraphs: [
        "Strictly necessary cookies keep you signed in, remember your language and protect against abuse; they don't need consent. Analytics cookies (PostHog) are set only after you accept them in the cookie banner, and you can change your mind from the footer at any time. We don't use advertising cookies.",
      ],
    },
    {
      heading: "8. Children",
      paragraphs: ["The Service isn't directed at children under 16, and we don't knowingly collect their data. Photos of children may appear in gifts made by adults; the sender is responsible for having the right to share them."],
    },
    {
      heading: "9. Security",
      paragraphs: ["Data is encrypted in transit and at rest. Uploaded files live in private storage and are served through short-lived signed links. Access to production systems is limited to people who need it and protected with multi-factor authentication."],
    },
    {
      heading: "10. Changes and contact",
      paragraphs: [`We'll post updates here and email account holders about material changes. Contact: ${E.name}, ${E.address}, ${E.email}.`],
    },
  ],
};

const privacyEs: LegalDoc = {
  title: "Política de privacidad",
  intro: `${E.name} («nosotros»), número de registro ${E.regNo}, ${E.address.replace("Latvia", "Letonia")}, es el responsable del tratamiento de los datos personales que se procesan a través de ${B}. Esta política explica qué recogemos, por qué y los derechos que tienes según el Reglamento General de Protección de Datos (RGPD). Preguntas: ${E.email}.`,
  sections: [
    {
      heading: "1. Datos que recogemos de los remitentes",
      paragraphs: [
        "Datos de cuenta: tu correo electrónico, tu nombre si lo indicas, el idioma elegido, tokens de acceso y, si inicias sesión con Google o Apple, el identificador y el perfil básico que esos proveedores comparten.",
        "Contenido del regalo: los nombres, mensajes, fotos, audio, vídeo, pies de foto, fechas y ajustes que añades a un regalo. Las fotos se redimensionan y recodifican en tu dispositivo antes de subirse; no conservamos los originales ni sus metadatos (EXIF, ubicación).",
        "Datos de compra: qué compraste, cuándo, el importe y la moneda, el enlace por el que llegaste (por ejemplo, un regalo que recibiste o una de nuestras publicaciones) y los identificadores de Stripe de la transacción. Los datos de tu tarjeta van directamente a Stripe; nunca los recibimos.",
        "Datos técnicos y de uso: dirección IP, tipo de navegador y dispositivo, páginas visitadas y acciones realizadas, informes de errores. Las analíticas de producto solo se recogen con tu consentimiento (ver Cookies).",
      ],
    },
    {
      heading: "2. Datos que recogemos de los destinatarios",
      paragraphs: [
        "Cuando se abre un regalo registramos un identificador anónimo (un hash unidireccional que no se vincula a tu nombre ni a tu IP exacta), el tipo de dispositivo, la hora y hasta dónde se vio el regalo, para que el remitente sepa que se ha recibido. Si envías una reacción, el emoji, el texto o la grabación de voz que envíes se almacena y se muestra únicamente al remitente. No pedimos a los destinatarios su nombre ni su correo.",
      ],
    },
    {
      heading: "3. Por qué los tratamos y con qué base legal",
      paragraphs: [
        "Para prestar el Servicio (crear y alojar regalos, entregarlos a los destinatarios, mostrar reacciones y estadísticas a los remitentes, procesar compras): ejecución de un contrato (art. 6.1.b RGPD).",
        "Para mantener el Servicio seguro, prevenir abusos y hacer cumplir nuestros términos: nuestro interés legítimo (art. 6.1.f).",
        "Para enviar correos transaccionales (enlaces de acceso, recibos, «tu regalo se ha abierto», «has recibido una reacción», recordatorios de regalos programados): ejecución de un contrato. Puedes desactivar los correos de notificación en tu cuenta.",
        "Analíticas de producto y cualquier correo comercial: tu consentimiento (art. 6.1.a), que puedes retirar en cualquier momento.",
        "Para cumplir obligaciones legales como las normas contables y fiscales: art. 6.1.c.",
      ],
    },
    {
      heading: "4. Con quién compartimos los datos",
      paragraphs: [
        "Usamos proveedores que tratan datos en nuestro nombre bajo contratos de encargo de tratamiento: Supabase (base de datos, autenticación y almacenamiento de archivos), Vercel (alojamiento y entrega), Stripe (pagos), Resend (correo transaccional), PostHog (analíticas de producto, solo con consentimiento), Sentry (monitorización de errores) y Anthropic (la función opcional «ayúdame a escribirlo»: solo se envían los datos que escribes en ese diálogo y solo cuando la usas). Algunos proveedores tratan datos en Estados Unidos; las transferencias se amparan en el Marco de Privacidad de Datos UE–EE. UU. o en las cláusulas contractuales tipo de la Comisión Europea. Cuando buscas un sitio en el selector de lugares de una plantilla, nuestros servidores envían lo que escribes a Photon, el buscador público de lugares de komoot basado en datos de OpenStreetMap, para encontrar pueblos y ciudades; solo se envía el texto de la búsqueda, nunca tu nombre ni tu regalo. Si un regalo incluye el enlace a una canción, al abrirlo se carga su portada desde YouTube, Spotify o Apple, que reciben la dirección IP de quien lo ve; al tocar el enlace se abre ese servicio, sujeto a su propia política de privacidad.",
        "No vendemos datos personales. Solo comunicamos datos a las autoridades cuando la ley lo exige.",
      ],
    },
    {
      heading: "5. Cuánto tiempo los conservamos",
      paragraphs: [
        "Los regalos y su contenido se conservan hasta que los borras o eliminas tu cuenta. Cuando un regalo publicado ya se ha abierto, podemos eliminar versiones de archivos subidos que ya no estén referenciadas por el regalo publicado; los regalos programados no se depuran antes de su hora de apertura. Al borrar una cuenta o un regalo, eliminamos del almacenamiento activo de Supabase los archivos asociados, incluidas imágenes, vídeos, notas de voz y grabaciones de reacción; las copias de seguridad rutinarias caducan en 30 días. Las estadísticas de visualización se conservan mientras exista el regalo. Los registros de compra se conservan durante el periodo que exige la legislación contable letona (actualmente cinco años). Los registros de acceso y datos de seguridad se conservan hasta 12 meses.",
      ],
    },
    {
      heading: "6. Tus derechos",
      paragraphs: [
        "Puedes acceder a tus datos, corregirlos, exportarlos (en un formato portable) o borrarlos, limitar u oponerte a ciertos tratamientos y retirar tu consentimiento, desde la página de tu cuenta o escribiéndonos. Respondemos en el plazo de un mes. También puedes reclamar ante la Inspección Estatal de Datos de Letonia (Datu valsts inspekcija, dvi.gov.lv) o ante la autoridad de control de tu lugar de residencia.",
        "Los destinatarios que quieran que se elimine una reacción o un registro de visualización pueden escribirnos con el enlace del regalo; lo eliminaremos e informaremos al remitente de que se ha retirado.",
      ],
    },
    {
      heading: "7. Cookies y tecnologías similares",
      paragraphs: [
        "Las cookies estrictamente necesarias mantienen tu sesión iniciada, recuerdan tu idioma y protegen contra abusos; no requieren consentimiento. Las cookies analíticas (PostHog) solo se instalan tras aceptarlas en el aviso de cookies, y puedes cambiar de opinión desde el pie de página en cualquier momento. No usamos cookies publicitarias.",
      ],
    },
    {
      heading: "8. Menores",
      paragraphs: ["El Servicio no está dirigido a menores de 16 años y no recogemos sus datos a sabiendas. En los regalos creados por adultos pueden aparecer fotos de menores; el remitente es responsable de tener derecho a compartirlas."],
    },
    {
      heading: "9. Seguridad",
      paragraphs: ["Los datos se cifran en tránsito y en reposo. Los archivos subidos se guardan en almacenamiento privado y se sirven mediante enlaces firmados de corta duración. El acceso a los sistemas de producción está limitado a las personas que lo necesitan y protegido con autenticación multifactor."],
    },
    {
      heading: "10. Cambios y contacto",
      paragraphs: [`Publicaremos las actualizaciones aquí y avisaremos por correo a los titulares de cuentas sobre cambios relevantes. Contacto: ${E.name}, ${E.address.replace("Latvia", "Letonia")}, ${E.email}.`],
    },
  ],
};

export const LEGAL_DOCS: Record<"terms" | "privacy", Record<GiftLocale, LegalDoc>> = {
  terms: { en: termsEn, es: termsEs },
  privacy: { en: privacyEn, es: privacyEs },
};

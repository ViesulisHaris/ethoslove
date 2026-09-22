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

export const LEGAL_UPDATED = "2026-09-22";

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

const E = LEGAL_ENTITY;
const B = BRAND.name;

const termsEn: LegalDoc = {
  title: "Terms of Service",
  intro: `These terms govern your use of ${B} (the “Service”), operated by ${E.name}, registration number ${E.regNo}, VAT ${E.vat}, ${E.address} (“we”, “us”). They cover every part of the Service: gifts, the Dates map and plans, reviews, games and the waitlist. By using the Service, creating an account, publishing a gift, posting a review or making a purchase, you agree to them. Our Privacy Policy explains how we handle personal data. If you don't agree, please don't use the Service.`,
  sections: [
    {
      heading: "1. What the Service is",
      paragraphs: [
        `${B} lets you build a personalised, animated web page (a “gift”) from a template, add your own photos, music, video and words, and share it through a link or QR code. Two templates are currently free. The others, and paid extras such as real songs, video, voice messages, more than 10 photos, scheduling, a password and removing the footer, are unlocked with a one-time payment.`,
        "The Service also has free tools for couples: a map of date ideas and places (Dates), plans you can share, long-distance tools, reviews of places, and browser games for two. Joining the waitlist for our planned couples' subscription costs nothing and commits you to nothing.",
        "Gifts are web pages. They work in current versions of the common mobile and desktop browsers and need an internet connection. Some templates use sound and, if the person viewing allows it, the microphone (for example to “blow out” candles) or motion sensors.",
      ],
    },
    {
      heading: "2. Who can use the Service, and your account",
      paragraphs: [
        "The Service is for personal, non-commercial use. You must be at least 16 to create an account, post a review or buy anything, and if you are under 18 you need a parent's or guardian's permission to buy. The Service isn't directed at children.",
        "You can sign in with a link or code sent to your email, or with Google (or Apple, where offered). You can also pay without signing in: we then create your account from the email address you give at checkout and add your purchase to it, so make sure that address is right. If an account already exists for that address, the purchase goes to it.",
        "Accounts are personal. Keep access to your email secure and tell us at once if you think someone else has used your account. You're responsible for everything published from your account, including by anyone you let use it.",
      ],
    },
    {
      heading: "3. Your content",
      paragraphs: [
        "You keep every right you have in the photos, video, audio, voice recordings and text you add to a gift or a review (“Your Content”). You give us a worldwide, non-exclusive, royalty-free licence to host, store, copy, resize, re-encode, display and transmit Your Content only as needed to run the Service: to show a gift to the people who have its link, to show it to you in your dashboard, and to publish your reviews (section 10). The licence ends when you delete the content or your account, except for copies in routine backups until they expire.",
        "You confirm that you own Your Content or have permission to use it, including any music you upload, and that it doesn't infringe anyone's copyright or other rights, or their privacy. Where Your Content shows or names other people, you're responsible for having their permission, and you shouldn't include more of their personal details than a personal gift needs.",
        "Library music in the editor belongs to us and may be used only inside gifts made on the Service. “Real songs” are 30-second previews supplied by Apple, and song links point to YouTube, Spotify or Apple Music: they belong to their owners, play from those services under their terms, and may stop working if a provider removes them.",
        "The optional writing helper uses an AI model to suggest drafts from the details you give it. Drafts can be wrong or unsuitable, so read them before you use them. Whatever you publish is Your Content and your responsibility.",
      ],
    },
    {
      heading: "4. Acceptable use",
      paragraphs: [
        "Don't use the Service to publish or send anything unlawful, defamatory, harassing, threatening or hateful; sexually explicit material; anything that sexualises or endangers minors; content that infringes intellectual property or someone's privacy, including other people's photos or personal details shared without their permission; or anything designed to deceive, such as phishing pages, scams or spam dressed up as gifts.",
        "Don't try to break, overload, scrape or reverse-engineer the Service; to get around payment, rate limits or security; to post reviews or reactions automatically; or to access gifts, game rooms, accounts or data that aren't yours. Game room codes are short, so anyone who has one can try to join: don't share them publicly.",
        "If these rules are broken, we may remove content, restrict features, suspend or close accounts, and report illegal content to the authorities where the law requires or allows it. Section 11 explains how, and how you can challenge a decision.",
      ],
    },
    {
      heading: "5. Gifts: links, scheduling, reactions and storage",
      paragraphs: [
        "Anyone who has a published gift's link can open it. Links are hard to guess but not secret: treat them like a private letter you hand to someone. When a link is shared in a messaging app or on a social network, its preview can show the gift's title or the recipient's name.",
        "With an unlock you can add a password, which the recipient needs to open the gift, or schedule a gift: until the time you choose, its link shows a waiting screen with your name and the opening time. You can edit a live gift, and your changes appear at the same link. You can delete a gift at any time: its link stops working at once and its files are removed.",
        "Recipients don't need an account. They can send the sender a reaction: an emoji, with an optional short note and a voice message of up to 20 seconds. Reactions are shown only to the gift's sender, who also receives the emoji and the note by email. Reactions must follow section 4.",
        "Drafts saved to your account that haven't been edited for 7 days are deleted automatically, with their uploads. The Service isn't a storage or backup service: keep your own copies of the photos, videos and words that matter to you.",
        "We aim to keep gift links working indefinitely, but we can't promise uninterrupted availability. We may take a gift offline if it breaks these terms or the law, if you delete it, if your account is closed, or if the payment that unlocked it is refunded or reversed (section 8). If we ever discontinue the Service, we'll give account holders at least 90 days' notice by email.",
      ],
    },
    {
      heading: "6. Buying unlocks: prices and payment",
      paragraphs: [
        "We sell one-time unlocks: one template, three templates of your choice, or “Everything”, which covers every gift template, including the ones we add later, for as long as we offer gift templates. An unlock covers the templates it names, with all their paid extras and no footer. There are no subscriptions and no automatic renewals, and “Everything” doesn't include other products we may sell separately.",
        "An unlock has no end date: it stays on your account for as long as your account exists and we run the Service. It is personal to your account and can't be transferred.",
        "Prices are shown on our site before you pay. For consumers they are final prices, including VAT where it applies. We charge in euros, or in your own currency where our site shows the price in it. If you pay in another currency, Stripe may convert the price at checkout, at its own rate and possibly with a conversion fee: the amount on the Stripe Checkout page, before you confirm, is the amount you pay. Your bank may add its own fees for payments in a foreign currency. If we ever charge you more than the price we showed you in the same currency, we'll refund the difference.",
        "How a purchase works: you choose an unlock on our site and go to Stripe Checkout, where you see the final amount and can check or correct your details, or go back, before you pay. The contract is concluded when Stripe confirms your payment, and we add the unlock to your account straight away. We email you a confirmation of what you unlocked, Stripe may send its own receipt, and your purchases are listed on your account page. Payments are processed by Stripe; we never see or store your full card details. The charge appears on your statement with “ETHOS” in its description.",
        "Promotion codes can be entered on the Stripe Checkout page. Each code is subject to the conditions shown with it (for example an expiry date or a limit on uses) and can't be exchanged for cash.",
      ],
    },
    {
      heading: "7. Your right of withdrawal (EU and UK consumers)",
      paragraphs: [
        "If you are a consumer in the EU or the UK, you generally have the right to withdraw from a purchase within 14 days of the day you made it, without giving a reason.",
        "Unlocks are digital content that we supply as soon as your payment is confirmed. Your right of withdrawal ends when supply begins only if all of these apply: before paying, you expressly agreed that we start supplying the unlock straight away, within the 14 days; you acknowledged that you would therefore lose your right of withdrawal; and we confirmed this to you in writing, for example in the purchase confirmation email. In that case you can't withdraw once the unlock is on your account, but your rights if it is faulty (section 8) still apply.",
        "This is how we ask: at checkout, the line directly above the Pay button says that paying asks for your purchase to be unlocked straight away and that, once it is, you lose the 14-day right to cancel. Paying after reading it is your agreement and acknowledgement, and your receipt email confirms it.",
        `Otherwise, you keep the right to withdraw for 14 days. To use it, tell us clearly before the 14 days end, for example by emailing ${E.email} with the email address you paid with and what you bought. You may use this model form, but you don't have to: “To ${E.name}, ${E.address}, ${E.email}: I hereby give notice that I withdraw from my contract for the supply of the following digital content: [the unlock]. Bought on: [date]. Name: [ ]. Email address used for the purchase: [ ]. Date: [ ].”`,
        "We'll refund everything you paid within 14 days of receiving your notice, using the same payment method and at no cost to you, and remove the unlock from your account; section 8 explains what then happens to gifts that use it.",
      ],
    },
    {
      heading: "8. Faults, refunds and chargebacks",
      paragraphs: [
        `If an unlock or a gift doesn't work as described, you have the legal rights that apply to digital content and services: to have it put right or, if we can't do that within a reasonable time, to a price reduction or a refund. Tell us at ${E.email}.`,
        "On top of those rights, we refund a duplicate purchase (for example if you were charged twice, or bought an unlock your account already had), and a purchase whose gift won't open or play properly on the recipient's device when we can't fix it, if you tell us within 30 days of buying. Apart from that and section 7, we don't refund a change of mind.",
        "Refunds go back through Stripe to the payment method you used; when they appear depends on your bank.",
        "When a payment is refunded, or reversed by your bank (a chargeback), the unlock it paid for is removed from your account. Gifts that need it are unpublished and return to your drafts, where the 7-day rule in section 5 applies, and gifts that only paid to remove the footer show it again. If a chargeback is decided in our favour, write to us and we'll restore the unlock. Please contact us before disputing a payment: we can usually sort things out faster.",
      ],
    },
    {
      heading: "9. Dates, plans and places",
      paragraphs: [
        "Dates, plans and the long-distance tools are free and are for information and inspiration only. Place information comes from OpenStreetMap (map tiles from OpenFreeMap, details from Nominatim and Overpass), forecasts and sunset times from Open-Meteo, and photographs from Wikimedia Commons, credited to their authors. It is made by others and can be incomplete, out of date or wrong, especially opening hours, prices, accessibility and whether a place is still open at all.",
        "Always check with the venue before you go, and use your own judgment about safety, weather, travel and local rules. We don't run, inspect or endorse any venue, we don't take bookings, and we aren't a party to anything you arrange with a venue or anyone else. To the extent the law allows, we aren't responsible for venues, their services, events or bookings, or for what happens on a date.",
        "Links from a place (directions, photos and reviews, Tripadvisor, Google, Yelp, a venue's website) open other services under their own terms. Where we show a rating from Tripadvisor or Google, it is theirs, shown with their name and a link to the source; we don't control or check it.",
        "How places are ordered: by our “date score”, which weighs distance from the point searched, the kind of place and its cuisine, how complete its map entry is (for example whether it lists a website or opening hours), whether it is a chain or takeaway-only, the star ratings couples have given it on the Service (weighted so that a handful of reviews can't dominate) and whether a real photograph of it exists. You can also sort by rating, distance or cost. No one pays for a place's position.",
      ],
    },
    {
      heading: "10. Reviews",
      paragraphs: [
        "If you're signed in, you can review a place: stars, what it cost for two, the occasion and a short text. You can post one review per place and edit or delete it at any time. Reviews are public: anyone can read them, shown with your first name (or “Somebody” if your profile has no name).",
        "Review rules: write only about a place you have been to, honestly and from your own experience. No defamation or false statements of fact about a venue or a person; no insults, hate or harassment; no personal details of other people, such as staff names or contact details; no advertising or self-promotion; no reviews of your own business or a competitor's, and none written in exchange for money, discounts or other benefits; nothing illegal.",
        "We don't check that reviewers have visited a place. To keep reviews genuine we require an account, allow one review per person per place, limit how often reviews can be posted, and remove reviews we find to be fake. Links and phone numbers are removed from review text automatically, and text written in capitals is changed to lower case. Every published review counts towards a place's rating; we don't pay for reviews and don't remove them for being negative.",
        "By posting a review you give us a worldwide, non-exclusive, royalty-free licence to publish it with your first name on the Service, and to count it in ratings and rankings, for as long as it is published. We may remove or restrict a review that breaks these rules or the law. Anyone can report a review (section 11).",
      ],
    },
    {
      heading: "11. Reporting illegal content, and how we moderate",
      paragraphs: [
        `Point of contact. Our single point of contact under the EU Digital Services Act, for users as well as for authorities, the European Commission and the European Board for Digital Services, is ${E.email}. You can write to us in English, Spanish or Latvian.`,
        `Reporting content. If you believe a gift, review, reaction or anything else on the Service is illegal or breaks these terms, email ${E.email} with: the link to the gift, or to the place and the review concerned; why you believe it is illegal or breaks our rules; your name and email address (not needed if you are reporting child sexual abuse material); and a statement that you believe in good faith that your report is accurate and complete. Rights holders can send copyright notices the same way.`,
        "What happens next. We confirm that we've received your report, review the content without undue delay, carefully and objectively, and tell you what we decided and how you can challenge it. Decisions are made by a person, not by an automated system. If content suggests a threat to someone's life or safety, we inform the authorities.",
        "If we act on your content or account. We don't review gifts or reviews before they're published, and we have no general obligation to monitor them. If we remove or restrict your content, or suspend or close your account, we'll tell you (if we have your email address) what we did and for how long, why (the law or the rule in these terms), whether it followed a report, and how you can challenge it, unless the law stops us.",
        `Challenging a decision. Within six months you can ask us to review any moderation decision, whether you posted the content or reported it, by replying to our message or writing to ${E.email}. We'll look at it again, reverse it if it was wrong and tell you the result. You can also go to court. We may stop handling reports from someone who repeatedly sends clearly unfounded ones, and suspend accounts that repeatedly post clearly illegal content.`,
      ],
    },
    {
      heading: "12. Our intellectual property",
      paragraphs: [
        `The Service, its templates, animations, code, design, brand, illustrations and library music belong to ${E.name} or its licensors. Publishing a gift doesn't give you any ownership of a template. You may not copy templates, or resell or sublicense access to the Service. The “${BRAND.watermark.en}” footer on free gifts may be removed only by unlocking the template.`,
        "Map data is © OpenStreetMap contributors and available under the Open Database Licence; photographs of places belong to their authors and are used under the licences shown with them.",
      ],
    },
    {
      heading: "13. Ending the relationship",
      paragraphs: [
        "You can delete individual gifts at any time, and your account from your account page. Deleting your account deletes your gifts, uploads, reactions, reviews and unlocks at once (backup copies expire within 30 days) and can't be undone. Unlocks aren't refunded when you delete your account, except where section 7 or 8 applies.",
        "We may suspend or close an account that seriously or repeatedly breaks these terms or the law, or where we must to protect the Service or other people. Where reasonable we'll warn you first, and we'll tell you why as section 11 describes.",
      ],
    },
    {
      heading: "14. Warranties and liability",
      paragraphs: [
        "We provide the Service with reasonable skill and care, and what you pay for will match its description. Beyond that and your statutory rights, we give no other promises: in particular, we don't guarantee that the Service will always be available or error-free, and the free parts of the Service are provided as they are.",
        "Nothing in these terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud, for damage we cause intentionally or through gross negligence, for your statutory rights as a consumer, or for anything else that can't be excluded or limited under the law that applies to you.",
        "Subject to that, we aren't liable for loss that wasn't reasonably foreseeable when you used the Service, for business losses (the Service is for personal use), or for loss you could reasonably have avoided, for example by keeping copies of your own photos and words. For any other claim connected to the Service, our total liability to you is limited to €100 or the amount you paid us in the 12 months before the claim arose, whichever is higher.",
      ],
    },
    {
      heading: "15. Changes to the Service and to these terms",
      paragraphs: [
        "We may change, add or retire templates and features for valid reasons, such as security, legal requirements, keeping the Service running or improving it. When we improve a template, gifts made with it show the improved version. If we retire a template, we stop offering it for new gifts, and gifts already published with it keep working. If a change affects your access to, or use of, something you paid for in more than a minor way, we'll tell you in advance, and you can end the contract for it free of charge within 30 days and get a proportionate refund.",
        "We may update these terms. We'll email account holders about material changes at least 14 days before they take effect; if you don't agree, you can stop using the Service and delete your account before then. If you keep using the Service after that date, the new terms apply. Changes never take away rights you already have for purchases you've made.",
      ],
    },
    {
      heading: "16. Governing law, complaints and disputes",
      paragraphs: [
        "These terms are governed by the laws of the Republic of Latvia. If you are a consumer, this doesn't take away the protection of the mandatory law of the country where you live. You can bring a claim in the courts of Latvia or of the country where you live, and we can bring a claim against you only in the courts of the country where you live. If you are not a consumer, the courts of Latvia have exclusive jurisdiction.",
        `If something goes wrong, please write to us first at ${E.email}: we aim to reply within 14 days. If we can't resolve your complaint, you can contact the Consumer Rights Protection Centre of Latvia (Patērētāju tiesību aizsardzības centrs, PTAC, ptac.gov.lv), or the consumer authority or out-of-court dispute resolution body in your own country. For cross-border complaints within the EU, the European Consumer Centre in your country can help.`,
      ],
    },
    {
      heading: "17. General",
      paragraphs: [
        "If a court finds part of these terms invalid, the rest still applies. If we don't enforce a right straight away, we haven't given it up. We may transfer the Service and these terms to another company that takes it over, as long as your rights aren't reduced; we'll tell you, and you can end the contract if you don't agree. These terms and the purchase process are available in English and Spanish. The current version is always on this page, and your purchases are recorded on your account page.",
      ],
    },
    {
      heading: "18. Contact",
      paragraphs: [`${E.name} · Reg. no. ${E.regNo} · VAT ${E.vat} · ${E.address} · ${E.email}`],
    },
  ],
};

const termsEs: LegalDoc = {
  title: "Términos del servicio",
  intro: `Estos términos regulan el uso de ${B} (el «Servicio»), operado por ${E.name}, número de registro ${E.regNo}, IVA ${E.vat}, ${E.address.replace("Latvia", "Letonia")} («nosotros»). Cubren todas las partes del Servicio: los regalos, el mapa de Citas y los planes, las reseñas, los juegos y la lista de espera. Al usar el Servicio, crear una cuenta, publicar un regalo o una reseña, o realizar una compra, los aceptas. Nuestra Política de privacidad explica cómo tratamos los datos personales. Si no estás de acuerdo, por favor no uses el Servicio.`,
  sections: [
    {
      heading: "1. Qué es el Servicio",
      paragraphs: [
        `${B} te permite crear una página web personalizada y animada (un «regalo») a partir de una plantilla, añadir tus fotos, música, vídeo y palabras, y compartirla mediante un enlace o un código QR. Ahora mismo hay dos plantillas gratuitas. Las demás, y extras de pago como canciones reales, vídeo, mensajes de voz, más de 10 fotos, la programación, una contraseña o quitar el pie, se desbloquean con un pago único.`,
        "El Servicio incluye además herramientas gratuitas para parejas: un mapa de ideas y sitios para citas (Citas), planes que puedes compartir, herramientas para parejas a distancia, reseñas de sitios y juegos para dos en el navegador. Apuntarte a la lista de espera de nuestra futura suscripción para parejas no cuesta nada ni te compromete a nada.",
        "Los regalos son páginas web. Funcionan en las versiones actuales de los navegadores habituales de móvil y ordenador y necesitan conexión a internet. Algunas plantillas usan sonido y, si quien las ve lo permite, el micrófono (por ejemplo, para «soplar» las velas) o los sensores de movimiento.",
      ],
    },
    {
      heading: "2. Quién puede usar el Servicio y tu cuenta",
      paragraphs: [
        "El Servicio es para uso personal y no comercial. Debes tener al menos 16 años para crear una cuenta, publicar una reseña o comprar, y si tienes menos de 18 necesitas el permiso de tu madre, tu padre o tu tutor para comprar. El Servicio no está dirigido a menores.",
        "Puedes iniciar sesión con un enlace o un código que te enviamos por correo, o con Google (o Apple, cuando esté disponible). También puedes pagar sin iniciar sesión: en ese caso creamos tu cuenta con el correo que indiques al pagar y añadimos la compra a ella, así que asegúrate de que el correo es correcto. Si ya existe una cuenta con ese correo, la compra va a esa cuenta.",
        "Las cuentas son personales. Protege el acceso a tu correo y avísanos de inmediato si crees que otra persona ha usado tu cuenta. Eres responsable de todo lo que se publique desde tu cuenta, incluido lo que publique cualquier persona a la que dejes usarla.",
      ],
    },
    {
      heading: "3. Tu contenido",
      paragraphs: [
        "Conservas todos los derechos que tengas sobre las fotos, el vídeo, el audio, las grabaciones de voz y los textos que añadas a un regalo o a una reseña («Tu Contenido»). Nos concedes una licencia mundial, no exclusiva y gratuita para alojar, almacenar, copiar, redimensionar, recodificar, mostrar y transmitir Tu Contenido solo en la medida necesaria para prestar el Servicio: para mostrar un regalo a quienes tengan su enlace, para mostrártelo en tu panel y para publicar tus reseñas (sección 10). La licencia termina cuando borras el contenido o tu cuenta, salvo por las copias de seguridad rutinarias, hasta que caduquen.",
        "Confirmas que eres titular de Tu Contenido o tienes permiso para usarlo, incluida cualquier música que subas, y que no vulnera los derechos de autor ni otros derechos de nadie, ni su privacidad. Si Tu Contenido muestra o menciona a otras personas, eres responsable de contar con su permiso, y no debes incluir más datos suyos de los que necesita un regalo personal.",
        "La música de biblioteca del editor es nuestra y solo puede usarse dentro de los regalos creados en el Servicio. Las «canciones reales» son avances de 30 segundos que proporciona Apple, y los enlaces a canciones llevan a YouTube, Spotify o Apple Music: pertenecen a sus titulares, se reproducen desde esos servicios según sus condiciones y pueden dejar de funcionar si el proveedor los retira.",
        "El asistente de escritura opcional usa un modelo de IA para proponerte borradores a partir de los datos que le das. Los borradores pueden ser incorrectos o inadecuados, así que léelos antes de usarlos. Lo que publiques es Tu Contenido y es responsabilidad tuya.",
      ],
    },
    {
      heading: "4. Uso aceptable",
      paragraphs: [
        "No uses el Servicio para publicar ni enviar nada ilegal, difamatorio, acosador, amenazante o de odio; material sexualmente explícito; nada que sexualice o ponga en peligro a menores; contenido que infrinja la propiedad intelectual o la privacidad de alguien, incluidas fotos o datos personales de otras personas compartidos sin su permiso; ni nada pensado para engañar, como páginas de phishing, estafas o spam disfrazados de regalo.",
        "No intentes romper, sobrecargar, extraer datos de forma masiva ni hacer ingeniería inversa del Servicio; saltarte el pago, los límites de uso o la seguridad; publicar reseñas o reacciones de forma automatizada; ni acceder a regalos, salas de juego, cuentas o datos que no son tuyos. Los códigos de las salas de juego son cortos, así que cualquiera que tenga uno puede intentar entrar: no los compartas en público.",
        "Si se incumplen estas normas, podemos retirar contenido, limitar funciones, suspender o cerrar cuentas y comunicar el contenido ilegal a las autoridades cuando la ley lo exija o lo permita. La sección 11 explica cómo lo hacemos y cómo puedes impugnar una decisión.",
      ],
    },
    {
      heading: "5. Regalos: enlaces, programación, reacciones y almacenamiento",
      paragraphs: [
        "Cualquiera que tenga el enlace de un regalo publicado puede abrirlo. Los enlaces son difíciles de adivinar, pero no secretos: trátalos como una carta privada que entregas en mano. Cuando se comparte un enlace en una app de mensajería o en una red social, la vista previa puede mostrar el título del regalo o el nombre del destinatario.",
        "Con un desbloqueo puedes añadir una contraseña, que el destinatario necesitará para abrir el regalo, o programarlo: hasta la hora que elijas, el enlace muestra una pantalla de espera con tu nombre y la hora de apertura. Puedes editar un regalo publicado y los cambios aparecen en el mismo enlace. Puedes borrar un regalo en cualquier momento: el enlace deja de funcionar al instante y se eliminan sus archivos.",
        "Los destinatarios no necesitan cuenta. Pueden enviar una reacción al remitente: un emoji y, si quieren, una nota breve y un mensaje de voz de hasta 20 segundos. Las reacciones solo las ve el remitente del regalo, que además recibe por correo el emoji y la nota. Las reacciones deben respetar la sección 4.",
        "Los borradores guardados en tu cuenta que no se editan durante 7 días se borran automáticamente, junto con sus archivos. El Servicio no es un servicio de almacenamiento ni de copias de seguridad: guarda tus propias copias de las fotos, los vídeos y las palabras que te importan.",
        "Nuestro objetivo es que los enlaces funcionen indefinidamente, pero no podemos prometer disponibilidad ininterrumpida. Podemos retirar un regalo si incumple estos términos o la ley, si lo borras, si se cierra tu cuenta o si se reembolsa o se revierte el pago que lo desbloqueó (sección 8). Si alguna vez dejamos de ofrecer el Servicio, avisaremos por correo a los titulares de cuentas con al menos 90 días de antelación.",
      ],
    },
    {
      heading: "6. Compra de desbloqueos: precios y pago",
      paragraphs: [
        "Vendemos desbloqueos de pago único: una plantilla, tres plantillas a tu elección o «Todo», que incluye todas las plantillas de regalo, también las que añadamos más adelante, mientras ofrezcamos plantillas de regalo. Cada desbloqueo cubre las plantillas indicadas, con todos sus extras de pago y sin el pie. No hay suscripciones ni renovaciones automáticas, y «Todo» no incluye otros productos que podamos vender por separado.",
        "Un desbloqueo no caduca: permanece en tu cuenta mientras exista tu cuenta y mantengamos el Servicio. Es personal e intransferible.",
        "Los precios se muestran en nuestra web antes de pagar. Para los consumidores son precios finales, con el IVA incluido cuando corresponde. Cobramos en euros, o en tu moneda cuando nuestra web muestra el precio en ella. Si pagas en otra moneda, Stripe puede convertir el precio al pagar, a su propio tipo de cambio y quizá con una comisión de conversión: el importe que aparece en la página de pago de Stripe, antes de confirmar, es el que pagas. Tu banco puede cobrar sus propias comisiones por pagos en moneda extranjera. Si alguna vez te cobramos más que el precio que te mostramos en la misma moneda, te devolveremos la diferencia.",
        "Cómo funciona una compra: eliges un desbloqueo en nuestra web y pasas a la página de pago de Stripe (Stripe Checkout), donde ves el importe final y puedes revisar o corregir tus datos, o volver atrás, antes de pagar. El contrato se celebra cuando Stripe confirma el pago, y añadimos el desbloqueo a tu cuenta en ese mismo momento. Te enviamos por correo una confirmación de lo que has desbloqueado, Stripe puede enviarte su propio recibo y tus compras aparecen en la página de tu cuenta. Los pagos los procesa Stripe; nunca vemos ni guardamos los datos completos de tu tarjeta. El cargo aparece en tu extracto con «ETHOS» en la descripción.",
        "Los códigos promocionales se introducen en la página de pago de Stripe. Cada código está sujeto a las condiciones que lo acompañan (por ejemplo, una fecha de caducidad o un límite de usos) y no puede canjearse por dinero.",
      ],
    },
    {
      heading: "7. Tu derecho de desistimiento (consumidores de la UE y del Reino Unido)",
      paragraphs: [
        "Si eres consumidor en la UE o en el Reino Unido, por lo general tienes derecho a desistir de una compra en un plazo de 14 días desde el día en que la hiciste, sin dar ninguna explicación.",
        "Los desbloqueos son contenido digital que suministramos en cuanto se confirma el pago. Tu derecho de desistimiento termina al empezar el suministro solo si se cumple todo lo siguiente: antes de pagar, aceptaste expresamente que empezáramos a suministrar el desbloqueo de inmediato, dentro de los 14 días; reconociste que por ello perderías tu derecho de desistimiento; y te lo confirmamos por escrito, por ejemplo en el correo de confirmación de la compra. En ese caso no puedes desistir una vez que el desbloqueo está en tu cuenta, pero conservas tus derechos si es defectuoso (sección 8).",
        "Así lo pedimos: en el pago, la línea situada justo encima del botón Pagar dice que, al pagar, pides que tu compra se desbloquee al instante y que, una vez desbloqueada, pierdes el derecho de desistimiento de 14 días. Pagar después de leerla es tu consentimiento y tu reconocimiento, y el correo con el recibo lo confirma.",
        `En los demás casos, conservas el derecho a desistir durante 14 días. Para ejercerlo, comunícanoslo de forma clara antes de que terminen los 14 días, por ejemplo escribiendo a ${E.email} con el correo con el que pagaste y lo que compraste. Puedes usar este modelo de formulario, aunque no es obligatorio: «A la atención de ${E.name}, ${E.address.replace("Latvia", "Letonia")}, ${E.email}: por la presente le comunico que desisto de mi contrato de suministro del siguiente contenido digital: [el desbloqueo]. Comprado el: [fecha]. Nombre: [ ]. Correo usado en la compra: [ ]. Fecha: [ ].»`,
        "Te devolveremos todo lo que pagaste en un plazo de 14 días desde que recibamos tu comunicación, con el mismo medio de pago y sin ningún coste para ti, y retiraremos el desbloqueo de tu cuenta; la sección 8 explica qué pasa entonces con los regalos que lo usan.",
      ],
    },
    {
      heading: "8. Defectos, reembolsos y contracargos",
      paragraphs: [
        `Si un desbloqueo o un regalo no funciona como se describe, tienes los derechos legales que corresponden al contenido y los servicios digitales: que se ponga en conformidad o, si no podemos hacerlo en un plazo razonable, una reducción del precio o el reembolso. Escríbenos a ${E.email}.`,
        "Además de esos derechos, reembolsamos una compra duplicada (por ejemplo, si se te cobró dos veces o compraste un desbloqueo que tu cuenta ya tenía) y una compra cuyo regalo no se abre o no se reproduce bien en el dispositivo del destinatario cuando no podemos arreglarlo, siempre que nos avises en los 30 días siguientes a la compra. Fuera de esos casos y de la sección 7, no reembolsamos un cambio de opinión.",
        "Los reembolsos se hacen a través de Stripe al medio de pago que usaste; cuándo aparecen depende de tu banco.",
        "Cuando un pago se reembolsa, o tu banco lo revierte (un contracargo), se retira de tu cuenta el desbloqueo que pagaba. Los regalos que lo necesitan se despublican y vuelven a tus borradores, donde se aplica la regla de los 7 días de la sección 5, y los que solo pagaban por quitar el pie vuelven a mostrarlo. Si un contracargo se resuelve a nuestro favor, escríbenos y restableceremos el desbloqueo. Contacta con nosotros antes de impugnar un pago: normalmente podemos solucionarlo antes.",
      ],
    },
    {
      heading: "9. Citas, planes y sitios",
      paragraphs: [
        "Citas, los planes y las herramientas a distancia son gratuitos y sirven solo como información e inspiración. La información de los sitios procede de OpenStreetMap (teselas del mapa de OpenFreeMap, detalles de Nominatim y Overpass); la previsión y la hora de la puesta de sol, de Open-Meteo; y las fotografías, de Wikimedia Commons, con el crédito de sus autores. La elaboran otros y puede estar incompleta, desactualizada o equivocada, sobre todo en cuanto a horarios, precios, accesibilidad y si un sitio sigue abierto.",
        "Consulta siempre con el local antes de ir y usa tu propio criterio en cuanto a seguridad, tiempo, desplazamientos y normas locales. No gestionamos, inspeccionamos ni avalamos ningún local, no hacemos reservas y no somos parte de nada que acuerdes con un local o con otra persona. En la medida en que la ley lo permita, no respondemos de los locales, sus servicios, eventos o reservas, ni de lo que ocurra en una cita.",
        "Los enlaces de un sitio (cómo llegar, fotos y reseñas, Tripadvisor, Google, Yelp, la web del local) abren otros servicios sujetos a sus propias condiciones. Cuando mostramos una valoración de Tripadvisor o de Google, es suya, se muestra con su nombre y un enlace a la fuente, y no la controlamos ni la comprobamos.",
        "Cómo se ordenan los sitios: por nuestra «puntuación para citas», que tiene en cuenta la distancia al punto buscado, el tipo de sitio y su cocina, lo completa que está su ficha en el mapa (por ejemplo, si indica web u horario), si es una cadena o solo para llevar, las estrellas que le han dado las parejas en el Servicio (ponderadas para que unas pocas reseñas no pesen demasiado) y si existe una fotografía real del sitio. También puedes ordenar por valoración, distancia o precio. Nadie paga por la posición de un sitio.",
      ],
    },
    {
      heading: "10. Reseñas",
      paragraphs: [
        "Si has iniciado sesión, puedes reseñar un sitio: estrellas, lo que costó para dos, la ocasión y un texto breve. Puedes publicar una reseña por sitio y editarla o borrarla cuando quieras. Las reseñas son públicas: cualquiera puede leerlas, junto con tu nombre de pila (o «Alguien» si tu perfil no tiene nombre).",
        "Normas de las reseñas: escribe solo sobre sitios en los que hayas estado, con honestidad y desde tu propia experiencia. Nada de difamación ni de afirmaciones falsas sobre un local o una persona; nada de insultos, odio o acoso; ningún dato personal de otras personas, como nombres del personal o datos de contacto; nada de publicidad ni autopromoción; ninguna reseña de tu propio negocio o de la competencia, ni reseñas a cambio de dinero, descuentos u otras ventajas; nada ilegal.",
        "No comprobamos que quien reseña haya visitado el sitio. Para que las reseñas sean auténticas exigimos una cuenta, permitimos una reseña por persona y sitio, limitamos la frecuencia de publicación y retiramos las reseñas que resulten falsas. Los enlaces y los números de teléfono se eliminan automáticamente del texto, y el texto escrito en mayúsculas se pasa a minúsculas. Todas las reseñas publicadas cuentan para la valoración de un sitio; no pagamos por reseñas ni las retiramos por ser negativas.",
        "Al publicar una reseña nos concedes una licencia mundial, no exclusiva y gratuita para publicarla con tu nombre de pila en el Servicio y contarla en valoraciones y clasificaciones mientras siga publicada. Podemos retirar o limitar una reseña que incumpla estas normas o la ley. Cualquiera puede denunciar una reseña (sección 11).",
      ],
    },
    {
      heading: "11. Denuncia de contenido ilegal y cómo moderamos",
      paragraphs: [
        `Punto de contacto. Nuestro punto único de contacto según el Reglamento de Servicios Digitales de la UE, tanto para usuarios como para las autoridades, la Comisión Europea y la Junta Europea de Servicios Digitales, es ${E.email}. Puedes escribirnos en inglés, español o letón.`,
        `Cómo denunciar contenido. Si crees que un regalo, una reseña, una reacción o cualquier otro contenido del Servicio es ilegal o incumple estos términos, escribe a ${E.email} indicando: el enlace al regalo, o al sitio y la reseña en cuestión; por qué crees que es ilegal o incumple nuestras normas; tu nombre y tu correo (no hacen falta si denuncias material de abuso sexual infantil); y una declaración de que crees de buena fe que tu denuncia es exacta y completa. Los titulares de derechos pueden enviar por la misma vía sus avisos sobre derechos de autor.`,
        "Qué pasa después. Te confirmamos que hemos recibido la denuncia, revisamos el contenido sin demoras indebidas, con diligencia y objetividad, y te comunicamos lo que hemos decidido y cómo puedes impugnarlo. Las decisiones las toma una persona, no un sistema automatizado. Si un contenido hace pensar que la vida o la seguridad de alguien corre peligro, avisamos a las autoridades.",
        "Si actuamos sobre tu contenido o tu cuenta. No revisamos los regalos ni las reseñas antes de que se publiquen y no tenemos una obligación general de supervisarlos. Si retiramos o limitamos tu contenido, o suspendemos o cerramos tu cuenta, te diremos (si tenemos tu correo) qué hemos hecho y durante cuánto tiempo, por qué (la ley o la norma de estos términos), si fue a raíz de una denuncia y cómo puedes impugnarlo, salvo que la ley nos lo impida.",
        `Cómo impugnar una decisión. En un plazo de seis meses puedes pedirnos que revisemos cualquier decisión de moderación, tanto si publicaste el contenido como si lo denunciaste, respondiendo a nuestro mensaje o escribiendo a ${E.email}. Lo volveremos a estudiar, lo corregiremos si nos equivocamos y te diremos el resultado. También puedes acudir a los tribunales. Podemos dejar de tramitar las denuncias de quien envíe repetidamente denuncias manifiestamente infundadas y suspender las cuentas que publiquen repetidamente contenido manifiestamente ilegal.`,
      ],
    },
    {
      heading: "12. Nuestra propiedad intelectual",
      paragraphs: [
        `El Servicio, sus plantillas, animaciones, código, diseño, marca, ilustraciones y música de biblioteca pertenecen a ${E.name} o a sus licenciantes. Publicar un regalo no te da ninguna propiedad sobre una plantilla. No puedes copiar plantillas ni revender o sublicenciar el acceso al Servicio. El pie «${BRAND.watermark.es}» de los regalos gratuitos solo puede quitarse desbloqueando la plantilla.`,
        "Los datos del mapa son © colaboradores de OpenStreetMap y están disponibles bajo la Open Database License; las fotografías de los sitios pertenecen a sus autores y se usan con las licencias que las acompañan.",
      ],
    },
    {
      heading: "13. Fin de la relación",
      paragraphs: [
        "Puedes borrar regalos concretos en cualquier momento, y tu cuenta desde la página de tu cuenta. Al eliminar tu cuenta se borran de inmediato tus regalos, archivos, reacciones, reseñas y desbloqueos (las copias de seguridad caducan en un plazo de 30 días), y no se puede deshacer. Los desbloqueos no se reembolsan al eliminar la cuenta, salvo en los casos de las secciones 7 y 8.",
        "Podemos suspender o cerrar una cuenta que incumpla estos términos o la ley de forma grave o reiterada, o cuando sea necesario para proteger el Servicio o a otras personas. Cuando sea razonable te avisaremos antes, y te explicaremos el motivo como se indica en la sección 11.",
      ],
    },
    {
      heading: "14. Garantías y responsabilidad",
      paragraphs: [
        "Prestamos el Servicio con una diligencia y un cuidado razonables, y lo que pagas se corresponderá con su descripción. Aparte de eso y de tus derechos legales, no damos otras garantías: en particular, no garantizamos que el Servicio esté siempre disponible o sin errores, y las partes gratuitas del Servicio se ofrecen tal cual.",
        "Nada en estos términos excluye ni limita nuestra responsabilidad por muerte o daños personales causados por nuestra negligencia, por fraude, por daños causados de forma intencionada o por negligencia grave, por tus derechos legales como consumidor ni por nada que no pueda excluirse o limitarse según la ley que te sea aplicable.",
        "Con esa salvedad, no respondemos de pérdidas que no fueran razonablemente previsibles cuando usaste el Servicio, de pérdidas empresariales (el Servicio es para uso personal) ni de pérdidas que podrías haber evitado razonablemente, por ejemplo guardando copias de tus propias fotos y textos. Para cualquier otra reclamación relacionada con el Servicio, nuestra responsabilidad total frente a ti se limita a 100 € o al importe que nos hayas pagado en los 12 meses anteriores a la reclamación, lo que sea mayor.",
      ],
    },
    {
      heading: "15. Cambios en el Servicio y en estos términos",
      paragraphs: [
        "Podemos cambiar, añadir o retirar plantillas y funciones por motivos válidos, como la seguridad, requisitos legales, el mantenimiento del Servicio o su mejora. Cuando mejoramos una plantilla, los regalos creados con ella muestran la versión mejorada. Si retiramos una plantilla, dejamos de ofrecerla para regalos nuevos, y los regalos ya publicados con ella siguen funcionando. Si un cambio afecta de forma no menor a tu acceso o al uso de algo que has pagado, te avisaremos con antelación y podrás resolver el contrato sobre ello sin coste en un plazo de 30 días y recibir un reembolso proporcional.",
        "Podemos actualizar estos términos. Avisaremos por correo a los titulares de cuentas de los cambios relevantes con al menos 14 días de antelación; si no estás de acuerdo, puedes dejar de usar el Servicio y eliminar tu cuenta antes de esa fecha. Si sigues usando el Servicio después, se aplicarán los nuevos términos. Los cambios nunca te quitan derechos que ya tengas por compras realizadas.",
      ],
    },
    {
      heading: "16. Ley aplicable, reclamaciones y conflictos",
      paragraphs: [
        "Estos términos se rigen por las leyes de la República de Letonia. Si eres consumidor, esto no te priva de la protección de las normas imperativas del país en el que resides. Puedes presentar una reclamación ante los tribunales de Letonia o del país en el que resides, y nosotros solo podemos demandarte ante los tribunales del país en el que resides. Si no eres consumidor, los tribunales de Letonia tienen competencia exclusiva.",
        `Si algo va mal, escríbenos primero a ${E.email}: intentamos responder en un plazo de 14 días. Si no conseguimos resolver tu reclamación, puedes dirigirte al Centro de Protección de los Derechos del Consumidor de Letonia (Patērētāju tiesību aizsardzības centrs, PTAC, ptac.gov.lv) o a la autoridad de consumo o al organismo de resolución extrajudicial de conflictos de tu país. Para reclamaciones transfronterizas dentro de la UE, puede ayudarte el Centro Europeo del Consumidor de tu país.`,
      ],
    },
    {
      heading: "17. Disposiciones generales",
      paragraphs: [
        "Si un tribunal declara nula una parte de estos términos, el resto sigue siendo válido. Si no ejercemos un derecho de inmediato, no renunciamos a él. Podemos transferir el Servicio y estos términos a otra empresa que se haga cargo de él, siempre que no se reduzcan tus derechos; te lo comunicaremos y podrás resolver el contrato si no estás de acuerdo. Estos términos y el proceso de compra están disponibles en inglés y en español. La versión vigente está siempre en esta página, y tus compras quedan registradas en la página de tu cuenta.",
      ],
    },
    {
      heading: "18. Contacto",
      paragraphs: [`${E.name} · N.º de registro ${E.regNo} · IVA ${E.vat} · ${E.address.replace("Latvia", "Letonia")} · ${E.email}`],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  intro: `${E.name} (“we”), registration number ${E.regNo}, ${E.address}, is the controller of the personal data processed through ${B}: the website, gifts, the Dates map and plans, reviews, games, the waitlist and our emails. This policy explains what we collect, why, who else is involved, how long we keep it, and your rights under the General Data Protection Regulation (GDPR). Questions and requests: ${E.email}.`,
  sections: [
    {
      heading: "1. Data from people who make gifts or buy",
      paragraphs: [
        "Account data: your email address; your name, if your Google or Apple account shares it; your language; your sign-in history, including the time and IP address of sign-ins; and, if you sign in with Google or Apple, the identifier and basic profile details (such as your name and a link to your profile picture) that they share.",
        "Gift content: the names, title, message, photos and captions, music you choose or upload, voice messages, video clips, song links, dates, places and other details you add, plus the gift's settings; a password is stored only as a secure hash. Photos are resized and re-encoded on your device before upload, which removes their metadata, such as where they were taken. Video and audio files are uploaded as they are, so any metadata they contain stays in them.",
        "Drafts: while you edit, your draft is kept in your browser's storage on your device and, if you're signed in, saved to your account, where photos upload as soon as you add them.",
        "Purchase data: what you bought, when, the amount and currency, the payment status, the link that brought you to us (such as a gift you received or one of our posts), and Stripe's identifiers for the transaction. Stripe collects your payment details and email address; your card details go straight to Stripe and we never receive them.",
        "Searches and helpers: when you search for a song, our servers send your search words to Apple's iTunes Search; when you paste a song link, they ask YouTube or Spotify for its title and cover. If you use “Help me write it”, what you type into it, with the occasion and the names on the gift, is sent to Anthropic to write the drafts; we don't store it.",
        "Emails: we send service emails only: sign-in links and codes, a welcome message, purchase confirmations, and notices when your gift is published or scheduled, is opened for the first time, unlocks or receives a reaction. We don't send marketing emails.",
      ],
    },
    {
      heading: "2. Data about people who open a gift",
      paragraphs: [
        "When a gift is opened, we record a pseudonymous visitor code, the type of device (iPhone or iPad, Android, computer or other), the time, and how much of the gift was watched, so the sender can see it arrived. The code is a one-way hash of your IP address and browser details together with the gift and the date; we don't store your IP address with it. Your browser keeps a note for 24 hours so that reloading doesn't count as a new open.",
        "If you send a reaction, the emoji, note and voice message you choose to send are stored and shown only to the sender, who also receives the emoji and the note by email. If a gift has a password, your browser keeps it, encrypted, in a cookie for up to a year so you don't have to type it again. We don't ask recipients for their name or email address.",
        "Some templates ask to use your microphone (for example to “blow out” candles) or your phone's motion sensors. That input is analysed on your device only; it isn't recorded or sent to us. If a gift includes a real song or a song link, your browser loads the song preview or its cover directly from Apple, YouTube or Spotify, which receive your IP address; tapping the link opens that service under its own privacy policy.",
      ],
    },
    {
      heading: "3. Dates, maps, plans and long distance",
      paragraphs: [
        "The Dates pages, plans and long-distance tools work without an account. To show places near you we need a location: a town you type, which our servers look up with Photon (run by komoot); the rough, city-level location our hosting provider works out from your connection, which we use only to open the map on your city and don't store; or, only if you press “Near me” and your browser agrees, your device's position. Your browser rounds a position to a grid of about a hundred metres before anything is sent to our servers. We don't store positions or link them to you, although, like any request, they can appear briefly in our host's technical logs. A search made with “Near me” is never written into the page's address. Your browser remembers the last area you searched, on your device only.",
        "The map is drawn from OpenFreeMap: your browser downloads map tiles directly from tiles.openfreemap.org, which therefore receives your IP address, as any website you visit does. Photographs of places load directly from Wikimedia's servers, which also receive your IP address. To find places and show a place's details, the forecast or a town's name, our servers ask OpenFreeMap, Nominatim (run by the OpenStreetMap Foundation), public Overpass servers, Open-Meteo, Photon and Wikimedia (Wikipedia, Wikidata and Commons) and, where we have turned them on, Tripadvisor and Google for their ratings. Those requests carry only rounded coordinates, a place's name or the text you searched for, never your name, your IP address or anything about your device.",
        "A plan you build is kept in your browser's local storage and is never sent to us. When you share it, the plan travels inside the link itself, in the part after the “#”, which browsers don't send to servers: whoever has the link can read the plan, and we can't. Treat the link like the invitation it is. Links you follow from a place (directions, photos and reviews, Tripadvisor, Google, Yelp, a venue's website) open other services under their own privacy policies.",
      ],
    },
    {
      heading: "4. Reviews",
      paragraphs: [
        "If you post a review, we store the place (its OpenStreetMap ID, name and position), your stars, cost, occasion and text, the language and the dates, linked to your account. Reviews are public: anyone can read them, with your first name (from your profile, for example from Google) or “Somebody”. The public review record also includes a random account ID, which shows which reviews came from the same account but not who you are; we never show your email address. You can edit or delete a review at any time, and deleting your account deletes your reviews.",
      ],
    },
    {
      heading: "5. Games",
      paragraphs: [
        "Two-phone games use a room: a live channel on Supabase's realtime service, named after the room code. The names you enter, who is in the room, and the moves and drawings pass through Supabase's servers to the other phone in real time; they are not stored in our database, and the room disappears when both players leave. The names you enter are shown to the other player and remembered on your device for next time, and a random player ID is kept in your browser tab. In Memory, the photos you pick stay in your browser and are never uploaded. One-phone games run entirely on your device.",
      ],
    },
    {
      heading: "6. The waitlist",
      paragraphs: [
        `If you join the waitlist for our planned couples' subscription, we store your email address, your language and when you joined. We use it only to send you one email when the subscription launches. You can ask to be removed at any time by writing to ${E.email}.`,
      ],
    },
    {
      heading: "7. Analytics, error reports and logs",
      paragraphs: [
        "On every page, including gift pages, we use Vercel Web Analytics and Speed Insights to count visits and measure how fast pages load. They don't use cookies. They record things such as the page, the referring site, the approximate country, and the type of browser, device and operating system. Before anything is sent, gift links are shortened to “/g/[shortId]” and query strings are removed, except the ones that say where a visit came from (“ref” and “utm_”).",
        "Microsoft Clarity (heatmaps and session recordings) runs only if you accept cookies in our banner, and never on gift pages, checkout, the dashboard or the account page. It records how you use our other pages, including the editor: clicks, taps, scrolling, mouse movements and what appears on screen. In the editor, what you type and upload is masked in these recordings, so the gift you're writing isn't captured. It uses cookies and is told not to use advertising storage. You can withdraw your consent at any time with “Stop cookies” in the footer: we then stop Clarity and delete its cookies.",
        "If something breaks in your browser, the page reports the error to our own server: the error message and a code, the page path (with no query string, and with gift links shortened), the template and your browser's user agent. It goes into our hosting logs and nowhere else.",
        "Like any website, our host logs technical details of each request, such as IP address, browser, the address requested and the time, to run and secure the Service. To prevent abuse, we also count requests from each IP address (or, for the writing helper, each account) for up to an hour.",
      ],
    },
    {
      heading: "8. Why we use data, and our legal bases",
      paragraphs: [
        "To provide what you ask for (accounts and sign-in; creating, hosting and delivering gifts; passing reactions and view statistics to senders; purchases; service emails; reviews; game rooms; the writing helper; the Dates features): performance of our contract with you (Art. 6(1)(b) GDPR). Where we have no contract with you, for example when you open a gift someone sent you, our legitimate interest, and the sender's, in delivering the gift and its reactions (Art. 6(1)(f)).",
        "To keep the Service secure and working, prevent fraud and abuse, keep reviews genuine, enforce our terms, fix errors, measure use with cookieless analytics and establish or defend legal claims: our legitimate interests (Art. 6(1)(f)). You can object to this (section 13).",
        "Microsoft Clarity and the waitlist: your consent (Art. 6(1)(a)), which you can withdraw at any time; withdrawing doesn't affect what happened before.",
        "To meet legal obligations, such as accounting and tax rules, and to handle reports and orders under the Digital Services Act: Art. 6(1)(c).",
      ],
    },
    {
      heading: "9. Who we share data with",
      paragraphs: [
        "Service providers that process data for us under data-processing agreements: Vercel (hosting, content delivery, logs, cookieless analytics and the approximate location of your connection); Supabase (database, sign-in, file storage and game rooms; our project is hosted in the EU, in Ireland); Stripe (payments); Resend (sending our emails); Microsoft (Clarity, only with your consent); and Anthropic (the writing helper, only when you use it).",
        "Companies that act as independent controllers under their own privacy policies: Stripe, for its own fraud-prevention and legal duties; Google or Apple, if you sign in with them; and the map, data and media services named in sections 1 to 3, which receive your IP address when your browser loads something directly from them (map tiles, photographs, song previews and covers). Our servers send them no personal data.",
        "We don't sell or rent personal data, and we don't use it for advertising. We disclose data to authorities only where the law requires it. If the Service or our company passes to a new owner, your data may go with it, under this policy.",
      ],
    },
    {
      heading: "10. Transfers outside the EEA",
      paragraphs: [
        "Some of these providers are based in the United States or may access data from outside the European Economic Area. Where they do, the transfer is covered by the EU–US Data Privacy Framework, for providers certified under it, or by the European Commission's Standard Contractual Clauses. You can ask us for details.",
      ],
    },
    {
      heading: "11. How long we keep data",
      paragraphs: [
        "Your account: until you delete it. Drafts saved to your account: deleted automatically after 7 days without edits. Uploaded files that no gift uses: deleted after 24 hours; once a gift has been opened, older versions of its files that it no longer uses are deleted too.",
        "Published and scheduled gifts, their files, view records and reactions: until you delete the gift or your account. Deleting removes the files from storage and the records from our database straight away; copies in routine backups expire within 30 days.",
        "Reviews: until you delete them or your account. Waitlist: until we've sent the launch email (then deleted within three months), until you ask us to remove you, or at most 24 months after you joined if the subscription hasn't launched.",
        "Purchases: your purchase history is deleted from our database with your account, but payment, invoice and accounting records are kept for as long as accounting and tax law requires (generally five years in Latvia, and up to ten years for VAT records).",
        "Logs and security: rate-limit counters, up to 1 hour; hosting logs and error reports, up to 30 days; sign-in and security records, up to 12 months. Microsoft keeps Clarity data for the periods it sets, currently up to 13 months. Data stored in your browser (section 12) stays until it expires or you clear it.",
      ],
    },
    {
      heading: "12. Cookies and similar technologies",
      paragraphs: [
        "Necessary cookies, which don't need consent: the sign-in cookies set by Supabase (sb-…-auth-token), which keep you signed in until you sign out or the session ends; auth_next, which remembers where to take you after signing in (10 minutes); ETHOS_LOCALE, which remembers your language (1 year); and ethos_gift_…, which remembers, encrypted, a gift password you entered (1 year, only on that gift's page).",
        "Browser storage on your device that makes features work: your cookie choice (ethos-analytics-consent); editor drafts and their media; your last Dates search area and your plan; game names and a player ID; a 24-hour note of gifts you've opened; and a short-lived note when you reply to a gift you received. None of this is sent to us by itself.",
        "Analytics cookies, only with your consent: Microsoft Clarity's cookies (_clck and _clsk) and a session-storage entry. We don't use advertising cookies. Stripe's checkout pages and Google's or Apple's sign-in pages set their own cookies on their own sites. You can change your choice at any time with “Allow cookies” or “Stop cookies” in the footer.",
      ],
    },
    {
      heading: "13. Your rights",
      paragraphs: [
        `You have the right to access your data and get a copy, to have it corrected or erased, to restrict its use, to data portability, to object to processing based on our legitimate interests, and to withdraw consent at any time. Your account page lets you download your data (account, gifts, purchases, unlocks, views and reactions, as a JSON file) and delete your account; for anything else, including your reviews and the waitlist, write to ${E.email}.`,
        "We answer within one month, or within three months for complex requests, in which case we'll tell you why. It's free, and we may ask you to confirm your identity first. We don't make decisions about you based solely on automated processing that have legal or similarly significant effects.",
        "You can complain to the Latvian Data State Inspectorate (Datu valsts inspekcija, dvi.gov.lv) or to the supervisory authority where you live or work, for example the Spanish Data Protection Agency (AEPD, aepd.es). We'd welcome the chance to help first.",
        "Recipients who want a reaction or view record removed can write to us with the gift link; we'll remove it and tell the sender it was withdrawn. If a gift or review contains information about you that you want taken down, you can also report it as section 11 of our Terms of Service explains.",
      ],
    },
    {
      heading: "14. Children",
      paragraphs: [
        "The Service isn't directed at children. You must be at least 16 to create an account, post a review or buy, and we don't knowingly collect data from younger children; if we learn that an account belongs to someone under 16, we delete it. Photos and names of children may appear in gifts made by their family: the sender is responsible for having the right to share them, should include only what the gift needs, and should leave out anything that could identify or locate a child to strangers, such as a school or an address. Remember that anyone with the link can open a gift.",
      ],
    },
    {
      heading: "15. Security",
      paragraphs: [
        "Data is encrypted in transit and at rest. Uploaded files live in private storage and are served through signed links that expire, and gift passwords are stored only as secure hashes. Access to production systems is limited to people who need it and protected with multi-factor authentication. No system is perfectly secure: if a breach puts your data at risk, we'll act at once and inform you and the authorities as the law requires.",
      ],
    },
    {
      heading: "16. Changes and contact",
      paragraphs: [`We'll post updates here and email account holders about material changes. Contact: ${E.name}, ${E.address}, ${E.email}.`],
    },
  ],
};

const privacyEs: LegalDoc = {
  title: "Política de privacidad",
  intro: `${E.name} («nosotros»), número de registro ${E.regNo}, ${E.address.replace("Latvia", "Letonia")}, es el responsable del tratamiento de los datos personales que se recogen a través de ${B}: la web, los regalos, el mapa de Citas y los planes, las reseñas, los juegos, la lista de espera y nuestros correos. Esta política explica qué recogemos, para qué, quién más interviene, cuánto tiempo lo conservamos y los derechos que tienes según el Reglamento General de Protección de Datos (RGPD). Preguntas y solicitudes: ${E.email}.`,
  sections: [
    {
      heading: "1. Datos de quienes crean regalos o compran",
      paragraphs: [
        "Datos de cuenta: tu correo electrónico; tu nombre, si tu cuenta de Google o Apple lo comparte; tu idioma; tu historial de inicios de sesión, con la hora y la dirección IP; y, si inicias sesión con Google o Apple, el identificador y los datos básicos de perfil (como tu nombre y el enlace a tu foto de perfil) que compartan.",
        "Contenido del regalo: los nombres, el título, el mensaje, las fotos y sus pies, la música que eliges o subes, los mensajes de voz, los vídeos, los enlaces a canciones, las fechas, los lugares y demás datos que añades, además de los ajustes del regalo; la contraseña se guarda solo como hash seguro. Las fotos se redimensionan y recodifican en tu dispositivo antes de subirse, lo que elimina sus metadatos, como el lugar donde se hicieron. Los archivos de vídeo y audio se suben tal cual, así que conservan los metadatos que contengan.",
        "Borradores: mientras editas, el borrador se guarda en el almacenamiento de tu navegador, en tu dispositivo, y, si has iniciado sesión, en tu cuenta, donde las fotos se suben en cuanto las añades.",
        "Datos de compra: qué compraste, cuándo, el importe y la moneda, el estado del pago, el enlace por el que llegaste (por ejemplo, un regalo que recibiste o una de nuestras publicaciones) y los identificadores de Stripe de la transacción. Stripe recoge tus datos de pago y tu correo; los datos de tu tarjeta van directamente a Stripe y nunca los recibimos.",
        "Búsquedas y asistentes: cuando buscas una canción, nuestros servidores envían las palabras que buscas a iTunes Search, de Apple; cuando pegas el enlace de una canción, piden a YouTube o Spotify su título y su portada. Si usas «Ayúdame a escribirlo», lo que escribes en ese diálogo, junto con la ocasión y los nombres del regalo, se envía a Anthropic para redactar los borradores; nosotros no lo guardamos.",
        "Correos: solo enviamos correos del servicio: enlaces y códigos de acceso, un mensaje de bienvenida, confirmaciones de compra y avisos cuando tu regalo se publica o se programa, se abre por primera vez, se desbloquea o recibe una reacción. No enviamos correos comerciales.",
      ],
    },
    {
      heading: "2. Datos de quienes abren un regalo",
      paragraphs: [
        "Cuando se abre un regalo registramos un código de visitante seudonimizado, el tipo de dispositivo (iPhone o iPad, Android, ordenador u otro), la hora y cuánto se vio del regalo, para que el remitente sepa que ha llegado. El código es un hash unidireccional de tu dirección IP y los datos de tu navegador junto con el regalo y la fecha; no guardamos tu dirección IP con él. Tu navegador guarda una nota durante 24 horas para que recargar la página no cuente como una nueva apertura.",
        "Si envías una reacción, el emoji, la nota y el mensaje de voz que decidas enviar se guardan y solo los ve el remitente, que además recibe por correo el emoji y la nota. Si un regalo tiene contraseña, tu navegador la guarda cifrada en una cookie hasta un año para que no tengas que volver a escribirla. No pedimos a los destinatarios su nombre ni su correo.",
        "Algunas plantillas piden usar el micrófono (por ejemplo, para «soplar» las velas) o los sensores de movimiento del móvil. Esa información se analiza solo en tu dispositivo; no se graba ni se nos envía. Si un regalo incluye una canción real o el enlace a una canción, tu navegador carga el avance o la portada directamente desde Apple, YouTube o Spotify, que reciben tu dirección IP; al tocar el enlace se abre ese servicio, sujeto a su propia política de privacidad.",
      ],
    },
    {
      heading: "3. Citas, mapas, planes y distancia",
      paragraphs: [
        "Las páginas de Citas, los planes y las herramientas a distancia funcionan sin cuenta. Para mostrarte sitios cerca necesitamos una ubicación: una ciudad que escribas, que nuestros servidores buscan con Photon (de komoot); la ubicación aproximada, a nivel de ciudad, que nuestro proveedor de alojamiento deduce de tu conexión, que solo usamos para abrir el mapa en tu ciudad y no guardamos; o, únicamente si pulsas «Cerca de mí» y tu navegador lo permite, la posición de tu dispositivo. Tu navegador redondea la posición a una cuadrícula de unos cien metros antes de enviar nada a nuestros servidores. No guardamos posiciones ni las vinculamos a ti, aunque, como cualquier petición, pueden aparecer brevemente en los registros técnicos de nuestro proveedor de alojamiento. Una búsqueda hecha con «Cerca de mí» nunca se escribe en la dirección de la página. Tu navegador recuerda la última zona que buscaste, solo en tu dispositivo.",
        "El mapa se dibuja con OpenFreeMap: tu navegador descarga las teselas directamente de tiles.openfreemap.org, que por tanto recibe tu dirección IP, como cualquier web que visitas. Las fotografías de los sitios se cargan directamente desde los servidores de Wikimedia, que también reciben tu dirección IP. Para encontrar sitios y mostrar sus detalles, la previsión del tiempo o el nombre de una ciudad, nuestros servidores consultan OpenFreeMap, Nominatim (de la Fundación OpenStreetMap), los servidores públicos de Overpass, Open-Meteo, Photon y Wikimedia (Wikipedia, Wikidata y Commons) y, cuando los hemos activado, Tripadvisor y Google para sus valoraciones. Esas peticiones solo llevan coordenadas redondeadas, el nombre de un sitio o el texto que has buscado, nunca tu nombre, tu dirección IP ni nada sobre tu dispositivo.",
        "El plan que montas se guarda en el almacenamiento local de tu navegador y nunca se nos envía. Cuando lo compartes, el plan viaja dentro del propio enlace, en la parte que va después de «#», que los navegadores no envían a los servidores: quien tenga el enlace puede leer el plan, y nosotros no. Trata el enlace como la invitación que es. Los enlaces que sigas desde un sitio (cómo llegar, fotos y reseñas, Tripadvisor, Google, Yelp, la web del local) abren otros servicios con sus propias políticas de privacidad.",
      ],
    },
    {
      heading: "4. Reseñas",
      paragraphs: [
        "Si publicas una reseña, guardamos el sitio (su identificador de OpenStreetMap, su nombre y su posición), tus estrellas, el precio, la ocasión y el texto, el idioma y las fechas, vinculados a tu cuenta. Las reseñas son públicas: cualquiera puede leerlas, con tu nombre de pila (tomado de tu perfil, por ejemplo de Google) o «Alguien». El registro público de la reseña incluye además un identificador de cuenta aleatorio, que permite ver qué reseñas proceden de la misma cuenta, pero no quién eres; nunca mostramos tu correo. Puedes editar o borrar una reseña en cualquier momento, y al eliminar tu cuenta se borran tus reseñas.",
      ],
    },
    {
      heading: "5. Juegos",
      paragraphs: [
        "Los juegos para dos móviles usan una sala: un canal en directo del servicio en tiempo real de Supabase, con el nombre del código de la sala. Los nombres que escribes, quién está en la sala y las jugadas y los dibujos pasan por los servidores de Supabase hasta el otro móvil en tiempo real; no se guardan en nuestra base de datos, y la sala desaparece cuando se van los dos jugadores. Los nombres que escribes se muestran al otro jugador y se recuerdan en tu dispositivo para la próxima vez, y en la pestaña del navegador se guarda un identificador de jugador aleatorio. En Memory, las fotos que eliges se quedan en tu navegador y nunca se suben. Los juegos de un solo móvil funcionan por completo en tu dispositivo.",
      ],
    },
    {
      heading: "6. La lista de espera",
      paragraphs: [
        `Si te apuntas a la lista de espera de nuestra futura suscripción para parejas, guardamos tu correo, tu idioma y cuándo te apuntaste. Solo lo usamos para enviarte un correo cuando se lance la suscripción. Puedes pedirnos que te borremos en cualquier momento escribiendo a ${E.email}.`,
      ],
    },
    {
      heading: "7. Analítica, informes de errores y registros",
      paragraphs: [
        "En todas las páginas, también en las de los regalos, usamos Vercel Web Analytics y Speed Insights para contar visitas y medir la velocidad de carga. No usan cookies. Registran datos como la página, la web de procedencia, el país aproximado y el tipo de navegador, dispositivo y sistema operativo. Antes de enviar nada, los enlaces de los regalos se acortan a «/g/[shortId]» y se eliminan los parámetros de la dirección, salvo los que indican de dónde viene la visita («ref» y «utm_»).",
        "Microsoft Clarity (mapas de calor y grabaciones de sesión) solo funciona si aceptas las cookies en nuestro aviso, y nunca en las páginas de los regalos, el pago, el panel ni la página de tu cuenta. Registra cómo usas nuestras demás páginas, incluido el editor: clics, toques, desplazamientos, movimientos del ratón y lo que aparece en pantalla. En el editor, lo que escribes y subes queda oculto en esas grabaciones, así que el regalo que estás escribiendo no se captura. Usa cookies y está configurado para no usar almacenamiento publicitario. Puedes retirar tu consentimiento en cualquier momento con «Quitar cookies» en el pie de página: entonces detenemos Clarity y borramos sus cookies.",
        "Si algo falla en tu navegador, la página informa del error a nuestro propio servidor: el mensaje de error y un código, la ruta de la página (sin parámetros y con los enlaces de los regalos acortados), la plantilla y el agente de usuario de tu navegador. Va a los registros de nuestro alojamiento y a ningún otro sitio.",
        "Como cualquier web, nuestro proveedor de alojamiento registra datos técnicos de cada petición, como la dirección IP, el navegador, la dirección solicitada y la hora, para prestar el Servicio y protegerlo. Para evitar abusos, además contamos las peticiones de cada dirección IP (o, en el asistente de escritura, de cada cuenta) durante un máximo de una hora.",
      ],
    },
    {
      heading: "8. Para qué usamos los datos y con qué base legal",
      paragraphs: [
        "Para darte lo que pides (cuentas e inicio de sesión; crear, alojar y entregar regalos; hacer llegar las reacciones y las estadísticas de visualización a los remitentes; compras; correos del servicio; reseñas; salas de juego; el asistente de escritura; las funciones de Citas): la ejecución de nuestro contrato contigo (art. 6.1.b RGPD). Cuando no tenemos un contrato contigo, por ejemplo cuando abres un regalo que te han enviado, nuestro interés legítimo, y el del remitente, en entregar el regalo y sus reacciones (art. 6.1.f).",
        "Para mantener el Servicio seguro y en funcionamiento, prevenir el fraude y los abusos, que las reseñas sean auténticas, hacer cumplir nuestros términos, corregir errores, medir el uso con analítica sin cookies y formular o defender reclamaciones: nuestros intereses legítimos (art. 6.1.f). Puedes oponerte (sección 13).",
        "Microsoft Clarity y la lista de espera: tu consentimiento (art. 6.1.a), que puedes retirar en cualquier momento; retirarlo no afecta a lo ya hecho.",
        "Para cumplir obligaciones legales, como las normas contables y fiscales, y tramitar denuncias y órdenes según el Reglamento de Servicios Digitales: art. 6.1.c.",
      ],
    },
    {
      heading: "9. Con quién compartimos los datos",
      paragraphs: [
        "Proveedores que tratan datos por encargo nuestro, con contratos de encargo del tratamiento: Vercel (alojamiento, distribución de contenidos, registros, analítica sin cookies y ubicación aproximada de tu conexión); Supabase (base de datos, inicio de sesión, almacenamiento de archivos y salas de juego; nuestro proyecto está alojado en la UE, en Irlanda); Stripe (pagos); Resend (envío de nuestros correos); Microsoft (Clarity, solo con tu consentimiento); y Anthropic (el asistente de escritura, solo cuando lo usas).",
        "Empresas que actúan como responsables independientes, con sus propias políticas de privacidad: Stripe, para sus propias obligaciones legales y de prevención del fraude; Google o Apple, si inicias sesión con ellos; y los servicios de mapas, datos y contenidos mencionados en las secciones 1 a 3, que reciben tu dirección IP cuando tu navegador carga algo directamente de ellos (teselas del mapa, fotografías, avances y portadas de canciones). Nuestros servidores no les envían datos personales.",
        "No vendemos ni alquilamos datos personales, ni los usamos para publicidad. Solo comunicamos datos a las autoridades cuando la ley lo exige. Si el Servicio o nuestra empresa pasan a otro titular, tus datos pueden transmitirse con ellos, sujetos a esta política.",
      ],
    },
    {
      heading: "10. Transferencias fuera del EEE",
      paragraphs: [
        "Algunos de estos proveedores tienen su sede en Estados Unidos o pueden acceder a los datos desde fuera del Espacio Económico Europeo. En ese caso, la transferencia se ampara en el Marco de Privacidad de Datos UE-EE. UU., para los proveedores adheridos a él, o en las cláusulas contractuales tipo de la Comisión Europea. Puedes pedirnos más información.",
      ],
    },
    {
      heading: "11. Cuánto tiempo conservamos los datos",
      paragraphs: [
        "Tu cuenta: hasta que la eliminas. Borradores guardados en tu cuenta: se borran automáticamente tras 7 días sin editarse. Archivos subidos que ningún regalo usa: se borran a las 24 horas; cuando un regalo ya se ha abierto, también se borran las versiones anteriores de sus archivos que ya no usa.",
        "Regalos publicados y programados, sus archivos, los registros de visualización y las reacciones: hasta que borras el regalo o tu cuenta. Al borrarlos, los archivos se eliminan del almacenamiento y los registros de nuestra base de datos en ese momento; las copias de seguridad rutinarias caducan en un plazo de 30 días.",
        "Reseñas: hasta que las borras o eliminas tu cuenta. Lista de espera: hasta que enviemos el correo del lanzamiento (después la borramos en un plazo de tres meses), hasta que nos pidas que te borremos o, como máximo, 24 meses después de apuntarte si la suscripción no se ha lanzado.",
        "Compras: tu historial de compras se borra de nuestra base de datos al eliminar tu cuenta, pero los registros de pagos, facturas y contabilidad se conservan durante el tiempo que exige la normativa contable y fiscal (en general, cinco años en Letonia y hasta diez años para los registros del IVA).",
        "Registros y seguridad: contadores de límite de uso, hasta 1 hora; registros del alojamiento e informes de errores, hasta 30 días; registros de inicio de sesión y de seguridad, hasta 12 meses. Microsoft conserva los datos de Clarity durante los plazos que fija, actualmente hasta 13 meses. Lo que se guarda en tu navegador (sección 12) permanece hasta que caduca o lo borras.",
      ],
    },
    {
      heading: "12. Cookies y tecnologías similares",
      paragraphs: [
        "Cookies necesarias, que no requieren consentimiento: las cookies de sesión de Supabase (sb-…-auth-token), que mantienen tu sesión iniciada hasta que la cierras o caduca; auth_next, que recuerda adónde llevarte después de iniciar sesión (10 minutos); ETHOS_LOCALE, que recuerda tu idioma (1 año); y ethos_gift_…, que recuerda, cifrada, la contraseña de un regalo que has introducido (1 año, solo en la página de ese regalo).",
        "Almacenamiento del navegador, en tu dispositivo, que hace funcionar el Servicio: tu elección sobre cookies (ethos-analytics-consent); los borradores del editor y sus archivos; tu última zona de búsqueda en Citas y tu plan; los nombres de los juegos y un identificador de jugador; una nota de 24 horas de los regalos que has abierto; y una nota breve cuando respondes a un regalo que has recibido. Nada de esto se nos envía por sí solo.",
        "Cookies analíticas, solo con tu consentimiento: las cookies de Microsoft Clarity (_clck y _clsk) y una entrada en el almacenamiento de sesión. No usamos cookies publicitarias. Las páginas de pago de Stripe y las de inicio de sesión de Google o Apple instalan sus propias cookies en sus propios sitios. Puedes cambiar tu elección en cualquier momento con «Aceptar cookies» o «Quitar cookies» en el pie de página.",
      ],
    },
    {
      heading: "13. Tus derechos",
      paragraphs: [
        `Tienes derecho a acceder a tus datos y obtener una copia, a rectificarlos o suprimirlos, a limitar su tratamiento, a la portabilidad, a oponerte al tratamiento basado en nuestros intereses legítimos y a retirar tu consentimiento en cualquier momento. En la página de tu cuenta puedes descargar tus datos (cuenta, regalos, compras, desbloqueos, visualizaciones y reacciones, en un archivo JSON) y eliminar tu cuenta; para todo lo demás, incluidas tus reseñas y la lista de espera, escribe a ${E.email}.`,
        "Respondemos en el plazo de un mes, o de tres meses en solicitudes complejas, en cuyo caso te explicaremos por qué. Es gratuito, y puede que antes te pidamos que confirmes tu identidad. No tomamos decisiones sobre ti basadas únicamente en tratamientos automatizados que produzcan efectos jurídicos o te afecten de forma similarmente significativa.",
        "Puedes presentar una reclamación ante la Inspección Estatal de Datos de Letonia (Datu valsts inspekcija, dvi.gov.lv) o ante la autoridad de control del lugar donde vives o trabajas, como la Agencia Española de Protección de Datos (AEPD, aepd.es). Nos gustaría tener antes la oportunidad de ayudarte.",
        "Los destinatarios que quieran que se elimine una reacción o un registro de visualización pueden escribirnos con el enlace del regalo; lo eliminaremos e informaremos al remitente de que se ha retirado. Si un regalo o una reseña contiene información sobre ti que quieres que se retire, también puedes denunciarlo como explica la sección 11 de nuestros Términos del servicio.",
      ],
    },
    {
      heading: "14. Menores",
      paragraphs: [
        "El Servicio no está dirigido a menores. Debes tener al menos 16 años para crear una cuenta, publicar una reseña o comprar, y no recogemos a sabiendas datos de menores de esa edad; si sabemos que una cuenta pertenece a alguien menor de 16 años, la eliminamos. En los regalos que hace su familia pueden aparecer fotos y nombres de menores: el remitente es responsable de tener derecho a compartirlos, debe incluir solo lo que el regalo necesita y evitar cualquier dato que permita a desconocidos identificar o localizar a un menor, como su colegio o su dirección. Recuerda que cualquiera que tenga el enlace puede abrir un regalo.",
      ],
    },
    {
      heading: "15. Seguridad",
      paragraphs: [
        "Los datos se cifran en tránsito y en reposo. Los archivos subidos se guardan en almacenamiento privado y se sirven mediante enlaces firmados que caducan, y las contraseñas de los regalos se guardan solo como hashes seguros. El acceso a los sistemas de producción está limitado a quienes lo necesitan y protegido con autenticación multifactor. Ningún sistema es perfectamente seguro: si una brecha pone en riesgo tus datos, actuaremos de inmediato y te informaremos a ti y a las autoridades como exige la ley.",
      ],
    },
    {
      heading: "16. Cambios y contacto",
      paragraphs: [`Publicaremos las actualizaciones aquí y avisaremos por correo a los titulares de cuentas de los cambios relevantes. Contacto: ${E.name}, ${E.address.replace("Latvia", "Letonia")}, ${E.email}.`],
    },
  ],
};

export const LEGAL_DOCS: Record<"terms" | "privacy", Record<GiftLocale, LegalDoc>> = {
  terms: { en: termsEn, es: termsEs },
  privacy: { en: privacyEn, es: privacyEs },
};

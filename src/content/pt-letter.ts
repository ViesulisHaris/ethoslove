import type { Currency } from "@/lib/pricing/products";
import { noteForEveryone } from "@/lib/gift/free-tier";

/**
 * The Letter, told in Brazilian Portuguese: one page at /pt/carta-digital.
 *
 * Why it exists (20 Nov 2026): visitors already arrive from Brazil, and when ChatGPT is asked in
 * Portuguese for a site to make a "carta digital" it names only makers that have a Portuguese page
 * (LovePaper, Love Cards, Afetim, Lovly); Ethos had none in any language but English and Spanish.
 * Brazil searches "carta virtual" 6,600 times a month, "carta digital" and "cartinha digital"
 * 1,600 each, "carta online para namorado" 390 (DataForSEO, 20 Nov 2026).
 *
 * It is one page, not a third language: the editor and the gift's few fixed words stay in English
 * or Spanish, and the page says so. Every fact about what is free comes from the template's own
 * guide (messages `templates.guide.faqFreeAShort`, `faqOpenA`, `faqEditA`), restated here;
 * tests/unit/pt-letter.test.ts holds the numbers to the code's.
 */
export const PT_LETTER_PATH = "/pt/carta-digital";
export const PT_LETTER_UPDATED = "2026-11-20";
export const PT_LETTER_LANG = "pt-BR";

/** How long a free note may be, said on the page (lib/gift/free-tier.ts FREE_NOTE_MAX_CHARS). */
export const PT_FREE_CHARS = 500;

/** The currency a price is charged in, by name, for "o seu banco converte". */
const CURRENCY_NAME: Record<Currency, string> = { eur: "euros", usd: "dólares americanos", gbp: "libras esterlinas" };

export type PtLetterCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaMake: string;
  ctaDemo: string;
  languageNote: string;
  spanishEditor: string;
  posterAlt: string;
  steps: { heading: string; items: { title: string; body: string }[] };
  pricing: { heading: string; free: string; paid: string; once: string };
  lines: { heading: string; intro: string; items: { when: string; line: string }[] };
  faq: { heading: string; items: { q: string; a: string }[] };
  more: { heading: string; body: string; link: string; about: string };
};

/** `price` is “Make it special” in the visitor's currency, from the catalogue; `currency` names it. */
export function ptLetterCopy({ price, currency }: { price: string; currency: Currency }): PtLetterCopy {
  // What is free follows the free-note setting (lib/gift/free-tier.ts): the short note on the live site, the whole letter with photos when it is off.
  const note = noteForEveryone();
  const paidFor = note
    ? "fotos, uma carta mais longa, um vídeo, uma mensagem de voz e agendamento para abrir na hora certa, sem o rodapé"
    : "um vídeo, uma mensagem de voz, até 20 fotos e agendamento para abrir na hora certa, sem o rodapé";
  return {
    metaTitle: "Carta digital de amor: crie sua carta virtual com música",
    metaDescription: `Carta virtual que abre como uma de verdade: lacre de cera, suas palavras e a música de vocês, enviada por link. ${note ? "Grátis como bilhete curto." : "Grátis, com fotos."}`,
    eyebrow: "Carta digital",
    title: "Carta digital de amor que abre como uma carta de verdade",
    subtitle:
      "A pessoa toca no lacre de cera, o envelope se abre e as suas palavras aparecem escritas à mão, com a música que você escolheu. Você monta em poucos minutos e envia por link ou QR code.",
    ctaMake: "Criar minha carta",
    ctaDemo: "Ver uma carta pronta",
    languageNote: "O editor está em inglês. A sua carta vai na língua em que você escrever.",
    spanishEditor: "Prefere o editor em espanhol?",
    posterAlt: "Carta digital do Ethos: um envelope com lacre de cera sobre uma mesa à luz de vela",
    steps: {
      heading: "Como fazer uma carta virtual",
      items: [
        {
          title: "Escreva",
          body: "Coloque o nome de quem vai receber e o que um cartão nunca tem espaço para dizer: uma lembrança, uma piada que só vocês entendem, o que você contaria sobre a pessoa a um desconhecido.",
        },
        {
          title: "Escolha a música",
          body: "Uma faixa da biblioteca do Ethos, ou a música de verdade de vocês: trinta segundos dela ficam esperando no final, a um toque.",
        },
        {
          title: "Envie",
          body: "Publique e mande o link pelo WhatsApp, pelo Instagram ou por e-mail, ou imprima o QR code e coloque dentro de um cartão de papel. Abre no navegador de qualquer celular ou computador, sem instalar nada.",
        },
      ],
    },
    pricing: {
      heading: "O que é grátis e o que é pago",
      free: note
        ? `Grátis: um bilhete de até ${PT_FREE_CHARS} caracteres, com música e um pequeno rodapé “Made with Ethos”.`
        : "Grátis: a carta inteira, até 10 fotos e música, com um pequeno rodapé “Made with Ethos”.",
      paid: `Com “Make it special”, por ${price}, pago uma única vez: ${paidFor}.`,
      once: `Não é assinatura. Você paga uma vez por presente, na página de pagamento do Stripe; a cobrança é feita em ${CURRENCY_NAME[currency]} e o seu banco converte para a sua moeda.`,
    },
    lines: {
      heading: "O que escrever na carta",
      intro: "Seis começos para pegar emprestado e terminar do seu jeito.",
      items: [
        { when: "Aniversário de namoro", line: "Um ano depois, eu ainda fico sem graça quando você me olha daquele jeito." },
        { when: "Namoro à distância", line: "Hoje a saudade chegou antes do café. Abre esta carta como se eu estivesse aí do seu lado." },
        { when: "Pedido de desculpas", line: "Eu quis ganhar a discussão mais do que quis ser gentil. Desculpa. Você importa mais do que ter razão." },
        { when: "Sem data nenhuma", line: "Não é dia de nada. Eu só lembrei de você no mercado e achei que você devia saber." },
        { when: "Aniversário", line: "Feliz aniversário para a pessoa que deixa qualquer lugar com cara de casa." },
        { when: "Para a mãe", line: "Mãe, eu demorei para entender tudo o que você fez em silêncio: cada marmita, cada carona, cada “leva um casaco”." },
      ],
    },
    faq: {
      heading: "Perguntas sobre a carta digital",
      items: [
        {
          q: "A carta digital é grátis?",
          a: note
            ? `Sim, como um bilhete curto: até ${PT_FREE_CHARS} caracteres, com música e um pequeno rodapé “Made with Ethos”. Com “Make it special”, por ${price}, pago uma única vez, vêm ${paidFor}.`
            : `Sim: a carta inteira, até 10 fotos e música, com um pequeno rodapé “Made with Ethos”. Com “Make it special”, por ${price}, pago uma única vez, vêm ${paidFor}.`,
        },
        {
          q: "Como a pessoa abre a carta?",
          a: "Pelo link que você envia no WhatsApp, no Instagram, no iMessage ou por e-mail, ou escaneando o QR code com a câmera do celular. Abre no navegador de qualquer celular ou computador: sem aplicativo para instalar e sem cadastro.",
        },
        {
          q: "Posso escrever em português?",
          a: "Pode. A carta vai exatamente como você escrever. Por enquanto o editor e os poucos textos fixos do presente, como o convite para tocar no lacre, aparecem em inglês; quem preferir pode usar o editor em espanhol.",
        },
        {
          q: "Dá para mudar a carta depois de enviar?",
          a: "Dá. Edite quando quiser e a mudança aparece no mesmo link. Os links não expiram: a carta abre de novo no ano que vem.",
        },
        {
          q: "É seguro pagar?",
          a: "O pagamento é feito na página do Stripe, com cartão, Apple Pay ou Google Pay; o Ethos nunca vê nem guarda os dados completos do seu cartão. Quem faz o Ethos é a SIA “MIGLAI”, uma empresa registrada na Letônia, na União Europeia.",
        },
      ],
    },
    more: {
      heading: "Outros presentes digitais",
      body: "Além da carta, há um buquê montado flor por flor, um álbum de recortes, um pote de motivos e jogos sobre vocês dois. Essas páginas estão em inglês e em espanhol.",
      link: "Ver todos os modelos",
      about: "Quem faz o Ethos",
    },
  };
}

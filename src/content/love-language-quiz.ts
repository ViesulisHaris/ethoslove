import type { GiftLocale } from "@/lib/gift/schema";
import type { LoveLanguage } from "@/lib/love-quiz/score";

/**
 * The love language quiz: people search "love language test" (90,500 a month in the US), "love
 * language quiz" (49,500) and "test lenguajes del amor" (docs/marketing/KEYWORDS.md). Thirty
 * choices, each between two things that feel like love; the arithmetic is in lib/love-quiz/score.ts.
 *
 * The five love languages are Gary Chapman's idea ("The 5 Love Languages", 1992, a registered
 * trademark): the page credits the book and claims no tie to him. Every question here is ours;
 * none may be copied or paraphrased from the official quiz. The free quiz is the whole thing; what
 * it leads to is a gift that speaks their language (LANGUAGE_GIFTS). Every claim about a template
 * matches its schema and Template.tsx.
 */
export const LOVE_QUIZ_PATH = "/tools/love-language-quiz";

/** The template that speaks each language. */
export const LANGUAGE_GIFTS: Record<LoveLanguage, string> = {
  words: "the-letter",
  time: "picnic",
  gifts: "bouquet",
  service: "scratch-card",
  touch: "xoxo",
};

/** Posts for each language: words, time, gifts, service, and reasons for the rest. */
export const LOVE_QUIZ_READING = ["reasons-why-i-love-you", "cute-things-to-say-to-your-boyfriend", "virtual-date-ideas-long-distance", "what-to-get-a-boyfriend-who-wants-nothing", "scratch-card-ideas"] as const;

type Side = { lang: LoveLanguage; en: string; es: string };
export type QuizQuestion = { prompt: { en: string; es: string }; a: Side; b: Side };

/**
 * In this order on screen. Every pair of languages appears three times, each language comes first
 * six times, and no two questions in a row share a pair (tests/unit/love-quiz.test.ts). Spanish is
 * Spain's, and never genders the person answering or their partner.
 */
export const QUESTIONS: readonly QuizQuestion[] = [
  {
    prompt: { en: "You've had a rough week. What helps more?", es: "Has tenido una semana dura. ¿Qué te ayuda más?" },
    a: { lang: "words", en: "They tell you, in so many words, what they admire about how you handled it.", es: "Que te diga, con todas las letras, lo que admira de cómo lo has llevado." },
    b: { lang: "time", en: "They clear their evening, and you do nothing much, together.", es: "Que se deje la tarde libre y la paséis sin hacer gran cosa, los dos." },
  },
  {
    prompt: { en: "They're back from a trip. What do you hope for at the door?", es: "Vuelve de un viaje. ¿Qué esperas en la puerta?" },
    a: { lang: "gifts", en: "Something from the airport that made them think of you.", es: "Algo del aeropuerto que le hizo pensar en ti." },
    b: { lang: "touch", en: "A hug that goes on a bit too long.", es: "Un abrazo que dura un poco más de la cuenta." },
  },
  {
    prompt: { en: "A busy morning. Which would make your day?", es: "Una mañana de locos. ¿Qué te alegraría el día?" },
    a: { lang: "service", en: "Your lunch packed and your keys waiting by the door.", es: "La comida preparada y las llaves esperándote junto a la puerta." },
    b: { lang: "words", en: "A voice message for the commute: three things they love about you.", es: "Un audio para el camino al trabajo: tres cosas que le encantan de ti." },
  },
  {
    prompt: { en: "It's your birthday. Which would mean more?", es: "Es tu cumpleaños. ¿Qué significaría más?" },
    a: { lang: "time", en: "A whole day planned around the two of you, phones in a drawer.", es: "Un día entero pensado para los dos, con los móviles en un cajón." },
    b: { lang: "gifts", en: "A present that's exactly the thing you mentioned once, in passing.", es: "Un regalo que es justo eso que mencionaste una vez, de pasada." },
  },
  {
    prompt: { en: "A long day for both of you. What do you want now?", es: "Un día larguísimo para los dos. ¿Qué te apetece ahora?" },
    a: { lang: "touch", en: "To fall asleep on the sofa with your head on their shoulder.", es: "Dormirte en el sofá con la cabeza sobre su hombro." },
    b: { lang: "service", en: "For them to make dinner so you don't have to.", es: "Que haga la cena para que tú no tengas que hacerla." },
  },
  {
    prompt: { en: "After an argument, what puts it right?", es: "Después de una discusión, ¿qué lo arregla?" },
    a: { lang: "words", en: "They say sorry first, out loud, even though it's awkward.", es: "Que dé el primer paso y pida perdón en voz alta, aunque cueste." },
    b: { lang: "gifts", en: "They come home with your favorite thing from the bakery.", es: "Que vuelva a casa con tu dulce favorito de la panadería." },
  },
  {
    prompt: { en: "Saturday's free. Which sounds better?", es: "El sábado está libre. ¿Qué suena mejor?" },
    a: { lang: "time", en: "A long walk somewhere new, just talking.", es: "Un paseo largo por un sitio nuevo, solo hablando." },
    b: { lang: "service", en: "They wash your car and fill it up while you sleep in.", es: "Que te lave el coche y le ponga gasolina mientras duermes hasta tarde." },
  },
  {
    prompt: { en: "Which would you keep forever?", es: "¿Qué guardarías para siempre?" },
    a: { lang: "gifts", en: "The keyring they bought you on your first trip together.", es: "El llavero que te compró en vuestro primer viaje." },
    b: { lang: "words", en: "The message they sent the night it all started, which you've never deleted.", es: "El mensaje que te mandó la noche en que empezó todo, y que nunca has borrado." },
  },
  {
    prompt: { en: "A night in. What matters more?", es: "Noche en casa. ¿Qué importa más?" },
    a: { lang: "touch", en: "Being wrapped up together under one blanket.", es: "Compartir manta, muy cerca." },
    b: { lang: "time", en: "That they're actually there with you, not half on their phone.", es: "Que esté contigo de verdad, no a medias con el móvil." },
  },
  {
    prompt: { en: "They want to surprise you. Which would you pick?", es: "Quiere darte una sorpresa. ¿Cuál eliges?" },
    a: { lang: "service", en: "They finally fix the thing you've been putting off for weeks.", es: "Que por fin arregle eso que llevas semanas posponiendo." },
    b: { lang: "gifts", en: "They hide a small present where only you will find it.", es: "Que esconda un regalito donde solo tú lo vayas a encontrar." },
  },
  {
    prompt: { en: "You're nervous before something big. What steadies you?", es: "Tienes nervios antes de algo importante. ¿Qué te calma?" },
    a: { lang: "words", en: "A message: “You've got this, and here's why.”", es: "Un mensaje: «Puedes con esto, y te digo por qué»." },
    b: { lang: "touch", en: "Their hand on the back of your neck before you walk in.", es: "Su mano en tu nuca justo antes de entrar." },
  },
  {
    prompt: { en: "It's an ordinary Tuesday. Which would you rather?", es: "Un martes cualquiera. ¿Qué prefieres?" },
    a: { lang: "gifts", en: "Flowers, for no reason at all.", es: "Flores, sin ningún motivo." },
    b: { lang: "time", en: "They ask you out to dinner tonight, just the two of you.", es: "Que te proponga cenar fuera esta noche, solo los dos." },
  },
  {
    prompt: { en: "You're in bed with a fever. What do you want most?", es: "Estás en la cama con fiebre. ¿Qué quieres más?" },
    a: { lang: "service", en: "Soup on the bedside table before you thought to ask.", es: "Una sopa en la mesilla antes de que se te ocurra pedirla." },
    b: { lang: "touch", en: "Them lying next to you, even if they catch it.", es: "Que se tumbe a tu lado, aunque se contagie." },
  },
  {
    prompt: { en: "You're apart for a week. What gets you through?", es: "Una semana sin veros. ¿Qué te ayuda a llevarla?" },
    a: { lang: "time", en: "A long call every night, even when there's nothing to report.", es: "Una llamada larga cada noche, aunque no haya nada que contar." },
    b: { lang: "words", en: "Messages through the day saying they miss you, and what they miss.", es: "Mensajes a lo largo del día diciendo que te echa de menos, y qué echa de menos." },
  },
  {
    prompt: { en: "Which gesture would stay with you longer?", es: "¿Qué gesto se te quedaría más tiempo?" },
    a: { lang: "gifts", en: "A book with the page folded down at the line that made them think of you.", es: "Un libro con la esquina doblada en la frase que le hizo pensar en ti." },
    b: { lang: "service", en: "Them giving up a Saturday to help you move.", es: "Que dedicara un sábado entero a ayudarte con la mudanza." },
  },
  {
    prompt: { en: "You're out with friends. Which means more?", es: "Estáis con amigos. ¿Qué significa más?" },
    a: { lang: "touch", en: "Their arm around you while everyone talks.", es: "Su brazo rodeándote mientras todos hablan." },
    b: { lang: "words", en: "Hearing them tell everyone how proud they are of you.", es: "Que presuma de ti delante de todos." },
  },
  {
    prompt: { en: "Anniversary dinner. Which part will you remember?", es: "Cena de aniversario. ¿Qué parte recordarás?" },
    a: { lang: "time", en: "The conversation that ran until they started stacking chairs.", es: "La conversación que duró hasta que empezaron a subir las sillas." },
    b: { lang: "touch", en: "Their knee against yours under the table all night.", es: "Su rodilla contra la tuya bajo la mesa toda la noche." },
  },
  {
    prompt: { en: "They have a free afternoon. You'd rather they…", es: "Tiene la tarde libre. Prefieres que…" },
    a: { lang: "service", en: "…did the big grocery run, so the fridge is full for the week.", es: "…haga la compra grande y deje la nevera llena para toda la semana." },
    b: { lang: "time", en: "…came to find you so you could spend it together.", es: "…venga a buscarte para pasarla contigo." },
  },
  {
    prompt: { en: "Which would make you feel most appreciated?", es: "¿Con qué notarías más que te valora?" },
    a: { lang: "words", en: "They thank you, specifically, for something you do that nobody notices.", es: "Que te dé las gracias, en concreto, por algo que haces y nadie ve." },
    b: { lang: "service", en: "They quietly take over something you do that nobody notices.", es: "Que se encargue, sin decir nada, de algo que haces y nadie ve." },
  },
  {
    prompt: { en: "You finally see each other after weeks apart. What do you want?", es: "Por fin os veis después de semanas. ¿Qué quieres?" },
    a: { lang: "touch", en: "Not letting go of each other's hand all day.", es: "No soltaros de la mano en todo el día." },
    b: { lang: "gifts", en: "A present they've been saving for this moment.", es: "Un regalo que ha guardado para este momento." },
  },
  {
    prompt: { en: "Which would you rather get for the holidays?", es: "¿Qué prefieres para estas fiestas?" },
    a: { lang: "time", en: "A promise: every Sunday morning in December belongs to the two of you.", es: "Una promesa: todos los domingos por la mañana de diciembre son para los dos." },
    b: { lang: "gifts", en: "A mug from a flea market that's just so you.", es: "Una taza de un mercadillo que es muy tú." },
  },
  {
    prompt: { en: "Which feels more like being looked after?", es: "¿Qué se parece más a que te cuiden?" },
    a: { lang: "touch", en: "A back rub when your shoulders are up around your ears.", es: "Un masaje en la espalda cuando tienes los hombros en las orejas." },
    b: { lang: "service", en: "They do the laundry so you have clean clothes for the week.", es: "Que ponga la lavadora para que tengas ropa limpia toda la semana." },
  },
  {
    prompt: { en: "Which would you rather find on your phone?", es: "¿Qué preferirías encontrar en tu móvil?" },
    a: { lang: "words", en: "A long message about the moment they knew they loved you.", es: "Un mensaje largo sobre el momento en que supo que te quería." },
    b: { lang: "time", en: "A calendar invite: “Saturday. All day. Us.”", es: "Una invitación en el calendario: «Sábado. Todo el día. Los dos»." },
  },
  {
    prompt: { en: "You've pulled off something big. How do you want it celebrated?", es: "Has conseguido algo importante. ¿Cómo quieres celebrarlo?" },
    a: { lang: "gifts", en: "A present to mark it, wrapped and waiting when you get home.", es: "Con un regalo para celebrarlo, envuelto y esperándote en casa." },
    b: { lang: "words", en: "A toast, in front of everyone, about how hard you worked for it.", es: "Con un brindis, delante de todos, sobre lo mucho que te lo has currado." },
  },
  {
    prompt: { en: "Which would you rather come home to?", es: "¿Con qué prefieres encontrarte al llegar a casa?" },
    a: { lang: "gifts", en: "A wrapped chocolate on your pillow, hotel-style.", es: "Un bombón envuelto sobre la almohada, como en los hoteles." },
    b: { lang: "service", en: "A clean kitchen and the trash already taken out.", es: "La cocina limpia y la basura ya bajada." },
  },
  {
    prompt: { en: "Which would you miss more if it stopped?", es: "¿Qué echarías más de menos si se acabara?" },
    a: { lang: "time", en: "Your one evening a week that's just for the two of you.", es: "Vuestra noche de la semana que es solo para los dos." },
    b: { lang: "touch", en: "The kiss before either of you leaves the house.", es: "El beso antes de que cualquiera de los dos salga de casa." },
  },
  {
    prompt: { en: "After a bad day, what helps first?", es: "Después de un mal día, ¿qué ayuda primero?" },
    a: { lang: "words", en: "They listen, then tell you why you're not the problem.", es: "Que te escuche y después te diga por qué el problema no eres tú." },
    b: { lang: "touch", en: "Being held without having to explain anything.", es: "Que te abrace sin que tengas que explicar nada." },
  },
  {
    prompt: { en: "A vacation's coming up. What do you hope for?", es: "Se acercan unas vacaciones. ¿Qué esperas?" },
    a: { lang: "service", en: "They handle every booking, ticket and transfer, so you don't have to think.", es: "Que se ocupe de cada reserva, billete y traslado para que tú no tengas que pensar." },
    b: { lang: "time", en: "A whole week of them looking at you, not at their inbox.", es: "Una semana entera mirándote a ti, no a su correo." },
  },
  {
    prompt: { en: "Valentine's Day. Which would you rather?", es: "San Valentín. ¿Qué prefieres?" },
    a: { lang: "touch", en: "A slow dance in the kitchen.", es: "Un baile lento en la cocina." },
    b: { lang: "gifts", en: "Something they made or tracked down, just for you.", es: "Algo que hizo o que buscó hasta encontrarlo, solo para ti." },
  },
  {
    prompt: { en: "Which sounds more like love to you?", es: "¿Qué te suena más a amor?" },
    a: { lang: "service", en: "“Don't worry about it. I already did it.”", es: "«No te preocupes. Ya está hecho»." },
    b: { lang: "words", en: "“I'm proud of you. I should say it more.”", es: "«Me encanta cómo eres. Debería decírtelo más»." },
  },
];

/** One language, as the result and the page explain it. */
export type LanguageCopy = {
  name: string;
  /** What it feels like, in one line. */
  line: string;
  body: string;
  /** Small things that land with someone who speaks it. */
  lands: string[];
  /** What misses. */
  misses: string;
  /** The gift that speaks it (LANGUAGE_GIFTS), and why. */
  gift: string;
};

/** The quiz's own words. {name} is the partner's first name or "your partner"; {language} a language's name. */
export type QuizUi = {
  meta: string;
  progress: string;
  back: string;
  startOver: string;
  resumed: string;
  invite: string;
  ownLink: string;
  resultEyebrow: string;
  and: string;
  evenTitle: string;
  evenBody: string;
  sharesNote: string;
  landsTitle: string;
  missesTitle: string;
  shareTitle: string;
  shareBody: string;
  nameLabel: string;
  share: string;
  copy: string;
  copied: string;
  samePhone: string;
  retake: string;
  giftTitle: string;
  see: string;
  make: string;
  allFive: string;
  compareEyebrow: string;
  you: string;
  yourPartner: string;
  firstFor: string;
  forYou: string;
  sameTop: string;
  differentTop: string;
  theirTopYourLast: string;
  yourTopTheirLast: string;
  needsTitle: string;
  yourNeedsTitle: string;
  makeFor: string;
  seeFirst: string;
  sendBack: string;
  sendBackBody: string;
  justMine: string;
  backToCompare: string;
  privacy: string;
  shareText: string;
  compareShareText: string;
};

export type LoveQuizGuide = {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  credit: string;
  languagesTitle: string;
  languagesIntro: string;
  giftsTitle: string;
  giftsIntro: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  readTitle: string;
  languages: Record<LoveLanguage, LanguageCopy>;
  ui: QuizUi;
};

export const LOVE_QUIZ: Record<GiftLocale, LoveQuizGuide> = {
  en: {
    title: "Love Language Quiz: Free Test for Couples, No Email",
    description: "30 quick choices, about 4 minutes, no sign-up. Find your love language and how all five rank, then send the link to your partner and compare.",
    eyebrow: "Free quiz",
    h1: "Love language quiz",
    intro:
      "Thirty quick choices, each between two things that feel like love. You'll get your love language and how all five rank for you. Then send the link to your partner: once they've answered, you'll both see where you match and where you don't.",
    credit:
      "The five love languages come from Gary Chapman's 1992 book The 5 Love Languages. This quiz and its questions are our own, and Ethos isn't connected to Dr. Chapman or his publisher.",
    languagesTitle: "The five love languages, in plain words",
    languagesIntro: "Most people want all five. The quiz shows which one wins when you have to choose.",
    giftsTitle: "A gift in each language",
    giftsIntro: "Once you know theirs, make them something that speaks it. Each of these opens on their phone, with your photos and your words.",
    faqTitle: "Questions",
    faq: [
      {
        q: "What are the five love languages?",
        a: "Words of affirmation, quality time, receiving gifts, acts of service and physical touch: five ways people give and notice love, named by Gary Chapman in his 1992 book. Most people want all five. What differs is which one they reach for first, and which they'd miss most if it stopped.",
      },
      {
        q: "How does this love language quiz work?",
        a: "It asks 30 questions, each a choice between two things that feel like love. Every pair of languages comes up three times, so each language is on offer twelve times, and your score is how often you picked it. The result shows all five as a share of your answers.",
      },
      {
        q: "Is this the official love language quiz?",
        a: "No. The official quiz is on 5lovelanguages.com, the site of Gary Chapman's book. This one is ours: we wrote the questions, it's free, it doesn't ask for an email, and it's made for comparing results with a partner.",
      },
      {
        q: "How do we compare our results as a couple?",
        a: "When you finish, send your partner the link. It opens the quiz for them with your result tucked inside, and when they finish, you both see your five side by side, what each of you needs from the other, and a link to send back. On the same phone? Tap “Your partner's turn, on this phone” instead.",
      },
      {
        q: "Can you have more than one love language?",
        a: "Yes. Ties are common, and most people score something in all five. The quiz names every language that shares the top score, and the bars show how close the others are. If two are only a few percent apart, treat them as a pair.",
      },
      {
        q: "What if our love languages are different?",
        a: "That's the usual case. Chapman's own observation is that people give love the way they'd like to get it. If yours is quality time and theirs is acts of service, your evening plans and the shelf they finally put up are both love; each of you just hears one of them better.",
      },
      {
        q: "Are love languages backed by research?",
        a: "Not much. A 2024 review by relationship scientists Emily Impett, Haeyoung Gideon Park and Amy Muise found little evidence that people have one primary love language, that there are exactly five, or that couples whose languages match are happier. The authors compare love to a balanced diet: people do best with all five. So skip the score and ask each other what would make you feel loved this week.",
      },
      {
        q: "Do you keep my answers?",
        a: "No. Your answers stay in your browser, which remembers them on this device. We count, without knowing who you are, how many people finish and which language comes first. The link you send carries only your five scores and, if you add it, your first name.",
      },
    ],
    readTitle: "More to read",
    languages: {
      words: {
        name: "Words of affirmation",
        line: "You feel loved when it's said out loud, or written down.",
        body: "Hearing it is what makes it real for you: a thank-you that names the actual thing, a “proud of you” you didn't have to fish for, a message that could only be about you. Words land harder the other way too, and one careless line in an argument can stay with you for weeks.",
        lands: ["A compliment that says exactly what, and why", "A note left where you'll find it hours later", "Being praised in front of other people", "Thanks for the effort nobody else noticed"],
        misses: "Silence. Doing everything right and never saying any of it.",
        gift: "The Letter: your words in handwriting, under a wax seal they break with a tap. Free to make.",
      },
      time: {
        name: "Quality time",
        line: "You feel loved when you have someone's whole attention.",
        body: "Twenty minutes with both phones in a drawer beats a whole weekend side by side on separate screens. You can tell when someone is half-listening, and a canceled plan stings more than the plan itself was worth.",
        lands: ["Plans for the two of you, in the calendar and kept", "A question that shows they listened last time", "Phones face down at dinner", "Coming along on an errand, just for the company"],
        misses: "“Mm-hm” from behind a screen. Rescheduling, again.",
        gift: "Picnic: a basket they unpack one tap at a time, each thing tagged with a line from you. Attach a date you've planned on Ethos and it comes out of the basket too.",
      },
      gifts: {
        name: "Receiving gifts",
        line: "You feel loved when something shows they were thinking of you.",
        body: "What counts is the evidence: they saw something, thought of you and carried it home. A ticket stub from the gig you couldn't make, a bar of the chocolate you mentioned once. A forgotten birthday, or a present that could have been for anyone, lands harder on you than on most.",
        lands: ["Something small brought back from any trip", "A present that remembers a passing comment", "Flowers for no occasion", "Wrapping that took effort, even on something tiny"],
        misses: "A forgotten date. A gift card that says nobody gave it much thought.",
        gift: "Bouquet: they watch it come together stem by stem, every flower picked by you, and it never wilts.",
      },
      service: {
        name: "Acts of service",
        line: "You feel loved when someone makes your load lighter.",
        body: "Love, for you, looks like a job done without being asked: the trash taken out, the form filled in, the car booked in for its service. You notice who does what, help that comes with a sigh or a lecture doesn't count, and one job done beats three promised.",
        lands: ["A chore done before you noticed it needed doing", "Taking over the admin you've been dreading", "Breakfast made on a morning you're running late", "“I'll handle it”, and then they do"],
        misses: "Offers of help that never happen. Being left with all of it.",
        gift: "Scratch Card: cards they rub open one by one, each with one of your photos and a line under it. Make every line a job you'll do for them, and save the biggest for the last card.",
      },
      touch: {
        name: "Physical touch",
        line: "You feel loved when someone reaches for you.",
        body: "A hand on your back in a crowd, their head on your shoulder on the train: small, constant contact is how you know things are fine between you. Distance is hardest on you, and so is someone keeping to the far side of the bed after an argument.",
        lands: ["Reaching for your hand without thinking", "A hug that lasts longer than hello", "Sitting close on the sofa, not at opposite ends", "A kiss hello and goodbye, every time"],
        misses: "Being kept at arm's length. Weeks apart with no date to see each other.",
        gift: "XOXO: an envelope sealed with a lipstick kiss, and wherever they tap, another kiss lands. Apart for now? Midnight Countdown counts down to the minute you see each other.",
      },
    },
    ui: {
      meta: "30 questions · about 4 minutes · no email",
      progress: "Question {n} of {total}",
      back: "Back",
      startOver: "Start over",
      resumed: "Picking up where you left off.",
      invite: "{name} has taken the quiz. Answer the same 30 to see where you two match.",
      ownLink: "This is your own link. Send it to your partner, and their result will land next to yours.",
      resultEyebrow: "Your love language",
      and: "and",
      evenTitle: "All five, evenly",
      evenBody: "You picked each language exactly six times. Either you want a little of everything, or you picked the same letter every time, which comes out even by design: take it again and go with your first instinct.",
      sharesNote: "Share of your 30 answers",
      landsTitle: "What lands",
      missesTitle: "What misses",
      shareTitle: "Now find out theirs",
      shareBody: "Send your partner the link. Once they've answered, you'll both see your results side by side.",
      nameLabel: "Your first name, so they know it's you",
      share: "Send to your partner",
      copy: "Copy the link",
      copied: "Link copied",
      samePhone: "Your partner's turn, on this phone",
      retake: "Take it again",
      giftTitle: "The gift that speaks it",
      see: "See it",
      make: "Make one",
      allFive: "What speaks each of the five",
      compareEyebrow: "You and {name}",
      you: "You",
      yourPartner: "your partner",
      firstFor: "First for {name}",
      forYou: "you",
      sameTop: "You both put {language} first. That makes it easy to get right, and just as easy to stop doing once it feels taken care of.",
      differentTop: "Your first choices differ, as most couples' do. People often give love the way they'd like to get it, so each of you may be saying it in the language the other hears less.",
      theirTopYourLast: "First for {name}, last for you: {language}. That's what is most likely to slip, because it's what you'd think of least.",
      yourTopTheirLast: "First for you, last for {name}: {language}. Say so out loud, because it may not occur to them on their own.",
      needsTitle: "What {name} needs from you",
      yourNeedsTitle: "What you need from {name}",
      makeFor: "Make it for {name}",
      seeFirst: "See it first",
      sendBack: "Send this to {name}",
      sendBackBody: "The link opens this comparison for them, with both your results in it.",
      justMine: "Your result on its own",
      backToCompare: "Back to the two of you",
      privacy: "Your answers stay on this device. A link you send carries only your scores and the first name you add.",
      shareText: "I took the love language quiz. Take it and see where we match:",
      compareShareText: "Our love languages, side by side:",
    },
  },
  es: {
    title: "Test de los lenguajes del amor: gratis y en pareja",
    description: "30 elecciones rápidas, unos 4 minutos y sin registro. Descubre tu lenguaje del amor y cómo quedan los cinco, y compáralo con tu pareja con un enlace.",
    eyebrow: "Test gratis",
    h1: "Test de los lenguajes del amor",
    intro:
      "Treinta elecciones rápidas, cada una entre dos cosas que a ti te saben a amor. Verás tu lenguaje del amor y cómo quedan los cinco para ti. Después envía el enlace a tu pareja: en cuanto conteste, veréis los dos en qué coincidís y en qué no.",
    credit:
      "Los cinco lenguajes del amor vienen del libro de Gary Chapman de 1992, Los 5 lenguajes del amor. Este test y sus preguntas son nuestros, y Ethos no tiene relación con el Dr. Chapman ni con su editorial.",
    languagesTitle: "Los cinco lenguajes del amor, sin rodeos",
    languagesIntro: "Casi todo el mundo quiere los cinco. El test muestra cuál gana cuando hay que elegir.",
    giftsTitle: "Un regalo en cada lenguaje",
    giftsIntro: "Cuando sepas el suyo, hazle algo que lo hable. Todos se abren en su móvil, con vuestras fotos y tus palabras.",
    faqTitle: "Preguntas",
    faq: [
      {
        q: "¿Cuáles son los cinco lenguajes del amor?",
        a: "Palabras de afirmación, tiempo de calidad, recibir regalos, actos de servicio y contacto físico: cinco formas de dar y notar el amor que Gary Chapman describió en su libro de 1992. Casi todo el mundo quiere las cinco. Lo que cambia es cuál sale primero y cuál echarías más de menos si desapareciera.",
      },
      {
        q: "¿Cómo funciona este test de los lenguajes del amor?",
        a: "Son 30 preguntas, y cada una es una elección entre dos cosas que a ti te saben a amor. Cada par de lenguajes sale tres veces, así que cada lenguaje aparece doce veces, y tu puntuación son las veces que lo has elegido. El resultado muestra los cinco como porcentaje de tus respuestas.",
      },
      {
        q: "¿Es el test oficial de los lenguajes del amor?",
        a: "No. El test oficial está en 5lovelanguages.com, la web del libro de Gary Chapman. Este es nuestro: escribimos las preguntas, es gratis, no pide correo y está pensado para comparar resultados en pareja.",
      },
      {
        q: "¿Cómo comparamos los resultados en pareja?",
        a: "Al terminar, envía el enlace a tu pareja. Le abre el test con tu resultado dentro, y cuando termine, veréis los dos vuestros cinco lado a lado, lo que cada cual necesita de la otra persona y un enlace para devolvértelo. ¿Estáis con el mismo móvil? Toca «Ahora tu pareja, en este móvil».",
      },
      {
        q: "¿Se puede tener más de un lenguaje del amor?",
        a: "Sí. Los empates son frecuentes, y casi todo el mundo puntúa algo en los cinco. El test nombra todos los lenguajes que comparten la puntuación más alta, y las barras muestran lo cerca que quedan los demás. Si dos están a pocos puntos, tómalos como una pareja.",
      },
      {
        q: "¿Y si nuestros lenguajes del amor son distintos?",
        a: "Es lo normal. El propio Chapman observó que solemos dar amor como nos gustaría recibirlo. Si el tuyo es tiempo de calidad y el suyo actos de servicio, tus planes para la tarde y la estantería que por fin colgó son amor los dos; solo que cada cual oye mejor uno de ellos.",
      },
      {
        q: "¿Tienen base científica los lenguajes del amor?",
        a: "Poca. Una revisión de 2024 de tres especialistas en relaciones de pareja, Emily Impett, Haeyoung Gideon Park y Amy Muise, encontró pocas pruebas de que tengamos un lenguaje del amor principal, de que sean exactamente cinco o de que las parejas cuyos lenguajes coinciden sean más felices. Comparan el amor con una dieta equilibrada: nos va mejor con los cinco. Así que, más que la puntuación, preguntaos qué gesto necesitáis esta semana.",
      },
      {
        q: "¿Guardáis mis respuestas?",
        a: "No. Tus respuestas se quedan en tu navegador, que las recuerda en este dispositivo. Contamos, sin saber quién eres, cuánta gente termina y qué lenguaje sale primero. El enlace que envías lleva solo tus cinco puntuaciones y, si lo añades, tu nombre.",
      },
    ],
    readTitle: "Para seguir leyendo",
    languages: {
      words: {
        name: "Palabras de afirmación",
        line: "El amor te llega cuando se dice en voz alta, o por escrito.",
        body: "Oírlo es lo que lo hace real para ti: un gracias que nombra lo que hiciste, un «qué bien lo has hecho» que no tuviste que pedir, un mensaje que solo podía ser para ti. Las palabras también pesan más en la otra dirección: una frase dicha sin pensar en una discusión te puede durar semanas.",
        lands: ["Un cumplido que dice exactamente qué y por qué", "Una nota donde la vas a encontrar horas después", "Que te elogie delante de otros", "Que agradezca el esfuerzo que nadie más vio"],
        misses: "El silencio. Hacerlo todo bien y no decir nada nunca.",
        gift: "La carta: tus palabras con letra a mano, bajo un sello de lacre que se rompe con un toque. Es gratis.",
      },
      time: {
        name: "Tiempo de calidad",
        line: "El amor te llega cuando tienes toda su atención.",
        body: "Veinte minutos con los móviles en un cajón valen más que un fin de semana entero en el mismo sofá, cada cual con su pantalla. Notas cuándo te escuchan a medias, y un plan cancelado te escuece más de lo que valía el plan.",
        lands: ["Planes para los dos, en el calendario, y cumplidos", "Una pregunta que demuestra que escuchó la última vez", "Los móviles boca abajo en la cena", "Acompañarte a un recado, solo por estar contigo"],
        misses: "Un «ajá» desde detrás de una pantalla. Aplazar, otra vez.",
        gift: "Pícnic: una cesta que se vacía toque a toque, cada cosa con una frase tuya en la etiqueta. Añade una cita que hayas planeado en Ethos y también saldrá de la cesta.",
      },
      gifts: {
        name: "Recibir regalos",
        line: "El amor te llega cuando algo demuestra que pensó en ti.",
        body: "Lo que cuenta es la prueba: vio algo, pensó en ti y te lo trajo. La entrada del concierto al que no pudiste ir, una tableta de ese chocolate que mencionaste una vez. Un cumpleaños olvidado, o un regalo que podría haber sido para cualquiera, te pesa más que a la mayoría.",
        lands: ["Algo pequeño traído de cualquier viaje", "Un regalo que recuerda algo que dijiste de pasada", "Flores sin ningún motivo", "Un envoltorio con esmero, aunque sea para algo diminuto"],
        misses: "Una fecha olvidada. Una tarjeta regalo que dice que nadie le dio muchas vueltas.",
        gift: "Ramo: lo ve formarse flor a flor, cada una elegida por ti, y nunca se marchita.",
      },
      service: {
        name: "Actos de servicio",
        line: "El amor te llega cuando alguien te aligera la carga.",
        body: "Para ti, el amor se parece a una tarea hecha sin que nadie la pida: la basura bajada, el formulario rellenado, la cita del taller pedida. Te fijas en quién hace qué, la ayuda que llega con un suspiro o un sermón no cuenta, y una tarea hecha vale más que tres prometidas.",
        lands: ["Una tarea hecha antes de que vieras que hacía falta", "Que se encargue del papeleo que te da pereza", "El desayuno hecho una mañana en la que vas con prisa", "«Ya me encargo yo», y se encarga"],
        misses: "Ofrecimientos de ayuda que nunca llegan. Que todo te toque a ti.",
        gift: "Rasca y gana: tarjetas que se rascan una a una, cada una con una foto tuya y una frase debajo. Que cada frase sea algo que harás por esa persona, y guarda lo más grande para la última.",
      },
      touch: {
        name: "Contacto físico",
        line: "El amor te llega cuando alguien te busca con la mano.",
        body: "Una mano en la espalda entre la gente, su cabeza en tu hombro en el tren: el contacto pequeño y constante es como sabes que todo va bien. La distancia es lo que peor llevas, y también que alguien se quede en su lado de la cama después de una discusión.",
        lands: ["Que te coja de la mano sin pensarlo", "Un abrazo que dura más que un hola", "Sentarse cerca en el sofá, no cada cual en una punta", "Un beso al llegar y otro al irse, siempre"],
        misses: "Que te mantengan a distancia. Semanas sin veros y sin fecha para el reencuentro.",
        gift: "XOXO: un sobre sellado con un beso de pintalabios, y donde toque, aparece otro beso. ¿Ahora estáis lejos? Cuenta atrás de medianoche marca los minutos que faltan para volver a veros.",
      },
    },
    ui: {
      meta: "30 preguntas · unos 4 minutos · sin dejar tu correo",
      progress: "Pregunta {n} de {total}",
      back: "Atrás",
      startOver: "Empezar de nuevo",
      resumed: "Sigues donde lo dejaste.",
      invite: "{name} ya ha hecho el test. Contesta las mismas 30 y veréis en qué coincidís.",
      ownLink: "Este es tu propio enlace. Envíaselo a tu pareja y su resultado aparecerá junto al tuyo.",
      resultEyebrow: "Tu lenguaje del amor",
      and: "y",
      evenTitle: "Los cinco, a partes iguales",
      evenBody: "Has elegido cada lenguaje exactamente seis veces. O quieres un poco de todo, o elegiste siempre la misma letra, que sale empatada a propósito: hazlo otra vez y quédate con lo primero que sientas.",
      sharesNote: "Parte de tus 30 respuestas",
      landsTitle: "Lo que te llega",
      missesTitle: "Lo que no llega",
      shareTitle: "Ahora descubre el suyo",
      shareBody: "Envía el enlace a tu pareja. En cuanto conteste, veréis los dos vuestros resultados lado a lado.",
      nameLabel: "Tu nombre, para que sepa que eres tú",
      share: "Enviar a tu pareja",
      copy: "Copiar el enlace",
      copied: "Enlace copiado",
      samePhone: "Ahora tu pareja, en este móvil",
      retake: "Hacerlo otra vez",
      giftTitle: "El regalo que lo dice",
      see: "Verlo",
      make: "Hacer uno",
      allFive: "Qué regalo dice cada lenguaje",
      compareEyebrow: "Tú y {name}",
      you: "Tú",
      yourPartner: "tu pareja",
      firstFor: "Lo primero para {name}",
      forYou: "ti",
      sameTop: "Los dos ponéis primero: {language}. Eso lo hace fácil de acertar, e igual de fácil dejar de hacerlo cuando ya parece cubierto.",
      differentTop: "No ponéis lo mismo en primer lugar, como la mayoría de las parejas. Solemos dar el amor como nos gustaría recibirlo, así que quizá os lo estéis diciendo en el lenguaje que la otra persona oye menos.",
      theirTopYourLast: "Lo primero para {name} y lo último para ti: {language}. Es lo que más fácil se olvida, porque es lo que menos se te ocurriría.",
      yourTopTheirLast: "Lo primero para ti y lo último para {name}: {language}. Díselo en voz alta, porque puede que no se le ocurra por su cuenta.",
      needsTitle: "Lo que {name} necesita de ti",
      yourNeedsTitle: "Lo que tú necesitas de {name}",
      makeFor: "Hazlo para {name}",
      seeFirst: "Verlo antes",
      sendBack: "Envía esto a {name}",
      sendBackBody: "El enlace le abre esta comparación, con vuestros dos resultados dentro.",
      justMine: "Tu resultado por separado",
      backToCompare: "Volver a los dos",
      privacy: "Tus respuestas se quedan en este dispositivo. El enlace que envíes lleva solo tus puntuaciones y el nombre que añadas.",
      shareText: "He hecho el test de los lenguajes del amor. Hazlo tú y mira en qué coincidimos:",
      compareShareText: "Nuestros lenguajes del amor, lado a lado:",
    },
  },
};

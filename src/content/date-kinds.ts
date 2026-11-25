import type { DateKind } from "@/lib/dates/date-kinds";

/**
 * The words of the pages by kind of date (/dates/ideas/<kind>) and of the four city-by-kind pages
 * (/dates/<city>/<kind>). Words only: which ideas a kind has, and in what order, is
 * src/lib/dates/date-kinds.ts. Spanish is written for Spain, in the plural the site uses.
 */

type L = { en: string; es: string };

export type DateKindCopy = {
  /** For a link in a row: "First date". */
  nav: L;
  /** The searched phrase, as its title starts: "First Date Ideas". */
  phrase: L;
  /** `{count}` is the number of ideas the page shows. */
  title: L;
  description: L;
  /** The h1. */
  heading: L;
  /** The italic line under it: at most 14 words. */
  line: L;
  /** One sentence beside the picture: at most 30 words. */
  sentence: L;
  /** The idea whose picture the hero shows. One of the kind's own, never the first card of a row below it, and no two kinds share one. */
  hero: string;
  /** Why each idea fits this kind: one line, at most 22 words, keyed by idea id. Exactly the kind's ideas. */
  fits: Record<string, L>;
  faq: { q: L; a: L }[];
};

/** Only the kinds with a page have words. */
export const DATE_KIND_COPY: Partial<Record<DateKind, DateKindCopy>> = {
  "first-date": {
    nav: { en: "First date", es: "Primera cita" },
    phrase: { en: "First Date Ideas", es: "Ideas para una primera cita" },
    title: { en: "First Date Ideas: {count} That Are Easy to Say Yes To", es: "Ideas para una primera cita: {count} fáciles de aceptar" },
    description: { en: "Nine first date ideas you can leave after an hour, most with something to do besides talk. The planner fills the one you pick with real places nearby.", es: "Nueve ideas para una primera cita de la que podéis iros al cabo de una hora. El planificador llena la que elijáis de sitios reales cerca." },
    heading: { en: "First date ideas that are easy to say yes to", es: "Ideas para una primera cita a las que es fácil decir que sí" },
    line: { en: "Short, public, and easy to leave if it isn’t working.", es: "Corta, en público, y fácil de dejar si no funciona." },
    sentence: { en: "Most of these nine give your hands something to do, all of them give you something to talk about after, and none traps you at a table for hours.", es: "Casi todas dan algo que hacer a las manos, las nueve dan de qué hablar después y ninguna os deja horas atrapados en una mesa." },
    hero: "gallery-hop",
    fits: {
      "bookshop-and-coffee": { en: "Twenty minutes apart is a breather for both of you, and the book each picked starts the conversation.", es: "Veinte minutos por separado son un respiro para los dos, y el libro que elija cada uno abre la conversación." },
      "ice-cream-walk": { en: "An hour and a half, side by side, which is easier than face to face across a table.", es: "Hora y media, caminando lado a lado, que es más fácil que mirarse desde los dos lados de una mesa." },
      "gallery-hop": { en: "Free to walk into and easy to leave; if it’s going well, the café is the next stop.", es: "Entrar es gratis e irse es fácil; si va bien, la siguiente parada es el café." },
      "mini-golf-and-milkshakes": { en: "A putter gives your hands a job, and the scorecard gives you something to tease each other about.", es: "El palo da trabajo a las manos, y la tarjeta de puntos, motivo para picaros." },
      "bowling-night": { en: "There is always somebody’s turn to watch, so a quiet moment never feels like one.", es: "Siempre hay un turno que mirar, así que un silencio nunca parece un silencio." },
      "arcade-night": { en: "Air hockey breaks the ice faster than any question about what you do for work.", es: "El air hockey rompe el hielo antes que cualquier pregunta sobre el trabajo." },
      "museum-then-wine": { en: "One hour among things to point at, then a drink only if you both want the second half.", es: "Una hora entre cosas que señalar, y la copa de después solo si os apetece la segunda parte." },
      "garden-afternoon": { en: "Daylight, open air and a bench when the talk gets good. Nobody has to commit to dinner.", es: "Luz de día, aire libre y un banco para cuando la charla se ponga buena. Nadie se compromete a cenar." },
      "skating-and-hot-chocolate": { en: "Nobody looks cool on skates, which takes the pressure off in the first five minutes.", es: "Nadie queda elegante sobre patines, y eso quita la presión en los primeros cinco minutos." },
    },
    faq: [
      {
        q: { en: "What makes a good first date idea?", es: "¿Qué hace buena una idea para una primera cita?" },
        a: { en: "Three things these nine share: you can leave after an hour without it being rude, there is something to look at besides each other, and nobody is stuck across a table for three hours. Dinner can be the second date.", es: "Tres cosas que comparten estas nueve: podéis iros al cabo de una hora sin quedar mal, hay algo que mirar aparte de vosotros y nadie se queda atrapado tres horas en una mesa. La cena puede ser la segunda cita." },
      },
      {
        q: { en: "How long should a first date be?", es: "¿Cuánto debería durar una primera cita?" },
        a: { en: "Long enough to want more. The ice cream walk here takes about an hour and a half, most of the others two to two and a half hours, and the museum one three only if you stay for the drink.", es: "Lo justo para quedarse con ganas. El paseo con helado dura más o menos hora y media, casi todas las demás entre dos horas y dos y media, y la del museo llega a tres solo si os quedáis a la copa." },
      },
    ],
  },
  fun: {
    nav: { en: "Fun", es: "Divertida" },
    phrase: { en: "Fun Date Ideas", es: "Ideas para una cita divertida" },
    title: { en: "Fun Date Ideas: {count} That Give You Something to Do", es: "Ideas para una cita divertida: {count} con algo a lo que jugar" },
    description: { en: "Eight fun date ideas with a game in them: mini golf, bowling, an escape room, karaoke, a rowing boat. Each has a twist that makes the game a small bet.", es: "Ocho ideas para una cita divertida con un juego dentro: minigolf, bolos, escape room, karaoke o una barca. Cada una trae un giro que lo vuelve una apuesta." },
    heading: { en: "Fun date ideas that give you something to do", es: "Ideas para una cita divertida, con algo a lo que jugar" },
    line: { en: "Somebody keeps score, and somebody ends up buying dessert.", es: "Alguien lleva la cuenta, y alguien acaba pagando el postre." },
    sentence: { en: "Eight dates built round playing something together. Each has a twist of its own, from loser buys dessert to narrating the rowing like a nature documentary.", es: "Ocho citas para jugar a algo juntos. Cada una trae su giro, desde «quien pierda paga el postre» hasta narrar la remada como un documental de naturaleza." },
    hero: "arcade-night",
    fits: {
      "mini-golf-and-milkshakes": { en: "Eighteen chances to be bad at something together, and the loser buys dessert.", es: "Dieciocho ocasiones de hacerlo fatal en compañía, y quien pierda paga el postre." },
      "bowling-night": { en: "Bumpers are allowed, score is kept, and every gutter ball costs a truth.", es: "Se permiten las barreras, se lleva la cuenta y cada bola fuera cuesta una verdad." },
      "arcade-night": { en: "A pocket of coins goes a long way, and the worse the prize, the better the story.", es: "Un puñado de monedas da para mucho, y cuanto peor es el premio, mejor es la historia." },
      "escape-room-debrief": { en: "Sixty minutes on the same side, which is rarer on a date than it should be.", es: "Sesenta minutos en el mismo bando, algo más raro en una cita de lo que debería." },
      "karaoke-duet": { en: "A private booth means only one person hears you, and it’s the right person.", es: "En una sala privada solo os oye una persona, y es la que importa." },
      "climbing-first-timers": { en: "You hold the rope while the other climbs, so trust arrives faster than usual.", es: "Uno sujeta la cuerda mientras el otro sube, así que la confianza llega antes de lo normal." },
      "boats-on-the-water": { en: "An hour of going in circles, with one of you narrating like a nature documentary.", es: "Una hora dando vueltas, con uno de los dos narrando como en un documental de naturaleza." },
      "skating-and-hot-chocolate": { en: "Holding hands is how you stay upright, so nobody has to make the first move.", es: "Ir de la mano es la forma de no caerse, así que nadie tiene que dar el primer paso." },
    },
    faq: [
      {
        q: { en: "What is a fun date that isn’t dinner?", es: "¿Qué cita divertida no es una cena?" },
        a: { en: "Any of these eight. Each starts with something to play, from mini golf to an escape room, and ends with a drink, a bite or a dessert, so dinner stops being the plan.", es: "Cualquiera de estas ocho. Todas empiezan con algo a lo que jugar, del minigolf a un escape room, y acaban con algo de beber, de picar o un postre: la cena deja de ser el plan." },
      },
      {
        q: { en: "Which of these work when it rains?", es: "¿Cuáles sirven si llueve?" },
        a: { en: "Six of the eight are under a roof: bowling, the arcade, the escape room, karaoke, climbing and skating. Mini golf and the rowing boat need a dry day, and the planner leaves them out when the forecast is wet.", es: "Seis de las ocho están bajo techo: los bolos, los recreativos, el escape room, el karaoke, la escalada y el patinaje. El minigolf y la barca necesitan un día seco, y el planificador las deja fuera cuando la previsión es de lluvia." },
      },
    ],
  },
  cheap: {
    nav: { en: "Cheap and free", es: "Barata o gratis" },
    phrase: { en: "Cheap Date Ideas", es: "Ideas para una cita barata" },
    title: { en: "Cheap Date Ideas: {count} for the Price of a Coffee, 4 Free", es: "Ideas para una cita barata: {count} por un café, 4 gratis" },
    description: { en: "Eight cheap date ideas for a coffee each or nothing: a gallery hop, a golden-hour picnic, a sunrise, a garden. Four are free if you bring your own.", es: "Ocho ideas para una cita barata por un café o nada: galerías, un pícnic a la hora dorada, un amanecer, un jardín. Cuatro, gratis si lleváis lo vuestro." },
    heading: { en: "Cheap date ideas, and four that are free", es: "Ideas para una cita barata, y cuatro que salen gratis" },
    line: { en: "Fill the flask at home and four of these cost nothing.", es: "Llenad el termo en casa y cuatro de estas no cuestan nada." },
    sentence: { en: "Eight dates that cost the price of a coffee each at most. Four of them cost nothing if the picnic comes from your own kitchen and you skip the café.", es: "Ocho citas por un café por cabeza, como mucho. Cuatro salen gratis si el pícnic sale de vuestra cocina y os saltáis la cafetería." },
    hero: "golden-hour-picnic",
    fits: {
      "gallery-hop": { en: "Small galleries are free to walk into, and the only cost is the coffee after, if you want one.", es: "En las galerías pequeñas se entra gratis; el único gasto es el café de después, si os apetece." },
      "golden-hour-picnic": { en: "The bakery stop is the only spend. Pack the picnic at home and the whole evening is free.", es: "La pastelería es el único gasto. Preparad el pícnic en casa y la tarde entera sale gratis." },
      "sunrise-and-breakfast": { en: "The sunrise is free and so is the empty city. Bring a flask and skip the café at the end.", es: "El amanecer es gratis, y la ciudad vacía también. Llevad un termo y saltaos la cafetería del final." },
      "garden-afternoon": { en: "A public park or garden costs nothing. Tea afterwards is the only spend, and it is optional.", es: "Un parque o un jardín público no cuesta nada. El té de después es el único gasto, y es opcional." },
      "bookshop-and-coffee": { en: "Browsing is free. Set a paperback budget, or leave with only the coffee.", es: "Curiosear es gratis. Poneos un tope de libro de bolsillo, o salid solo con el café." },
      "ice-cream-walk": { en: "Two cones and a park: the cheapest date here that still feels like an occasion.", es: "Dos helados y un parque: la cita más barata de aquí que aún parece una ocasión." },
      "stars-and-planets": { en: "On a clear night the darkest viewpoint in town is free; the planetarium is the paid plan B.", es: "En una noche despejada, el mirador más oscuro de la ciudad es gratis; el planetario es el plan B de pago." },
      "mini-golf-and-milkshakes": { en: "The priciest of the eight: a round each, then the loser buys the milkshakes.", es: "La más cara de las ocho: una partida por cabeza, y quien pierda paga los batidos." },
    },
    faq: [
      {
        q: { en: "What are free date ideas that don’t feel cheap?", es: "¿Qué citas gratis no parecen de saldo?" },
        a: { en: "The four at the top: a gallery hop, a picnic at golden hour, a sunrise and an afternoon in a garden. What makes them a date is the twist each one comes with, not what was spent.", es: "Las cuatro primeras: una ruta de galerías, un pícnic a la hora dorada, un amanecer y una tarde en un jardín. Lo que las convierte en cita es el giro que trae cada una, no lo gastado." },
      },
      {
        q: { en: "How do I plan a cheap date tonight?", es: "¿Cómo planeo una cita barata para hoy?" },
        a: { en: "Set the planner’s budget to “free” or “pocket change at most” and say where you are. It picks an idea that fits the forecast and the hour, and tells you when nothing that cheap fits.", es: "Poned el presupuesto del planificador en «gratis» o «gastando solo calderilla» y decid dónde estáis. Elige una idea que encaje con la previsión y con la hora, y avisa cuando no hay nada tan barato." },
      },
    ],
  },
  romantic: {
    nav: { en: "Romantic", es: "Romántica" },
    phrase: { en: "Romantic Date Ideas", es: "Ideas para una cita romántica" },
    title: { en: "Romantic Date Ideas: {count} That Slow the Evening Down", es: "Ideas para una cita romántica: {count} planes sin prisas" },
    description: { en: "Ten romantic date ideas built round a view, a table or the dark: a golden-hour picnic, dinner and a slow walk, the stars. Timed to the real sunset.", es: "Diez ideas para una cita romántica con una vista, una mesa o la noche: pícnic a la hora dorada, cena y paseo, las estrellas. Ajustadas a la puesta de sol." },
    heading: { en: "Romantic date ideas that slow the evening down", es: "Ideas para una cita romántica, sin prisas" },
    line: { en: "Be at the view three quarters of an hour before sunset.", es: "Estad en el mirador tres cuartos de hora antes de la puesta de sol." },
    sentence: { en: "Ten dates with nowhere else to be. Four of them hang on the light, so the planner times those to the real sunset or sunrise of the day you pick.", es: "Diez citas sin otro sitio al que ir. Cuatro dependen de la luz, y el planificador las ajusta al sol del día que elijáis." },
    hero: "pasta-and-a-slow-walk",
    fits: {
      "golden-hour-picnic": { en: "The best view in town as the light goes, and one thing each that the other has never tried.", es: "La mejor vista de la ciudad mientras cae la luz, y algo que el otro nunca haya probado." },
      "pasta-and-a-slow-walk": { en: "A table for two, then a walk with no destination. You order for each other, no vetoes.", es: "Una mesa para dos y un paseo sin destino. Pedís el uno por el otro, sin vetos." },
      "stars-and-planets": { en: "The darkest viewpoint in town, and a star named after each other on a napkin.", es: "El mirador más oscuro de la ciudad, y una estrella con el nombre del otro en una servilleta." },
      "beach-until-sunset": { en: "Sand, salt and dinner with your shoes still off. Write something for the tide to take.", es: "Arena, sal y cenar todavía sin zapatos. Escribid algo para que se lo lleve la marea." },
      "sunrise-and-breakfast": { en: "A view with nobody else in it, and phones in pockets until the sun is fully up.", es: "Una vista sin nadie más, y los móviles en el bolsillo hasta que el sol haya salido del todo." },
      "boats-on-the-water": { en: "An hour on the water with nowhere to go and nobody else in the boat.", es: "Una hora en el agua, sin sitio al que ir y sin nadie más en la barca." },
      "theatre-night": { en: "A reason to wear the good outfit, and a drink at intermission to guess the ending.", es: "Una excusa para ponerse lo bueno, y una copa en el descanso para adivinar el final." },
      "spa-evening": { en: "Warm water, no phones, and the slowest two hours of the month.", es: "Agua caliente, sin móviles y las dos horas más lentas del mes." },
      "garden-afternoon": { en: "Slow paths, a bench for two and tea afterwards. Nothing about it can be hurried.", es: "Caminos lentos, un banco para dos y un té después. Nada de esto admite prisas." },
      "skating-and-hot-chocolate": { en: "You hold hands for the whole hour, and the hot chocolate is earned.", es: "Vais de la mano toda la hora, y el chocolate caliente se gana." },
    },
    faq: [
      {
        q: { en: "What is the most romantic date idea?", es: "¿Cuál es la cita más romántica?" },
        a: { en: "The one timed to the light. A picnic at golden hour puts you at the view about forty-five minutes before the sun goes down, when the light is at its best; the planner reads the real sunset for your day.", es: "La que sigue a la luz. El pícnic a la hora dorada os deja en el mirador unos cuarenta y cinco minutos antes de que se ponga el sol, cuando la luz está mejor; el planificador lee la puesta de sol real de vuestro día." },
      },
      {
        q: { en: "What is a romantic date at night?", es: "¿Qué cita romántica hay para la noche?" },
        a: { en: "Looking up: a planetarium if the sky is against you, the darkest viewpoint in town if it isn’t. The planner starts it an hour after sunset, and never before nine.", es: "Mirar hacia arriba: un planetario si el cielo no acompaña, el mirador más oscuro de la ciudad si sí. El planificador la empieza una hora después de la puesta de sol, y nunca antes de las nueve." },
      },
    ],
  },
  "double-date": {
    nav: { en: "Double date", es: "Cita doble" },
    phrase: { en: "Double Date Ideas", es: "Ideas para una cita doble" },
    title: { en: "Double Date Ideas: {count} That Work Better With Four", es: "Ideas para una cita doble: {count} que mejoran con cuatro" },
    description: { en: "Eight double date ideas where four is the right number: bowling in teams, an escape room, mini golf, karaoke duets. The planner finds lanes and rooms.", es: "Ocho ideas para una cita doble en las que cuatro es el número justo: bolos por equipos, escape room, minigolf, karaoke, con pistas y salas reales cerca." },
    heading: { en: "Double date ideas that work better with four", es: "Ideas para una cita doble que mejoran con cuatro" },
    line: { en: "Couple against couple beats four people making small talk.", es: "Pareja contra pareja funciona mejor que cuatro personas buscando de qué hablar." },
    sentence: { en: "Eight dates where a second couple helps: there are teams to pick, a puzzle that wants four heads, or a table worth sharing.", es: "Ocho citas en las que una segunda pareja ayuda: hay equipos que formar, un enigma que pide cuatro cabezas o una mesa que merece compartirse." },
    hero: "escape-room-debrief",
    fits: {
      "bowling-night": { en: "Couple against couple, or swap partners for a game and see who sulks.", es: "Pareja contra pareja, o cambiad de compañero una partida y a ver quién se enfurruña." },
      "escape-room-debrief": { en: "Four heads find the clues that two walk past, and the debrief is twice as loud.", es: "Cuatro cabezas ven las pistas que dos pasan de largo, y el comentario de después, a cuatro voces." },
      "mini-golf-and-milkshakes": { en: "Four scorecards, one loser, and a round of milkshakes on them.", es: "Cuatro tarjetas de puntos, alguien pierde y paga una ronda de batidos." },
      "karaoke-duet": { en: "Two duets and an audience of two that has to clap.", es: "Dos duetos y un público de dos que tiene que aplaudir." },
      "arcade-night": { en: "Pool four people’s tickets and argue about who takes the prize home.", es: "Juntad los tickets de los cuatro y discutid quién se lleva el premio a casa." },
      "boats-on-the-water": { en: "Two boats make it a race, however badly both are rowed.", es: "Con dos barcas ya es una carrera, por mal que se reme en cada una." },
      "pasta-and-a-slow-walk": { en: "A table for four where each couple orders for the other one. No vetoes.", es: "Una mesa para cuatro en la que cada pareja pide por la otra. Sin vetos." },
      "golden-hour-picnic": { en: "Everybody brings one thing the others have never tried, so the blanket fills up fast.", es: "Cada cual lleva algo que los demás no hayan probado, y la manta se llena enseguida." },
    },
    faq: [
      {
        q: { en: "What do you do on a double date?", es: "¿Qué se hace en una cita doble?" },
        a: { en: "Something with teams or turns, so four people are playing and not interviewing each other. Bowling, mini golf and an escape room all give everyone a job in the first five minutes.", es: "Algo con equipos o con turnos, para que los cuatro jueguen en vez de entrevistarse. Los bolos, el minigolf y un escape room dan a cada uno algo que hacer en los primeros cinco minutos." },
      },
      {
        q: { en: "Can the planner plan for four?", es: "¿El planificador sirve para cuatro?" },
        a: { en: "It plans the places and the times, which are the same for two or four. Book the lane or the escape room for four yourselves: the plan gives you the name and the directions.", es: "Planea los sitios y las horas, que son los mismos para dos que para cuatro. La pista o el escape room para cuatro los reserváis vosotros: el plan os da el nombre y cómo llegar." },
      },
    ],
  },
  winter: {
    nav: { en: "Winter", es: "Invierno" },
    phrase: { en: "Winter Date Ideas", es: "Ideas para una cita en invierno" },
    title: { en: "Winter Date Ideas: {count} for When It’s Dark by Five", es: "Ideas para una cita en invierno: {count} para días cortos" },
    description: { en: "Nine winter date ideas for cold days and long nights: skating and hot chocolate, a spa evening, a planetarium, a film. Seven of them are indoors.", es: "Nueve ideas para una cita en invierno: patinar y chocolate caliente, una tarde de spa, un planetario, una peli y un postre. Siete son a cubierto." },
    heading: { en: "Winter date ideas for when it’s dark by five", es: "Ideas para una cita en invierno, cuando anochece a las cinco" },
    line: { en: "Skate first, then thaw out over a hot chocolate.", es: "Primero a patinar, y después a descongelarse con un chocolate caliente." },
    sentence: { en: "Nine dates that suit short days: one on the ice, one under the stars, and seven indoors where the coats come off.", es: "Nueve citas para días cortos: una sobre hielo, una bajo las estrellas y siete a cubierto, donde sobran los abrigos." },
    hero: "spa-evening",
    fits: {
      "skating-and-hot-chocolate": { en: "The one date that is better cold: a rink, mittens, and whoever falls first buys the hot chocolate.", es: "La única cita que mejora con frío: una pista, manoplas, y quien se caiga primero paga el chocolate." },
      "spa-evening": { en: "Warm water while it’s freezing outside, and not one word about work.", es: "Agua caliente mientras fuera hiela, y ni una palabra de trabajo." },
      "cinema-and-late-dessert": { en: "Two hours in the warm, then a dessert somewhere still open after the credits.", es: "Dos horas al calor, y luego un postre en algún sitio que siga abierto al salir." },
      "stars-and-planets": { en: "Long nights mean the stars are out early. A planetarium is the warm version.", es: "Con noches largas, las estrellas salen pronto. El planetario es la versión con calefacción." },
      "bookshop-and-coffee": { en: "A bookshop is a warm room that is free to walk into, and the coffee after is the excuse to stay.", es: "Una librería es una sala cálida en la que se entra gratis, y el café de después, la excusa para quedarse." },
      "museum-then-wine": { en: "One hour indoors, out of the wind, then a glass of something nearby.", es: "Una hora a cubierto, sin viento, y luego una copa cerca." },
      "theatre-night": { en: "Winter is the season for dressing up, and the intermission drink is part of it.", es: "El invierno es la temporada de arreglarse, y la copa del descanso forma parte." },
      "bowling-night": { en: "Warm, loud and under a roof, with a plate of fries between turns.", es: "Calor, ruido y techo, con un plato de patatas entre turno y turno." },
      "climbing-first-timers": { en: "An indoor wall warms you up faster than any café, and dinner is on whoever says “I can’t” first.", es: "Un rocódromo calienta antes que cualquier café, y la cena la paga quien diga primero «no puedo»." },
    },
    faq: [
      {
        q: { en: "What can couples do in winter besides dinner?", es: "¿Qué puede hacer una pareja en invierno además de cenar?" },
        a: { en: "Skate, soak, or look up. A rink and hot chocolate, a spa evening and a planetarium are the three here that winter makes better.", es: "Patinar, ponerse a remojo o mirar al cielo. Una pista con chocolate caliente, una tarde de spa y un planetario son las tres de aquí que el invierno mejora." },
      },
      {
        q: { en: "What is a winter date that is free?", es: "¿Hay alguna cita de invierno gratis?" },
        a: { en: "The stars, if the sky is clear: the darkest viewpoint in town costs nothing. Browsing a bookshop is the other one: the only spend is the coffee after.", es: "Las estrellas, si el cielo está despejado: el mirador más oscuro de la ciudad no cuesta nada. La otra es curiosear en una librería: el único gasto es el café de después." },
      },
    ],
  },
  "rainy-day": {
    nav: { en: "Rainy day", es: "Día de lluvia" },
    phrase: { en: "Rainy Day Date Ideas", es: "Ideas para una cita con lluvia" },
    title: { en: "Rainy Day Date Ideas: {count} That Never Needed the Sun", es: "Ideas para una cita con lluvia: {count} planes bajo techo" },
    description: { en: "Twelve rainy day date ideas under a roof: a bookshop and coffee, a gallery hop, bowling, an escape room, a film. The planner checks the forecast first.", es: "Doce ideas para una cita con lluvia, todas bajo techo: librería y café, galerías, bolos, escape room, una peli. El planificador mira antes la previsión." },
    heading: { en: "Rainy day date ideas that never needed the sun", es: "Ideas para una cita con lluvia, todas bajo techo" },
    line: { en: "All twelve are under a roof, so let the forecast do its worst.", es: "Las doce están bajo techo: que la previsión haga lo que quiera." },
    sentence: { en: "Twelve dates that work in any weather. When the forecast for your day is wet, the planner leads with these and leaves the picnic out.", es: "Doce citas para cualquier tiempo. Si vuestro día sale de lluvia, el planificador empieza por estas y deja fuera el pícnic." },
    hero: "cinema-and-late-dessert",
    fits: {
      "bookshop-and-coffee": { en: "Rain on the window is what a bookshop is for. Twenty minutes apart, then coffee.", es: "Para eso está una librería: lluvia en el cristal. Veinte minutos por separado y luego un café." },
      "museum-then-wine": { en: "One hour, not the whole building, then a bar to argue about what you saw.", es: "Una hora, no el edificio entero, y después un bar para discutir lo que habéis visto." },
      "gallery-hop": { en: "Small rooms, free to walk into, and a short dash between them.", es: "Salas pequeñas, entrada libre y una carrera corta entre una y otra." },
      "cinema-and-late-dessert": { en: "The back row, shared popcorn, and with luck the rain has stopped by the credits.", es: "La última fila, palomitas a medias y, con suerte, al salir ya no llueve." },
      "bowling-night": { en: "Loud, bright and dry, and every gutter ball costs a truth.", es: "Ruido, luz y techo, y cada bola fuera cuesta una verdad." },
      "arcade-night": { en: "A pocket of coins outlasts most showers.", es: "Un puñado de monedas dura más que casi cualquier chaparrón." },
      "escape-room-debrief": { en: "Locked in for sixty minutes is no hardship when it’s pouring outside.", es: "Estar encerrados sesenta minutos no es ningún castigo si fuera diluvia." },
      "climbing-first-timers": { en: "A beginner’s wall, chalky hands and a roof over all of it.", es: "Una pared para principiantes, manos con magnesio y un techo encima de todo." },
      "skating-and-hot-chocolate": { en: "An indoor rink doesn’t care about the forecast, and falling over warms you up.", es: "A una pista cubierta le da igual la previsión, y caerse hace entrar en calor." },
      "karaoke-duet": { en: "A private booth, one duet, and nobody outside can hear either of you.", es: "Una sala privada, un dueto, y fuera nadie os oye a ninguno de los dos." },
      "spa-evening": { en: "You were going to get wet anyway. Warm water, no phones.", es: "Os ibais a mojar de todas formas. Agua caliente y sin móviles." },
      "theatre-night": { en: "Coats at the coat check, a drink at intermission, and the weather is somebody else’s problem.", es: "Los abrigos en el guardarropa, una copa en el descanso y el tiempo ya es problema de otro." },
    },
    faq: [
      {
        q: { en: "What can couples do on a rainy day?", es: "¿Qué puede hacer una pareja un día de lluvia?" },
        a: { en: "Anything on this page: all twelve are indoors. The cheapest is the gallery hop, which is free to walk into; the longest are the film and the theater, at about three and a half hours each.", es: "Cualquier cosa de esta página: las doce son a cubierto. La más barata es la ruta de galerías, donde se entra gratis; las más largas, la peli y el teatro, unas tres horas y media cada una." },
      },
      {
        q: { en: "What if the forecast changes?", es: "¿Y si cambia la previsión?" },
        a: { en: "The planner on this page reads the forecast for tonight, tomorrow or the weekend each time you plan; the dates map picks any day up to sixteen days ahead. If the day turns dry, the outdoor ideas come back.", es: "El planificador de esta página lee la previsión de esta noche, mañana o el finde cada vez que planeáis; el mapa de citas elige cualquier día con hasta dieciséis días de antelación. Si el día sale seco, vuelven las ideas al aire libre." },
      },
    ],
  },
  night: {
    nav: { en: "Date night", es: "Noche de cita" },
    phrase: { en: "Date Night Ideas", es: "Ideas para una noche de cita" },
    title: { en: "Date Night Ideas: {count} That Start at Seven or Later", es: "Ideas para una noche de cita: {count} a partir de las siete" },
    description: { en: "Nine date night ideas for after work: dinner and a slow walk, a film, bowling, karaoke, the theater, the stars. The planner times each stop.", es: "Nueve ideas para una noche de cita: cena y paseo, una peli, bolos, karaoke, teatro o las estrellas. El planificador pone la hora de cada parada." },
    heading: { en: "Date night ideas that start at seven or later", es: "Ideas para una noche de cita, de las siete en adelante" },
    line: { en: "Seven start at seven. The other two wait until nine.", es: "Siete empiezan a las siete. Las otras dos esperan a las nueve." },
    sentence: { en: "Nine evenings in two stops, each with a twist. Plan one for tonight and the first stop is half an hour from now, never before five.", es: "Nueve noches en dos paradas, cada una con su giro. Si la planeáis para hoy, la primera parada es dentro de media hora, y nunca antes de las cinco." },
    hero: "theatre-night",
    fits: {
      "pasta-and-a-slow-walk": { en: "Dinner at seven, then the long way home. You order for each other, so the menu is the first game.", es: "Cena a las siete y vuelta por el camino largo. Pedís el uno por el otro: la carta ya es un juego." },
      "cinema-and-late-dessert": { en: "Three and a half hours with the talking saved for dessert. One picks the film, the other the seats.", es: "Tres horas y media, y la charla se guarda para el postre. Uno elige la peli; el otro, los asientos." },
      "bowling-night": { en: "Shoes on by seven. Every gutter ball costs a truth, every strike earns a dare.", es: "A las siete, zapatos puestos. Cada bola fuera cuesta una verdad; cada pleno, un reto." },
      "arcade-night": { en: "Coins, air hockey and a shelf prize, then a table nearby to argue about the score.", es: "Monedas, air hockey y un premio de estantería; después, una mesa cerca para discutir el marcador." },
      "karaoke-duet": { en: "Starts at nine at the earliest, in a private booth. Each of you picks the other’s solo.", es: "Empieza a las nueve como pronto, en una sala privada. Cada uno elige el solo del otro." },
      "escape-room-debrief": { en: "An hour locked in on the same side, then a drink. Nobody assigns blame before it arrives.", es: "Una hora encerrados en el mismo bando y luego una copa. Nadie reparte culpas antes de que llegue." },
      "theatre-night": { en: "The one to dress for. Write your guess at the ending down at intermission; the loser buys the nightcap.", es: "La de arreglarse. Apuntad en el descanso cómo creéis que acaba; quien falle paga la última copa." },
      "stars-and-planets": { en: "It waits for dark: an hour after sunset, never before nine. If it rains, the planetarium.", es: "Espera a que oscurezca: una hora después de la puesta de sol, nunca antes de las nueve. Si llueve, el planetario." },
      "spa-evening": { en: "Three hours: warm water and no phones, then dinner. Not one word about work.", es: "Tres horas: agua caliente sin móviles y después la cena. Ni una palabra de trabajo." },
    },
    faq: [
      {
        q: { en: "What is a good date night idea that isn’t dinner and a film?", es: "¿Qué plan de noche no es cenar y ver una peli?" },
        a: { en: "Seven of these nine. Bowling, the arcade, karaoke, an escape room, the theater, a spa and the stars all start with something to do. Dinner or a drink comes second, when there is something to talk about.", es: "Siete de estas nueve. Los bolos, los recreativos, el karaoke, un escape room, el teatro, un spa y las estrellas empiezan con algo que hacer. La cena o la copa van después, cuando ya hay de qué hablar." },
      },
      {
        q: { en: "What time should a date night start?", es: "¿A qué hora empieza una noche de cita?" },
        a: { en: "Seven suits most of these: the planner starts the evening ideas at 7:00 and the two late ones at nine or an hour after sunset, whichever is later. For tonight it starts half an hour from now.", es: "A las siete, casi todas: el planificador empieza las de tarde a las 19:00 y las dos más tardías a las nueve o una hora después de la puesta de sol, lo que llegue más tarde. Si es para hoy, empieza dentro de media hora." },
      },
    ],
  },
  outdoor: {
    nav: { en: "Outdoor", es: "Al aire libre" },
    phrase: { en: "Outdoor Date Ideas", es: "Ideas para una cita al aire libre" },
    title: { en: "Outdoor Date Ideas: {count} for a Dry Day", es: "Ideas para una cita al aire libre: {count} para un día seco" },
    description: { en: "Eight outdoor date ideas: a golden-hour picnic, a garden, a sunrise, a rowing boat, mini golf, the beach. The planner keeps them for dry days.", es: "Ocho ideas para una cita al aire libre: pícnic a la hora dorada, jardín, amanecer, barca, minigolf o playa. El planificador las guarda para días secos." },
    heading: { en: "Outdoor date ideas for a dry day", es: "Ideas para una cita al aire libre, para un día seco" },
    line: { en: "Rain calls most of these off. The stars move to a planetarium.", es: "La lluvia cancela casi todas. Las estrellas pasan al planetario." },
    sentence: { en: "Eight dates under open sky, from a sunrise to a rowing boat. Three follow the light, and the planner sets those by your day’s real sunrise or sunset.", es: "Ocho citas a cielo abierto, de un amanecer a una barca. Tres siguen la luz: el planificador las ajusta al amanecer o al atardecer de vuestro día." },
    hero: "garden-afternoon",
    fits: {
      "golden-hour-picnic": { en: "You are at the view three quarters of an hour before sunset, with one thing each to try.", es: "Estáis en el mirador tres cuartos de hora antes de la puesta de sol, con algo nuevo que probar cada uno." },
      "garden-afternoon": { en: "Two and a half hours of slow paths and one bench. Find the plant that looks like each of you.", es: "Dos horas y media de caminos lentos y un banco. Buscad la planta que más se parezca a cada uno." },
      "ice-cream-walk": { en: "The shortest one here, an hour and a half: two scoops each and a park to get lost in.", es: "La más corta de aquí, hora y media: dos bolas por cabeza y un parque en el que perderse." },
      "sunrise-and-breakfast": { en: "It starts half an hour before sunrise, when the view has nobody in it. Coffee comes after.", es: "Empieza media hora antes del amanecer, cuando en el mirador no hay nadie. El café viene después." },
      "boats-on-the-water": { en: "An hour on the water going in circles. Whoever isn’t rowing narrates like a nature documentary.", es: "Una hora en el agua dando vueltas. Quien no rema narra como en un documental de naturaleza." },
      "mini-golf-and-milkshakes": { en: "Eighteen holes of trash talk in daylight, a very serious scorecard, and the loser buys dessert.", es: "Dieciocho hoyos de piques a la luz del día, una tarjeta muy seria, y quien pierda paga el postre." },
      "beach-until-sunset": { en: "Four hours: sand first, then dinner with your shoes still off. Only where there is a coast.", es: "Cuatro horas: primero arena y luego cenar todavía sin zapatos. Solo donde hay costa." },
      "stars-and-planets": { en: "Outdoors after dark: the darkest viewpoint in town, an hour after sunset and never before nine.", es: "Al aire libre y de noche: el mirador más oscuro de la ciudad, una hora después de la puesta de sol." },
    },
    faq: [
      {
        q: { en: "What if it rains on the day?", es: "¿Y si llueve ese día?" },
        a: { en: "The planner reads the forecast for the day you pick. On a wet one it leaves out the ones rain would spoil and moves the stars under a planetarium’s dome. Choose “Outdoors” yourself and it plans them anyway.", es: "El planificador lee la previsión del día que elijáis. Si viene lluvia, deja fuera las que el agua estropearía y lleva las estrellas a la cúpula de un planetario. Si elegís «Al aire libre», las planea igualmente." },
      },
      {
        q: { en: "Which outdoor dates are free?", es: "¿Qué citas al aire libre son gratis?" },
        a: { en: "The picnic, the sunrise and the garden cost nothing if you bring your own food and skip the café. The stars are free from a viewpoint. The rest cost a cone, a round of mini golf, an hour’s boat hire or a dinner.", es: "El pícnic, el amanecer y el jardín no cuestan nada si lleváis lo vuestro y os saltáis la cafetería. Las estrellas son gratis desde un mirador. Las demás cuestan un helado, una partida de minigolf, una hora de barca o una cena." },
      },
    ],
  },
  unique: {
    nav: { en: "Unique", es: "Diferente" },
    phrase: { en: "Unique Date Ideas", es: "Ideas para una cita diferente" },
    title: { en: "Unique Date Ideas: {count} That Aren’t Dinner and a Film", es: "Ideas para una cita diferente: {count} sin cena ni peli" },
    description: { en: "Eight unique date ideas: a sunrise with nobody about, an escape room, a climbing wall, karaoke, a rowing boat, an ice rink, a spa. Each comes with a twist.", es: "Ocho ideas para una cita diferente: un amanecer sin nadie, un escape room, un rocódromo, karaoke, una barca, patinaje o un spa. Cada una, con su giro." },
    heading: { en: "Unique date ideas that aren’t dinner and a film", es: "Ideas para una cita diferente, sin cena ni peli" },
    line: { en: "Pick the one neither of you has done before.", es: "Elegid la que ninguno de los dos haya hecho nunca." },
    sentence: { en: "Eight dates that start somewhere other than a table: on a wall, on ice, in a booth, on the water, or on a hill before the city wakes up.", es: "Ocho citas que no empiezan en una mesa: en una pared, sobre hielo, en una sala, en el agua o en un mirador antes de que despierte la ciudad." },
    hero: "stars-and-planets",
    fits: {
      "sunrise-and-breakfast": { en: "The alarm goes off before the city does. Phones stay in pockets until the sun is fully up.", es: "La alarma suena antes que la ciudad. Los móviles, en el bolsillo hasta que el sol haya salido del todo." },
      "escape-room-debrief": { en: "Sixty minutes to learn how you two work under pressure, with drinks after to recover.", es: "Sesenta minutos para ver cómo funcionáis bajo presión, y algo de beber después para recuperaros." },
      "stars-and-planets": { en: "Name a star after each other and make it official on a napkin.", es: "Ponedle a una estrella el nombre del otro y hacedlo oficial en una servilleta." },
      "climbing-first-timers": { en: "A beginner’s wall, and one of you holds the other’s rope. Dinner is on whoever says “I can’t” first.", es: "Una pared para principiantes, y uno sujeta la cuerda del otro. Paga la cena quien diga primero «no puedo»." },
      "karaoke-duet": { en: "A private booth, one duet, and a solo each that the other one picked.", es: "Una sala privada, un dueto y un solo para cada uno, elegido por el otro." },
      "boats-on-the-water": { en: "An hour of rowing in circles while the passenger narrates like a nature documentary.", es: "Una hora remando en círculos mientras quien no rema narra como en un documental." },
      "skating-and-hot-chocolate": { en: "Holding hands is how you stay upright. Whoever falls first buys the hot chocolate.", es: "Ir de la mano es la forma de no caerse. Quien se caiga primero paga el chocolate." },
      "spa-evening": { en: "Warm water, no phones, and one rule: not a single word about work.", es: "Agua caliente, sin móviles y una regla: ni una palabra de trabajo." },
    },
    faq: [
      {
        q: { en: "What is a unique date idea for a couple who have done everything?", es: "¿Qué cita diferente queda cuando ya lo habéis hecho todo?" },
        a: { en: "Getting up for the sunrise. It starts half an hour before the sun, at a view with nobody in it, and ends with the first coffee of the day. Phones stay in pockets until the sun is fully up.", es: "Madrugar para ver amanecer. Empieza media hora antes de que salga el sol, en un mirador sin nadie, y acaba con el primer café del día. Los móviles se quedan en el bolsillo hasta que el sol haya salido del todo." },
      },
      {
        q: { en: "Which of these work in the rain?", es: "¿Cuáles sirven con lluvia?" },
        a: { en: "Five need no sky at all: the escape room, the climbing wall, karaoke, the ice rink and the spa. The stars move to a planetarium. The sunrise and the rowing boat wait for a dry day.", es: "Cinco no necesitan cielo: el escape room, el rocódromo, el karaoke, la pista de hielo y el spa. Las estrellas se mudan a un planetario. El amanecer y la barca esperan a un día seco." },
      },
    ],
  },
};

export type DateKindUi = {
  eyebrow: string;
  planButton: string;
  tonightLabel: string;
  tonightHeading: string;
  tonightLine: string;
  ideasLabel: string;
  ideasHeading: string;
  ideasLine: string;
  twist: string;
  planNear: string;
  freeLabel: string;
  freeHeading: string;
  freeLine: string;
  paidLabel: string;
  paidHeading: string;
  paidLine: string;
  questionsLabel: string;
  questionsHeading: string;
  questionsLine: string;
  citiesLabel: string;
  citiesHeading: string;
  citiesLine: string;
  allCities: string;
  kindsNav: string;
  byKind: string;
  inCityByKind: string;
  allInCity: string;
  freePlacesLabel: string;
  freePlacesHeading: string;
  freePlacesLine: string;
  meetLabel: string;
  meetHeading: string;
  meetLine: string;
  romanticPlacesLabel: string;
  romanticPlacesHeading: string;
  romanticPlacesLine: string;
  nightPlacesLabel: string;
  nightPlacesHeading: string;
  nightPlacesLine: string;
  outdoorPlacesLabel: string;
  outdoorPlacesHeading: string;
  outdoorPlacesLine: string;
  rainyPlacesLabel: string;
  rainyPlacesHeading: string;
  rainyPlacesLine: string;
  winterPlacesLabel: string;
  winterPlacesHeading: string;
  winterPlacesLine: string;
  funPlacesLabel: string;
  funPlacesHeading: string;
  funPlacesLine: string;
  uniquePlacesLabel: string;
  uniquePlacesHeading: string;
  uniquePlacesLine: string;
};

/** The words every page by kind shares. */
export const DATE_KIND_UI: Record<"en" | "es", DateKindUi> = {
  en: {
    eyebrow: "Date ideas",
    planButton: "Plan one in a tap",
    tonightLabel: "The planner",
    tonightHeading: "One of these, with real places",
    tonightLine: "Say where. We pick one that fits the forecast and the hour.",
    ideasLabel: "The ideas",
    ideasHeading: "{count} to choose from",
    ideasLine: "Open a card: why it fits, and the twist that makes it a date.",
    twist: "The twist",
    planNear: "Plan it near you",
    freeLabel: "Free",
    freeHeading: "Free date ideas",
    freeLine: "These four cost nothing if you bring the flask and the snacks.",
    paidLabel: "Pocket change",
    paidHeading: "For pocket change",
    paidLine: "Four more where the spend is a coffee, a cone or a cheap ticket.",
    questionsLabel: "Questions",
    questionsHeading: "Before you go",
    questionsLine: "The short answers, before you plan.",
    citiesLabel: "By city",
    citiesHeading: "The same ideas, with real places",
    citiesLine: "Each city page fills the stops with cafés, parks and museums near its center.",
    allCities: "All {count} cities",
    kindsNav: "More kinds of date",
    byKind: "Date ideas by kind",
    inCityByKind: "In {city}, by kind",
    allInCity: "All date ideas in {city}",
    freePlacesLabel: "Free",
    freePlacesHeading: "Usually free to walk into",
    freePlacesLine: "Parks, galleries, bookshops and viewpoints the map knows within {km} km.",
    meetLabel: "Where to meet",
    meetHeading: "Cafés, bookshops and galleries near the center",
    meetLine: "Easy places to find each other, all within {km} km.",
    romanticPlacesLabel: "With a view",
    romanticPlacesHeading: "Views, gardens and parks near the center",
    romanticPlacesLine: "Places to walk to after dinner, all within {km} km.",
    nightPlacesLabel: "After dark",
    nightPlacesHeading: "Bars, cinemas and theaters near the center",
    nightPlacesLine: "Where an evening can start or end, all within {km} km.",
    outdoorPlacesLabel: "Outside",
    outdoorPlacesHeading: "Parks, gardens and lookouts near the center",
    outdoorPlacesLine: "Open air the map knows within {km} km of the center.",
    rainyPlacesLabel: "Under a roof",
    rainyPlacesHeading: "Museums, galleries, cinemas and bookshops nearby",
    rainyPlacesLine: "Dry places the map knows within {km} km of the center.",
    winterPlacesLabel: "Somewhere warm",
    winterPlacesHeading: "Cafés, museums and cinemas near the center",
    winterPlacesLine: "Warm places the map knows within {km} km.",
    funPlacesLabel: "To play",
    funPlacesHeading: "Places with a game in them",
    funPlacesLine: "What the map knows within {km} km; the planner finds more.",
    uniquePlacesLabel: "Out of the ordinary",
    uniquePlacesHeading: "Places with a story near the center",
    uniquePlacesLine: "A cellar, a rooftop, a hidden bar: what the map’s names give away.",
  },
  es: {
    eyebrow: "Ideas para una cita",
    planButton: "Planead una ya",
    tonightLabel: "El planificador",
    tonightHeading: "Una de estas, con sitios reales",
    tonightLine: "Decid dónde. Elegimos una que encaje con la previsión y la hora.",
    ideasLabel: "Las ideas",
    ideasHeading: "{count} para elegir",
    ideasLine: "Abrid una tarjeta: por qué encaja y el giro que la convierte en cita.",
    twist: "El giro",
    planNear: "Planeadla cerca de vosotros",
    freeLabel: "Gratis",
    freeHeading: "Ideas para una cita gratis",
    freeLine: "Estas cuatro no cuestan nada si lleváis el termo y algo de picar.",
    paidLabel: "Calderilla",
    paidHeading: "Por calderilla",
    paidLine: "Cuatro más: el gasto es un café, un helado o una entrada barata.",
    questionsLabel: "Preguntas",
    questionsHeading: "Antes de salir",
    questionsLine: "Las respuestas cortas, antes de planear.",
    citiesLabel: "Por ciudad",
    citiesHeading: "Las mismas ideas, con sitios reales",
    citiesLine: "Cada ciudad rellena las paradas con cafeterías, parques y museos cerca de su centro.",
    allCities: "Las {count} ciudades",
    kindsNav: "Más tipos de cita",
    byKind: "Ideas para una cita por tipo",
    inCityByKind: "En {city}, por tipo",
    allInCity: "Todas las ideas para una cita en {city}",
    freePlacesLabel: "Gratis",
    freePlacesHeading: "Sitios donde se suele entrar gratis",
    freePlacesLine: "Parques, galerías, librerías y miradores que el mapa conoce a menos de {km} km.",
    meetLabel: "Dónde quedar",
    meetHeading: "Cafeterías, librerías y galerías cerca del centro",
    meetLine: "Sitios fáciles para encontrarse, todos a menos de {km} km.",
    romanticPlacesLabel: "Con vistas",
    romanticPlacesHeading: "Miradores, jardines y parques cerca del centro",
    romanticPlacesLine: "Sitios a los que ir andando después de cenar, a menos de {km} km.",
    nightPlacesLabel: "De noche",
    nightPlacesHeading: "Bares, cines y teatros cerca del centro",
    nightPlacesLine: "Donde puede empezar o acabar una noche, a menos de {km} km.",
    outdoorPlacesLabel: "Al aire libre",
    outdoorPlacesHeading: "Parques, jardines y miradores cerca del centro",
    outdoorPlacesLine: "Aire libre que el mapa conoce a menos de {km} km del centro.",
    rainyPlacesLabel: "Bajo techo",
    rainyPlacesHeading: "Museos, galerías, cines y librerías cerca",
    rainyPlacesLine: "Sitios secos que el mapa conoce a menos de {km} km del centro.",
    winterPlacesLabel: "Al calor",
    winterPlacesHeading: "Cafeterías, museos y cines cerca del centro",
    winterPlacesLine: "Sitios calentitos que el mapa conoce a menos de {km} km.",
    funPlacesLabel: "Para jugar",
    funPlacesHeading: "Sitios con un juego dentro",
    funPlacesLine: "Lo que el mapa conoce a menos de {km} km; el planificador encuentra más.",
    uniquePlacesLabel: "Fuera de lo común",
    uniquePlacesHeading: "Sitios con historia cerca del centro",
    uniquePlacesLine: "Un sótano, una azotea, un bar escondido: lo que delatan los nombres del mapa.",
  },
};

/** The two questions every page by kind ends its list with. */
export const DATE_KIND_SHARED_FAQ: { q: L; a: L }[] = [
  {
    q: { en: "Do we need an account to plan one?", es: "¿Hace falta una cuenta para planear una?" },
    a: { en: "No. The planner fills an idea’s stops with real places and keeps the plan in your browser. You send it as a link; an account only matters if you want it saved on every device.", es: "No. El planificador rellena las paradas de una idea con sitios reales y guarda el plan en vuestro navegador. Se envía como enlace; la cuenta solo hace falta si lo queréis guardado en todos los dispositivos." },
  },
  {
    q: { en: "Where do the places come from?", es: "¿De dónde salen los sitios?" },
    a: { en: "From OpenStreetMap, the map people edit themselves. Each stop is a real place, as close to the one before as the map allows, usually a short walk. Hours are not always listed, so check before you go.", es: "De OpenStreetMap, el mapa que edita la propia gente. Cada parada es un sitio real, lo más cerca de la anterior que permite el mapa; casi siempre, a un paseo. Los horarios no siempre figuran: comprobadlos antes de ir." },
  },
];

/** The cities a page by kind links to, biggest searches first (SEO-PICTURE.md section 5). */
export const KIND_PAGE_CITIES: readonly string[] = ["new-york", "chicago", "london", "los-angeles", "boston", "dallas", "houston", "kansas-city"];

/** A kind inside a city: the four pages of BRIEF-dates.md 2b, keyed "city/kind". */
export type CityKindCopy = {
  title: L;
  description: L;
  heading: L;
  line: L;
  sentence: L;
  /**
   * The hero's idea when the kind's own picture would not do under a city's name: the cheap page's
   * picnic has a skyline of spires, which is not London's or New York's. Two cones on a tree-lined path fit any city.
   */
  hero?: string;
};
export const CITY_KIND_COPY: Record<string, CityKindCopy> = {
  "new-york/cheap": {
    title: { en: "Cheap Date Ideas in NYC: 8 With Real Places, 4 Free", es: "Citas baratas en Nueva York: 8 ideas, 4 gratis" },
    description: { en: "Eight cheap date ideas in New York with real cafés, parks and galleries near Washington Square, and the places nearby that are usually free to walk into.", es: "Ocho ideas para una cita barata en Nueva York con cafeterías, parques y galerías reales cerca de Washington Square, y sitios donde se entra gratis." },
    heading: { en: "Cheap date ideas in New York", es: "Ideas para una cita barata en Nueva York" },
    line: { en: "The streets are free, and so is the Staten Island Ferry.", es: "Las calles son gratis, y el ferri de Staten Island también." },
    hero: "ice-cream-walk",
    sentence: { en: "Our eight cheap ideas with real places near Washington Square, and the parks, galleries and bookshops nearby that are usually free.", es: "Nuestras ocho ideas baratas con sitios reales cerca de Washington Square, y los parques, galerías y librerías cercanos, que suelen ser gratis." },
  },
  "new-york/first-date": {
    title: { en: "First Date Ideas in NYC: 9 Easy Ones With Real Places", es: "Primera cita en Nueva York: 9 ideas fáciles" },
    description: { en: "Nine first date ideas in New York that are easy to leave, with real cafés, bookshops and galleries near Washington Square for each stop.", es: "Nueve ideas para una primera cita en Nueva York, fáciles de dejar, con cafeterías, librerías y galerías reales cerca de Washington Square." },
    heading: { en: "First date ideas in New York", es: "Ideas para una primera cita en Nueva York" },
    line: { en: "Around Washington Square, bookshops, small galleries and cafés sit a block apart.", es: "Alrededor de Washington Square, librerías, galerías pequeñas y cafeterías están a una manzana." },
    sentence: { en: "Nine dates you can leave after an hour, each with real places near Washington Square, and a short list of cafés and bookshops near the center to meet at.", es: "Nueve citas de las que podéis iros al cabo de una hora, con sitios reales cerca de Washington Square y unas cafeterías y librerías donde quedar." },
  },
  "london/first-date": {
    title: { en: "First Date Ideas in London: 9 Easy Ones With Real Places", es: "Primera cita en Londres: 9 ideas fáciles" },
    description: { en: "Nine first date ideas in London that are easy to enjoy and easy to leave, each with real cafés, bookshops and galleries around Covent Garden for the stops.", es: "Nueve ideas para una primera cita en Londres, fáciles de dejar, con cafeterías, librerías y galerías reales alrededor de Covent Garden." },
    heading: { en: "First date ideas in London", es: "Ideas para una primera cita en Londres" },
    line: { en: "Most of the big museums are free, so the first hour costs nothing.", es: "Casi todos los grandes museos son gratis: la primera hora no cuesta nada." },
    sentence: { en: "Nine dates you can leave after an hour, each with real places around Covent Garden, and a short list of cafés and bookshops near the center to meet at.", es: "Nueve citas de las que podéis iros al cabo de una hora, con sitios reales alrededor de Covent Garden y unas cafeterías y librerías donde quedar." },
  },
  "london/cheap": {
    title: { en: "Cheap Date Ideas in London: 8 With Real Places, 4 Free", es: "Citas baratas en Londres: 8 ideas, 4 gratis" },
    description: { en: "Eight cheap date ideas in London with real cafés, parks and galleries around Covent Garden, and the places nearby that are usually free to walk into.", es: "Ocho ideas para una cita barata en Londres con cafeterías, parques y galerías reales cerca de Covent Garden, y sitios donde se entra gratis." },
    heading: { en: "Cheap date ideas in London", es: "Ideas para una cita barata en Londres" },
    line: { en: "Most of the big museums charge nothing at the door.", es: "Casi ningún gran museo cobra en la puerta." },
    hero: "ice-cream-walk",
    sentence: { en: "Our eight cheap ideas with real places around Covent Garden, and the galleries, parks and bookshops nearby that are usually free.", es: "Nuestras ocho ideas baratas con sitios reales alrededor de Covent Garden, y las galerías, parques y librerías cercanos, que suelen ser gratis." },
  },
};

/**
 * The words of a city pair that has no hand-written ones (CITY_KIND_COPY), composed from the kind’s
 * and the city’s own data by src/lib/cities/kind-copy.ts. `{count}` is a numeral: the cards shown.
 */
export const CITY_KIND_WORDS: Record<"en" | "es", { title: string; description: string; heading: string; sentence: string; pick: string }> = {
  en: {
    title: "{phrase} in {city}: {count} With Real Places",
    description: "{count} {phraseLower} in {city}, each with real places near the center for its stops. The planner fits one to the day’s forecast.",
    heading: "{phraseSentence} in {city}",
    sentence: "{count} {dates} for {city}, in the order the city deserves, with real places near the center for every stop.",
    pick: "Especially good in {city}: {idea}.",
  },
  es: {
    title: "{short} en {city}: {count} con sitios reales",
    description: "{count} {phraseLower} en {city}, con sitios reales cerca del centro para cada parada. El planificador elige una según la previsión.",
    heading: "{phrase} en {city}",
    sentence: "{count} {dates} para {city}, en el orden que pide la ciudad, con sitios reales cerca del centro para cada parada.",
    pick: "Especialmente buena en {city}: {idea}.",
  },
};

/** What a pair’s sentence calls the kind’s dates, and how its Spanish title starts. */
export const CITY_KIND_NOUNS: Record<Exclude<DateKind, "at-home">, { dates: L; short: string }> = {
  "first-date": { dates: { en: "first dates", es: "primeras citas" }, short: "Primera cita" },
  fun: { dates: { en: "fun dates", es: "citas divertidas" }, short: "Citas divertidas" },
  cheap: { dates: { en: "cheap dates", es: "citas baratas" }, short: "Citas baratas" },
  romantic: { dates: { en: "romantic dates", es: "citas románticas" }, short: "Citas románticas" },
  "double-date": { dates: { en: "double dates", es: "citas dobles" }, short: "Citas dobles" },
  winter: { dates: { en: "winter dates", es: "citas de invierno" }, short: "Citas de invierno" },
  "rainy-day": { dates: { en: "rainy-day dates", es: "citas bajo techo" }, short: "Citas bajo techo" },
  night: { dates: { en: "date nights", es: "noches de cita" }, short: "Noche de cita" },
  outdoor: { dates: { en: "outdoor dates", es: "citas al aire libre" }, short: "Citas al aire libre" },
  unique: { dates: { en: "unique dates", es: "citas diferentes" }, short: "Citas diferentes" },
};

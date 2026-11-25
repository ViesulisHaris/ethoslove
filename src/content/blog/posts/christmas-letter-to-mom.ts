import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "christmas-letter-to-mom",
  published: "2026-11-10",
  updated: "2026-11-25",
  occasion: "christmas",
  templates: ["fireside", "recipe-box", "the-letter"],
  content: {
    en: {
      title: "Christmas letter and messages for your mother, with examples",
      description: "What to write in a Christmas letter or card to your mother: what to thank her for, three example letters, 17 short messages to copy and how to give it.",
      keyword: "christmas letter to mom",
      lead: "A Christmas letter to your mother lands when it thanks her for something she doesn't expect to be noticed: the list on the fridge, the extra chair, the year she made it all work. Pick one Christmas from when you were small, one thing she did this year, and one habit of hers you've kept. Below is how to put that on a page, with three example letters, and short Christmas messages for her card if a letter is more than you need.",
      takeaways: [
        "Thank her for the work behind the day, not for being \"the best mother in the world\".",
        "Pick one childhood Christmas and tell it properly, down to the year and what she did.",
        "Tell her what you do now because of her. Mothers rarely hear it.",
        "Give it when the kitchen is quiet, and let her read it alone if she'd rather.",
      ],
      body: [
        { type: "h2", text: "What to write in a Christmas letter to your mother" },
        {
          type: "p",
          text: "Most letters to a mother say the same three things: thank you, I love you, you're amazing. All true, and she's heard them. What she hasn't heard is that you noticed the specifics. Four specifics will carry the whole letter:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**The work behind the day.** The present she bought for the aunt nobody else remembers, the turkey timed to the minute, the bed made up for whoever turns up. Name one job she does every year that nobody thanks her for.",
            "**One Christmas from when you were small.** Not \"all those Christmases\": one. The year the power went out, the bike in the hall, the carol she sang wrong on purpose. Say what you saw then, and what you now know it cost her.",
            "**This year.** Something she did in the last twelve months, for you or for someone else, that you haven't told her you saw.",
            "**What you've kept.** A recipe, a phrase, the way you wrap presents, the habit of calling on Sundays. Tell her where it came from.",
          ],
        },
        {
          type: "p",
          text: "End with something about next year: a visit, a meal, a thing you'll do together. A date is better than a promise. If you're writing to a partner too, our [Christmas letter to your boyfriend](/blog/christmas-letter-to-boyfriend) uses a different shape for a different kind of love.",
        },
        { type: "h2", text: "What to thank her for, depending on your mother" },
        {
          type: "table",
          head: ["If she's the one who", "Thank her for", "A line to start from"],
          rows: [
            ["Runs Christmas like a small airport", "The planning nobody sees", "\"I know the list on the fridge started in October.\""],
            ["Says she wants nothing", "The things she gives without being asked", "\"You never ask for anything, so I'm giving you this.\""],
            ["Lives far from you", "The phone calls, the parcels, the waiting", "\"You've never once made me feel guilty for living this far away.\""],
            ["Has had a hard year", "Getting through it, and still showing up", "\"You had every reason to skip Christmas this year. You didn't.\""],
            ["Is new to doing it alone", "Keeping the traditions going", "\"The tree went up on the same weekend, like always. I noticed.\""],
          ],
        },
        { type: "h2", text: "Christmas letter to your mother from a daughter" },
        {
          type: "quote",
          text: "I'm writing this at your kitchen table while you're out buying the cream you forgot, which you forget every year. I've been thinking about the Christmas I was seven, when you stayed up until three finishing the dollhouse because the instructions were in a language neither of us spoke. I didn't know that until this year, when you mentioned it like it was nothing. It wasn't nothing. In June you gave up two weekends to help me move and never once said you were tired. I make my gravy the way you do, with too much pepper. I'm keeping it that way. Come to me in April. I'll do the cooking. Love you, more than I say on the phone.",
        },
        { type: "h2", text: "Christmas letter to your mother from a son" },
        {
          type: "quote",
          text: "I don't write letters, so you'll know this one matters. When I was ten you took me to see the lights in town and we missed the last bus back, and you made the walk home into a game about which house had the worst decorations. I've done the same with my own kids twice now. Lately I've noticed how you call Grandma every evening at six, even on the days she doesn't remember who's calling. I don't know how you do it so patiently. Thank you for every Christmas, and for this one. I'll call you on Sunday, like you taught me.",
        },
        { type: "h2", text: "A Christmas letter to your mother when you can't be home" },
        {
          type: "p",
          text: "If you're spending Christmas somewhere else, the letter has to stand in for you at the table. Tell her about your day, show her you can picture hers, and say when you'll be back:",
        },
        {
          type: "quote",
          text: "Today I'm at Sam's parents', trying their stuffing and telling them, politely, that yours is better. I can see your morning from here: the radio on, the oven on, Dad asking if there's anything he can do and you saying no. I wish I were there to peel the potatoes badly. In October you sent me a box of things from my old room without me asking, and the photo of us at the beach is on my desk now. I'm home on the 3rd. Save me a slice of the cake.",
        },
        { type: "h2", text: "What to write in a Christmas card to your mother" },
        {
          type: "p",
          text: "Two things are enough for a card: what you noticed this year and the date you'll next see her:",
        },
        {
          type: "quote",
          text: "Thank you for the two weekends in June, and every box you carried. I'm cooking in April, you're resting. Merry Christmas.",
        },
        { type: "h2", text: "Short Christmas messages for your mother" },
        {
          type: "p",
          text: "If you'd rather start from a line, these are built the same way. Swap the detail in each for one of yours: a message works because it's true of her, not because it's well put.",
        },
        { type: "h3", text: "Emotional, to make her cry a little" },
        {
          type: "list",
          items: [
            "\"Merry Christmas. I finally understand how much work went into every Christmas you made look easy. Thank you for all of them.\"",
            "\"This year I noticed you always save the last slice for whoever arrives late. It's usually me. Thank you.\"",
            "\"Everything I like about Christmas, I learned in your kitchen. Merry Christmas.\"",
          ],
        },
        { type: "h3", text: "Short enough for a gift tag" },
        {
          type: "list",
          items: [
            "\"Merry Christmas. Thank you for this year, and every one before it.\"",
            "\"Love you. Lunch in January, my treat.\"",
            "\"To the one who still wraps every present in the same paper so nobody can guess. Merry Christmas.\"",
          ],
        },
        { type: "h3", text: "Funny" },
        {
          type: "list",
          items: [
            "\"Merry Christmas to the only person who still asks if I've eaten. Yes. Mostly your leftovers.\"",
            "\"Thank you for raising me. Some years were harder than others, and most of those were my fault.\"",
            "\"I'll call you on Sunday. This card is proof that I remembered.\"",
          ],
        },
        { type: "h3", text: "When you can't be there" },
        {
          type: "list",
          items: [
            "\"I can't be at your table this year, so I'm using your stuffing recipe at mine. It won't be the same. Home on the 3rd.\"",
            "\"Wherever I wake up on Christmas morning, I can hear your radio in the kitchen. Merry Christmas. See you in spring.\"",
          ],
        },
        { type: "h3", text: "After a hard year" },
        {
          type: "list",
          items: [
            "\"You had every reason to call this year off, and you made it to Christmas anyway. I'm proud of you.\"",
            "\"Thank you for answering the phone every single time this year. This Christmas, someone else does the dishes.\"",
          ],
        },
        { type: "h3", text: "From a daughter or a son" },
        {
          type: "list",
          items: [
            "\"Every year I sound more like you, especially when I tell someone to take a coat. I don't mind at all.\" (from a daughter)",
            "\"I never say it on the phone, so here it is in writing: thank you, for everything. Merry Christmas.\" (from a son)",
          ],
        },
        { type: "h3", text: "If she is no longer here" },
        {
          type: "list",
          items: [
            "\"The first Christmas without you, and I'm writing to you anyway. Thank you for every one before it.\"",
            "\"I made your stuffing this year. It still isn't right, and I hope it never quite is.\"",
          ],
        },
        { type: "h2", text: "What to leave out" },
        {
          type: "list",
          items: [
            "**\"Best mother in the world.\"** She'll smile, and forget it. The dollhouse at three in the morning, she'll keep.",
            "**A list of everything you're sorry for.** One small apology is fine. A full account of your teenage years turns her Christmas into a weight.",
            "**Advice.** Not about her health, her partner or her cooking. Not in this letter.",
            "**This year's family arguments.** Even if you're on her side.",
          ],
        },
        { type: "h2", text: "How to give her the letter" },
        {
          type: "list",
          items: [
            "**After the meal, when the kitchen is quiet.** Not during the presents, when everyone is watching.",
            "**Somewhere she'll find it.** Inside the recipe book she uses on Christmas morning, or in the pocket of the apron she cooks in.",
            "**If she'd cry in front of people,** give it to her as you leave, and say \"read it later\".",
            "**If you're far away,** send it in a parcel early enough to arrive before the 24th, or send it so it opens on her phone on Christmas morning.",
          ],
        },
        { type: "h2", text: "A letter she opens on her phone on Christmas morning" },
        {
          type: "p",
          text: "Sent as a [digital gift](/gifts), the letter comes with your photos and her song, and opens on her phone. With a [premium](/pricing) template, \"Schedule the reveal\" keeps it locked until the hour you pick in her time zone, say 9:00 on the 25th, and until then she sees a countdown. In March, the same link still opens it. Other ideas for her are among the [digital gifts for your mother](/gifts/for-mom), and the season's are on the [Christmas](/occasions/christmas) page.",
        },
        {
          type: "template",
          slug: "fireside",
          note: "A cabin at dusk, with snow falling past the window if you choose it. Once she lights the candle, the room glows and your letter comes out of the blanket. Your photos wait on a string, with her song underneath. Premium.",
        },
        {
          type: "template",
          slug: "recipe-box",
          note: "Write her as a recipe: up to six ingredients, like \"two cups of patience\" or \"one Christmas Eve spent on the dollhouse\". She tilts the phone to pour each one into the bowl, shakes it to stir, and the recipe card turns over into your letter. There are buttons if her phone can't feel the tilt. Premium.",
        },
        {
          type: "template",
          slug: "the-letter",
          note: "She breaks the wax seal and your words appear in handwriting. {note:Free as a short note: up to 500 characters and her song, enough for a card message from above. The full letter and photos come with \"Make it special\", paid once ([prices](/pricing)).|Free with the whole letter, your photos and her song.}",
        },
      ],
      faq: [
        {
          q: "What should I write in a Christmas letter to my mother?",
          a: "Four short parts: one job she does every Christmas that nobody thanks her for, one Christmas from your childhood told in detail, one thing she did this year, and one habit of hers you've kept. End with a date for your next visit.",
        },
        {
          q: "How long should a Christmas letter to my mother be?",
          a: "One page is enough: 100 to 250 words. The three letters above run from about 90 to 125. A letter she can read twice in the kitchen is better than three pages she saves for later and finds hard to start.",
        },
        {
          q: "What do I write if I can't be home for Christmas?",
          a: "Tell her where you'll be, describe her Christmas morning as you imagine it, thank her for one thing from this year, and give her the date you'll be home. Send it early if it's going by parcel, or send it to her phone to open on the day.",
        },
        {
          q: "How do I give my mother a Christmas letter without making her cry in front of everyone?",
          a: "Give it after the meal when the kitchen is quiet, slip it into the pocket of the apron she cooks in, or hand it over as you leave and say \"read it later\".",
        },
        {
          q: "What is a good short Christmas message for my mother?",
          a: "One thing you noticed this year and one plan, in two lines: \"Thank you for the two weekends in June. Lunch in January, my treat. Merry Christmas.\" A short message works when it's specific. A line that could go to anyone's mother is the one she'll forget.",
        },
        {
          q: "What do I give my mother for Christmas if she says she wants nothing?",
          a: "Believe her about things, and give her time instead: a letter that names what she did this year, with the date of your next visit written in. If you want something for her to open on the day, there are more ideas among the [digital gifts for your mother](/gifts/for-mom).",
        },
      ],
    },
    es: {
      title: "Carta de Navidad para tu madre y frases de feliz Navidad",
      description: "Qué escribir en una carta o tarjeta de Navidad para tu madre: qué agradecerle, tres cartas de ejemplo, 17 frases cortas para felicitarla y cómo dársela.",
      keyword: "carta de navidad para mi madre",
      lead: "Una carta de Navidad para tu madre llega de verdad cuando le agradece algo que ella no espera que nadie note: la lista en la nevera, la silla de más, el año en que consiguió que todo saliera bien. Elige una Navidad de tu infancia, una cosa que haya hecho este año y una costumbre suya que te has quedado. Aquí tienes cómo ponerlo en una página, con tres cartas de ejemplo, y frases cortas de Navidad para su tarjeta si una carta es más de lo que necesitas.",
      takeaways: [
        "Agradécele el trabajo que hay detrás del día, no que sea «la mejor madre del mundo».",
        "Elige una Navidad de tu infancia y cuéntala bien, con el año y lo que hizo ella.",
        "Dile qué haces ahora gracias a ella. Las madres casi nunca lo oyen.",
        "Dásela cuando la cocina esté tranquila, y deja que la lea a solas si lo prefiere.",
      ],
      body: [
        { type: "h2", text: "Qué escribir en una carta de Navidad para tu madre" },
        {
          type: "p",
          text: "Casi todas las cartas a una madre dicen lo mismo: gracias, te quiero, eres increíble. Todo es verdad, y ya lo ha oído. Lo que no ha oído es que te fijaste en los detalles. Con cuatro detalles concretos se sostiene toda la carta:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**El trabajo que hay detrás del día.** El regalo para la tía de la que nadie más se acuerda, el pavo calculado al minuto, la cama preparada para quien se presente. Menciona una tarea que hace cada año y que nadie le agradece.",
            "**Una Navidad de tu infancia.** No «todas aquellas Navidades»: una. El año que se fue la luz, la bici en el pasillo, el villancico que cantaba mal a propósito. Di lo que viste entonces y lo que ahora sabes que le costó.",
            "**Este año.** Algo que haya hecho en los últimos doce meses, por ti o por otra persona, y que todavía no le has dicho que has visto.",
            "**Lo que te has quedado.** Una receta, una frase, la forma de envolver los regalos, la costumbre de llamar los domingos. Dile de dónde viene.",
          ],
        },
        {
          type: "p",
          text: "Termina con algo del año que viene: una visita, una comida, algo que vayáis a hacer juntos. Una fecha vale más que una promesa. Si también le escribes a tu pareja, nuestra [carta de Navidad para tu novio](/blog/christmas-letter-to-boyfriend) tiene otra estructura, para otro tipo de cariño.",
        },
        { type: "h2", text: "Qué agradecerle, según cómo sea tu madre" },
        {
          type: "table",
          head: ["Si es la que", "Agradécele", "Una frase para empezar"],
          rows: [
            ["Organiza la Navidad como un pequeño aeropuerto", "La planificación que nadie ve", "«Sé que la lista de la nevera empezó en octubre»."],
            ["Dice que no quiere nada", "Lo que da sin que nadie se lo pida", "«Nunca pides nada, así que te doy esto»."],
            ["Vive lejos de ti", "Las llamadas, los paquetes, la espera", "«Nunca me has hecho sentir culpable por vivir tan lejos»."],
            ["Ha tenido un año difícil", "Haber salido adelante, y seguir ahí", "«Tenías todos los motivos para saltarte la Navidad este año. No lo hiciste»."],
            ["Lo hace sola por primera vez", "Mantener las tradiciones", "«El árbol se puso el mismo fin de semana de siempre. Me di cuenta»."],
          ],
        },
        { type: "h2", text: "Carta de Navidad para tu madre, de una hija" },
        {
          type: "quote",
          text: "Te escribo esto en la mesa de tu cocina mientras estás fuera comprando la nata que se te ha olvidado, como cada año. He estado pensando en la Navidad en que yo tenía siete años y te quedaste hasta las tres terminando la casa de muñecas, porque las instrucciones venían en un idioma que no hablábamos ninguna de las dos. No lo supe hasta este año, cuando lo mencionaste como si nada. No fue poca cosa. En junio te pasaste dos fines de semana ayudándome con la mudanza y ni una vez dijiste que estabas cansada. Hago la salsa como tú, con demasiada pimienta. La voy a dejar así. Ven a verme en abril. Cocino yo. Te quiero, más de lo que digo por teléfono.",
        },
        { type: "h2", text: "Carta de Navidad para tu madre, de un hijo" },
        {
          type: "quote",
          text: "Yo no escribo cartas, así que ya sabes que esta importa. Cuando tenía diez años me llevaste a ver las luces del centro, perdimos el último autobús y convertiste la vuelta andando en un juego sobre qué casa tenía la peor decoración. Ya lo he hecho dos veces con mis hijos. Últimamente me he fijado en que llamas a la abuela cada tarde a las seis, incluso los días en que no recuerda quién la llama. No sé cómo tienes tanta paciencia. Gracias por todas las Navidades, y por esta. Te llamo el domingo, como me enseñaste.",
        },
        { type: "h2", text: "Carta de Navidad para tu madre cuando no puedes ir a casa" },
        {
          type: "p",
          text: "Si pasas la Navidad en otro sitio, la carta tiene que ocupar tu lugar en la mesa. Cuéntale tu día, demuéstrale que te imaginas el suyo y dile qué día vuelves:",
        },
        {
          type: "quote",
          text: "Hoy estoy en casa de los padres de Sam, probando su relleno y diciéndoles, con educación, que el tuyo está más rico. Desde aquí veo tu mañana: la radio puesta, el horno encendido, papá preguntando si puede ayudar y tú diciendo que no. Ojalá estuviera ahí para pelar mal las patatas. En octubre me mandaste una caja con cosas de mi antiguo cuarto sin que te lo pidiera, y nuestra foto en la playa ya está en mi mesa. Vuelvo a casa el 3 de enero. Guárdame un trozo de tarta.",
        },
        { type: "h2", text: "Qué escribir en una tarjeta de Navidad para tu madre" },
        {
          type: "p",
          text: "Para la tarjeta bastan dos cosas: lo que viste este año y la fecha en que la vas a volver a ver:",
        },
        {
          type: "quote",
          text: "Gracias por los dos fines de semana de junio y por cada caja que cargaste. En abril cocino yo y tú descansas. Feliz Navidad.",
        },
        { type: "h2", text: "Frases de feliz Navidad para tu madre" },
        {
          type: "p",
          text: "Si prefieres partir de una frase, estas siguen la misma idea. Cambia el detalle de cada una por uno tuyo: un mensaje funciona porque es verdad de ella, no porque esté bien dicho.",
        },
        { type: "h3", text: "Emotivas, para hacerla llorar un poco" },
        {
          type: "list",
          items: [
            "«Feliz Navidad, mamá. Por fin entiendo cuánto trabajo había detrás de cada Navidad que hacías parecer fácil. Gracias por todas».",
            "«Este año me he dado cuenta de que siempre guardas el último trozo para el que llega tarde. Casi siempre soy yo. Gracias».",
            "«Todo lo que me gusta de la Navidad lo aprendí en tu cocina. Feliz Navidad, mamá».",
          ],
        },
        { type: "h3", text: "Cortas, para la etiqueta del regalo" },
        {
          type: "list",
          items: [
            "«Feliz Navidad. Gracias por este año, y por todos los anteriores».",
            "«Te quiero. Comida en enero, invito yo».",
            "«Para la que sigue envolviendo todos los regalos con el mismo papel para que nadie adivine nada. Feliz Navidad».",
          ],
        },
        { type: "h3", text: "Divertidas" },
        {
          type: "list",
          items: [
            "«Feliz Navidad a la única persona que todavía me pregunta si he comido. Sí. Sobre todo de tus tápers».",
            "«Gracias por criarme. Unos años fueron más difíciles que otros, y casi todos por mi culpa».",
            "«Te llamo el domingo. Esta tarjeta es la prueba de que me acordé».",
          ],
        },
        { type: "h3", text: "Cuando no puedes estar" },
        {
          type: "list",
          items: [
            "«Este año no puedo sentarme a tu mesa, así que hago tu relleno en la mía. No va a ser lo mismo. Vuelvo el 3 de enero».",
            "«Me despierte donde me despierte en Navidad, oigo tu radio en la cocina. Feliz Navidad, mamá. Nos vemos en primavera».",
          ],
        },
        { type: "h3", text: "Después de un año difícil" },
        {
          type: "list",
          items: [
            "«Tenías todos los motivos para tirar la toalla este año, y aun así has llegado a la Navidad. No sabes cuánto te admiro».",
            "«Gracias por cogerme el teléfono todas las veces que te he llamado este año. Esta Navidad, los platos los friega otro».",
          ],
        },
        { type: "h3", text: "De una hija o de un hijo" },
        {
          type: "list",
          items: [
            "«Cada año me parezco más a ti, sobre todo cuando le digo a alguien que se lleve una chaqueta. No me importa nada». (de una hija)",
            "«Por teléfono nunca lo digo, así que aquí lo tienes por escrito: gracias por todo. Feliz Navidad». (de un hijo)",
          ],
        },
        { type: "h3", text: "Si ya no está" },
        {
          type: "list",
          items: [
            "«La primera Navidad sin ti, y te escribo igualmente. Gracias por todas las anteriores».",
            "«Este año he hecho tu relleno. Sigue sin salirme igual, y espero que nunca me salga del todo».",
          ],
        },
        { type: "h2", text: "Qué dejar fuera" },
        {
          type: "list",
          items: [
            "**«La mejor madre del mundo».** Sonreirá, y se le olvidará. La casa de muñecas a las tres de la madrugada, esa se la queda.",
            "**Una lista de todo lo que lamentas.** Una pequeña disculpa está bien. Un repaso completo de tu adolescencia le convierte la Navidad en un peso.",
            "**Consejos.** Ni sobre su salud, ni sobre su pareja, ni sobre cómo cocina. No en esta carta.",
            "**Las discusiones familiares del año.** Aunque estés de su parte.",
          ],
        },
        { type: "h2", text: "Cómo darle la carta" },
        {
          type: "list",
          items: [
            "**Después de comer, cuando la cocina esté tranquila.** No durante los regalos, con todos mirando.",
            "**Donde la vaya a encontrar.** Dentro del libro de recetas que usa la mañana de Navidad, o en el bolsillo del delantal con el que cocina.",
            "**Si es de las que lloran delante de la gente,** dásela al despedirte y dile «léela luego».",
            "**Si estás lejos,** mándala por correo con tiempo para que llegue antes del 24, o envíasela para que se abra en su móvil la mañana de Navidad.",
          ],
        },
        { type: "h2", text: "Una carta que abre en su móvil la mañana de Navidad" },
        {
          type: "p",
          text: "Como [regalo digital](/gifts), la carta llega con vuestras fotos y su canción, y se abre en su móvil. Con una plantilla [premium](/pricing), «Programar la apertura» la mantiene cerrada hasta la hora que elijas en su zona horaria, por ejemplo las 9:00 del día 25, y hasta entonces ve una cuenta atrás. En marzo, el mismo enlace la sigue abriendo. Hay más ideas para ella entre los [regalos digitales para tu madre](/gifts/for-mom), y las de la temporada, en la página de [Navidad](/occasions/christmas).",
        },
        {
          type: "template",
          slug: "fireside",
          note: "Una cabaña al anochecer, con nieve cayendo tras la ventana si la eliges. En cuanto enciende la vela, la habitación se ilumina y tu carta sale de la manta. Vuestras fotos esperan colgadas en un hilo, y de fondo, su canción. Premium.",
        },
        {
          type: "template",
          slug: "recipe-box",
          note: "Escríbela como una receta: hasta seis ingredientes, como «dos tazas de paciencia» o «una Nochebuena entera con la casa de muñecas». Ella inclina el móvil para verter cada uno en el bol, lo agita para mezclar y la ficha se da la vuelta y se convierte en tu carta. Hay botones por si su móvil no nota la inclinación. Premium.",
        },
        {
          type: "template",
          slug: "the-letter",
          note: "Ella rompe el sello de lacre y tus palabras aparecen escritas a mano. {note:Gratis como nota corta: hasta 500 caracteres y su canción, suficiente para una de las frases de arriba. La carta completa y las fotos vienen con «Hazlo especial», con un solo pago ([precios](/pricing)).|Gratis con la carta entera, tus fotos y su canción.}",
        },
      ],
      faq: [
        {
          q: "¿Qué pongo en una carta de Navidad para mi madre?",
          a: "Cuatro partes cortas: una tarea que hace cada Navidad y que nadie le agradece, una Navidad de tu infancia contada con detalle, algo que haya hecho este año y una costumbre suya que te has quedado. Termina con la fecha de tu próxima visita.",
        },
        {
          q: "¿Cómo de larga tiene que ser una carta de Navidad para mi madre?",
          a: "Basta con una página: entre 100 y 250 palabras. Las tres cartas de arriba tienen entre unas 90 y 125. Una carta que pueda leer dos veces en la cocina es mejor que tres páginas que guarde para luego y le cueste empezar.",
        },
        {
          q: "¿Qué le escribo si no puedo ir a casa en Navidad?",
          a: "Dile dónde vas a estar, descríbele su mañana de Navidad tal como la imaginas, agradécele una cosa de este año y dale la fecha en que vuelves. Mándala por correo con tiempo, o envíasela para que se abra en su móvil ese día.",
        },
        {
          q: "¿Cómo le doy la carta a mi madre sin que llore delante de todos?",
          a: "Dásela después de comer, cuando la cocina esté tranquila, métela en el bolsillo del delantal con el que cocina o entrégasela al despedirte y dile «léela luego».",
        },
        {
          q: "¿Qué frase corta de Navidad le escribo a mi madre?",
          a: "Una cosa que hayas visto este año y un plan, en dos líneas: «Gracias por los dos fines de semana de junio. Comida en enero, invito yo. Feliz Navidad». Una frase corta funciona cuando es concreta. La que valdría para la madre de cualquiera es la que se le olvida.",
        },
        {
          q: "¿Qué le regalo a mi madre en Navidad si dice que no quiere nada?",
          a: "Si dice que no quiere cosas, hazle caso y regálale tiempo: una carta que diga lo que hizo este año, con la fecha de tu próxima visita escrita. Si quieres que abra algo ese día, tienes más ideas entre los [regalos digitales para tu madre](/gifts/for-mom).",
        },
      ],
    },
  },
};

import type { GiftLocale } from "@/lib/gift/schema";

/**
 * The idea lists for the occasions that had none until 20 Nov 2026: Mother's Day, Father's Day,
 * graduation, a wedding, long distance, an apology, no occasion at all and Thanksgiving.
 * content/occasions.ts puts each one on its guide; birthday, anniversary, Valentine's and Christmas
 * keep theirs there. They live here only because that file is already 1,350 lines.
 *
 * The same rules as those four. Every idea is a template, and says what to put in it: a sample line
 * is always one that fits the field it is for (each was counted against the template's schema.ts),
 * and what a template does was checked against its Template.tsx, not only its manifest. A list
 * stops when the next idea would repeat one, so the counts differ. The only thing called free is
 * The Letter as a short note (lib/gift/free-tier.ts).
 *
 * Spanish is adapted, not translated: the days fall on other dates (Mother's Day is 10 May in
 * Mexico and an October Sunday in Argentina; Thanksgiving is a US and Canadian day), and the
 * recipient is never given a gender.
 */
export type OccasionIdeas = { title: string; items: { template: string; heading: string; body: string }[] };

export type ListedOccasion = "mothers-day" | "fathers-day" | "graduation" | "wedding" | "long-distance" | "apology" | "just-because" | "thanksgiving";

/**
 * Which field each quoted sample in an idea is for, in the order the quotes appear in its body (the
 * same order in both languages). tests/unit/occasion-guides.test.ts counts every sample against
 * that field's limit in the template's schema, so a line that would not fit the editor fails.
 * "-" is a quote that is not a sample: a label in the editor, or what not to write.
 */
export const SAMPLE_FIELDS: Record<ListedOccasion, Record<string, string[]>> = {
  "mothers-day": {
    "recipe-box": ["ingredients", "ingredients", "ingredients", "makes"],
    bouquet: ["cardNote"],
    "jar-of-reasons": ["reasons", "label"],
    museum: ["caption", "exhibition"],
    "music-box": [],
    garden: ["sign"],
    "popup-card": ["-", "banner"],
    keepsake: ["engraving", "word"],
    bloom: [],
    "the-letter": ["-", "freeNote"],
  },
  "fathers-day": {
    "front-page": ["headline", "weather", "ads"],
    museum: ["caption"],
    "jar-of-reasons": ["reasons", "reasons", "reasons", "label"],
    vinyl: ["album", "side"],
    "the-council": ["-", "charge", "findings", "findings"],
    "our-timeline": ["dates", "dates", "dates"],
    "fortune-cookie": ["fortunes", "fortunes"],
    "the-letter": ["freeNote"],
    "text-thread": ["lines", "lines", "lines"],
    "scratch-card": ["finalTitle", "foilText"],
  },
  graduation: {
    "cap-toss": ["-", "awardedFor"],
    "our-timeline": ["dates", "dates"],
    "front-page": ["headline", "price", "ads"],
    "fortune-cookie": ["fortunes", "fortunes"],
    "scratch-card": ["finalTitle", "foilText"],
    "pack-your-bags": ["clues", "clues", "clues"],
    museum: ["caption"],
    "jar-of-reasons": ["reasons", "label"],
    "the-letter": ["-", "freeNote", "greeting"],
    digicam: ["-", "headline"],
  },
  wedding: {
    "the-toast": ["opening"],
    "front-page": ["headline", "weather", "ads"],
    "scratch-card": ["finalTitle", "foilText"],
    "our-timeline": ["dates", "dates"],
    museum: ["caption"],
    "music-box": [],
    "the-letter": ["signOff", "-"],
    keepsake: ["engraving", "ticket", "word"],
    "pack-your-bags": ["clues", "clues", "clues"],
    "jar-of-reasons": ["reasons", "reasons", "label"],
  },
  "long-distance": {
    halfway: ["halfwayNote"],
    passport: ["nationality"],
    "midnight-countdown": ["headline", "zeroLine"],
    "snow-globe": ["-", "lines", "plaque"],
    "text-thread": ["lines", "lines"],
    constellations: ["finalLine"],
    vinyl: ["album"],
    "pack-your-bags": ["-", "-", "clues", "clues", "clues", "when"],
    "paper-crane": ["lines", "lines"],
    scrapbook: ["headline", "tag"],
    "the-letter": ["freeNote"],
  },
  apology: {
    "the-letter": ["freeNote"],
    "paper-crane": ["lines", "closing"],
    "text-thread": ["lines", "lines", "lines"],
    bloom: [],
    bouquet: ["cardNote"],
    "sticker-bomb": ["labels", "labels", "prompt"],
    "the-council": ["charge", "findings"],
    picnic: ["labels", "labels"],
  },
  "just-because": {
    "fortune-cookie": ["fortunes", "fortunes"],
    "sticker-bomb": ["labels", "labels"],
    kawaii: ["greeting", "banner"],
    picnic: ["labels", "labels"],
    "on-repeat": ["caption", "caption", "playlist", "note"],
    "text-thread": ["lines"],
    "the-letter": ["freeNote"],
    "favorite-person": ["title", "title"],
    "the-council": ["charge", "findings", "findings"],
    arcade: ["title"],
    "scratch-card": ["finalTitle", "foilText"],
  },
  thanksgiving: {
    wishbone: ["wish"],
    "light-the-candles": ["thanks", "thanks"],
    "recipe-box": ["ingredients", "ingredients", "recipeName", "-"],
    "the-toast": ["opening", "venue"],
    "jar-of-reasons": ["-", "reasons", "reasons", "label"],
    "fall-for-you": ["note"],
    fireside: ["tag"],
    "front-page": ["headline", "weather", "ads"],
  },
};

export const OCCASION_IDEAS: Record<ListedOccasion, Record<GiftLocale, OccasionIdeas>> = {
  "mothers-day": {
    en: {
      title: "10 digital Mother's Day gift ideas",
      items: [
        {
          template: "recipe-box",
          heading: "Her recipe, with her as the ingredients",
          body: "A recipe card on a kitchen counter, and she is the recipe. She tilts the phone and each ingredient pours into the bowl as it is written on the card, six at most. Measure her out: “two cups of asking if I've eaten”, “a pinch of being right about the coat”, “one whole Sunday, given away”. Then write the line under the title yourself: “Makes one of her. Serves everyone.”",
        },
        {
          template: "bouquet",
          heading: "Flowers that last past Sunday",
          body: "Choose every stem yourself, up to 24: tulips, peonies, ranunculus, lilies, in the colours of the ones she grows or the ones she buys for herself. The card tucked inside holds 30 characters, enough for “From the one who picked yours”. Check the date before you schedule it: Mother's Day is the second Sunday of May in the US, and in the UK Mothering Sunday falls three weeks before Easter, in March or early April.",
        },
        {
          template: "jar-of-reasons",
          heading: "One note for every year she has been your mother",
          body: "A jar of folded notes she shakes out one at a time. Write one for each year you have been hers, and make every note something she did, not something she is: “You pretended the burnt toast was how you liked it.” Give the jar a label of its own, “34 things you did that I noticed”, and start with your oldest photo: pictures attach to the first notes in order.",
        },
        {
          template: "museum",
          heading: "A gallery of the photos she is in",
          body: "Mothers take the photos, so they are missing from most of them. Go looking for the ones she is in and hang each in a room of its own, up to twenty, with a plaque you write: “Woman Carrying Two Children and the Shopping, 1996”. Call the exhibition “Portrait of a Mother, 1989 to Now”. The last wall is your message, set like a curator's text.",
        },
        {
          template: "music-box",
          heading: "The lullaby, and her photos in the mirror",
          body: "A lacquered music box that she winds herself: three turns of the key and the lid lifts. Of its three tunes, choose Brahms' Lullaby if she sang to you. Put your photos in the order she would tell the story, eight at most, because they come up in the mirror inside the lid one at a time, with the caption of each on a paper slip. When the spring runs down, a folded letter rises out of the velvet.",
        },
        {
          template: "garden",
          heading: "A garden walk, for the one who taught you the plant names",
          body: "She pushes open a gate and walks down a page that grows as she scrolls: seedlings, a meadow, your photos on a trellis, a greenhouse with your letter on the potting table. Choose what is growing in the beds (roses, peonies, sunflowers or wildflowers) and who walks with her: a butterfly, a bee or a cat. The sign on the gate takes 24 characters: “Mind the peonies”.",
        },
        {
          template: "popup-card",
          heading: "A card that stands itself up on the shelf",
          body: "The card she would have propped on the shelf, except that this one unfolds by itself: a paper cake rises out of the crease with balloons behind it. Change the pennants from “happy birthday” to your own 20 characters, “to the best one” fits, and leave the age empty so the cake has five candles and no number. Inside the lid, in handwriting, is your letter.",
        },
        {
          template: "keepsake",
          heading: "A locket with the month you were born",
          body: "She breaks a wax seal and finds a box of things somebody kept. Decide which two photos go first, because their places are fixed: the first lies under dried flowers at the top, and the second is inside a gold locket she opens with a tap. Engrave the locket with the month you arrived, “since March 1994”, and make the word torn from a book hers: “Home”. Seven more photos are pressed in below, like pages.",
        },
        {
          template: "bloom",
          heading: "One flower that opens while she holds it",
          body: "A single flower in a pot on a windowsill, grown in 3D, that opens petal by petal only while she keeps a finger on the screen. If she lets go, it waits. When it is fully open your photos float up around it and your message is inside. Choose a peony, a tulip or a daisy in any colour, and write three sentences, not thirty: it is small on purpose.",
        },
        {
          template: "the-letter",
          heading: "The free one: a short note that says the thing",
          body: "The Letter is free as a short note of up to 500 characters with a song, and that is enough for what most people never write down. Not “thanks for everything”. One memory, and what you understand about it now: “You sat in the car outside my exam for three hours and said you had errands. I know there were no errands.”",
        },
      ],
    },
    es: {
      title: "10 ideas de regalos digitales para el Día de la Madre",
      items: [
        {
          template: "recipe-box",
          heading: "Su receta, con ella como ingredientes",
          body: "Una ficha de receta sobre la encimera, y la receta es ella. Inclina el móvil y cada ingrediente cae en el bol mientras se escribe en la ficha, seis como máximo. Mídela: “dos tazas de preguntar si he comido”, “una pizca de tener razón con el abrigo”, “un domingo entero, regalado”. Y escribe tú la línea de debajo del título: “Sale una como ella. Da para todos.”",
        },
        {
          template: "bouquet",
          heading: "Flores que duran más que el domingo",
          body: "Elige tú cada tallo, hasta 24: tulipanes, peonías, ranúnculos, lirios, en los colores de las que cultiva o de las que se compra ella. En la tarjetita caben 30 caracteres, suficientes para “De quien arrancaba las tuyas”. Mira la fecha antes de programarlo: en México el Día de la Madre es el 10 de mayo, caiga como caiga; en Estados Unidos, el segundo domingo de mayo; en Argentina, el tercer domingo de octubre.",
        },
        {
          template: "jar-of-reasons",
          heading: "Una nota por cada año que lleva siendo tu madre",
          body: "Un frasco de notas dobladas que salen de una en una al agitar el móvil. Escribe una por cada uno de esos años, y que cada nota sea algo que hizo, no algo que es: “Fingiste que la tostada quemada te gustaba así.” Ponle al frasco su propia etiqueta, “34 cosas que hiciste y que vi”, y empieza por tu foto más antigua: las fotos van con las primeras notas, en orden.",
        },
        {
          template: "museum",
          heading: "Una galería con las fotos en las que sale ella",
          body: "Las madres hacen las fotos, así que faltan en casi todas. Busca aquellas en las que sale y cuelga cada una en su propia sala, hasta veinte, con una placa escrita por ti: “Mujer con dos niños y la compra, 1996”. Llama a la exposición “Retrato de una madre, de 1989 a hoy”. Tu mensaje va en la última pared, como el texto de un comisario.",
        },
        {
          template: "music-box",
          heading: "La nana, y sus fotos en el espejo",
          body: "Una caja de música lacada a la que da cuerda ella misma: tres vueltas de llave y la tapa se levanta. De sus tres melodías, elige la Canción de cuna de Brahms si te cantaba. Pon las fotos en el orden en que ella contaría la historia, ocho como máximo, porque en el espejo de la tapa aparecen de una en una, con el pie de cada una en un papelito. Cuando se acaba la cuerda, del terciopelo sale una carta doblada.",
        },
        {
          template: "garden",
          heading: "Un paseo por el jardín, para quien te enseñó los nombres de las plantas",
          body: "Empuja una verja y baja por una página que crece al deslizar: brotes, un prado, tus fotos en una celosía y un invernadero con tu carta sobre la mesa. Elige qué crece en los parterres (rosas, peonías, girasoles o flores silvestres) y quién la acompaña: una mariposa, una abeja o un gato. En el cartel de la verja caben 24 caracteres: “Cuidado con las peonías”.",
        },
        {
          template: "popup-card",
          heading: "Una tarjeta que se pone de pie sola",
          body: "La tarjeta que habría dejado en la estantería, solo que esta se despliega sola: una tarta de papel se levanta del pliegue, con globos detrás. Cambia los banderines de “feliz cumple” por tus propios 20 caracteres, “a la mejor del mundo” cabe justo, y deja la edad vacía para que la tarta lleve cinco velas y ningún número. Dentro de la tapa, escrita a mano, va tu carta.",
        },
        {
          template: "keepsake",
          heading: "Un relicario con el mes en que naciste",
          body: "Rompe un sello de lacre y encuentra una caja de cosas que alguien guardó. Decide qué dos fotos van primero, porque tienen sitio fijo: la primera queda bajo flores secas, arriba del todo, y la segunda va dentro de un relicario de oro que se abre con un toque. Graba dentro el mes en que llegaste, “desde marzo, 1994”, y que la palabra arrancada de un libro sea suya: “Casa”. Debajo van otras siete fotos, prensadas como páginas.",
        },
        {
          template: "bloom",
          heading: "Una sola flor que se abre mientras la sostiene",
          body: "Una flor en una maceta, en el alféizar, hecha en 3D, que se abre pétalo a pétalo solo mientras mantiene el dedo en la pantalla. Si lo levanta, la flor espera. Cuando está abierta del todo, tus fotos suben a su alrededor y tu mensaje está dentro. Elige una peonía, un tulipán o una margarita del color que quieras, y escribe tres frases, no treinta: es pequeña a propósito.",
        },
        {
          template: "the-letter",
          heading: "La gratis: una nota corta que dice lo importante",
          body: "La carta es gratis como nota corta de hasta 500 caracteres con una canción, y con eso basta para lo que casi nadie llega a escribir. No “gracias por todo”. Un recuerdo, y lo que entiendes ahora de él: “Estuviste tres horas en el coche delante de mi examen y dijiste que tenías recados. Ya sé que no había recados.”",
        },
      ],
    },
  },

  "fathers-day": {
    en: {
      title: "10 digital Father's Day gift ideas",
      items: [
        {
          template: "front-page",
          heading: "He is the headline, for once",
          body: "A newspaper with his name on the masthead and him on the front. Headline: “LOCAL MAN FIXES TAP, REFUSES TO CALL IT LUCK”. Weather box: “Dry, with a strong chance of the same three stories”. Then eight classified ads for the family jokes: “WANTED: the good scissors. Last seen 2009. No questions asked.” Father's Day is the third Sunday of June in the US and the UK.",
        },
        {
          template: "museum",
          heading: "The Museum of Things He Fixed",
          body: "Walk round your home and photograph six things he built, mended or assembled: the shelf, the bike, the wobbly chair that no longer wobbles. Hang each in a room of its own with a plaque: “Shelf, 2011. Still level.” Put the years on every plaque, keep one photo of the man himself for the last frame, and let the wall text after it say thank you.",
        },
        {
          template: "jar-of-reasons",
          heading: "Everything he taught you, one note at a time",
          body: "A jar of folded notes he shakes out one by one, as many as a hundred. Fill it with what he taught you, big and small: “How to reverse with a trailer. Mostly.” “That you check the oil before a long drive.” “That you turn up.” Change the label, or the jar will promise reasons I love you: “Things you taught me (it took a while)” fits its 40 characters.",
        },
        {
          template: "vinyl",
          heading: "The song from the car, on a record",
          body: "He drops the needle and the record turns with the music while your photos wait in a crate as album covers, up to twelve. Use the song that was always on in the car. Name the album “Songs We Weren't Allowed to Skip”, credit the artist as the two of you, and change the side label to “Side Dad”. Your message is printed as the liner notes.",
        },
        {
          template: "the-council",
          heading: "Five cats rule on his jokes",
          body: "A bench of cats hears the case against him. The charge follows the words “charged with”, so write it that way: “telling the same joke since 1998”. Give each cat a finding to read out, “has never once followed the sat nav”, “claims the lawn mows itself”, and choose the stamp. Certified icon is the right verdict for a father. Your photos go in as exhibits.",
        },
        {
          template: "our-timeline",
          heading: "From his shoulders to your own front door",
          body: "A road that draws itself down the page, with a dated photo at every stop: “1996: on your shoulders at the parade”, “2008: that driving lesson”, “2019: the sofa, four floors, no lift”. Two to twenty photos, each label up to 40 characters. It takes a short video at the end too, which is the place for the grandchildren, if there are any.",
        },
        {
          template: "fortune-cookie",
          heading: "Dad jokes, baked into cookies",
          body: "A plate of fortune cookies that crack open on slips you wrote, three to twenty of them. Write them in his voice: “You will tell this joke again within the hour. We will laugh again. Somehow.” “A stranger will ask you for directions. You will be thrilled.” Make the lucky numbers his birthday and the years his children were born.",
        },
        {
          template: "the-letter",
          heading: "The line you have never said out loud",
          body: "Fathers get the shortest messages of anyone. The free version suits him: a note of up to 500 characters under a wax seal, with a song. One thing he did and what it meant: “I check the oil because you taught me to, and I think of you every time.” Press your own initial into the wax, and don't add a joke at the end.",
        },
        {
          template: "text-thread",
          heading: "The messages he can't answer with a thumbs up",
          body: "He replies to everything with one emoji, so send him a conversation he can only read. Your messages arrive on his screen one bubble at a time, with the typing dots: “Dad.” “I know you'd answer this with a thumbs up.” “So I'm saying it here, where you can't.” Then the paragraph. Up to forty bubbles, and a line that says only [photo] drops in the next picture.",
        },
        {
          template: "scratch-card",
          heading: "News under foil: a visit, a match, a grandchild",
          body: "For the year the present is an announcement. He scratches the foil off a few cards, each with a photo and a caption, and the last one says it in big letters: “Two tickets. Saturday. You're driving.” Print a line on the foil so the cover gives nothing away, up to 30 characters: “Scratch with a coin, as usual”.",
        },
      ],
    },
    es: {
      title: "10 ideas de regalos digitales para el Día del Padre",
      items: [
        {
          template: "front-page",
          heading: "Por una vez, el titular es él",
          body: "Un periódico con su nombre en la cabecera y él en portada. Titular: “VECINO ARREGLA EL GRIFO Y DICE QUE NO FUE SUERTE”. El tiempo: “Seco, con riesgo alto de las tres historias de siempre”. Y ocho anuncios clasificados para las bromas de familia: “SE BUSCAN las tijeras buenas. Vistas por última vez en 2009.” El Día del Padre es el tercer domingo de junio en México, Argentina y Estados Unidos, y el 19 de marzo en otros países.",
        },
        {
          template: "museum",
          heading: "El Museo de las Cosas que Arregló",
          body: "Date una vuelta por casa y haz fotos a seis cosas que montó, arregló o construyó: la estantería, la bici, la silla que cojeaba y ya no cojea. Cuelga cada una en su sala, con su placa: “Estantería, 2011. Sigue recta.” Pon los años en todas las placas, deja para el último marco una foto suya y que el texto de la pared, que viene después, dé las gracias.",
        },
        {
          template: "jar-of-reasons",
          heading: "Todo lo que te enseñó, nota a nota",
          body: "Un frasco con hasta cien notas dobladas, que va sacando una por una. Llénalo con lo que te enseñó, lo grande y lo pequeño: “A dar marcha atrás con remolque. Más o menos.” “Que se mira el aceite antes de un viaje largo.” “Que hay que aparecer.” Cambia la etiqueta, o el frasco prometerá razones por las que te quiero: “Cosas que me enseñaste (tardé lo mío)” cabe en sus 40 caracteres.",
        },
        {
          template: "vinyl",
          heading: "La canción del coche, en un disco",
          body: "Pone la aguja y el disco gira con la música mientras tus fotos esperan en una caja como portadas, hasta doce. Usa la canción que siempre sonaba en el coche. Llama al disco “Las que no se podían saltar”, firma como artista con vuestros dos nombres y cambia la cara a “Cara Papá”. Tu mensaje va impreso en las notas del libreto.",
        },
        {
          template: "the-council",
          heading: "Cinco gatos dictan sentencia sobre sus chistes",
          body: "Un tribunal de gatos juzga su caso. La acusación va detrás de las palabras “se le acusa de”, así que escríbela como tal: “contar el mismo chiste desde 1998”. Dale a cada gato una conclusión para leer en voz alta, “jamás ha hecho caso al GPS”, “sostiene que el césped se corta solo”, y elige el sello. Para un padre, el veredicto es icono certificado. Tus fotos entran como pruebas.",
        },
        {
          template: "our-timeline",
          heading: "De ir a hombros a tener tu propia puerta",
          body: "Un camino que se dibuja página abajo, con una foto y su fecha en cada parada: “1996: a hombros en la cabalgata”, “2008: aquella clase de conducir”, “2019: el sofá, cuatro pisos a pie”. De dos a veinte fotos, con etiquetas de hasta 40 caracteres. Al final admite también un vídeo corto, que es el sitio de los nietos, si los hay.",
        },
        {
          template: "fortune-cookie",
          heading: "Chistes de padre, dentro de galletas",
          body: "Un plato de galletas de la fortuna que se parten sobre tiras escritas por ti, de tres a veinte. Escríbelas con su voz: “Volverás a contar este chiste antes de una hora. Volveremos a reírnos. No se sabe cómo.” “Alguien te preguntará por una calle. Será tu mejor momento del día.” Que los números de la suerte sean su cumpleaños y los años en que nacieron sus hijos.",
        },
        {
          template: "the-letter",
          heading: "La frase que nunca has dicho en voz alta",
          body: "A los padres les llegan los mensajes más cortos de todos. La versión gratis le va bien: una nota de hasta 500 caracteres bajo un sello de lacre, con una canción. Una cosa que hizo y lo que significó: “Miro el aceite porque me enseñaste tú, y me acuerdo de ti cada vez.” Pon tu inicial en el lacre, y no remates con un chiste.",
        },
        {
          template: "text-thread",
          heading: "Los mensajes que no puede contestar con un pulgar",
          body: "Contesta a todo con un emoji, así que mándale una conversación que solo pueda leer. Tus mensajes llegan a su pantalla burbuja a burbuja, con los puntitos de escribiendo: “Papá.” “Sé que a esto contestarías con un pulgar.” “Así que te lo digo aquí, donde no puedes.” Y luego, el párrafo. Hasta cuarenta burbujas, y una línea que solo diga [photo] coloca la siguiente foto.",
        },
        {
          template: "scratch-card",
          heading: "Una noticia bajo el metalizado: una visita, un partido, un nieto",
          body: "Para el año en que el regalo es un anuncio. Rasca unas cuantas tarjetas, cada una con su foto y su pie, y la última lo dice en letras grandes: “Dos entradas. El sábado. Conduces tú.” Imprime una frase sobre el metalizado para que la portada no cuente nada, hasta 30 caracteres: “Rasca con una moneda, como tú”.",
        },
      ],
    },
  },

  graduation: {
    en: {
      title: "10 digital graduation gift ideas",
      items: [
        {
          template: "cap-toss",
          heading: "They cheer, and the cap goes up",
          body: "Made for the day itself. A mortarboard waits on a plinth with a crowd in gowns behind it; they cheer into the phone and it launches, higher the louder they get. Then a diploma drops in, and its ribbon pulls open onto your letter. Put the year and the course on the banner, and after “Awarded for” write what they really did: “finishing a thesis and a house move in the same month”.",
        },
        {
          template: "our-timeline",
          heading: "From the first day to the last, on one road",
          body: "The photo outside the building on day one, the awkward middle, the library at 2 a.m., the gown. Each gets a stop on a road that draws itself as they scroll, under a label you write: “Sept 2023: the wrong lecture hall”, “Year two: the flat with the mould”. Add a countdown and it sits under the closing line: aim it at the first day of whatever comes next.",
        },
        {
          template: "front-page",
          heading: "The front page they have earned",
          body: "A newspaper with their name on the masthead. Headline: “GRADUATE CONFIRMED: FAMILY MAY STOP ASKING ABOUT THE THESIS”. The price on the masthead takes 20 characters: charge “Four years of fees”. Spend the classified ads on what is left over: “FOR SALE: 400 highlighters, lightly used. Collection only.” Your message runs in columns underneath.",
        },
        {
          template: "fortune-cookie",
          heading: "Advice nobody asked for, in cookies",
          body: "Everyone will give them advice this month. Put yours where they have to crack something open to read it: three to twenty fortunes of up to 140 characters. “You will be asked ‘so what now?’ nine times this week. ‘Lunch’ is a complete answer.” “The job will not be the one on the certificate. This is fine.” The last cookie holds your real message.",
        },
        {
          template: "scratch-card",
          heading: "The real present, under foil",
          body: "For when the gift is something they can't unwrap in a car park: a trip, a watch waiting at home, help with a deposit. Put a photo with its caption under the foil of each card, and the news on the last one, where it prints as a headline: “Your first month's rent is on us.” Print “Class of 2027” on the foil, and the outside tells them nothing.",
        },
        {
          template: "pack-your-bags",
          heading: "The trip after the ceremony, on a departures board",
          body: "The present is the trip, and this is how they find out where. Choose plane, train or road trip; a road trip can list its stops in order, five at most. Write the packing list as clues: “no textbooks”, “something to swim in”, “the shoes from the ceremony”. They pack the case one luggage tag at a time, the departures board clatters letter by letter to the place, and your letter is under the ticket stub they tear off.",
        },
        {
          template: "museum",
          heading: "An exhibition of the degree",
          body: "Hang the evidence, one photo to a room, up to twenty: the desk, the group project, the kettle that did four years. The plaques are yours to write in museum voice: “Desk, Third Year. Mixed media: coffee, highlighters, despair.” It takes a video clip in a room of its own, which is where the hat throw goes once you have filmed it.",
        },
        {
          template: "jar-of-reasons",
          heading: "A note from everyone who watched",
          body: "Ask the family for one line each and put them all in the jar, with the name at the end of the note: “You rang me from the bus after every exam. I kept every voicemail. Gran.” It holds up to a hundred: nobody has to be left out. Give it a label that isn't about love: “Signed, everyone who watched you do it”.",
        },
        {
          template: "the-letter",
          heading: "From a parent: what you saw when they weren't looking",
          body: "Not “congratulations”. They will get fifty of those. The free note holds 500 characters, enough for the one thing you noticed and never mentioned: “The night before your second-year exams I heard you get up at four. I didn't come in. I have never been prouder of anybody.” Change the greeting to “To the graduate (I can say that now),”.",
        },
        {
          template: "digicam",
          heading: "Four years on one camera roll",
          body: "A pocket camera from 2006 with their photos on the roll, up to twelve, each with an orange date stamp and your caption in pixel type. Switch off “It's their birthday”, write “class of 2027” in the cut-out title and set the stamp to graduation day. After the last photo the shutter prints the whole roll as a strip.",
        },
      ],
    },
    es: {
      title: "10 ideas de regalos digitales de graduación",
      items: [
        {
          template: "cap-toss",
          heading: "Grita, y el birrete sale volando",
          body: "Hecha para el día en sí. Un birrete espera en su pedestal, con toda la promoción detrás; grita al móvil y sale disparado, más alto cuanto más fuerte. Luego cae un diploma, y al tirar de la cinta se abre con tu carta. Pon el año y la carrera en la pancarta y, después de “Se le concede por”, escribe lo que hizo de verdad: “acabar el trabajo de fin de grado y una mudanza el mismo mes”.",
        },
        {
          template: "our-timeline",
          heading: "Del primer día al último, en un solo camino",
          body: "La foto en la puerta el primer día, los cursos torpes del medio, la biblioteca a las dos de la madrugada, la toga. Cada una tiene su parada en un camino que se dibuja al deslizar, bajo una etiqueta escrita por ti: “Sept. 2023: el aula equivocada”, “Segundo: el piso con humedades”. Ponle una cuenta atrás y sale bajo la frase final: apúntala al primer día de lo que venga después.",
        },
        {
          template: "front-page",
          heading: "La portada que se ha ganado",
          body: "Un periódico con su nombre en la cabecera. Titular: “CONFIRMADO: LA FAMILIA YA PUEDE DEJAR DE PREGUNTAR POR EL TFG”. El precio de la cabecera admite 20 caracteres: cobra “Cuatro matrículas”. Y gasta los anuncios clasificados en lo que sobra: “SE VENDEN 400 subrayadores, poco uso. Recogida en mano.” Tu mensaje va debajo, en columnas.",
        },
        {
          template: "fortune-cookie",
          heading: "Consejos que nadie ha pedido, en galletas",
          body: "Este mes todo el mundo le va a dar consejos. Pon los tuyos donde tenga que romper algo para leerlos: de tres a veinte fortunas de hasta 140 caracteres. “Esta semana te preguntarán ‘¿y ahora qué?’ nueve veces. ‘Comer’ es una respuesta completa.” “El trabajo no será el que pone en el título. No pasa nada.” La última galleta guarda tu mensaje de verdad.",
        },
        {
          template: "scratch-card",
          heading: "El regalo de verdad, bajo el metalizado",
          body: "Para cuando el regalo es algo que no se puede desenvolver en un aparcamiento: un viaje, un reloj que espera en casa, una ayuda para la fianza. Pon una foto con su pie bajo el metalizado de cada tarjeta, y la noticia en la última, donde sale como un titular: “El primer mes de alquiler lo ponemos nosotros.” Imprime “Promoción 2027” sobre el metalizado, y lo de fuera no adelanta nada.",
        },
        {
          template: "pack-your-bags",
          heading: "El viaje de después, en un panel de salidas",
          body: "El regalo es el viaje, y así se entera de adónde. Elige avión, tren o coche; un viaje en coche puede llevar sus paradas en orden, cinco como máximo. Escribe la lista de la maleta como pistas: “ni un apunte”, “algo para bañarse”, “los zapatos de la ceremonia”. Hace la maleta etiqueta a etiqueta, el panel de salidas gira letra a letra hasta el destino, y tu carta está debajo del resguardo que arranca.",
        },
        {
          template: "museum",
          heading: "Una exposición de la carrera",
          body: "Cuelga las pruebas, una foto por sala, hasta veinte: el escritorio, el trabajo en grupo, el hervidor que aguantó cuatro años. Las placas las escribes tú con voz de museo: “Escritorio, tercer curso. Técnica mixta: café, subrayadores, desesperación.” Admite un clip de vídeo en una sala propia, que es donde va el lanzamiento de birretes cuando lo tengas grabado.",
        },
        {
          template: "jar-of-reasons",
          heading: "Una nota de cada persona que lo vio",
          body: "Pide una frase a cada persona de la familia y mételas todas en el frasco, con el nombre al final de la nota: “Me llamabas desde el autobús después de cada examen. Guardo todos los audios. La abuela.” Caben hasta cien: no tiene por qué quedarse nadie fuera. Ponle una etiqueta que no hable de amor: “Firmado: quienes te vimos hacerlo”.",
        },
        {
          template: "the-letter",
          heading: "De una madre o un padre: lo que viste cuando no miraba",
          body: "No “enhorabuena”; de esas le llegarán cincuenta. En la nota gratis caben 500 caracteres, suficientes para eso que viste y nunca comentaste: “La noche antes de los exámenes de segundo te oí levantarte a las cuatro. No entré. Nunca he sentido tanto orgullo por nadie.” Cambia el saludo por “Para ti, que ya tienes el título:”.",
        },
        {
          template: "digicam",
          heading: "Cuatro años en un solo carrete",
          body: "Una cámara de bolsillo de 2006 con sus fotos en el carrete, hasta doce, cada una con la fecha naranja y tu pie de foto en letra de píxeles. Desactiva “Es su cumpleaños”, escribe “promoción 2027” en el título recortado y pon en el sello el día de la graduación. Tras la última foto, el disparador imprime todo el carrete en una tira.",
        },
      ],
    },
  },

  wedding: {
    en: {
      title: "10 digital wedding gift ideas",
      items: [
        {
          template: "the-toast",
          heading: "The toast, whether or not you gave one",
          body: "Two glasses and a menu card. They tilt the phone to pour, knock it once to clink, and the menu opens into your speech. Write the first line, the one everybody goes quiet for: “To Ana and Marco, who took nine years to notice.” The venue and the date print on the card, and the glasses can hold champagne, wine or something without alcohol.",
        },
        {
          template: "front-page",
          heading: "The morning-after edition",
          body: "A newspaper for the day after, with their names on the masthead. Headline: “THEY DID IT: GUESTS REPORT CRYING, DANCING, ONE LOST SHOE”. Weather: “Clear, with heavy confetti.” The classified ads carry the stories from the tables: “LOST: page two of the best man's speech. If found, do not read aloud.” Schedule it for the next morning, when the phones come back out.",
        },
        {
          template: "scratch-card",
          heading: "Will you stand next to me? Asked under foil",
          body: "For asking a bridesmaid, a best man or a witness. They scratch through a few cards of the two of you, one photo and one caption apiece, until the last card asks in big letters: “Will you stand next to me on the 14th?” The foil can carry a line of its own too, up to 30 characters: “Scratch. It's important.”",
        },
        {
          template: "our-timeline",
          heading: "How they got here, seen from the outside",
          body: "The couple know their story. They don't know it the way their friends watched it. Pin your photos of them along a road, with labels in your words: “2017: the wrong table at Sam's birthday”, “2019: ‘we're just friends’, part four”. Two to twenty stops. Add a countdown to their first anniversary and it will still be counting when they open it again.",
        },
        {
          template: "museum",
          heading: "A gallery for the welcome table",
          body: "Hang up to twenty photos of the two of them, one to a room, and caption each as a museum would: “The Proposal (Second Attempt), 2024”. Then print the QR card and stand it on the welcome table, so guests walk through the exhibition on their phones while they wait for the couple. A video clip gets a room of its own.",
        },
        {
          template: "music-box",
          heading: "From a parent, for the morning of",
          body: "For the morning itself, before the hairdresser arrives. Load the mirror with eight photos in order, the oldest one you have first and last week's last: a new one comes up as the ballerina turns, or the two swans, if you choose them. When the tune slows, a folded letter lifts out of the velvet. Say there what you won't manage to say at the reception.",
        },
        {
          template: "the-letter",
          heading: "To the person you are marrying, an hour before",
          body: "Written the night before and read alone, with a seal to break. The free note holds 500 characters: room for a promise and a joke. Sign off with “See you at the front. I'll be the one crying,”. A free note goes when you send it, so give the link to someone you trust and name the minute; timing it yourself comes with “Make it special”.",
        },
        {
          template: "keepsake",
          heading: "Something old: a locket with the date inside",
          body: "Something old doesn't have to be an object. Three things in this box are yours to word: engrave the wedding date inside the gold locket, “14 · 06 · 2027”, change what the ticket admits them to, “admit two, for good”, and make the word torn from a book “Yes”. Put the earliest photo you have of the two of them first, where it lies under dried flowers, and the proposal second. The second photo is the one inside the locket.",
        },
        {
          template: "pack-your-bags",
          heading: "The honeymoon they don't know about yet",
          body: "For the one who planned the honeymoon in secret. Hand over your phone at the reception, after the cake, and let them pack: “nothing white”, “the good sunglasses”, “a book you won't open”. The lid shuts, a tag with the date swings from the handle and the departures board clatters to the answer. The ticket that slides up has both your names on it and the number of nights, thirty at most.",
        },
        {
          template: "jar-of-reasons",
          heading: "The vows that didn't fit in the vows",
          body: "The ceremony has room for the solemn ones. The jar takes the rest, up to a hundred folded notes: “I promise to pretend your directions are helpful.” “I promise you the window seat, mostly.” Label it “Vows, the unofficial ones” and hand it over on the first morning, to be shaken out a few at a time.",
        },
      ],
    },
    es: {
      title: "10 ideas de regalos digitales de boda",
      items: [
        {
          template: "the-toast",
          heading: "El brindis, lo hicieras o no",
          body: "Dos copas y un menú de pie. Inclinan el móvil para servir, le dan un golpecito para brindar y el menú se abre con tu discurso. Escribe la primera frase, esa con la que todo el mundo se calla: “Por Ana y Marco, que tardaron nueve años en darse cuenta.” El lugar y la fecha salen impresos en el menú, y en las copas puede haber champán, vino o algo sin alcohol.",
        },
        {
          template: "front-page",
          heading: "La edición de la mañana siguiente",
          body: "Un periódico para el día después, con sus nombres en la cabecera. Titular: “SE HAN CASADO: HUBO LLANTOS, BAILE Y UN ZAPATO PERDIDO”. El tiempo: “Despejado, con fuertes lluvias de confeti.” Los anuncios clasificados cuentan lo de las mesas: “SE BUSCA la página dos del discurso del padrino. Si aparece, no leer en voz alta.” Prográmalo para la mañana siguiente, cuando vuelven a salir los móviles.",
        },
        {
          template: "scratch-card",
          heading: "¿Te pones a mi lado? Preguntado bajo el metalizado",
          body: "Para pedírselo a una dama de honor, a un padrino o a un testigo. Rascan unas cuantas tarjetas vuestras, con una foto y un pie en cada una, hasta que la última pregunta en letras grandes: “¿Te pones a mi lado el día 14?” El metalizado también puede llevar su propia frase, de hasta 30 caracteres: “Rasca. Es importante.”",
        },
        {
          template: "our-timeline",
          heading: "Cómo llegaron hasta aquí, visto desde fuera",
          body: "La pareja se sabe su historia. No se la sabe como la vieron sus amigos. Clava tus fotos de los dos a lo largo de un camino, con etiquetas en tus palabras: “2017: la mesa equivocada del cumple”, “2019: ‘solo somos amigos’, parte 4”. De dos a veinte paradas. Añade una cuenta atrás hasta su primer aniversario y seguirá contando cuando lo vuelvan a abrir.",
        },
        {
          template: "museum",
          heading: "Una galería para la mesa de bienvenida",
          body: "Cuelga hasta veinte fotos de los dos, una por sala, y ponle a cada una un pie como los de un museo: “La pedida (segundo intento), 2024”. Luego imprime la tarjeta con el código QR y déjala de pie en la mesa de bienvenida, para que los invitados recorran la exposición en el móvil mientras esperan a la pareja. Un clip de vídeo tiene su propia sala.",
        },
        {
          template: "music-box",
          heading: "De una madre o un padre, para esa mañana",
          body: "Para esa misma mañana, antes de que empiece la peluquería. Carga el espejo con ocho fotos en orden, la más antigua que tengas primero y la de la semana pasada al final: sale una nueva mientras gira la bailarina, o los dos cisnes, si los eliges. Cuando la melodía se frena, del terciopelo sale una carta doblada. Di ahí lo que no vas a conseguir decir en el banquete.",
        },
        {
          template: "the-letter",
          heading: "Para la persona con la que te casas, una hora antes",
          body: "Escrita la noche anterior y leída a solas, con un sello que romper. En la nota gratis caben 500 caracteres, que dan para una promesa y una broma. Despídete con “Nos vemos delante. Yo soy quien llora,”. Una nota gratis sale cuando la mandas, así que dale el enlace a alguien de confianza y dile el minuto; programarla tú viene con “Hazlo especial”.",
        },
        {
          template: "keepsake",
          heading: "Algo viejo: un relicario con la fecha dentro",
          body: "Para lo de llevar algo viejo no hace falta un objeto. En esta caja hay tres cosas que escribes tú: graba la fecha de la boda dentro del relicario de oro, “14 · 06 · 2027”, cambia a qué da entrada el billete, “vale para dos, sin vuelta”, y que la palabra arrancada de un libro sea “Sí”. Pon primero la foto más antigua que tengas de los dos, que queda bajo flores secas, y la de la pedida en segundo lugar. La segunda es la que va dentro del relicario.",
        },
        {
          template: "pack-your-bags",
          heading: "La luna de miel que aún no conoce",
          body: "Para quien ha organizado la luna de miel en secreto. Pásale tu móvil en el banquete, después de la tarta, y que haga la maleta: “nada blanco”, “las gafas de sol buenas”, “un libro que no vas a abrir”. La tapa se cierra, una etiqueta con la fecha se balancea en el asa y el panel de salidas gira hasta la respuesta. El billete que sube lleva vuestros dos nombres y el número de noches, treinta como máximo.",
        },
        {
          template: "jar-of-reasons",
          heading: "Los votos que no cabían en los votos",
          body: "En la ceremonia caben los solemnes. En el frasco cabe el resto, hasta cien notas dobladas: “Prometo fingir que tus indicaciones me ayudan.” “Prometo dejarte la ventanilla, casi siempre.” Ponle de etiqueta “Votos, los no oficiales” y entrégalo la primera mañana, para ir sacando unas pocas cada vez.",
        },
      ],
    },
  },

  "long-distance": {
    en: {
      title: "11 digital long-distance gift ideas",
      items: [
        {
          template: "halfway",
          heading: "A paper plane they blow across the real distance",
          body: "A postcard map with your town on one island and theirs on the other, and the true distance between you in big numbers. They blow into the phone and a paper plane rides it along the dotted line while the kilometres count down. Add the places you have met in the middle, up to four, and a line for the halfway point: “Somewhere under here is the motorway services where we said goodbye.”",
        },
        {
          template: "passport",
          heading: "A passport with a stamp for every visit",
          body: "Their name on the cover, a globe that turns, and a route drawn from your city to theirs with up to six stopovers. Every photo becomes a stamp on a page, up to ten: use one from each visit. The nationality line is yours to write: “Dual citizen: here, and wherever you are”. The visa page holds your message.",
        },
        {
          template: "midnight-countdown",
          heading: "A countdown to the arrivals gate",
          body: "Set the clock to the minute your flight lands, in their time zone, and send the link weeks ahead. Until then it shows the time left under a darkening sky, headed “Until I walk through arrivals with too many bags”. At zero the fireworks go off and it opens, with a last line of yours: “Look up. I'm the one waving like an idiot.”",
        },
        {
          template: "snow-globe",
          heading: "Your two homes in one snow globe",
          body: "Choose the scene called “Your two homes” and the globe holds two little houses with a path worn between them. They shake the phone and it snows; each time it settles, one of your lines or photos has appeared inside. Four lines at most: “It's snowing here. I checked your forecast too.” The brass plaque at the end takes 44 characters: “Two addresses, one home. For now.”",
        },
        {
          template: "text-thread",
          heading: "The good morning they wake up to",
          body: "When you are hours apart, your evening is their morning. Write tonight what they will read at breakfast, up to forty messages that come in one after another behind the typing dots: “You're asleep.” “I walked past the place with the bad coffee and missed you anyway.” Then the paragraph. To put a photo between two messages, write [photo] on a line by itself.",
        },
        {
          template: "constellations",
          heading: "The same sky, with your photos for stars",
          body: "You can't share a room, and you do share a sky. Each photo is a star they tap to fly to, three to twelve of them. Once the last is found, the stars link up into the shape you chose, a heart, a star or an infinity sign, with your closing line under it: “Same sky. Go to the window, I'm at mine.” Send it when it is dark where they are.",
        },
        {
          template: "vinyl",
          heading: "The song you send each other, on a record",
          body: "Every long-distance couple has one song that gets sent back and forth. Put it on a turntable: they drop the needle, the record spins, and your photos flip past as album covers, twelve at most. Name the album “Songs for a Six-Hour Difference” and let the liner notes carry your message. Add a voice message for the last screen and say when you first sent it to them.",
        },
        {
          template: "pack-your-bags",
          heading: "The next visit, sprung as a surprise",
          body: "Book the trip to them, then tell them like this. Set “Going to” as their own city and “Leaving from” as yours. They pack your clues, “my worst jumper, by request”, “an appetite”, “the key you gave me”, with no idea where the case is headed, until the departures board spells out their own town. Put the real arrival on the ticket: “Fri 12 Dec, 19:40”.",
        },
        {
          template: "paper-crane",
          heading: "A crane for the night the call dropped",
          body: "A sheet of paper they fold by pressing and holding each crease, three to six folds, with one of your lines appearing at every fold: “I hate the delay on the line more than the distance.” “I say goodnight twice so one of them arrives.” When it is a crane they blow into the phone and it flies off, leaving your letter on the table.",
        },
        {
          template: "scrapbook",
          heading: "One page for the last visit",
          body: "Twelve photos from the days you had, taped to a scrapbook page as polaroids, a photo-booth strip and a roll of film. The cut-out title takes 28 characters, “four days in october”, and the pinned note is typewritten, with a dot to start a new line: “arrivals · gate B · 19:40”. Make one after every visit and they have a shelf of them.",
        },
        {
          template: "the-letter",
          heading: "A note for the bad day, kept until it comes",
          body: "Write it now, while things are fine, for the day the distance is too much. The free note holds 500 characters under a wax seal: “If you're reading this it has been a rubbish week. I'm still here, the flight is still booked, and you still snore.” Send the link with one instruction: don't open it until you need it. The link will wait.",
        },
      ],
    },
    es: {
      title: "11 ideas de regalos digitales para una relación a distancia",
      items: [
        {
          template: "halfway",
          heading: "Un avión de papel que cruza soplando la distancia real",
          body: "Una postal con un mapa: tu ciudad en una isla, la suya en la otra y, en grande, la distancia real entre los dos. Sopla al móvil y un avión de papel la recorre por la línea de puntos mientras bajan los kilómetros. Añade los sitios donde os habéis encontrado a medio camino, hasta cuatro, y una frase para el punto medio: “Por aquí debajo está el área de servicio donde nos despedimos.”",
        },
        {
          template: "passport",
          heading: "Un pasaporte con un sello por cada visita",
          body: "Su nombre en la portada, un globo que gira y una ruta dibujada de tu ciudad a la suya, con hasta seis escalas. Cada foto se convierte en un sello en una página, hasta diez: usa una de cada visita. La línea de la nacionalidad la escribes tú: “Doble nacionalidad: aquí y contigo”. La página del visado guarda tu mensaje.",
        },
        {
          template: "midnight-countdown",
          heading: "Una cuenta atrás hasta la puerta de llegadas",
          body: "Pon el reloj en el minuto en que aterriza tu vuelo, en su zona horaria, y manda el enlace semanas antes. Hasta entonces muestra el tiempo que falta bajo un cielo que oscurece, con el título “Hasta que salga por llegadas con demasiadas maletas”. A cero estallan los fuegos artificiales y se abre, con una última frase tuya: “Levanta la vista. Soy quien saluda sin vergüenza.”",
        },
        {
          template: "snow-globe",
          heading: "Vuestras dos casas en una bola de nieve",
          body: "Elige la escena “Vuestras dos casas” y la bola guarda dos casitas con un camino gastado entre ellas. Agita el móvil y nieva; cada vez que la nieve se posa, dentro ha aparecido una de tus frases o de tus fotos. Cuatro frases como máximo: “Aquí está nevando. También he mirado tu previsión.” En la placa de latón del final caben 44 caracteres: “Dos direcciones, una casa. De momento.”",
        },
        {
          template: "text-thread",
          heading: "Los buenos días que le esperan al despertar",
          body: "Con horas de diferencia, tu noche es su mañana. Escribe hoy lo que leerá en el desayuno, hasta cuarenta mensajes que van entrando uno tras otro después de los puntitos: “Estás durmiendo.” “He pasado por el sitio del café malo y te he echado de menos igual.” Y luego, el párrafo. Para meter una foto entre dos mensajes, escribe [photo] en una línea aparte.",
        },
        {
          template: "constellations",
          heading: "El mismo cielo, con tus fotos por estrellas",
          body: "No compartís habitación, pero sí cielo. Cada foto es una estrella que toca para volar hasta ella, de tres a doce. Al encontrar la última, las estrellas se enlazan en la figura que elegiste, un corazón, una estrella o un infinito, con tu frase final debajo: “El mismo cielo. Asómate a la ventana, yo estoy en la mía.” Mándalo cuando allí sea de noche.",
        },
        {
          template: "vinyl",
          heading: "La canción que os mandáis, en un disco",
          body: "Toda pareja a distancia tiene una canción que va y viene. Ponla en un tocadiscos: baja la aguja, el disco gira y tus fotos pasan como portadas, doce como máximo. Llama al disco “Canciones con seis horas de diferencia” y deja tu mensaje en las notas del libreto. Añade un mensaje de voz para la última pantalla y cuenta cuándo se la mandaste por primera vez.",
        },
        {
          template: "pack-your-bags",
          heading: "La próxima visita, anunciada por sorpresa",
          body: "Compra el billete para ir a su ciudad y cuéntaselo así. Pon su ciudad en “Destino” y la tuya en “Salida”. Mete tus pistas en la maleta, “mi peor jersey, a petición tuya”, “hambre”, “la llave que me diste”, sin saber adónde va, hasta que el panel de salidas deletrea su propia ciudad. Pon en el billete la llegada de verdad: “vie. 12 dic., 19:40”.",
        },
        {
          template: "paper-crane",
          heading: "Una grulla para la noche en que se cortó la llamada",
          body: "Una hoja de papel que dobla manteniendo pulsado cada pliegue, de tres a seis, con una frase tuya en cada doblez: “Odio más el retardo de la llamada que la distancia.” “Digo buenas noches dos veces para que una llegue.” Cuando ya es una grulla sopla al móvil y sale volando, y tu carta se queda en la mesa.",
        },
        {
          template: "scrapbook",
          heading: "Una página para la última visita",
          body: "Doce fotos de los días que tuvisteis, pegadas en una página de álbum como polaroids, una tira de fotomatón y un carrete. En el título recortado caben 28 caracteres, “cuatro días de octubre”, y la nota clavada va a máquina, con un punto para saltar de línea: “llegadas · puerta B · 19:40”. Haz una después de cada visita y tendrá una estantería entera.",
        },
        {
          template: "the-letter",
          heading: "Una nota para el día malo, guardada hasta que llegue",
          body: "Escríbela ahora, que todo va bien, para el día en que la distancia pese demasiado. En la nota gratis caben 500 caracteres bajo un sello de lacre: “Si estás leyendo esto, la semana ha sido horrible. Sigo aquí, el vuelo sigue comprado y tú sigues roncando.” Manda el enlace con una sola instrucción: no la abras hasta que haga falta. El enlace espera.",
        },
      ],
    },
  },

  apology: {
    en: {
      title: "8 ways to say sorry with a digital gift",
      items: [
        {
          template: "the-letter",
          heading: "The plain one: no “if”, no “but”",
          body: "A short note under a wax seal, free, up to 500 characters. That is not much room, which helps: say what you did, what it cost them, and what changes. “I was wrong about Saturday, and I knew it while I was still arguing. You asked for one thing. I'll be there at six.” No photo, and no song unless it is theirs.",
        },
        {
          template: "paper-crane",
          heading: "Six folds for six things you should have said",
          body: "They fold a sheet of paper by pressing and holding each crease. Let go early and it springs back. It can't be rushed, and an apology shouldn't be. Each fold shows one line, three to six of them: “I interrupted you, and you were right.” The line left on the table when the crane has flown is your last word: “I'll listen first next time.”",
        },
        {
          template: "text-thread",
          heading: "What you should have typed",
          body: "The argument happened over text, or should never have. Write what you ought to have sent, a bubble at a time, and let it arrive with the typing dots: “You said you were tired.” “I heard ‘I don't care’. You meant ‘I'm tired’.” “That one is on me.” Keep it under ten bubbles. The last message, the long one, is the apology itself.",
        },
        {
          template: "bloom",
          heading: "One flower, and nothing to answer",
          body: "A single flower on a windowsill that opens only while they keep a finger on the screen. If they are not ready, it stays shut. Nothing here asks for a reply. When it is open, your message is inside. Keep it to three sentences, choose a daisy or a tulip, and turn the stickers off so it stays quiet.",
        },
        {
          template: "bouquet",
          heading: "Flowers that don't turn up at their desk",
          body: "A delivery to their work makes the apology public, and makes them carry it home on the train. This one opens on their phone, when they choose. Build it from the flowers they like, not the expensive ones, and use the 30 characters on the card for the plain version: “No excuses. I'm sorry.” The longer message is behind the card.",
        },
        {
          template: "sticker-bomb",
          heading: "For small crimes only: twelve taps of grovelling",
          body: "Use this for the forgotten milk and the lateness, never for anything that made them cry. Every tap slaps a sticker where their finger lands, and some carry label strips you wrote, up to six: “ate the leftovers. guilty.” “was wrong about the route”. Change the line on the empty page to “hit me with stickers, I earned it”. Twelve taps in, your card opens.",
        },
        {
          template: "the-council",
          heading: "Let five cats rule that they were right",
          body: "The hearing is about the person who opens it, so charge them with what they got right: “being correct about the motorway, again”. Each cat reads a finding you wrote: “said ‘take the next exit’. was ignored.” Stamp it Approved. It suits an argument you can both already laugh about, and your letter, the full ruling, is where you say sorry properly.",
        },
        {
          template: "picnic",
          heading: "A peace offering, unpacked one thing at a time",
          body: "A basket on a gingham blanket. Each tap takes one thing out, strawberries, lemonade, tulips, your photos in frames, and every one carries a tag you wrote, three to eight of them: “the last strawberry, which is yours”, “I'll do the dishes all week. In writing.” The folded note at the bottom is your letter. If you plan a date to make up for it, that comes out of the basket too.",
        },
      ],
    },
    es: {
      title: "8 formas de pedir perdón con un regalo digital",
      items: [
        {
          template: "the-letter",
          heading: "La sencilla: sin “si” y sin “pero”",
          body: "Una nota corta bajo un sello de lacre, gratis, de hasta 500 caracteres. No es mucho sitio, y eso ayuda: di qué hiciste, qué le costó y qué cambia. “Me equivoqué con lo del sábado, y lo sabía mientras seguía discutiendo. Pediste una sola cosa. A las seis estoy allí.” Sin foto, y sin canción salvo que sea la suya.",
        },
        {
          template: "paper-crane",
          heading: "Seis pliegues para seis cosas que debiste decir",
          body: "Dobla una hoja de papel manteniendo pulsado cada pliegue. Si suelta antes de tiempo, se abre otra vez. No se puede hacer con prisa, y una disculpa tampoco. Cada pliegue enseña una frase, de tres a seis: “Te interrumpí, y tenías razón.” La que queda en la mesa cuando la grulla se va es tu última palabra: “La próxima vez escucho primero.”",
        },
        {
          template: "text-thread",
          heading: "Lo que tenías que haber escrito",
          body: "La discusión fue por mensajes, o nunca debió serlo. Escribe lo que tendrías que haber mandado, burbuja a burbuja, y que llegue con los puntitos de escribiendo: “Dijiste que no podías más.” “Yo entendí ‘me da igual’. Querías decir ‘estoy sin fuerzas’.” “Eso es culpa mía.” Que no pase de diez burbujas. El último mensaje, el largo, es la disculpa.",
        },
        {
          template: "bloom",
          heading: "Una sola flor, y nada que contestar",
          body: "Una flor en un alféizar que solo se abre mientras mantiene el dedo en la pantalla. Si todavía no quiere, se queda cerrada. Aquí nada pide respuesta. Cuando se abre, tu mensaje está dentro. Que sean tres frases, elige una margarita o un tulipán y desactiva las pegatinas para que no haga ruido.",
        },
        {
          template: "bouquet",
          heading: "Flores que no aparecen en su mesa de trabajo",
          body: "Un ramo entregado en su trabajo hace pública la disculpa, y luego hay que llevarlo a casa en el metro. Este se abre en su móvil, cuando quiera. Hazlo con las flores que le gustan, no con las caras, y usa los 30 caracteres de la tarjeta para la versión corta: “Sin excusas. Perdóname.” El mensaje largo está detrás de la tarjeta.",
        },
        {
          template: "sticker-bomb",
          heading: "Solo para delitos menores: doce toques de arrepentimiento",
          body: "Úsalo para la leche que olvidaste y para los retrasos, nunca para algo que le hizo llorar. Cada toque pega un sticker donde cae el dedo, y algunos llevan tiras de rotuladora escritas por ti, hasta seis: “me comí las sobras. culpable”, “me equivoqué de ruta”. Cambia la frase de la página vacía por “dame con los stickers, me lo gané”. A los doce toques se abre tu tarjeta.",
        },
        {
          template: "the-council",
          heading: "Que cinco gatos sentencien que tenía razón",
          body: "La vista trata de quien la abre, así que la acusación es aquello en lo que acertó: “tener razón con la autopista, otra vez”. Cada gato lee una conclusión escrita por ti: “dijo ‘coge la siguiente salida’. nadie le hizo caso.” Ponle el sello de visto bueno. Va bien para una discusión de la que ya os podéis reír, y en tu carta, la sentencia completa, pides perdón como es debido.",
        },
        {
          template: "picnic",
          heading: "Una ofrenda de paz, sacada cosa a cosa",
          body: "Una cesta sobre una manta de cuadros. Cada toque saca una cosa, fresas, limonada, tulipanes, tus fotos enmarcadas, y cada una lleva una etiqueta escrita por ti, de tres a ocho: “la última fresa, que es tuya”, “friego yo toda la semana. Por escrito.” La nota doblada del fondo es tu carta. Si planeas una cita para compensar, también sale de la cesta.",
        },
      ],
    },
  },

  "just-because": {
    en: {
      title: "11 digital gifts for no reason at all",
      items: [
        {
          template: "fortune-cookie",
          heading: "A fortune for an ordinary Tuesday",
          body: "A plate of cookies that crack open on slips you wrote. Three is the minimum and three is plenty for a weekday: “Someone is thinking about you in a meeting. It's me. It's a long meeting.” “Tonight you will be handed the good blanket.” Put today's date in the lucky numbers, so the day with no occasion gets one.",
        },
        {
          template: "sticker-bomb",
          heading: "Twelve taps for the middle of their workday",
          body: "A blank page and one instruction. Every tap slaps down a sticker, cats, hamsters, your own photos as polaroids, and under some of them a label strip you wrote: “best thing in my week”, “has never once been boring”. Quick to make and quicker to open: about right for a Wednesday.",
        },
        {
          template: "kawaii",
          heading: "A plushie with something to tell them",
          body: "A bunny, a bear or a kitten in a bow waves hello and says a line of yours before the gift box opens: “psst. someone thinks you're doing great”. Inside are your photos as stickers and your message in a speech bubble. The ribbon banner takes 24 characters, and “no reason at all” is the honest thing to put on it.",
        },
        {
          template: "picnic",
          heading: "A picnic in the middle of the week",
          body: "They tap a basket and unpack it one thing at a time: strawberries, cherries, pink lemonade, your photos in gingham frames. Each thing has a tag with a line from you, three to eight: “the way you narrate the cat's thoughts”, “your terrible, terrible puns”. If you have planned a real date, it comes out of the basket too.",
        },
        {
          template: "on-repeat",
          heading: "A playlist of right now",
          body: "Your photo as the album cover, their name as the artist, and every photo you add becomes a track whose title is its caption: “the one from the kitchen”, “that Sunday, on repeat”. Name the playlist, 24 characters, “songs for your commute”, and write the note under the player: “track 3 is still stuck in my head”. Send it as they leave work.",
        },
        {
          template: "text-thread",
          heading: "A thread that turns into a paragraph",
          body: "It starts the way your chats do, “no reason. I just saw a dog that looked like you”, and arrives bubble by bubble with the typing dots. Six or seven lines of nonsense, a photo dropped in with [photo], and then the last message: the three sentences you would never send in the middle of a Tuesday, sent in the middle of a Tuesday.",
        },
        {
          template: "the-letter",
          heading: "Three lines, free, sent before lunch",
          body: "The free note is 500 characters under a wax seal, and for no occasion it should use about half of that. One line on why today, one thing you like about them that you have never said, and stop: “You hummed while you made the coffee this morning. I'd like forty more years of that, please.” Add a song from the library.",
        },
        {
          template: "favorite-person",
          heading: "A page that says who they are to you",
          body: "They lift a sheet of tissue paper with their name on it, and under it is a watercolour scrapbook page: your photos on polaroids, pearls, cherry blossom, a satin bow, and a torn note in the middle with 22 characters of your own. “favourite human” fits. So does “the good bit of my day”. Every tap on the page doodles a heart.",
        },
        {
          template: "the-council",
          heading: "A hearing about nothing in particular",
          body: "Five cats convene to consider the case of someone who has done nothing wrong. Charge: “being suspiciously nice to come home to”. Findings: “leaves the last biscuit, every time”, “laughs before the punchline”. The gavel falls three times and the stamp says Certified icon. Your letter is the full ruling, so it can be two lines long.",
        },
        {
          template: "arcade",
          heading: "A coffee-break game with your photos as the prizes",
          body: "A tiny retro game with a title you choose, “TUESDAY QUEST”, where they drag a basket to catch falling hearts, stars or slices of cake. Each level cleared reveals a photo, and the last one reveals your message. Drop the catches per level from eight to four and it fits inside a coffee break, with a leaderboard of one.",
        },
        {
          template: "scratch-card",
          heading: "A small plan, under foil",
          body: "It doesn't have to be a proposal. Three cards with a photo each, and on the last one a plan for tonight in big letters: “Friday is cancelled. We're getting noodles.” Print your own words on the foil, “scratch for dinner”, and send it at four in the afternoon, when the day is at its longest.",
        },
      ],
    },
    es: {
      title: "11 regalos digitales sin motivo alguno",
      items: [
        {
          template: "fortune-cookie",
          heading: "Una fortuna para un martes cualquiera",
          body: "Un plato de galletas que se parten sobre tiras escritas por ti. El mínimo son tres, y tres sobran para un día de diario: “Alguien piensa en ti en una reunión. Soy yo. Es una reunión larga.” “Esta noche te tocará la manta buena.” Pon la fecha de hoy en los números de la suerte, y el día sin motivo ya tiene uno.",
        },
        {
          template: "sticker-bomb",
          heading: "Doce toques en mitad de su jornada",
          body: "Una página vacía y una instrucción. Cada toque pega un sticker, gatos, hámsteres, tus propias fotos como polaroids, y bajo algunos una tira de rotuladora escrita por ti: “lo mejor de mi semana”, “no ha aburrido nunca a nadie”. Se hace rápido y se abre más rápido: lo justo para un miércoles.",
        },
        {
          template: "kawaii",
          heading: "Un peluche con algo que decirle",
          body: "Un conejito, un osito o un gatito con lazo saluda y dice una frase tuya antes de que se abra la caja: “pst. alguien cree que lo estás haciendo genial”. Dentro van tus fotos como pegatinas y tu mensaje en un bocadillo. En la cinta caben 24 caracteres, y “porque sí” es lo más sincero que puedes poner.",
        },
        {
          template: "picnic",
          heading: "Un pícnic en mitad de la semana",
          body: "Tocan una cesta y la van vaciando cosa a cosa: fresas, cerezas, limonada rosa, tus fotos en marcos de cuadros. Cada cosa lleva una etiqueta con una frase tuya, de tres a ocho: “cómo le pones voz al gato”, “tus juegos de palabras, que son malísimos”. Si has planeado una cita de verdad, también sale de la cesta.",
        },
        {
          template: "on-repeat",
          heading: "Una playlist de ahora mismo",
          body: "Tu foto como portada, su nombre como artista, y cada foto que añades se convierte en una canción cuyo título es su pie de foto: “la de la cocina”, “aquel domingo, en bucle”. Ponle nombre a la playlist, 24 caracteres, “para tu vuelta a casa”, y escribe la nota de debajo del reproductor: “la 3 sigue sin salirme de la cabeza”. Mándala a la hora en que sale del trabajo.",
        },
        {
          template: "text-thread",
          heading: "Un hilo que acaba en un párrafo",
          body: "Empieza como vuestros chats, “sin motivo. he visto un perro igualito a ti”, y llega burbuja a burbuja con los puntitos de escribiendo. Seis o siete líneas de tonterías, una foto que entra con [photo], y luego el último mensaje: las tres frases que nunca mandarías en mitad de un martes, mandadas en mitad de un martes.",
        },
        {
          template: "the-letter",
          heading: "Tres líneas, gratis, enviadas antes de comer",
          body: "La nota gratis son 500 caracteres bajo un sello de lacre, y sin motivo debería gastar la mitad. Una línea sobre por qué hoy, una cosa que te gusta de esa persona y que nunca has dicho, y ya: “Esta mañana tarareabas mientras hacías el café. Quiero cuarenta años más de eso, por favor.” Añade una canción de la biblioteca.",
        },
        {
          template: "favorite-person",
          heading: "Una página que dice quién es para ti",
          body: "Levanta una hoja de papel de seda con su nombre y debajo hay una página de álbum en acuarela: tus fotos en polaroids, perlas, flor de cerezo, un lazo de raso y, en el centro, una nota rasgada con 22 caracteres tuyos. “mi persona favorita” cabe. “lo mejor de mi día” también. Cada toque en la página dibuja un corazón.",
        },
        {
          template: "the-council",
          heading: "Una vista sobre nada en particular",
          body: "Cinco gatos se reúnen para estudiar el caso de alguien que no ha hecho nada malo. Acusación: “dar demasiadas ganas de volver a casa”. Conclusiones: “deja siempre la última galleta”, “se ríe antes del final del chiste”. El mazo cae tres veces y el sello dice icono certificado. Tu carta es la sentencia completa, así que puede tener dos líneas.",
        },
        {
          template: "arcade",
          heading: "Un juego para la pausa del café, con tus fotos de premio",
          body: "Un minijuego retro con el título que elijas, “MISIÓN MARTES”, en el que arrastran una cesta para atrapar corazones, estrellas o trozos de tarta. Cada nivel superado descubre una foto, y el último descubre tu mensaje. Baja las capturas por nivel de ocho a cuatro y cabe en la pausa del café, con un ranking de una sola persona.",
        },
        {
          template: "scratch-card",
          heading: "Un plan pequeño, bajo el metalizado",
          body: "No hace falta que sea una pedida. Tres tarjetas con una foto cada una y, en la última, un plan para esta noche en letras grandes: “El viernes queda cancelado. Vamos a por ramen.” Imprime tus propias palabras sobre el metalizado, “rasca y cenamos”, y mándalo a las cuatro de la tarde, cuando el día se hace más largo.",
        },
      ],
    },
  },

  thanksgiving: {
    en: {
      title: "8 digital Thanksgiving gift ideas",
      items: [
        {
          template: "wishbone",
          heading: "A wishbone only one of you can win",
          body: "A wishbone on a plate with a name tag on each end. They pull their side with a finger until it snaps, and you decide beforehand who gets the big half. The wish that comes out on a card is yours, 120 characters: “That we host next year, and your mother brings the pie.” Thanksgiving is the fourth Thursday of November in the US and the second Monday of October in Canada.",
        },
        {
          template: "light-the-candles",
          heading: "Five candles, five things from this year",
          body: "A table at dusk with five unlit candles. They carry a flame from wick to wick with a finger, and each candle that catches writes one thing you are thankful for in light: “the night you drove four hours because I sounded off”, “every lunch you packed without being asked”. Sixty characters each. Order them small to large, and the fifth candle is the one they remember.",
        },
        {
          template: "recipe-box",
          heading: "The dish nobody else is allowed to make",
          body: "Every family table has one: the stuffing, the pie, the thing with marshmallows. Write it as a recipe card for the person who makes it, with them as the ingredients, six at most: “one argument about sage, annually”, “forty years of not measuring anything”. Name the card, “The stuffing (do not improve)”, and write your own line under the title, or it will read “Makes one of her”.",
        },
        {
          template: "the-toast",
          heading: "A toast for the one who couldn't fly in",
          body: "Two glasses on linen and a menu card between them. They tilt the phone to pour and knock it once to clink, then the card opens into what you would have said standing up. First line: “To the ones at the table, and the one on the screen.” Put the house on the menu as the venue, “Aunt Jo's, the kids' table”, and fill the glasses with something without alcohol if that is the house rule.",
        },
        {
          template: "jar-of-reasons",
          heading: "A jar of thank-yous for the host",
          body: "The person who cooks for twelve gets a “thanks, that was great” at the door. Give them a jar instead, to shake out the morning after: “For pretending the gravy was meant to be like that.” “For the chair you found for my new boyfriend.” Three notes is the minimum. Give the jar a label of its own, or it promises reasons I love you: “Thank you for the following”.",
        },
        {
          template: "fall-for-you",
          heading: "An autumn page with a recipe card for two",
          body: "A dark room and a candle in a jar. One tap lights it, and an autumn collage is underneath on brown gingham: your photos on polaroids, maple leaves, a patchwork pumpkin, and wooden letter blocks that spell their name or up to 12 letters of yours, like THANKFUL. The recipe card is for one line in your handwriting: “Two forks, one pie, nothing for your brother.”",
        },
        {
          template: "fireside",
          heading: "For the one who isn't coming home this year",
          body: "A cabin at dusk with leaves falling past the window, or snow if that is truer. They light the candle, the room turns gold and a letter unfolds from the blanket, with your photos pegged on a string. Tie a tag to the candle, 24 characters, “your seat is saved”, and choose what is in the mug: cocoa, tea or coffee.",
        },
        {
          template: "front-page",
          heading: "The family paper, Thanksgiving edition",
          body: "A front page about the day itself. Headline: “TURKEY DRY AGAIN, FAMILY ‘FINE WITH IT’”. Weather: “Warm front moving in from the oven.” Use the eight classified ads for the table's running jokes: “WANTED: one adult willing to sit at the kids' table. Pie provided.” Send it to the family group on Friday morning, with the leftovers.",
        },
      ],
    },
    es: {
      title: "8 ideas de regalos digitales de Acción de Gracias",
      items: [
        {
          template: "wishbone",
          heading: "Una espoleta que solo gana uno de los dos",
          body: "Una espoleta en un plato, con una etiqueta en cada punta. Tira de su lado con el dedo hasta que se parte, y tú decides antes a quién le toca la mitad grande. El deseo que sale en la tarjeta es tuyo, 120 caracteres: “Que el año que viene sea en casa, y que tu madre traiga la tarta.” Acción de Gracias es el cuarto jueves de noviembre en Estados Unidos y el segundo lunes de octubre en Canadá.",
        },
        {
          template: "light-the-candles",
          heading: "Cinco velas, cinco cosas de este año",
          body: "Una mesa al anochecer con cinco velas apagadas. Lleva la llama de mecha en mecha con el dedo, y cada vela que prende escribe con luz algo por lo que das las gracias: “la noche que condujiste cuatro horas por mi voz”, “cada táper que preparaste sin que lo pidiera”. Sesenta caracteres cada una. Ordénalas de menor a mayor, y la quinta vela es la que se recuerda.",
        },
        {
          template: "recipe-box",
          heading: "El plato que nadie más puede tocar",
          body: "En toda mesa familiar hay uno: el relleno, la tarta, eso que lleva nubes de azúcar. Escríbelo como una ficha de receta para quien lo cocina, con esa persona como ingredientes, seis como máximo: “una discusión anual sobre la salvia”, “cuarenta años sin medir nada”. Ponle nombre a la ficha, “El relleno (no se mejora)”, y escribe tú la línea de debajo del título, o dirá “Sale una como ella”.",
        },
        {
          template: "the-toast",
          heading: "Un brindis para quien no pudo coger el avión",
          body: "Dos copas sobre lino y un menú entre ellas. Inclina el móvil para servir, lo toca una vez para chocar las copas, y del menú sale lo que habrías dicho de pie. Primera frase: “Por quienes estáis en la mesa, y por quien está en la pantalla.” Pon la casa en el menú, “En casa de la tía Jo, mesa de los niños”, y llena las copas con algo sin alcohol si es la norma.",
        },
        {
          template: "jar-of-reasons",
          heading: "Un frasco de gracias para quien organiza",
          body: "A quien cocina para doce se le dice “gracias, estaba todo buenísimo” en la puerta. Dale un frasco para ir sacando notas a la mañana siguiente: “Por fingir que la salsa tenía que quedar así.” “Por la silla que encontraste para mi novio nuevo.” El mínimo son tres notas. Cambia la etiqueta, para que no prometa razones por las que te quiero: “Gracias por lo siguiente”.",
        },
        {
          template: "fall-for-you",
          heading: "Una página de otoño con una receta para dos",
          body: "Una habitación a oscuras y una vela en un tarro. Un toque la enciende, y debajo hay un collage de otoño sobre cuadros marrones: tus fotos en polaroids, hojas de arce, una calabaza de patchwork y unos bloques de madera que deletrean su nombre o hasta 12 letras tuyas, como GRACIAS. La ficha de receta es para una frase a mano: “Dos tenedores, una tarta, y a tu hermano ni olerla.”",
        },
        {
          template: "fireside",
          heading: "Para quien este año no vuelve a casa",
          body: "Una cabaña al anochecer, con hojas cayendo tras la ventana, o nieve si se parece más. Enciende la vela, la habitación se vuelve dorada y de la manta sale una carta, con tus fotos colgadas de un hilo con pinzas. Átale una etiqueta a la vela, 24 caracteres, “tu silla sigue guardada”, y elige qué hay en la taza: cacao, té o café.",
        },
        {
          template: "front-page",
          heading: "El periódico de la familia, edición de Acción de Gracias",
          body: "Una portada sobre el día en sí. Titular: “EL PAVO, SECO OTRA VEZ; LA FAMILIA DICE QUE ‘ESTÁ BIEN’”. El tiempo: “Frente cálido procedente del horno.” Usa los ocho anuncios clasificados para las bromas de siempre: “SE BUSCA un adulto dispuesto a sentarse en la mesa de los niños. Hay tarta.” Mándalo al grupo de la familia el viernes por la mañana, con las sobras.",
        },
      ],
    },
  },
};

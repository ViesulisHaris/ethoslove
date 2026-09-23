import type { StickerId } from "@/templates/_shared/covers/stickers";

type L = { en: string; es: string };
type Ls = { en: string[]; es: string[] };

export type TripKind = "road" | "city" | "train" | "islands";
export const TRIP_KINDS: TripKind[] = ["road", "city", "islands", "train"];

export type TripStop = {
  name: string;
  /** The Spanish name, where Spanish has its own (Nápoles, Praga). */
  es?: string;
  lat: number;
  lng: number;
  /** Nights spent here; 0 is a stop on the way. */
  nights: number;
  note: L;
};

export type TripDay = { day: number; title: L; items: Ls };

/**
 * A trip for two, written like a friend who has been: where to sleep, what to do each day in the
 * order it works on the ground, and something for each evening. Coordinates are the town centre
 * (or the square, or the sight) as OpenStreetMap has it, checked against Nominatim.
 */
export type Trip = {
  id: string;
  kind: TripKind;
  title: L;
  blurb: L;
  days: number;
  /** 1–12. */
  bestMonths: number[];
  /** What two people spend there a day, flights aside: € up to ~150, €€ ~150–300, €€€ more. */
  budget: 1 | 2 | 3;
  /** The airport you'd fly into (IATA); it is in AIRPORTS. */
  flyTo: string;
  stops: TripStop[];
  plan: TripDay[];
  /** public/trips/<id>.webp (with a -sm twin), or null where there is no photograph yet. */
  image: string | null;
  /** The card's colours and sticker: behind the photograph while it loads, and instead of it where there is none. */
  art: { from: string; to: string; sticker: StickerId };
};

const photo = (id: string) => `/trips/${id}.webp`;

export const TRIPS: Trip[] = [
  {
    id: "lisbon-slow-weekend",
    kind: "city",
    title: { en: "Lisbon, slowly", es: "Lisboa, sin prisa" },
    blurb: {
      en: "Three days of steep lanes, custard tarts still warm, and a ferry across the river for the sunset most visitors miss. Stay in Alfama and walk everywhere; the hills are the point.",
      es: "Tres días de cuestas, pastéis de nata aún calientes y un ferry al otro lado del río para ver el atardecer que casi nadie ve. Dormid en Alfama y moveos a pie: las cuestas son parte del plan.",
    },
    days: 3,
    bestMonths: [3, 4, 5, 6, 9, 10],
    budget: 2,
    flyTo: "LIS",
    stops: [
      { name: "Alfama", lat: 38.7118, lng: -9.1284, nights: 2, note: { en: "Where to sleep: quiet at night once the fado houses close, and five minutes from the castle.", es: "Donde dormir: tranquilo de noche cuando cierran las casas de fado, y a cinco minutos del castillo." } },
      { name: "Chiado", lat: 38.7103, lng: -9.1405, nights: 0, note: { en: "Bookshops, old cafés and the wide staircases down to the river.", es: "Librerías, cafés de siempre y las escalinatas anchas que bajan hasta el río." } },
      { name: "Belém", lat: 38.6978, lng: -9.2056, nights: 0, note: { en: "Go early for the pastéis and the monastery, before the coaches arrive.", es: "Id temprano a por los pastéis y al monasterio, antes de que lleguen los autocares." } },
      { name: "Cacilhas", lat: 38.6808, lng: -9.1492, nights: 0, note: { en: "Ten minutes by ferry from Cais do Sodré, and the best view back at the city.", es: "A diez minutos en ferry desde Cais do Sodré, con la mejor vista de vuelta a la ciudad." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Alfama and the castle hill", es: "Alfama y la colina del castillo" },
        items: {
          en: [
            "Drop the bags and get lost in Alfama on purpose; every lane ends at the river anyway.",
            "Coffee at the Miradouro de Santa Luzia, between the tiled benches and the bougainvillea.",
            "Castelo de São Jorge in the late afternoon, when the peacocks come out and the light turns gold.",
            "Evening: a small fado house in Alfama. Book a table, and go quiet when the lights go down.",
          ],
          es: [
            "Dejad las maletas y perdeos por Alfama a propósito: todas las callejuelas acaban en el río.",
            "Un café en el Miradouro de Santa Luzia, entre los bancos de azulejos y las buganvillas.",
            "El Castelo de São Jorge a última hora de la tarde, cuando salen los pavos reales y la luz se vuelve dorada.",
            "Por la noche: una casa de fado pequeña en Alfama. Reservad mesa y guardad silencio cuando bajen las luces.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Belém, then Chiado", es: "Belém y luego Chiado" },
        items: {
          en: [
            "Tram 15 out to Belém, and pastéis de nata at Pastéis de Belém, warm, with cinnamon.",
            "The cloister of the Jerónimos Monastery, then along the river to the Belém Tower.",
            "Back in town, Livraria Bertrand in Chiado, the oldest working bookshop in the world. Choose a book for each other.",
            "Evening: sunset at the Miradouro de São Pedro de Alcântara, then dinner in the side streets of Príncipe Real.",
          ],
          es: [
            "El tranvía 15 hasta Belém y pastéis de nata en Pastéis de Belém, calientes y con canela.",
            "El claustro del Monasterio de los Jerónimos y un paseo junto al río hasta la Torre de Belém.",
            "De vuelta, la Livraria Bertrand en Chiado, la librería en activo más antigua del mundo. Elegid un libro el uno para el otro.",
            "Por la noche: el atardecer en el Miradouro de São Pedro de Alcântara y cena por las calles de Príncipe Real.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Across the river", es: "Al otro lado del río" },
        items: {
          en: [
            "A slow breakfast, then lunch at the Mercado de Campo de Ourique, where people who live here eat.",
            "The ferry from Cais do Sodré to Cacilhas: ten minutes, a couple of euros, the whole city on the water behind you.",
            "Walk the river path to Ponto Final and order grilled fish at a table on the pier.",
            "Evening: the ferry back as the lights come on across Lisbon.",
          ],
          es: [
            "Desayuno sin prisa y comida en el Mercado de Campo de Ourique, donde come la gente del barrio.",
            "El ferry de Cais do Sodré a Cacilhas: diez minutos, un par de euros y la ciudad entera sobre el agua a vuestra espalda.",
            "Caminad por la orilla hasta Ponto Final y pedid pescado a la brasa en una mesa sobre el muelle.",
            "Por la noche: el ferry de vuelta mientras se encienden las luces de Lisboa.",
          ],
        },
      },
    ],
    image: photo("lisbon-slow-weekend"),
    art: { from: "#FFE3D3", to: "#F9C6D0", sticker: "heart" },
  },
  {
    id: "amalfi-coast",
    kind: "road",
    title: { en: "The Amalfi Coast by car", es: "La costa amalfitana en coche" },
    blurb: {
      en: "Pizza in Naples, the ruins of Pompeii, then the coast road, which never runs straight for long. Rent the smallest car they have, and leave it parked in Positano: the boat is quicker.",
      es: "Pizza en Nápoles, las ruinas de Pompeya y luego la carretera de la costa, que no va recta ni un minuto. Alquilad el coche más pequeño que tengan y dejadlo aparcado en Positano: en barco se llega antes.",
    },
    days: 6,
    bestMonths: [5, 6, 9, 10],
    budget: 3,
    flyTo: "NAP",
    stops: [
      { name: "Naples", es: "Nápoles", lat: 40.847, lng: 14.2518, nights: 1, note: { en: "Collect the car on the way out, not on arrival: nobody should drive in Naples on their first evening.", es: "Recoged el coche al salir, no al llegar: nadie debería conducir por Nápoles la primera noche." } },
      { name: "Pompeii", es: "Pompeya", lat: 40.7485, lng: 14.4831, nights: 0, note: { en: "Three hours is enough if you pick a route. Bring water and a hat; there is little shade.", es: "Con tres horas basta si elegís un recorrido. Llevad agua y gorra: apenas hay sombra." } },
      { name: "Sorrento", lat: 40.6262, lng: 14.3758, nights: 1, note: { en: "Park at the hotel and walk: the old town is small, and the lemon groves hide behind its walls.", es: "Aparcad en el hotel y caminad: el casco antiguo es pequeño y los limoneros se esconden tras sus muros." } },
      { name: "Positano", lat: 40.6276, lng: 14.4877, nights: 2, note: { en: "Parking costs more than dinner. Book a hotel with a space, or come by boat from Sorrento.", es: "Aparcar cuesta más que la cena. Buscad hotel con plaza, o venid en barco desde Sorrento." } },
      { name: "Amalfi", lat: 40.6342, lng: 14.6026, nights: 1, note: { en: "Busy by day, lovely after six, when the day boats leave.", es: "Lleno de gente de día, precioso a partir de las seis, cuando se van los barcos de excursión." } },
      { name: "Ravello", lat: 40.6487, lng: 14.6127, nights: 0, note: { en: "Twenty minutes up the hill from Amalfi, and a quieter world.", es: "A veinte minutos cuesta arriba desde Amalfi, y otro mundo mucho más tranquilo." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Naples", es: "Nápoles" },
        items: {
          en: [
            "Land, leave the bags near the centro storico and walk Spaccanapoli end to end.",
            "A sfogliatella and an espresso standing at the counter, the way it's done here.",
            "The Veiled Christ in the Cappella Sansevero: twenty minutes you'll talk about for years. Book ahead.",
            "Evening: a margherita on Via dei Tribunali, then the seafront walk to Castel dell'Ovo as the bay lights up.",
          ],
          es: [
            "Aterrizad, dejad las maletas cerca del centro histórico y recorred Spaccanapoli de punta a punta.",
            "Una sfogliatella y un espresso de pie en la barra, como se hace aquí.",
            "El Cristo velado de la Cappella Sansevero: veinte minutos de los que hablaréis durante años. Reservad antes.",
            "Por la noche: una margarita en Via dei Tribunali y el paseo marítimo hasta el Castel dell'Ovo con la bahía iluminada.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Pompeii, then Sorrento", es: "Pompeya y luego Sorrento" },
        items: {
          en: [
            "Pick up the car and be at Pompeii's Porta Marina gate when it opens.",
            "The Villa of the Mysteries, the Forum and the amphitheatre; skip the rest without guilt.",
            "Forty minutes on to Sorrento, and a lemon granita in Piazza Tasso.",
            "Evening: sunset over the bay from the Villa Comunale gardens, then dinner in the old town.",
          ],
          es: [
            "Recoged el coche y plantaos en la Porta Marina de Pompeya a la hora de abrir.",
            "La Villa de los Misterios, el Foro y el anfiteatro; saltaos el resto sin remordimientos.",
            "Cuarenta minutos más hasta Sorrento y un granizado de limón en la Piazza Tasso.",
            "Por la noche: el atardecer sobre la bahía desde los jardines de la Villa Comunale y cena en el casco antiguo.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "The coast road to Positano", es: "La carretera de la costa hasta Positano" },
        items: {
          en: [
            "Drive the SS163 early, before the buses, and stop at every lay-by with a view, which is all of them.",
            "Check in to Positano and go straight down the steps to Spiaggia Grande for a swim.",
            "A late lunch of spaghetti with clams at a beach restaurant, feet in the sand.",
            "Evening: aperitivo on a terrace above the town while the houses turn pink.",
          ],
          es: [
            "Haced la SS163 temprano, antes que los autobuses, y parad en cada mirador, que es decir en todos.",
            "Instalaos en Positano y bajad directos por las escaleras a la Spiaggia Grande a daros un baño.",
            "Comida tardía de espaguetis con almejas en un restaurante de playa, con los pies en la arena.",
            "Por la noche: aperitivo en una terraza sobre el pueblo mientras las casas se vuelven rosas.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "The Path of the Gods", es: "El Sendero de los Dioses" },
        items: {
          en: [
            "Bus up to Bomerano and walk the Path of the Gods back towards Positano: three hours, mostly downhill, the whole coast below you.",
            "Lunch in Nocelle at the end of the path, then the long flight of steps down to town.",
            "The afternoon on a rented boat or a sunbed; you've earned it.",
            "Evening: dinner with a view over the bay. Book the terrace, not the room.",
          ],
          es: [
            "Autobús hasta Bomerano y el Sendero de los Dioses de vuelta hacia Positano: tres horas, casi todo cuesta abajo, con la costa entera a vuestros pies.",
            "Comida en Nocelle, al final del camino, y la larga escalinata de bajada hasta el pueblo.",
            "La tarde en una barca alquilada o en una tumbona: os lo habéis ganado.",
            "Por la noche: cena con vistas a la bahía. Reservad en la terraza, no en el comedor.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "Amalfi and Atrani", es: "Amalfi y Atrani" },
        items: {
          en: [
            "Drive or take the ferry to Amalfi, and climb the cathedral steps before the crowds.",
            "The paper museum in the Valle dei Mulini: Amalfi has made paper since the Middle Ages. Buy a sheet for a letter.",
            "A swim at Atrani's little beach, one bay along, which most people walk straight past.",
            "Evening: dinner in Atrani's tiny square, then the walk back to Amalfi by lamplight.",
          ],
          es: [
            "En coche o en ferry hasta Amalfi, y subid las escaleras de la catedral antes de que llegue la gente.",
            "El Museo del Papel en el Valle dei Mulini: en Amalfi se hace papel desde la Edad Media. Comprad una hoja para una carta.",
            "Un baño en la playita de Atrani, en la cala de al lado, que casi todo el mundo pasa de largo.",
            "Por la noche: cena en la plaza diminuta de Atrani y vuelta a pie a Amalfi a la luz de las farolas.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "Ravello, then home", es: "Ravello y vuelta a casa" },
        items: {
          en: [
            "Up to Ravello in the morning for the gardens of Villa Rufolo.",
            "The Terrace of Infinity at Villa Cimbrone: marble busts, a sheer drop and the sea.",
            "Lunch in the piazza, then about an hour and a half back to Naples airport.",
            "On the way down, the ceramics shops: one plate you'll eat off every Sunday.",
          ],
          es: [
            "Subid a Ravello por la mañana para ver los jardines de Villa Rufolo.",
            "La Terraza del Infinito de Villa Cimbrone: bustos de mármol, un precipicio y el mar.",
            "Comida en la plaza y hora y media de vuelta al aeropuerto de Nápoles.",
            "En la bajada, las tiendas de cerámica: un plato en el que comeréis cada domingo.",
          ],
        },
      },
    ],
    image: photo("amalfi-coast"),
    art: { from: "#FFF1C9", to: "#FBD3B5", sticker: "sparkle" },
  },
  {
    id: "tuscany-hill-towns",
    kind: "road",
    title: { en: "Tuscany's hill towns", es: "Los pueblos de la Toscana" },
    blurb: {
      en: "Two nights in Florence, then south through Chianti on the old SR222, with a hill town at the end of every afternoon. Drive less than you think you will; the best of it is sitting still.",
      es: "Dos noches en Florencia y luego hacia el sur por el Chianti, por la vieja SR222, con un pueblo en lo alto al final de cada tarde. Conducid menos de lo que pensáis: lo mejor es quedarse quieto.",
    },
    days: 6,
    bestMonths: [4, 5, 6, 9, 10],
    budget: 2,
    flyTo: "FLR",
    stops: [
      { name: "Florence", es: "Florencia", lat: 43.7731, lng: 11.2555, nights: 2, note: { en: "Book the Uffizi or the Accademia ahead, not both: one museum a day is plenty for two.", es: "Reservad los Uffizi o la Accademia, no los dos: un museo al día es suficiente para dos." } },
      { name: "Greve in Chianti", lat: 43.5823, lng: 11.3169, nights: 1, note: { en: "A triangular piazza, a famous butcher, and wine cellars in every direction.", es: "Una plaza triangular, una carnicería famosa y bodegas en todas direcciones." } },
      { name: "Siena", lat: 43.3184, lng: 11.3316, nights: 1, note: { en: "Sleep inside the walls and leave the car outside them; the centre is closed to traffic.", es: "Dormid dentro de las murallas y dejad el coche fuera: el centro está cerrado al tráfico." } },
      { name: "Pienza", lat: 43.0765, lng: 11.6789, nights: 0, note: { en: "The whole town takes an hour. Buy pecorino, then lean on the walls over the Val d'Orcia.", es: "El pueblo entero se ve en una hora. Comprad pecorino y asomaos a la muralla sobre el Val d'Orcia." } },
      { name: "Montepulciano", lat: 43.0927, lng: 11.781, nights: 1, note: { en: "Steep, red-brick, and full of wine cellars dug into the hill.", es: "Empinado, de ladrillo rojo y lleno de bodegas excavadas en la colina." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Florence from above", es: "Florencia desde arriba" },
        items: {
          en: [
            "Land, drop the bags and walk to the Duomo without a plan.",
            "Climb Giotto's bell tower instead of the dome: a shorter queue, and the dome is in the view.",
            "Gelato, and a slow walk over the Ponte Vecchio into the Oltrarno.",
            "Evening: sunset from San Miniato al Monte, above the crowd at Piazzale Michelangelo, then dinner around Santo Spirito.",
          ],
          es: [
            "Aterrizad, dejad las maletas y caminad hasta el Duomo sin plan.",
            "Subid al campanario de Giotto en vez de a la cúpula: menos cola, y la cúpula sale en la vista.",
            "Un helado y un paseo lento por el Ponte Vecchio hasta el Oltrarno.",
            "Por la noche: el atardecer desde San Miniato al Monte, por encima del gentío del Piazzale Michelangelo, y cena por Santo Spirito.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Florence, slowly", es: "Florencia, sin prisa" },
        items: {
          en: [
            "The Uffizi first thing, with a booked slot: Botticelli's Venus and Primavera, then out.",
            "Lunch upstairs at the Mercato Centrale, or a lampredotto sandwich downstairs if you're brave.",
            "The Boboli Gardens in the afternoon, and a rest under the cypresses.",
            "Evening: a bistecca alla fiorentina for two, shared, rare, and not up for discussion.",
          ],
          es: [
            "Los Uffizi a primera hora, con entrada reservada: la Venus y la Primavera de Botticelli, y fuera.",
            "Comida en la planta de arriba del Mercato Centrale, o un bocadillo de lampredotto abajo si sois valientes.",
            "Por la tarde, los Jardines de Bóboli y un descanso bajo los cipreses.",
            "Por la noche: una bistecca alla fiorentina para dos, compartida, poco hecha y sin discusión.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Into Chianti", es: "Hacia el Chianti" },
        items: {
          en: [
            "Pick up the car on the edge of town and take the SR222, the Chiantigiana, south.",
            "Coffee and cured meats at the Antica Macelleria Falorni on Greve's piazza.",
            "A cellar visit and tasting at a family winery near Panzano. One of you drives, so one of you spits.",
            "Evening: dinner at the farmhouse, then a walk down the lane; in early summer the fireflies come out.",
          ],
          es: [
            "Recoged el coche a las afueras y tomad la SR222, la Chiantigiana, hacia el sur.",
            "Café y embutidos en la Antica Macelleria Falorni, en la plaza de Greve.",
            "Visita con cata en una bodega familiar cerca de Panzano. Uno de los dos conduce, y a ese le toca escupir el vino.",
            "Por la noche: cena en el agroturismo y un paseo por el camino; a principios de verano salen las luciérnagas.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "Siena", es: "Siena" },
        items: {
          en: [
            "An hour south to Siena. Park outside the walls and walk up to the Campo.",
            "The cathedral and its striped marble, and the painted ceiling of the Piccolomini Library.",
            "Climb the Torre del Mangia for the whole shell-shaped square below you.",
            "Evening: an aperitivo at one of the Campo's cafés, then pici with ragù in a side street.",
          ],
          es: [
            "Una hora hacia el sur hasta Siena. Aparcad fuera de las murallas y subid andando al Campo.",
            "La catedral con su mármol a rayas y el techo pintado de la Biblioteca Piccolomini.",
            "Subid a la Torre del Mangia para ver la plaza entera, en forma de concha, a vuestros pies.",
            "Por la noche: aperitivo en un café del Campo y pici al ragú en una calle lateral.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "Val d'Orcia", es: "Val d'Orcia" },
        items: {
          en: [
            "Cross the Crete Senesi towards Pienza. The road is the postcard, so stop often.",
            "Pienza for pecorino and the view from the walls.",
            "The little chapel of the Madonna di Vitaleta and its cypresses, a short walk from the San Quirico road.",
            "Evening: on to Montepulciano, a glass of Vino Nobile in a cellar under the town, then dinner on the Piazza Grande.",
          ],
          es: [
            "Cruzad las Crete Senesi hacia Pienza. La carretera es la postal, así que parad a menudo.",
            "Pienza, por el pecorino y las vistas desde la muralla.",
            "La capillita de la Madonna di Vitaleta con sus cipreses, a un paseo corto de la carretera de San Quirico.",
            "Por la noche: seguid hasta Montepulciano, una copa de Vino Nobile en una bodega bajo el pueblo y cena en la Piazza Grande.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "Hot springs, then home", es: "Aguas termales y vuelta a casa" },
        items: {
          en: [
            "A morning soak in the free hot springs at Bagni San Filippo, or at Bagno Vignoni if you want a café beside you.",
            "One last lunch of pici with truffle in a village trattoria.",
            "About two hours back to Florence airport to drop the car.",
            "A bottle of Vino Nobile in the suitcase, for the next anniversary.",
          ],
          es: [
            "Por la mañana, un baño en las termas gratuitas de Bagni San Filippo, o en Bagno Vignoni si queréis un café al lado.",
            "Una última comida de pici con trufa en una trattoria de pueblo.",
            "Unas dos horas de vuelta al aeropuerto de Florencia para devolver el coche.",
            "Una botella de Vino Nobile en la maleta, para el próximo aniversario.",
          ],
        },
      },
    ],
    image: photo("tuscany-hill-towns"),
    art: { from: "#F4E6D0", to: "#E9C9B3", sticker: "leaf" },
  },
  {
    id: "paris-without-cliches",
    kind: "city",
    title: { en: "Paris without the clichés", es: "París sin tópicos" },
    blurb: {
      en: "No padlocks, no queue for the tower. Stay by the Canal Saint-Martin, eat from the markets, and spend the evenings where Parisians spend theirs: on the edge of the canal with a bottle.",
      es: "Sin candados y sin cola para la torre. Alojaos junto al Canal Saint-Martin, comed de los mercados y pasad las tardes donde las pasan los parisinos: al borde del canal con una botella.",
    },
    days: 4,
    bestMonths: [4, 5, 6, 9, 10],
    budget: 3,
    flyTo: "CDG",
    stops: [
      { name: "Canal Saint-Martin", lat: 48.869, lng: 2.3672, nights: 3, note: { en: "Iron footbridges, plane trees, and a picnic on the quay every evening.", es: "Pasarelas de hierro, plátanos de sombra y un pícnic en el muelle cada tarde." } },
      { name: "Belleville", lat: 48.8715, lng: 2.3842, nights: 0, note: { en: "Painted walls, Chinese bakeries, and a park with the best free view of the city.", es: "Muros pintados, panaderías chinas y un parque con la mejor vista gratis de la ciudad." } },
      { name: "Buttes-Chaumont", lat: 48.8796, lng: 2.3821, nights: 0, note: { en: "A park with a cliff, a lake and a temple on top; locals picnic here on Sundays.", es: "Un parque con acantilado, lago y un templete en lo alto; aquí hacen pícnic los parisinos los domingos." } },
      { name: "Marché d'Aligre", lat: 48.8489, lng: 2.378, nights: 0, note: { en: "The cheapest, loudest market in Paris, with a covered hall for cheese and oysters.", es: "El mercado más barato y ruidoso de París, con un mercado cubierto para el queso y las ostras." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "The canal", es: "El canal" },
        items: {
          en: [
            "Leave the bags near the canal and walk its length, from République to the Bassin de la Villette.",
            "Coffee at a counter on the Quai de Valmy, then the bookshops along it, for a present for each other.",
            "Watch a lock fill as a boat comes through. It takes ten minutes and nobody minds.",
            "Evening: cheese, bread and wine from the shops on Rue de Lancry, eaten on the quay as the lights come on.",
          ],
          es: [
            "Dejad las maletas cerca del canal y recorredlo entero, de République a la Bassin de la Villette.",
            "Un café en barra en el Quai de Valmy y luego sus librerías, a por un regalo el uno para el otro.",
            "Mirad cómo se llena una esclusa al pasar un barco. Son diez minutos y a nadie le importa esperar.",
            "Por la noche: queso, pan y vino de las tiendas de la Rue de Lancry, en el muelle, mientras se encienden las luces.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Belleville and the Buttes", es: "Belleville y las Buttes" },
        items: {
          en: [
            "Up to Belleville for breakfast, and the painted walls of Rue Dénoyez.",
            "The Parc de Belleville, for the whole city, tower included, at a comfortable distance.",
            "A picnic in the Parc des Buttes-Chaumont, then the climb to the Temple de la Sibylle on its cliff.",
            "Evening: natural wine and small plates in a bar in the 11th. Sit at the counter.",
          ],
          es: [
            "Subid a Belleville a desayunar y pasad por los muros pintados de la Rue Dénoyez.",
            "El Parc de Belleville, con la ciudad entera, torre incluida, a una distancia prudente.",
            "Pícnic en el Parc des Buttes-Chaumont y subida al Temple de la Sibylle, en lo alto del acantilado.",
            "Por la noche: vino natural y platos pequeños en un bar del distrito 11. Sentaos en la barra.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Markets and the green viaduct", es: "Mercados y el viaducto verde" },
        items: {
          en: [
            "The Marché d'Aligre in the morning: fruit outside, cheese and oysters in the Beauvau hall.",
            "The Coulée verte, an old railway viaduct turned into a garden, quiet all the way towards the Bois de Vincennes.",
            "The afternoon at the Musée de la Vie romantique, with its garden café and nobody in a hurry.",
            "Evening: dinner on the Île Saint-Louis, then the lower quays of the Seine after dark.",
          ],
          es: [
            "El Marché d'Aligre por la mañana: fruta fuera, y queso y ostras en el mercado cubierto Beauvau.",
            "La Coulée verte, un antiguo viaducto del tren convertido en jardín, tranquilo hasta el Bois de Vincennes.",
            "La tarde en el Musée de la Vie romantique, con su café en el jardín y nadie con prisa.",
            "Por la noche: cena en la Île Saint-Louis y paseo por los muelles bajos del Sena ya de noche.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "One last morning", es: "Una última mañana" },
        items: {
          en: [
            "Croissants from the bakery on your street, eaten walking.",
            "The Musée de l'Orangerie at opening time: Monet's water lilies, with the room nearly to yourselves.",
            "A long lunch in a bouillon, one of the old workers' canteens, cheap and quick.",
            "The RER B from Gare du Nord to Charles de Gaulle: about forty minutes.",
          ],
          es: [
            "Cruasanes de la panadería de vuestra calle, comidos por el camino.",
            "El Musée de l'Orangerie a la hora de abrir: los nenúfares de Monet con la sala casi para vosotros.",
            "Una comida larga en un bouillon, los antiguos comedores obreros, baratos y rápidos.",
            "El RER B desde la Gare du Nord hasta Charles de Gaulle: unos cuarenta minutos.",
          ],
        },
      },
    ],
    image: photo("paris-without-cliches"),
    art: { from: "#FCE0EE", to: "#F5BFD9", sticker: "bow" },
  },
  {
    id: "scottish-highlands",
    kind: "road",
    title: { en: "The Scottish Highlands", es: "Las Highlands escocesas" },
    blurb: {
      en: "From Edinburgh up through the glens to Skye and across to Inverness, on roads with more sheep than cars. Pack a waterproof each and allow one day of rain; it will be the one you remember.",
      es: "De Edimburgo a Skye por los valles y de ahí a Inverness, por carreteras con más ovejas que coches. Llevad un chubasquero cada uno y contad con un día de lluvia: será el que más recordéis.",
    },
    days: 6,
    bestMonths: [5, 6, 9],
    budget: 2,
    flyTo: "EDI",
    stops: [
      { name: "Edinburgh", es: "Edimburgo", lat: 55.9489, lng: -3.1954, nights: 1, note: { en: "Walk the Old Town the first evening; collect the car on your way out the next morning.", es: "Recorred la ciudad vieja la primera tarde y recoged el coche al salir, a la mañana siguiente." } },
      { name: "Pitlochry", lat: 56.7036, lng: -3.7355, nights: 1, note: { en: "A Victorian spa town with a salmon ladder and a theatre by the river.", es: "Un pueblo balneario victoriano con una escala para salmones y un teatro junto al río." } },
      { name: "Glencoe", lat: 56.6828, lng: -5.1015, nights: 1, note: { en: "The most dramatic valley in Scotland, with the saddest story. Stay in the village, not on the main road.", es: "El valle más espectacular de Escocia, con la historia más triste. Dormid en el pueblo, no en la carretera principal." } },
      { name: "Portree", lat: 57.4131, lng: -6.1944, nights: 2, note: { en: "A harbour of painted houses, good fish, and the base for the north of Skye.", es: "Un puerto de casas pintadas, buen pescado y la base para el norte de Skye." } },
      { name: "Inverness", lat: 57.4764, lng: -4.2256, nights: 0, note: { en: "Fly home from here, or take the train south through the mountains.", es: "Volved en avión desde aquí, o en tren hacia el sur entre montañas." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Edinburgh", es: "Edimburgo" },
        items: {
          en: [
            "Land, drop the bags and climb the Royal Mile the back way, through the closes.",
            "Victoria Street and the Grassmarket, for a pint under the castle.",
            "Calton Hill before sunset: the city, the castle and the sea in one turn of the head.",
            "Evening: a candlelit dinner in the Old Town. Order haggis once, for the story.",
          ],
          es: [
            "Aterrizad, dejad las maletas y subid la Royal Mile por detrás, por los callejones.",
            "Victoria Street y el Grassmarket, para una pinta a los pies del castillo.",
            "Calton Hill antes del atardecer: la ciudad, el castillo y el mar de un solo vistazo.",
            "Por la noche: cena a la luz de las velas en la ciudad vieja. Pedid haggis una vez, aunque sea por contarlo.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "North to Pitlochry", es: "Hacia el norte, a Pitlochry" },
        items: {
          en: [
            "Collect the car and drive north over the Forth, about an hour and a half.",
            "The Hermitage near Dunkeld on the way: a folly over a waterfall, in a forest of giant firs.",
            "A tasting at Edradour, one of Scotland's smallest distilleries; the passenger tastes.",
            "Evening: a play at the Pitlochry Festival Theatre across the river, if there's one on, then dinner in town.",
          ],
          es: [
            "Recoged el coche y conducid hacia el norte cruzando el Forth, hora y media.",
            "The Hermitage, cerca de Dunkeld, de camino: un pabellón sobre una cascada en un bosque de abetos gigantes.",
            "Una cata en Edradour, una de las destilerías más pequeñas de Escocia; prueba quien no conduce.",
            "Por la noche: una obra en el Pitlochry Festival Theatre, al otro lado del río, si hay función, y cena en el pueblo.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Across Rannoch Moor to Glencoe", es: "Por el páramo de Rannoch hasta Glencoe" },
        items: {
          en: [
            "West across Rannoch Moor on the A82: empty, huge, and better in bad weather.",
            "The Three Sisters viewpoint, and the Lost Valley walk if you have three hours and good boots.",
            "The Glencoe visitor centre, for the story of the massacre, told plainly.",
            "Evening: dinner by the fire at the Clachaig Inn, where walkers dry their socks.",
          ],
          es: [
            "Hacia el oeste por el páramo de Rannoch, por la A82: vacío, enorme y mejor con mal tiempo.",
            "El mirador de las Three Sisters, y la ruta al Lost Valley si tenéis tres horas y buenas botas.",
            "El centro de visitantes de Glencoe, para entender la historia de la masacre, contada sin adornos.",
            "Por la noche: cena junto a la chimenea en el Clachaig Inn, donde los montañeros secan los calcetines.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "The road to Skye", es: "La carretera a Skye" },
        items: {
          en: [
            "North past Fort William, with a detour to the Glenfinnan Viaduct.",
            "Eilean Donan Castle on its island, best from the lay-by across the loch.",
            "Over the bridge to Skye and on to Portree.",
            "Evening: fish and chips on the harbour wall, or scallops at a table inside if the wind is up.",
          ],
          es: [
            "Hacia el norte pasando Fort William, con un desvío hasta el viaducto de Glenfinnan.",
            "El castillo de Eilean Donan en su islote, mejor desde el apartadero al otro lado del lago.",
            "Cruzad el puente a Skye y seguid hasta Portree.",
            "Por la noche: fish and chips sentados en el muro del puerto, o vieiras en una mesa dentro si sopla el viento.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "The north of Skye", es: "El norte de Skye" },
        items: {
          en: [
            "An early walk up to the Old Man of Storr, before the car park fills: about two hours there and back.",
            "Kilt Rock's waterfall dropping straight into the sea, and lunch in Staffin.",
            "The Quiraing loop in the afternoon: the strangest landscape in Britain.",
            "Evening: a dram by the fire in Portree, and the harbour at last light, which in June is nearly midnight.",
          ],
          es: [
            "Temprano, la subida al Old Man of Storr, antes de que se llene el aparcamiento: unas dos horas ida y vuelta.",
            "La cascada de Kilt Rock cayendo directa al mar, y comida en Staffin.",
            "Por la tarde, la vuelta al Quiraing: el paisaje más extraño de Gran Bretaña.",
            "Por la noche: un whisky junto al fuego en Portree y el puerto con la última luz, que en junio es casi a medianoche.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "To Inverness", es: "Hasta Inverness" },
        items: {
          en: [
            "Back across the island and east through Glen Shiel, about three hours to Inverness.",
            "A stop on the shore of Loch Ness at Urquhart Castle. Look for the monster, briefly.",
            "A walk along the River Ness to the Ness Islands and their little footbridges.",
            "Evening: live folk music at Hootananny before the flight, or the sleeper train south.",
          ],
          es: [
            "De vuelta por la isla y hacia el este por Glen Shiel: unas tres horas hasta Inverness.",
            "Una parada a orillas del lago Ness, en el castillo de Urquhart. Buscad al monstruo, un momento.",
            "Un paseo junto al río Ness hasta las Ness Islands y sus pasarelas.",
            "Por la noche: música folk en directo en el Hootananny antes del vuelo, o el tren nocturno hacia el sur.",
          ],
        },
      },
    ],
    image: photo("scottish-highlands"),
    art: { from: "#E6E0F8", to: "#D3C8EE", sticker: "cloud" },
  },
  {
    id: "iceland-south-coast",
    kind: "road",
    title: { en: "Iceland's south coast", es: "La costa sur de Islandia" },
    blurb: {
      en: "Waterfalls you can walk behind, black beaches, and a lagoon of icebergs at the end of the road. In June it never quite gets dark: bring an eye mask, and don't waste the midnight light.",
      es: "Cascadas por las que se pasa por detrás, playas negras y una laguna llena de icebergs al final de la carretera. En junio no llega a anochecer: llevad antifaz y no desperdiciéis la luz de medianoche.",
    },
    days: 6,
    bestMonths: [5, 6, 7, 8, 9],
    budget: 3,
    flyTo: "KEF",
    stops: [
      { name: "Reykjavík", es: "Reikiavik", lat: 64.1418, lng: -21.9267, nights: 1, note: { en: "Collect the car at the airport; the city itself is small enough to walk.", es: "Recoged el coche en el aeropuerto; la ciudad se recorre a pie." } },
      { name: "Þingvellir", lat: 64.2583, lng: -21.1249, nights: 0, note: { en: "Where two continents are pulling apart. You walk down the crack between them.", es: "Donde se separan dos continentes. Se camina por la grieta que queda entre ellos." } },
      { name: "Seljalandsfoss", lat: 63.6155, lng: -19.9882, nights: 1, note: { en: "The waterfall with a path behind it. Bring a waterproof, whatever the sky says.", es: "La cascada con un camino por detrás. Llevad chubasquero, diga lo que diga el cielo." } },
      { name: "Vík", lat: 63.4188, lng: -19.0055, nights: 2, note: { en: "The village by the black beach. Two nights, so the weather can have one day.", es: "El pueblo junto a la playa negra. Dos noches, para que el tiempo pueda quedarse con un día." } },
      { name: "Jökulsárlón", lat: 64.0783, lng: -16.2274, nights: 1, note: { en: "The glacier lagoon. Sleep nearby and come back late, when the coaches have gone.", es: "La laguna glaciar. Dormid cerca y volved tarde, cuando se han ido los autocares." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Reykjavík", es: "Reikiavik" },
        items: {
          en: [
            "Collect the car at Keflavík and stop at a geothermal lagoon on the way in; book a time.",
            "A hot dog from the stand by the harbour, the one with the queue.",
            "Up Hallgrímskirkja's tower for the coloured roofs, then Laugavegur for wool jumpers.",
            "Evening: lamb or Arctic char for dinner, then the shore path to the Sun Voyager sculpture in the late light.",
          ],
          es: [
            "Recoged el coche en Keflavík y parad en una laguna geotermal de camino; reservad hora.",
            "Un perrito caliente del puesto del puerto, el que tiene cola.",
            "La torre de Hallgrímskirkja para ver los tejados de colores, y Laugavegur para los jerséis de lana.",
            "Por la noche: cordero o salvelino para cenar, y el paseo por la orilla hasta la escultura del Sun Voyager con la última luz.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Þingvellir to Seljalandsfoss", es: "De Þingvellir a Seljalandsfoss" },
        items: {
          en: [
            "Þingvellir in the morning: walk the Almannagjá rift, where the old parliament met in the open air.",
            "Strokkur at Geysir, which goes up every few minutes, and Gullfoss thundering into its canyon.",
            "The Kerið crater on the way south, a red bowl with a green lake in it.",
            "Evening: walk behind Seljalandsfoss in the low sun, then into Gljúfrabúi, the waterfall hidden in the gorge next door.",
          ],
          es: [
            "Þingvellir por la mañana: la grieta de Almannagjá, donde se reunía al aire libre el antiguo parlamento.",
            "El Strokkur de Geysir, que salta cada pocos minutos, y Gullfoss rugiendo en su cañón.",
            "El cráter de Kerið de camino al sur, un cuenco rojo con un lago verde dentro.",
            "Por la noche: pasad por detrás de Seljalandsfoss con el sol bajo y entrad en Gljúfrabúi, la cascada escondida en el desfiladero de al lado.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Skógafoss to Vík", es: "De Skógafoss a Vík" },
        items: {
          en: [
            "Skógafoss, and the steps up beside it to the start of the river trail.",
            "A guided walk on the Sólheimajökull glacier, crampons and all.",
            "The arch at Dyrhólaey, and its puffins from May to August.",
            "Evening: Reynisfjara beach at sunset. Stay well back from the water; the waves here are treacherous.",
          ],
          es: [
            "Skógafoss, y las escaleras que suben a su lado hasta el sendero del río.",
            "Una caminata guiada por el glaciar Sólheimajökull, con crampones y todo.",
            "El arco de Dyrhólaey y sus frailecillos, de mayo a agosto.",
            "Por la noche: la playa de Reynisfjara al atardecer. Quedaos lejos del agua: aquí las olas son traicioneras.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "A slow day in Vík", es: "Un día tranquilo en Vík" },
        items: {
          en: [
            "Sleep in. This is the spare day: if the weather is bad, it's a café and a book.",
            "Walk up to the church above the village for the view of the Reynisdrangar sea stacks.",
            "A wool jumper each from the knitting factory shop in the village.",
            "Evening: the village pool's hot tubs, where the locals talk about the weather, then dinner overlooking the beach.",
          ],
          es: [
            "Dormid hasta tarde. Este es el día de reserva: si hace mal tiempo, un café y un libro.",
            "Subid a la iglesia sobre el pueblo para ver los farallones de Reynisdrangar.",
            "Un jersey de lana para cada uno en la tienda de la fábrica de punto del pueblo.",
            "Por la noche: los jacuzzis de la piscina municipal, donde la gente del pueblo habla del tiempo, y cena frente a la playa.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "East to the ice", es: "Hacia el este, al hielo" },
        items: {
          en: [
            "Across the Eldhraun lava field, mossy and silent, and along the rim of the Fjaðrárgljúfur canyon.",
            "Skaftafell: an easy hour's walk to Svartifoss, the waterfall between black basalt columns.",
            "Jökulsárlón in the afternoon, then Diamond Beach across the road, where the ice washes up on black sand.",
            "Evening: back to the lagoon late, when the coaches have gone and the icebergs turn pink.",
          ],
          es: [
            "Por el campo de lava de Eldhraun, cubierto de musgo y en silencio, y por el borde del cañón de Fjaðrárgljúfur.",
            "Skaftafell: una hora de paseo fácil hasta Svartifoss, la cascada entre columnas de basalto negro.",
            "Jökulsárlón por la tarde, y la Diamond Beach al otro lado de la carretera, donde el hielo llega a la arena negra.",
            "Por la noche: volved a la laguna tarde, cuando se han ido los autocares y los icebergs se vuelven rosas.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "The long drive back", es: "El largo camino de vuelta" },
        items: {
          en: [
            "A boat among the icebergs first thing, if the wind allows.",
            "About five hours back to Keflavík; break it with lunch in Vík.",
            "One last stop at Seljalandsfoss if the light is good, then hand back the car.",
          ],
          es: [
            "A primera hora, una barca entre los icebergs, si el viento lo permite.",
            "Unas cinco horas de vuelta a Keflavík; haced una parada para comer en Vík.",
            "Una última parada en Seljalandsfoss si la luz acompaña, y a devolver el coche.",
          ],
        },
      },
    ],
    image: photo("iceland-south-coast"),
    art: { from: "#DDE9F5", to: "#C4D6EC", sticker: "snowflake" },
  },
  {
    id: "baltic-coast",
    kind: "road",
    title: { en: "The Baltic coast, Riga to Tallinn", es: "La costa báltica, de Riga a Tallin" },
    blurb: {
      en: "Where this site is made. Art nouveau Riga, castles in the Gauja valley, a beach town that smells of pine, and Tallinn's old town at the top. White nights in June, and quiet roads the whole way.",
      es: "Donde se hace esta web. La Riga modernista, castillos en el valle del Gauja, un pueblo de playa que huele a pino y la ciudad vieja de Tallin al final. Noches blancas en junio y carreteras tranquilas todo el camino.",
    },
    days: 7,
    bestMonths: [6, 7, 8],
    budget: 1,
    flyTo: "RIX",
    stops: [
      { name: "Riga", lat: 56.9496, lng: 24.1052, nights: 2, note: { en: "Stay in the old town or the art nouveau quarter; everything is a walk away.", es: "Dormid en el casco antiguo o en el barrio modernista: todo queda a un paseo." } },
      { name: "Sigulda", lat: 57.1532, lng: 24.8541, nights: 1, note: { en: "Castles, caves and a cable car over the Gauja river, an hour from Riga.", es: "Castillos, cuevas y un teleférico sobre el río Gauja, a una hora de Riga." } },
      { name: "Cēsis", lat: 57.3131, lng: 25.2704, nights: 1, note: { en: "A medieval castle you explore by candle lantern, and a small town that goes to bed early.", es: "Un castillo medieval que se recorre con farolillo y un pueblo pequeño que se acuesta pronto." } },
      { name: "Pärnu", lat: 58.3849, lng: 24.5075, nights: 1, note: { en: "Estonia's summer town: wooden villas, a wide white beach, and mud baths.", es: "El pueblo de verano de Estonia: villas de madera, una playa ancha de arena blanca y baños de barro." } },
      { name: "Tallinn", es: "Tallin", lat: 59.4374, lng: 24.7452, nights: 1, note: { en: "Fly home from here, or take the ferry to Helsinki for one more night.", es: "Volved en avión desde aquí, o coged el ferry a Helsinki para una noche más." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Riga's old town", es: "El casco antiguo de Riga" },
        items: {
          en: [
            "A loop of the old town: the Dome Cathedral, the House of the Blackheads, and the Cat House with its cats on the roof.",
            "Coffee and cake in an old-town café, then the lift up St Peter's tower.",
            "The Central Market in its old zeppelin hangars: smoked fish, rye bread, and in summer, berries by the cup.",
            "Evening: a Black Balsam cocktail on a rooftop over the old town, then dinner of modern Latvian cooking.",
          ],
          es: [
            "Una vuelta por el casco antiguo: la catedral del Domo, la Casa de los Cabezas Negras y la Casa del Gato, con sus gatos en el tejado.",
            "Café y tarta en un café del casco antiguo, y subida en ascensor a la torre de San Pedro.",
            "El Mercado Central, en sus antiguos hangares de zepelines: pescado ahumado, pan de centeno y, en verano, bayas por vasos.",
            "Por la noche: un cóctel con Bálsamo Negro en una azotea sobre el casco antiguo y cena de cocina letona moderna.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Art nouveau, then the sea", es: "Modernismo y luego el mar" },
        items: {
          en: [
            "Alberta iela and Elizabetes iela: faces, gods and dragons on every art nouveau façade.",
            "Lunch in the wooden courtyards of the Kalnciema Quarter across the river (there's a market on Saturdays).",
            "The train to Jūrmala, half an hour, and a walk along the endless beach at Majori.",
            "Evening: sunset on the sand, dinner on Jomas iela, and the last train back.",
          ],
          es: [
            "Alberta iela y Elizabetes iela: caras, dioses y dragones en cada fachada modernista.",
            "Comida en los patios de madera del barrio de Kalnciema, al otro lado del río (hay mercado los sábados).",
            "El tren a Jūrmala, media hora, y un paseo por la playa interminable de Majori.",
            "Por la noche: atardecer en la arena, cena en Jomas iela y el último tren de vuelta.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Sigulda and the Gauja valley", es: "Sigulda y el valle del Gauja" },
        items: {
          en: [
            "Collect the car and drive an hour east to Sigulda.",
            "The red-brick tower of Turaida Castle, and the grave of the Rose of Turaida, where couples leave flowers.",
            "Gūtmanis Cave, its sandstone walls carved with centuries of names.",
            "Evening: the cable car across the valley, then dinner on a terrace above the river.",
          ],
          es: [
            "Recoged el coche y conducid una hora hacia el este hasta Sigulda.",
            "La torre de ladrillo rojo del castillo de Turaida y la tumba de la Rosa de Turaida, donde las parejas dejan flores.",
            "La cueva de Gūtmanis, con sus paredes de arenisca grabadas con nombres de varios siglos.",
            "Por la noche: el teleférico sobre el valle y cena en una terraza sobre el río.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "Cēsis by lantern", es: "Cēsis con farolillo" },
        items: {
          en: [
            "A morning walk along the Gauja's sandstone cliffs, then forty minutes on to Cēsis.",
            "The castle ruins by candle lantern, up the dark stairs of the west tower.",
            "Coffee on the old town square, and the swans on the pond in the castle park.",
            "Evening: dinner with a Latvian cider, then a walk round the castle walls as it gets dark, which in June is very late.",
          ],
          es: [
            "Por la mañana, un paseo por los acantilados de arenisca del Gauja, y cuarenta minutos más hasta Cēsis.",
            "Las ruinas del castillo con farolillo, subiendo por las escaleras a oscuras de la torre oeste.",
            "Café en la plaza del casco antiguo, y los cisnes del estanque del parque del castillo.",
            "Por la noche: cena con una sidra letona y un paseo alrededor de la muralla cuando oscurece, que en junio es muy tarde.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "Up the coast to Pärnu", es: "Por la costa hasta Pärnu" },
        items: {
          en: [
            "About two and a half hours north, over the border into Estonia; lunch by the sea at Salacgrīva.",
            "The red sandstone cliffs at Veczemji on the Vidzeme coast, a short walk from the road.",
            "Pärnu beach in the afternoon: wide, white, and shallow enough to wade out a long way.",
            "Evening: dinner in the old town, then out along the river mole to the lighthouse at sunset.",
          ],
          es: [
            "Unas dos horas y media hacia el norte, cruzando a Estonia; comida junto al mar en Salacgrīva.",
            "Los acantilados de arenisca roja de Veczemji, en la costa de Vidzeme, a un paseo corto de la carretera.",
            "La playa de Pärnu por la tarde: ancha, blanca y tan poco profunda que se puede caminar mar adentro.",
            "Por la noche: cena en el casco antiguo y paseo por el espigón del río hasta el faro al atardecer.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "Tallinn", es: "Tallin" },
        items: {
          en: [
            "Two hours to Tallinn. Leave the car at the hotel and walk into the old town.",
            "Up to Toompea, to the viewing platforms over the red roofs and the harbour.",
            "The wooden houses of Kalamaja, and lunch in the Telliskivi Creative City.",
            "Evening: a candlelit dinner in the old town, and Town Hall Square at midnight, when it still isn't quite dark.",
          ],
          es: [
            "Dos horas hasta Tallin. Dejad el coche en el hotel y entrad andando en la ciudad vieja.",
            "Subid a Toompea, a los miradores sobre los tejados rojos y el puerto.",
            "Las casas de madera de Kalamaja y comida en la Ciudad Creativa de Telliskivi.",
            "Por la noche: cena a la luz de las velas en la ciudad vieja y la plaza del Ayuntamiento a medianoche, cuando todavía no es de noche del todo.",
          ],
        },
      },
      {
        day: 7,
        title: { en: "One more morning", es: "Una mañana más" },
        items: {
          en: [
            "Kadriorg Park and its pink palace, which Peter the Great built for his wife.",
            "Coffee by the sea at Pirita, or a seafront sauna by the old harbour.",
            "Drop the car at Tallinn airport, ten minutes from the centre. A one-way rental costs a little more; it's worth it.",
          ],
          es: [
            "El parque de Kadriorg y su palacio rosa, que Pedro el Grande construyó para su mujer.",
            "Café junto al mar en Pirita, o una sauna frente al mar junto al puerto viejo.",
            "Devolved el coche en el aeropuerto de Tallin, a diez minutos del centro. Alquilarlo solo de ida cuesta algo más, pero merece la pena.",
          ],
        },
      },
    ],
    image: photo("baltic-coast"),
    art: { from: "#E1EFD9", to: "#CBE3BE", sticker: "moon" },
  },
  {
    id: "prague-krumlov-vienna",
    kind: "train",
    title: { en: "Prague to Vienna by train", es: "De Praga a Viena en tren" },
    blurb: {
      en: "Two capitals and a river town between them, joined by trains with window seats. Český Krumlov is the one you'll talk about: a castle above a bend in the Vltava, and nothing to do but walk.",
      es: "Dos capitales y un pueblo junto al río entre ellas, unidas por trenes con ventanilla. Český Krumlov es del que más hablaréis: un castillo sobre un meandro del Moldava y nada que hacer salvo pasear.",
    },
    days: 6,
    bestMonths: [4, 5, 6, 9, 10, 12],
    budget: 2,
    flyTo: "PRG",
    stops: [
      { name: "Prague", es: "Praga", lat: 50.0874, lng: 14.421, nights: 2, note: { en: "Stay in Malá Strana, under the castle, and cross the Charles Bridge before breakfast.", es: "Alojaos en Malá Strana, bajo el castillo, y cruzad el Puente de Carlos antes de desayunar." } },
      { name: "Český Krumlov", lat: 48.8109, lng: 14.3148, nights: 1, note: { en: "About three hours by train, changing at České Budějovice. Stay the night to see it empty.", es: "Unas tres horas en tren, con cambio en České Budějovice. Quedaos a dormir para verlo vacío." } },
      { name: "Vienna", es: "Viena", lat: 48.2085, lng: 16.372, nights: 2, note: { en: "No direct train from Krumlov: change at České Budějovice and Linz, or take the shared shuttle van, about three hours.", es: "No hay tren directo desde Krumlov: cambiad en České Budějovice y Linz, o coged la furgoneta compartida, unas tres horas." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Prague", es: "Praga" },
        items: {
          en: [
            "Old Town Square for the astronomical clock on the hour, then lose the crowd in the lanes behind the Týn Church.",
            "Lunch in a beer hall: goulash, dumplings and half a litre of pilsner.",
            "The beer garden in Letná Park in the afternoon, with all the bridges lined up below.",
            "Evening: a concert in one of the churches of Malá Strana, then the Charles Bridge after dark.",
          ],
          es: [
            "La plaza de la Ciudad Vieja para ver el reloj astronómico a la hora en punto, y luego perded a la gente por las callejas detrás de la iglesia de Týn.",
            "Comida en una cervecería: gulash, knedlíky y medio litro de pilsner.",
            "Por la tarde, la terraza cervecera del parque Letná, con todos los puentes en fila a vuestros pies.",
            "Por la noche: un concierto en una iglesia de Malá Strana y el Puente de Carlos ya de noche.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "The castle and the hill", es: "El castillo y la colina" },
        items: {
          en: [
            "The Charles Bridge at seven, while it's empty, then up Nerudova to the castle as it opens.",
            "St Vitus Cathedral, and the tiny houses of the Golden Lane.",
            "Down through the gardens of Petřín hill, with a detour to the mirror maze if you want to laugh.",
            "Evening: a pedal boat on the Vltava at sunset, then dinner in Vinohrady.",
          ],
          es: [
            "El Puente de Carlos a las siete, cuando está vacío, y subida por Nerudova hasta el castillo a la hora de abrir.",
            "La catedral de San Vito y las casitas del Callejón del Oro.",
            "Bajada por los jardines de la colina de Petřín, con desvío al laberinto de espejos si os apetece reír.",
            "Por la noche: un hidropedal por el Moldava al atardecer y cena en Vinohrady.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "South to Český Krumlov", es: "Al sur, a Český Krumlov" },
        items: {
          en: [
            "A morning train from Praha hlavní nádraží, changing at České Budějovice. Bring breakfast for the window seat.",
            "Walk in across the river and up to the castle's covered bridge, the Plášťový most.",
            "The castle tower, for the bend in the river with red roofs all the way round.",
            "Evening: dinner at a table by the water, then the empty lanes after the day visitors have gone.",
          ],
          es: [
            "Tren de mañana desde Praha hlavní nádraží, con cambio en České Budějovice. Llevad el desayuno para la ventanilla.",
            "Entrad al pueblo cruzando el río y subid al puente cubierto del castillo, el Plášťový most.",
            "La torre del castillo, para ver el meandro del río con tejados rojos alrededor.",
            "Por la noche: cena en una mesa junto al agua y las callejas vacías cuando se han ido los visitantes del día.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "On to Vienna", es: "Rumbo a Viena" },
        items: {
          en: [
            "A morning on the river: rent a canoe for the gentle float round the town's bends, or walk the castle gardens.",
            "The shuttle van, or the train through Linz, to Vienna: about three hours either way.",
            "Check in near the Naschmarkt and wander it as the stalls close.",
            "Evening: cheap standing tickets at the State Opera, bought on the night. Leave at the interval or stay to the end; both count.",
          ],
          es: [
            "Una mañana en el río: alquilad una canoa para bajar tranquilos por los meandros del pueblo, o paseo por los jardines del castillo.",
            "La furgoneta compartida, o el tren por Linz, hasta Viena: unas tres horas de una u otra forma.",
            "Alojaos cerca del Naschmarkt y dad una vuelta por el mercado cuando van cerrando los puestos.",
            "Por la noche: entradas de pie para la Ópera Estatal, baratas y compradas el mismo día. Marchaos en el descanso o quedaos hasta el final: las dos cosas cuentan.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "Coffee houses and Klimt", es: "Cafés vieneses y Klimt" },
        items: {
          en: [
            "Breakfast in a proper coffee house, Café Sperl or Café Prückel, with the newspaper on its stick.",
            "The Belvedere, for Klimt's The Kiss, which is better than any print of it.",
            "The Prater in the afternoon: the giant Ferris wheel, one cabin, one turn.",
            "Evening: dinner at a Heuriger wine tavern among the vineyards of Grinzing, at the end of the tram line.",
          ],
          es: [
            "Desayuno en un café vienés de verdad, el Café Sperl o el Prückel, con el periódico en su varilla.",
            "El Belvedere, por El beso de Klimt, que es mejor que cualquier lámina.",
            "Por la tarde, el Prater: la noria gigante, una cabina, una vuelta.",
            "Por la noche: cena en un Heuriger, una taberna de vino entre los viñedos de Grinzing, al final de la línea del tranvía.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "Cake, then home", es: "Tarta y vuelta a casa" },
        items: {
          en: [
            "Sachertorte at the Hotel Sacher or at Demel, and settle the argument yourselves.",
            "Tram 1 or 2 round the Ringstrasse: the palaces, without the tour.",
            "Fly home from Vienna; the train to the airport takes about twenty minutes.",
          ],
          es: [
            "Sachertorte en el Hotel Sacher o en Demel, y zanjad la discusión vosotros mismos.",
            "El tranvía 1 o el 2 por el Ring: los palacios, sin visita guiada.",
            "Volved en avión desde Viena; el tren al aeropuerto tarda unos veinte minutos.",
          ],
        },
      },
    ],
    image: photo("prague-krumlov-vienna"),
    art: { from: "#EADFF6", to: "#DCCBF0", sticker: "star" },
  },
  {
    id: "santorini-naxos",
    kind: "islands",
    title: { en: "Santorini and Naxos", es: "Santorini y Naxos" },
    blurb: {
      en: "Two nights on the caldera for the sunsets, then the ferry to Naxos, which is bigger, cheaper, and has the beaches Santorini lacks. The ferry is part of the trip: sit outside.",
      es: "Dos noches frente a la caldera por los atardeceres, y luego el ferry a Naxos, que es más grande, más barata y tiene las playas que le faltan a Santorini. El ferry es parte del viaje: sentaos fuera.",
    },
    days: 6,
    bestMonths: [5, 6, 9, 10],
    budget: 3,
    flyTo: "JTR",
    stops: [
      { name: "Oia", lat: 36.4622, lng: 25.3757, nights: 2, note: { en: "Stay on the caldera side, and watch the sunset from your own terrace instead of the castle wall.", es: "Alojaos en el lado de la caldera y ved el atardecer desde vuestra terraza, no desde la muralla del castillo." } },
      { name: "Naxos Town", es: "Naxos (la Chora)", lat: 37.1051, lng: 25.3767, nights: 3, note: { en: "About two hours by ferry. Stay near the old castle quarter, above the harbour.", es: "Unas dos horas en ferry. Alojaos cerca del barrio del castillo, sobre el puerto." } },
      { name: "Apeiranthos", lat: 37.0718, lng: 25.5196, nights: 0, note: { en: "A marble village high in the middle of the island; go by hire car or scooter.", es: "Un pueblo de mármol en lo alto, en el centro de la isla; id en coche de alquiler o en moto." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "The caldera", es: "La caldera" },
        items: {
          en: [
            "Land, take the transfer to Oia, and do nothing on the terrace for an hour.",
            "Walk the lanes before sunset, then down the steps to Ammoudi Bay.",
            "A swim off the rocks at Ammoudi, where a ladder goes straight into deep blue water.",
            "Evening: grilled fish at a taverna on Ammoudi's quay as the sun goes down behind the rocks.",
          ],
          es: [
            "Aterrizad, traslado a Oia y una hora sin hacer nada en la terraza.",
            "Paseo por las callejas antes del atardecer y bajada por las escaleras hasta la bahía de Ammoudi.",
            "Un baño desde las rocas de Ammoudi, donde una escalerilla baja directa al azul profundo.",
            "Por la noche: pescado a la brasa en una taberna del muelle de Ammoudi mientras el sol cae tras las rocas.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Fira to Oia on foot", es: "De Fira a Oia a pie" },
        items: {
          en: [
            "The bus to Fira in the morning, and the caldera path back to Oia: about three hours, through Imerovigli.",
            "Skaros Rock at Imerovigli, where the old castle stood, for the views both ways.",
            "A winery near Pyrgos in the afternoon, for Assyrtiko from vines woven into baskets on the ground.",
            "Evening: a sunset sail round the caldera, with dinner on board.",
          ],
          es: [
            "El autobús a Fira por la mañana y vuelta a Oia a pie por el sendero de la caldera: unas tres horas, pasando por Imerovigli.",
            "La roca de Skaros, en Imerovigli, donde estaba el antiguo castillo, para ver las vistas a ambos lados.",
            "Por la tarde, una bodega cerca de Pyrgos para probar Assyrtiko de cepas trenzadas en cestas a ras de suelo.",
            "Por la noche: un paseo en velero por la caldera al atardecer, con cena a bordo.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Ferry to Naxos", es: "Ferry a Naxos" },
        items: {
          en: [
            "The morning ferry from Athinios; sit on the top deck and watch the caldera shrink behind you.",
            "Check in near the Kastro and wander its marble lanes.",
            "Lunch at a harbour taverna: Naxos potatoes, graviera cheese and island lamb.",
            "Evening: sunset at the Portara, the huge marble doorway of a temple that was never finished.",
          ],
          es: [
            "El ferry de la mañana desde Athinios; sentaos en la cubierta de arriba y ved cómo se hace pequeña la caldera.",
            "Alojaos cerca del Kastro y perdeos por sus callejas de mármol.",
            "Comida en una taberna del puerto: patatas de Naxos, queso graviera y cordero de la isla.",
            "Por la noche: el atardecer en la Portara, la enorme puerta de mármol de un templo que nunca se terminó.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "Beaches", es: "Playas" },
        items: {
          en: [
            "Hire a car or a scooter and head south down the west coast.",
            "Plaka beach in the morning: long, quiet, with dunes behind.",
            "Lunch at a beach taverna in Mikri Vigla, watching the kitesurfers.",
            "Evening: a golden-hour swim at Agios Prokopios, then dinner in the old lanes of the Chora.",
          ],
          es: [
            "Alquilad un coche o una moto y bajad por la costa oeste.",
            "La playa de Plaka por la mañana: larga, tranquila y con dunas detrás.",
            "Comida en una taberna de playa en Mikri Vigla, mirando a los kitesurfistas.",
            "Por la noche: un baño en Agios Prokopios a la hora dorada y cena en las callejas de la Chora.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "The mountain villages", es: "Los pueblos de montaña" },
        items: {
          en: [
            "Up to Halki for kitron, the island's citron liqueur, at its old distillery.",
            "Apeiranthos: marble streets, a square under a plane tree, men playing backgammon.",
            "The giant unfinished statue of a kouros, lying in a field at Apollonas.",
            "Evening: dinner at a village taverna in the hills, where the menu is whatever was cooked today.",
          ],
          es: [
            "Subid a Halki para probar el kitron, el licor de cidra de la isla, en su vieja destilería.",
            "Apeiranthos: calles de mármol, una plaza bajo un plátano y señores jugando al backgammon.",
            "La estatua gigante de un kuros, sin terminar, tumbada en un campo en Apollonas.",
            "Por la noche: cena en una taberna de pueblo en la montaña, donde el menú es lo que se haya cocinado ese día.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "Home", es: "Vuelta a casa" },
        items: {
          en: [
            "A last swim at Agios Georgios, the town beach, before breakfast.",
            "Fly out of Naxos's small airport via Athens, or take the ferry back to Santorini for your flight.",
            "A jar of thyme honey in the suitcase, for the kitchen at home.",
          ],
          es: [
            "Un último baño en Agios Georgios, la playa del pueblo, antes de desayunar.",
            "Volad desde el pequeño aeropuerto de Naxos vía Atenas, o coged el ferry de vuelta a Santorini para vuestro vuelo.",
            "Un tarro de miel de tomillo en la maleta, para la cocina de casa.",
          ],
        },
      },
    ],
    image: photo("santorini-naxos"),
    art: { from: "#D9EEF3", to: "#BBDDE8", sticker: "sparkle" },
  },
  {
    id: "copenhagen-hygge",
    kind: "city",
    title: { en: "A hygge weekend in Copenhagen", es: "Un fin de semana hygge en Copenhague" },
    blurb: {
      en: "Candles in every window, cinnamon buns, a harbour clean enough to swim in, and a museum by the sea that is worth the train on its own. Rent bikes on the first morning; the city is built for them.",
      es: "Velas en cada ventana, rollos de canela, un puerto tan limpio que se puede nadar y un museo junto al mar que ya justifica el tren. Alquilad bicis la primera mañana: la ciudad está hecha para ellas.",
    },
    days: 3,
    bestMonths: [5, 6, 7, 8, 12],
    budget: 3,
    flyTo: "CPH",
    stops: [
      { name: "Christianshavn", lat: 55.6721, lng: 12.5914, nights: 2, note: { en: "Canals and houseboats, a short walk from everything, and quieter than Nyhavn.", es: "Canales y barcos vivienda, a un paseo de todo y más tranquilo que Nyhavn." } },
      { name: "Nørrebro", lat: 55.6927, lng: 12.544, nights: 0, note: { en: "The small shops and bakeries of Jægersborggade, and the cemetery park where Kierkegaard is buried.", es: "Las tiendas y panaderías de Jægersborggade, y el cementerio-parque donde está enterrado Kierkegaard." } },
      { name: "Louisiana, Humlebæk", lat: 55.9694, lng: 12.5432, nights: 0, note: { en: "Forty minutes north by train: modern art in a garden that runs down to the sea.", es: "A cuarenta minutos en tren hacia el norte: arte moderno en un jardín que baja hasta el mar." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Harbour and canals", es: "Puerto y canales" },
        items: {
          en: [
            "Rent two bikes and ride the harbour, past the Opera, to the Royal Library's Black Diamond.",
            "Cinnamon buns and coffee at a bakery in Christianshavn.",
            "Climb the outside spiral of the Church of Our Saviour, for the whole city from the top.",
            "Evening: dinner in the old Meatpacking District, Kødbyen, then a candlelit drink in a basement bar.",
          ],
          es: [
            "Alquilad dos bicis y recorred el puerto, pasando por la Ópera, hasta el Diamante Negro de la Biblioteca Real.",
            "Rollos de canela y café en una panadería de Christianshavn.",
            "Subid por la espiral exterior de la Iglesia de Nuestro Salvador para ver la ciudad entera desde arriba.",
            "Por la noche: cena en el antiguo barrio de los mataderos, Kødbyen, y una copa a la luz de las velas en un bar de sótano.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Louisiana by the sea", es: "Louisiana junto al mar" },
        items: {
          en: [
            "The train from Central Station to Humlebæk, forty minutes up the coast.",
            "The Louisiana Museum of Modern Art: Giacometti's figures, Kusama's room of lights, and the sculpture lawn over the Øresund.",
            "Lunch on the museum café's terrace, looking at Sweden across the water.",
            "Evening: back in town, a swim at the Islands Brygge harbour bath in summer or Tivoli's lights in December, then a wine bar.",
          ],
          es: [
            "El tren desde la Estación Central hasta Humlebæk: cuarenta minutos por la costa.",
            "El Louisiana Museum of Modern Art: las figuras de Giacometti, la sala de luces de Kusama y el césped de las esculturas sobre el Øresund.",
            "Comida en la terraza del café del museo, con Suecia al otro lado del agua.",
            "Por la noche: de vuelta, un baño en el puerto de Islands Brygge si es verano, o las luces del Tivoli si es diciembre, y luego un bar de vinos.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Nørrebro, slowly", es: "Nørrebro, sin prisa" },
        items: {
          en: [
            "Breakfast on Jægersborggade, then a walk through Assistens Cemetery, which locals use as a park.",
            "The lakes: a loop of Sortedams Sø, and the swan pedal boats if they're out.",
            "Smørrebrød for lunch, two open sandwiches each, and a cold aquavit if you dare.",
            "Late afternoon: the short canal boat tour from Nyhavn, sitting at the front.",
          ],
          es: [
            "Desayuno en Jægersborggade y un paseo por el cementerio de Assistens, que la gente del barrio usa como parque.",
            "Los lagos: una vuelta a Sortedams Sø, y los hidropedales con forma de cisne si están fuera.",
            "Smørrebrød para comer, dos sándwiches abiertos por cabeza, y un aquavit bien frío si os atrevéis.",
            "A última hora de la tarde: el paseo corto en barco por los canales desde Nyhavn, sentados delante.",
          ],
        },
      },
    ],
    image: photo("copenhagen-hygge"),
    art: { from: "#FFE9D6", to: "#F6CFB3", sticker: "mug" },
  },
  {
    id: "algarve-coast",
    kind: "road",
    title: { en: "The Algarve coast", es: "La costa del Algarve" },
    blurb: {
      en: "Flamingos in the lagoons, whitewashed Tavira, the sea caves at Benagil and the cliffs at the end of Europe. Go in May or September, when the sea is warm and the beaches are nearly yours.",
      es: "Flamencos en las lagunas, la blanca Tavira, las cuevas marinas de Benagil y los acantilados del fin de Europa. Id en mayo o septiembre, cuando el mar está templado y las playas son casi vuestras.",
    },
    days: 6,
    bestMonths: [4, 5, 6, 9, 10],
    budget: 2,
    flyTo: "FAO",
    stops: [
      { name: "Faro", lat: 37.0133, lng: -7.9352, nights: 0, note: { en: "Collect the car at the airport; the walled old town is worth an hour on the way.", es: "Recoged el coche en el aeropuerto; el casco antiguo amurallado merece una hora de camino." } },
      { name: "Tavira", lat: 37.1269, lng: -7.6498, nights: 1, note: { en: "The prettiest town on the coast, with a Roman bridge and an island beach a boat ride away.", es: "El pueblo más bonito de la costa, con un puente romano y una playa en una isla a un paseo en barca." } },
      { name: "Benagil", lat: 37.0873, lng: -8.4257, nights: 1, note: { en: "The sea cave is reached by kayak or boat, and landing inside is no longer allowed: go for the light, not the beach.", es: "A la cueva se llega en kayak o en barca, y ya no se puede desembarcar dentro: id por la luz, no por la playa." } },
      { name: "Lagos", lat: 37.1009, lng: -8.6699, nights: 2, note: { en: "An old town, lively evenings, and the rock stacks of Ponta da Piedade.", es: "Un casco antiguo, noches animadas y los farallones de Ponta da Piedade." } },
      { name: "Sagres", lat: 37.0078, lng: -8.9419, nights: 1, note: { en: "The windy end of the coast, with the best sunset in the Algarve at Cabo de São Vicente.", es: "El extremo ventoso de la costa, con el mejor atardecer del Algarve en el Cabo de São Vicente." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "Faro to Tavira", es: "De Faro a Tavira" },
        items: {
          en: [
            "Land in Faro, collect the car, and walk the old town inside the walls; the cathedral tower looks over the lagoon.",
            "The Ria Formosa: flamingos and oyster beds, seen from the causeway out to Praia de Faro.",
            "Half an hour east to Tavira, and over the Roman bridge into the old town.",
            "Evening: grilled sardines by the river, then up to the garden inside the castle walls.",
          ],
          es: [
            "Aterrizad en Faro, recoged el coche y recorred el casco antiguo amurallado; la torre de la catedral da a la laguna.",
            "La Ría Formosa: flamencos y criaderos de ostras desde el puente que va a la Praia de Faro.",
            "Media hora al este hasta Tavira, y por el puente romano al casco antiguo.",
            "Por la noche: sardinas a la brasa junto al río y subida al jardín dentro de las murallas del castillo.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "An island beach, then west", es: "Una playa en una isla, y hacia el oeste" },
        items: {
          en: [
            "The little train across the lagoon to Praia do Barril and its graveyard of anchors.",
            "A morning on the sand, then octopus for lunch in Santa Luzia, the octopus village.",
            "About an hour west along the coast, to the cliffs around Benagil.",
            "Evening: sunset from the clifftop above Praia da Marinha, then dinner in Carvoeiro.",
          ],
          es: [
            "El trenecito que cruza la laguna hasta la Praia do Barril y su cementerio de anclas.",
            "Una mañana de playa y pulpo para comer en Santa Luzia, el pueblo del pulpo.",
            "Una hora al oeste por la costa, hasta los acantilados de Benagil.",
            "Por la noche: el atardecer desde lo alto de la Praia da Marinha y cena en Carvoeiro.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "The caves", es: "Las cuevas" },
        items: {
          en: [
            "Kayak into the Benagil cave early, before the boats; the light through the roof is best mid-morning.",
            "The Seven Hanging Valleys trail along the clifftops to Praia da Marinha.",
            "An afternoon swim at Praia do Carvalho, reached through a tunnel in the rock.",
            "Evening: forty minutes on to Lagos, and dinner in the lanes of the old town.",
          ],
          es: [
            "Entrad en kayak en la cueva de Benagil temprano, antes que las barcas: la luz del techo es mejor a media mañana.",
            "El sendero de los Siete Valles Colgantes por lo alto de los acantilados hasta la Praia da Marinha.",
            "Un baño por la tarde en la Praia do Carvalho, a la que se llega por un túnel en la roca.",
            "Por la noche: cuarenta minutos más hasta Lagos y cena en las callejas del casco antiguo.",
          ],
        },
      },
      {
        day: 4,
        title: { en: "Lagos", es: "Lagos" },
        items: {
          en: [
            "Ponta da Piedade by boat in the morning, through the arches and grottoes.",
            "The wooden staircase down to Praia do Camilo, a tiny cove.",
            "Lunch at the market, then a lazy afternoon on the long Meia Praia.",
            "Evening: drinks on a terrace above the marina at sunset, then live music in the old town.",
          ],
          es: [
            "Ponta da Piedade en barca por la mañana, entre arcos y grutas.",
            "La escalera de madera que baja a la Praia do Camilo, una cala diminuta.",
            "Comida en el mercado y tarde perezosa en la larguísima Meia Praia.",
            "Por la noche: una copa al atardecer en una terraza sobre el puerto deportivo y música en directo en el casco antiguo.",
          ],
        },
      },
      {
        day: 5,
        title: { en: "To the end of Europe", es: "Hasta el fin de Europa" },
        items: {
          en: [
            "Half an hour west to Sagres and its fortress on the headland, where the wind never stops.",
            "A surf lesson for two at Praia do Tonel, or watch from the rocks.",
            "Grilled fish for lunch at the harbour, where the boats come in.",
            "Evening: Cabo de São Vicente at sunset. Bring a jumper and a blanket, and buy the 'last sausage before America' from the stand.",
          ],
          es: [
            "Media hora al oeste hasta Sagres y su fortaleza sobre el cabo, donde el viento no para nunca.",
            "Una clase de surf para dos en la Praia do Tonel, o miradlo desde las rocas.",
            "Pescado a la brasa para comer en el puerto, donde llegan las barcas.",
            "Por la noche: el Cabo de São Vicente al atardecer. Llevad jersey y manta, y comprad la «última salchicha antes de América» en el puesto.",
          ],
        },
      },
      {
        day: 6,
        title: { en: "Back along the coast", es: "De vuelta por la costa" },
        items: {
          en: [
            "A morning walk on the empty beaches of the west coast, at Praia do Amado.",
            "Lunch in Silves, under its red castle, on the way back inland.",
            "About an hour and a half to Faro airport.",
          ],
          es: [
            "Un paseo por la mañana por las playas vacías de la costa oeste, en la Praia do Amado.",
            "Comida en Silves, a los pies de su castillo rojo, volviendo por el interior.",
            "Hora y media hasta el aeropuerto de Faro.",
          ],
        },
      },
    ],
    image: photo("algarve-coast"),
    art: { from: "#FFE3D3", to: "#FBC9B0", sticker: "daisy" },
  },
  {
    id: "amsterdam-by-bike",
    kind: "city",
    title: { en: "Amsterdam by bike", es: "Ámsterdam en bici" },
    blurb: {
      en: "Rent two bikes on the first morning and forget the trams. Canals in the Jordaan, a free ferry to the north, and a ride out along the dike to a village of wooden houses.",
      es: "Alquilad dos bicis la primera mañana y olvidaos del tranvía. Canales en el Jordaan, un ferry gratis al norte y una ruta por el dique hasta un pueblo de casas de madera.",
    },
    days: 3,
    bestMonths: [4, 5, 6, 9],
    budget: 2,
    flyTo: "AMS",
    stops: [
      { name: "Jordaan", lat: 52.3754, lng: 4.8811, nights: 2, note: { en: "Narrow canals, old brown cafés and the Saturday market at the Noordermarkt: the place to stay.", es: "Canales estrechos, cafés de toda la vida y el mercado del sábado en el Noordermarkt: el sitio donde alojarse." } },
      { name: "Vondelpark", lat: 52.3572, lng: 4.8641, nights: 0, note: { en: "The city's park. Ride through it, and stop at the open-air theatre in summer.", es: "El parque de la ciudad. Cruzadlo en bici y parad en el teatro al aire libre si es verano." } },
      { name: "NDSM, Noord", lat: 52.4004, lng: 4.893, nights: 0, note: { en: "A free ferry from behind Central Station to an old shipyard full of studios and waterside bars.", es: "Un ferry gratis desde detrás de la Estación Central hasta un antiguo astillero lleno de talleres y bares junto al agua." } },
      { name: "Durgerdam", lat: 52.3779, lng: 4.9905, nights: 0, note: { en: "A row of wooden houses along the dike, an easy half-hour ride from the centre.", es: "Una hilera de casas de madera sobre el dique, a media hora fácil en bici desde el centro." } },
    ],
    plan: [
      {
        day: 1,
        title: { en: "The canal ring", es: "El anillo de canales" },
        items: {
          en: [
            "Rent two bikes with proper locks and ride the Prinsengracht slowly, stopping on every bridge.",
            "Apple pie with cream at Winkel 43 in the Jordaan.",
            "The Nine Streets for small shops, then up the Westerkerk tower for the roofs.",
            "Evening: dinner in the Jordaan, a drink in a brown café, and a canal walk once the bridges light up.",
          ],
          es: [
            "Alquilad dos bicis con buenos candados y recorred el Prinsengracht despacio, parando en cada puente.",
            "Tarta de manzana con nata en Winkel 43, en el Jordaan.",
            "Las Nueve Calles para las tiendas pequeñas, y la torre de la Westerkerk para ver los tejados.",
            "Por la noche: cena en el Jordaan, una copa en un café marrón y un paseo junto al canal cuando se iluminan los puentes.",
          ],
        },
      },
      {
        day: 2,
        title: { en: "Museums, the park, the north", es: "Museos, el parque y el norte" },
        items: {
          en: [
            "The Rijksmuseum at opening time: The Night Watch and Vermeer's Milkmaid, then out before lunch.",
            "Ride through the Vondelpark and have lunch in De Pijp, by the Albert Cuyp market.",
            "The free ferry from Central Station to NDSM in the north, bikes on board.",
            "Evening: dinner at a waterside restaurant at NDSM as the sun goes down over the IJ, then the ferry back.",
          ],
          es: [
            "El Rijksmuseum a la hora de abrir: La ronda de noche y La lechera de Vermeer, y fuera antes de comer.",
            "Cruzad el Vondelpark en bici y comed en De Pijp, junto al mercado de Albert Cuyp.",
            "El ferry gratis de la Estación Central a NDSM, en el norte, con las bicis a bordo.",
            "Por la noche: cena en un restaurante junto al agua en NDSM mientras el sol cae sobre el IJ, y ferry de vuelta.",
          ],
        },
      },
      {
        day: 3,
        title: { en: "Out along the dike", es: "Por el dique" },
        items: {
          en: [
            "Ferry across the IJ and ride east along the dike to Durgerdam: half an hour, fields on one side and water on the other.",
            "Coffee on the dike at Durgerdam, and on to the village of Ransdorp if you're enjoying it.",
            "Back through the Eastern Docklands, and a quiet hour in the palm house at the Hortus Botanicus.",
            "Evening: an early dinner, the bikes returned, and one last walk along the Brouwersgracht.",
          ],
          es: [
            "Cruzad el IJ en ferry y pedalead hacia el este por el dique hasta Durgerdam: media hora, con prados a un lado y agua al otro.",
            "Café en el dique de Durgerdam y, si os está gustando, seguid hasta el pueblo de Ransdorp.",
            "Vuelta por los antiguos muelles del este y una hora tranquila en el invernadero de palmeras del Hortus Botanicus.",
            "Por la noche: cena temprana, devolved las bicis y un último paseo por el Brouwersgracht.",
          ],
        },
      },
    ],
    image: photo("amsterdam-by-bike"),
    art: { from: "#FFE0E6", to: "#FBC4D0", sticker: "tulip" },
  },
];

export const TRIP_IDS = TRIPS.map((t) => t.id);

export const getTrip = (id: string): Trip | undefined => TRIPS.find((t) => t.id === id);

export const stopName = (stop: TripStop, locale: "en" | "es"): string => (locale === "es" && stop.es ? stop.es : stop.name);

/** The smaller of the two sizes, for cards and phones. */
export const tripImageSm = (path: string): string => path.replace(/\.webp$/, "-sm.webp");
export const tripSrcSet = (path: string): string => `${tripImageSm(path)} 800w, ${path} 1600w`;

/** €, €€ or €€€. */
export const budgetMark = (budget: Trip["budget"]): string => "€".repeat(budget);

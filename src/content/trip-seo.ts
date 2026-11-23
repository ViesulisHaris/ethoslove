type L = { en: string; es: string };

/**
 * What a search result shows for each trip: the searched pattern ("3 days in Lisbon for two"), in
 * the trip's own voice. The page's h1 stays the trip's name, and its TouristTrip JSON-LD keeps the
 * name and the blurb. Every place a description names is in that trip's plan (src/lib/trips/presets.ts):
 * change the plan, check this.
 */
export const TRIP_SEO: Record<string, { title: L; description: L }> = {
  "lisbon-slow-weekend": {
    title: { en: "3 days in Lisbon for two: a slow day-by-day itinerary", es: "3 días en Lisboa en pareja: itinerario día a día, sin prisa" },
    description: {
      en: "A 3-day Lisbon itinerary for couples: Alfama and the castle, Belém and Chiado, then the ferry to Cacilhas for sunset. Day by day, with a map.",
      es: "Itinerario de 3 días en Lisboa para dos: Alfama y el castillo, Belém y Chiado, y el ferry a Cacilhas para el atardecer. Día a día, con mapa.",
    },
  },
  "amalfi-coast": {
    title: { en: "Amalfi Coast road trip for two: a 6-day itinerary by car", es: "La costa amalfitana en coche: itinerario de 6 días para dos" },
    description: {
      en: "Six days from Naples to Ravello for two: Pompeii, Sorrento, Positano, the Path of the Gods and Amalfi, planned day by day with a map of the route.",
      es: "Seis días de Nápoles a Ravello para dos: Pompeya, Sorrento, Positano, el Sendero de los Dioses y Amalfi, planeados día a día y con mapa de la ruta.",
    },
  },
  "tuscany-hill-towns": {
    title: { en: "6 days in Tuscany for two: a hill-town road trip itinerary", es: "6 días en la Toscana para dos: itinerario en coche" },
    description: {
      en: "A Tuscany itinerary for couples: two nights in Florence, then Chianti, Siena, the Val d'Orcia and Montepulciano by car. Six days, planned one by one.",
      es: "Itinerario por la Toscana en pareja: dos noches en Florencia y luego el Chianti, Siena, el Val d'Orcia y Montepulciano en coche. Seis días, uno a uno.",
    },
  },
  "paris-without-cliches": {
    title: { en: "4 days in Paris for two: an itinerary without the clichés", es: "4 días en París en pareja: un itinerario sin tópicos" },
    description: {
      en: "A 4-day Paris itinerary for couples who skip the queues: the Canal Saint-Martin, Belleville, the Buttes-Chaumont and the markets, day by day.",
      es: "Itinerario de 4 días en París para dos, sin colas: el Canal Saint-Martin, Belleville, las Buttes-Chaumont y los mercados, día a día y con mapa.",
    },
  },
  "scottish-highlands": {
    title: { en: "Scottish Highlands road trip for two: a 6-day itinerary", es: "Highlands escocesas en coche: itinerario de 6 días para dos" },
    description: {
      en: "Six days by car from Edinburgh to Inverness for two: Pitlochry, Rannoch Moor, Glencoe and two nights on Skye, with every day planned and mapped.",
      es: "Seis días en coche de Edimburgo a Inverness para dos: Pitlochry, el páramo de Rannoch, Glencoe y dos noches en Skye, con cada día planeado y en el mapa.",
    },
  },
  "iceland-south-coast": {
    title: { en: "Iceland south coast for two: a 6-day road trip itinerary", es: "Sur de Islandia en coche: itinerario de 6 días para dos" },
    description: {
      en: "A 6-day Iceland itinerary for couples: Reykjavík, Þingvellir, Seljalandsfoss, Skógafoss, Vík and the icebergs at Jökulsárlón, day by day by car.",
      es: "Itinerario de 6 días por Islandia en pareja: Reikiavik, Þingvellir, Seljalandsfoss, Skógafoss, Vík y los icebergs de Jökulsárlón, día a día y en coche.",
    },
  },
  "baltic-coast": {
    title: { en: "Riga to Tallinn for two: a 7-day Baltic road trip itinerary", es: "De Riga a Tallin en coche: itinerario de 7 días para dos" },
    description: {
      en: "Seven days up the Baltic coast for two: Riga's old town, Sigulda and Cēsis in the Gauja valley, the beach at Pärnu, then Tallinn. Planned day by day.",
      es: "Siete días por la costa báltica para dos: el casco antiguo de Riga, Sigulda y Cēsis en el valle del Gauja, la playa de Pärnu y Tallin. Planeado día a día.",
    },
  },
  "prague-krumlov-vienna": {
    title: { en: "Prague to Vienna by train for two: a 6-day itinerary", es: "De Praga a Viena en tren: itinerario de 6 días para dos" },
    description: {
      en: "Six days by train for two: Prague and its castle, a night in Český Krumlov, then Vienna's coffee houses and Klimt. Every day planned, with a map.",
      es: "Seis días en tren para dos: Praga y su castillo, una noche en Český Krumlov y los cafés y el Klimt de Viena. Cada día planeado, con mapa de la ruta.",
    },
  },
  "santorini-naxos": {
    title: { en: "Santorini and Naxos for two: a 6-day island itinerary", es: "Santorini y Naxos para dos: itinerario de 6 días" },
    description: {
      en: "A 6-day Greek island itinerary for couples: two nights on Santorini's caldera, the walk from Fira to Oia, then the ferry to Naxos and its beaches.",
      es: "Itinerario de 6 días por las islas griegas en pareja: dos noches en la caldera de Santorini, el paseo de Fira a Oia y el ferry a Naxos y sus playas.",
    },
  },
  "copenhagen-hygge": {
    title: { en: "3 days in Copenhagen for two: a hygge weekend itinerary", es: "3 días en Copenhague: itinerario hygge para dos" },
    description: {
      en: "A 3-day Copenhagen itinerary for couples: the harbour and canals by bike, Louisiana by the sea, and a slow last day in Nørrebro. With a map.",
      es: "Itinerario de 3 días en Copenhague para dos: el puerto y los canales en bici, Louisiana junto al mar y un último día sin prisa en Nørrebro. Con mapa.",
    },
  },
  "algarve-coast": {
    title: { en: "Algarve road trip for two: a 6-day itinerary along the coast", es: "El Algarve en coche: itinerario de 6 días para dos" },
    description: {
      en: "Six days along the Algarve for two: Faro and Tavira, an island beach, the Benagil caves, Lagos and the cliffs at Sagres, planned day by day.",
      es: "Seis días por el Algarve para dos: Faro y Tavira, una playa en una isla, las cuevas de Benagil, Lagos y los acantilados de Sagres, día a día.",
    },
  },
  "amsterdam-by-bike": {
    title: { en: "3 days in Amsterdam for two: a day-by-day itinerary by bike", es: "3 días en Ámsterdam en pareja: itinerario día a día en bici" },
    description: {
      en: "A 3-day Amsterdam itinerary for couples on two bikes: the canal ring, the Vondelpark, the free ferry north and the dike out to Durgerdam.",
      es: "Itinerario de 3 días en Ámsterdam para dos en bici: el anillo de canales, el Vondelpark, el ferry gratis al norte y el dique hasta Durgerdam.",
    },
  },
};

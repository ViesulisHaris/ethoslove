import type { GiftLocale } from "@/lib/gift/schema";
import type { TripKind } from "./schema";

/**
 * Every line the template says, in both languages. The Spanish is its own copy, written the way
 * a ticket and a friend would say it there, not the English put through a dictionary. Board and
 * ticket labels are upper case on the page, so they are written plain here.
 */
export type Copy = {
  packTitle: string;
  packSub: string;
  packHint: string;
  packed: string;
  packedSub: string;
  pack: string;
  departs: string;
  to: string;
  mystery: string;
  night: string;
  nights: string;
  where: string;
  soon: string;
  question: string;
  answer: string;
  announce: string;
  board: Record<TripKind, { title: string; caption: string; info: string[]; columns: string[]; status: string; next: string }>;
  pass: Record<TripKind, string>;
  from: string;
  toLabel: string;
  passenger: string;
  with: string;
  date: string;
  boarding: string;
  departsLabel: string;
  gate: string;
  seats: string;
  nightsLabel: string;
  coach: string;
  platform: string;
  stops: string;
  train: string;
  flight: string;
  via: string;
  about: Record<TripKind, string>;
  tear: string;
  tearLabel: string;
  admitTwo: string;
  photos: string;
};

export const S: Record<GiftLocale, Copy> = {
  en: {
    packTitle: "Pack your bags, {name}.",
    packSub: "Everything you'll need. Where to? Not yet.",
    packHint: "tap each one to pack it",
    packed: "All packed, {name}.",
    packedSub: "Now for the part you've been wondering about.",
    pack: "Pack {thing}",
    departs: "departs",
    to: "to",
    mystery: "? ? ?",
    night: "{n} night",
    nights: "{n} nights",
    where: "Where to?",
    soon: "Soon",
    question: "Where are we going?",
    answer: "We're going to {place}.",
    announce: "{place}. {detail}",
    board: {
      flight: { title: "Departures", caption: "Flight {no} · {from}", info: ["Time", "Gate"], columns: ["Time", "Destination", "Gate"], status: "Boarding", next: "Your boarding pass" },
      train: { title: "Departures", caption: "Train {no} · {from}", info: ["Time", "Platform"], columns: ["Time", "Destination", "Plat."], status: "Boarding", next: "Your ticket" },
      road: { title: "Road trip", caption: "From {from}", info: ["Nights"], columns: ["No.", "On the way"], status: "Let's go", next: "Your itinerary" },
    },
    pass: { flight: "Boarding pass", train: "Train ticket", road: "Road trip" },
    from: "From",
    toLabel: "To",
    passenger: "Passenger",
    with: "With",
    date: "Date",
    boarding: "Boarding",
    departsLabel: "Departs",
    gate: "Gate",
    seats: "Seats",
    nightsLabel: "Nights",
    coach: "Coach",
    platform: "Platform",
    stops: "Stops",
    train: "Train",
    flight: "Flight",
    via: "via {places}",
    about: { flight: "about {time} in the air", train: "about {time} on the train", road: "about {time} of driving" },
    tear: "tear here",
    tearLabel: "Tear off the stub",
    admitTwo: "Admit two",
    photos: "before we go",
  },
  es: {
    packTitle: "Haz la maleta, {name}.",
    packSub: "Todo lo que vas a necesitar. ¿Adónde? Todavía no.",
    packHint: "toca cada cosa para meterla",
    packed: "Maleta hecha, {name}.",
    packedSub: "Y ahora, lo que te estás preguntando.",
    pack: "Meter {thing}",
    departs: "salida",
    to: "destino",
    mystery: "? ? ?",
    night: "{n} noche",
    nights: "{n} noches",
    where: "¿Adónde?",
    soon: "Muy pronto",
    question: "¿Adónde vamos?",
    answer: "Nos vamos a {place}.",
    announce: "{place}. {detail}",
    board: {
      flight: { title: "Salidas", caption: "Vuelo {no} · {from}", info: ["Hora", "Puerta"], columns: ["Hora", "Destino", "Puerta"], status: "Embarcando", next: "Tu tarjeta de embarque" },
      train: { title: "Salidas", caption: "Tren {no} · {from}", info: ["Hora", "Vía"], columns: ["Hora", "Destino", "Vía"], status: "Embarcando", next: "Tu billete" },
      road: { title: "Ruta", caption: "Desde {from}", info: ["Noches"], columns: ["N.º", "Por el camino"], status: "En marcha", next: "Tu hoja de ruta" },
    },
    pass: { flight: "Tarjeta de embarque", train: "Billete de tren", road: "Hoja de ruta" },
    from: "Origen",
    toLabel: "Destino",
    passenger: "Nombre",
    with: "Acompañante",
    date: "Fecha",
    boarding: "Embarque",
    departsLabel: "Salida",
    gate: "Puerta",
    seats: "Asientos",
    nightsLabel: "Noches",
    coach: "Coche",
    platform: "Vía",
    stops: "Paradas",
    train: "Tren",
    flight: "Vuelo",
    via: "pasando por {places}",
    about: { flight: "aprox. {time} de vuelo", train: "aprox. {time} en tren", road: "aprox. {time} al volante" },
    tear: "arranca por aquí",
    tearLabel: "Arrancar el resguardo",
    admitTwo: "Válido para dos",
    photos: "antes de irnos",
  },
};

/** "{name}" and friends. */
export const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

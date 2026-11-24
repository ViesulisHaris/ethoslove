import { CITY_PAGES, cityName } from "@/lib/cities/cities";
import { ideasForCity } from "@/lib/cities/ideas";
import { HERO_ART, ideaImage } from "@/lib/dates/art";
import { tripImageSm, TRIPS } from "@/lib/trips/presets";
import { getManifest } from "@/templates/manifests";
import { HALFWAY_GIFT_SLUG, type WaysData } from "./ways";

/** What the ways on need, worked out on the server (it reads the whole of presets.ts): handed to the page as a prop. */
export function waysData(locale: "en" | "es"): WaysData {
  return {
    cities: CITY_PAGES.map((c) => ({ slug: c.slug, name: cityName(c, locale), lat: c.lat, lng: c.lng, image: ideaImage(ideasForCity(c)[0].id) })),
    trips: TRIPS.map((t) => ({ id: t.id, title: t.title[locale], lat: t.stops[0].lat, lng: t.stops[0].lng, image: t.image ? tripImageSm(t.image) : null, art: { from: t.art.from, to: t.art.to } })),
    giftPoster: getManifest(HALFWAY_GIFT_SLUG)!.thumbnail.poster,
    datesImage: HERO_ART.dates,
  };
}

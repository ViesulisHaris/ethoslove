import { Bath, Building2, Castle, Cat, Clapperboard, Dices, DoorStairwell, FerrisWheel, Flower2, KeyRound, Lighthouse, MicVocal, Mountain, Music, PawPrint, Sailboat, Snowflake, Sunset, Telescope, TreePalm, Waves, Wind, Wine, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUIRKS, type Quirk } from "@/lib/dates/unusual";

/** What each quirk looks like: the badge on a card, the chip in a place's sheet, the tile with no photo. */
const ICONS: Record<Quirk, LucideIcon> = {
  // A cellar is a door and a staircase down; a vault door would read as a bank.
  underground: DoorStairwell,
  speakeasy: KeyRound,
  rooftop: Sunset,
  high: Building2,
  music: Music,
  tiki: TreePalm,
  water: Sailboat,
  stars: Telescope,
  games: Dices,
  karaoke: MicVocal,
  cats: Cat,
  animals: PawPrint,
  castle: Castle,
  lighthouse: Lighthouse,
  windmill: Wind,
  glasshouse: Flower2,
  openair: Clapperboard,
  baths: Waves,
  spa: Bath,
  wine: Wine,
  ice: Snowflake,
  climb: Mountain,
  thrills: FerrisWheel,
};

export function QuirkIcon({ quirk, className }: { quirk: Quirk; className?: string }) {
  const Icon = ICONS[quirk];
  return <Icon aria-hidden="true" className={cn("shrink-0", className)} />;
}

/** The quirk as a small pill: its icon and what it is ("Rooftop", "Bar escondido"). */
export function QuirkBadge({ quirk, locale, className }: { quirk: Quirk; locale: "en" | "es"; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full font-semibold whitespace-nowrap", className)}>
      <QuirkIcon quirk={quirk} className="size-3.5 text-rose-deep" />
      <span className="truncate">{QUIRKS[quirk].label[locale]}</span>
    </span>
  );
}

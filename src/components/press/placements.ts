import { FINDER_FOOT_ART, type PlacedArt } from "@/components/templates/page/placements";

/**
 * Where the loose pieces of the page art lie on /press. The page has two pictures with lilies of
 * their own (the phone in the hero, the polaroid in the band), so little is strewn: a leaf in the
 * gap under the figures, and the finder's lily across the edge into the last band.
 */
export const PRESS_NUMBERS_ART: PlacedArt[] = [{ art: "leaf-2", x: 79, y: 101, size: 9.5, rot: 16, phone: false }];
export const PRESS_FOOT_ART: PlacedArt[] = FINDER_FOOT_ART;
export const PRESS_PLACEMENTS: readonly PlacedArt[] = [...PRESS_NUMBERS_ART, ...PRESS_FOOT_ART];

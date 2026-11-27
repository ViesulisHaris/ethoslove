import type { EcardPage } from "./types";
import { page as christmasEcards } from "./pages/christmas-ecards";
import { page as valentinesEcards } from "./pages/valentines-ecards";

// The routine adds a page with one import line above and its name in this list. Nothing else changes here.
const PAGES: EcardPage[] = [christmasEcards, valentinesEcards];

/** Every ecard page, oldest first. content/gift-guides.ts joins them to the gift pages by kind. */
export const ECARD_PAGES: readonly EcardPage[] = PAGES;

import type { EcardPage } from "./types";
import { page as christmasEcards } from "./pages/christmas-ecards";

// The routine adds a page with one import line above and its name in this list. Nothing else changes here.
const PAGES: EcardPage[] = [christmasEcards];

/** Every ecard page, oldest first. content/gift-guides.ts joins them to the gift pages by kind. */
export const ECARD_PAGES: readonly EcardPage[] = PAGES;

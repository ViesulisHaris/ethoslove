/**
 * Templates with an H.264 preview at public/templates/<slug>/preview.mp4, which the iPhone app's
 * AVPlayer can play (it can't play the VP8 WebM the site uses). Written by scripts/previews-mp4.mjs;
 * a slug is listed only once its file exists. The app catalogue (lib/app/catalog.ts) reads this for
 * each template's `previewMp4`, and the app animates the poster where there is none.
 */
export const MP4_PREVIEWS: readonly string[] = [];

import { notFound } from "next/navigation";

/** Any unmatched path inside a locale renders the localised not-found page. */
export default function CatchAllPage() {
  notFound();
}

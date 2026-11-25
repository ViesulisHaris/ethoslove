import { heroLead } from "@/components/templates/page/lead";

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const sentencesOf = (s: string) => s.trim().split(/(?<=[.!?])\s+/).filter(Boolean);

/**
 * What a trip's hero says of its blurb: heroLead's whole sentences (thirty words beside the
 * picture, DESIGN-LESS-TEXT), and where they run over 24 words, the first of them alone. The
 * second is the plan's cut of the page's word budget (PLAN-trips2.md step 5): the Spanish Baltic
 * coast was 302 visible words with thirty. The rest waits on the page in "More about this trip".
 */
export function tripLead(blurb: string): { lead: string; rest: string } {
  const { lead } = heroLead(blurb);
  const taken = words(lead) > 24 ? 1 : sentencesOf(lead).length;
  const sentences = sentencesOf(blurb);
  return { lead: sentences.slice(0, taken).join(" "), rest: sentences.slice(taken).join(" ") };
}

import type { ReactNode } from "react";

/**
 * For `t.rich`: a name inside a sentence the browser may translate stays exactly as it was typed.
 * The translator can't tell a name from a word, so "Rose" would come back as "Trandafir". Tag the
 * name in the message (`<who>{name}</who>`) and pass this as the tag.
 */
export const keepAsWritten = (chunks: ReactNode) => <span translate="no">{chunks}</span>;

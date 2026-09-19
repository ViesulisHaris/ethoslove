/**
 * Keeps the app standing when the browser translates the page.
 *
 * Chrome's "Translate this page" (and Edge's, and Safari's) swaps the page's text nodes for its
 * own. React still holds the originals, so the next time it puts an element in front of one — a
 * spinner in front of "Unlock everything", a check mark in front of "Saved" — or removes one, the
 * DOM throws "Failed to execute 'insertBefore' on 'Node'" and the page falls over to the error
 * screen (facebook/react#11538). A customer translating the editor into Romanian met it again
 * and again: error code WAAC4V.
 *
 * So when the node React names isn't where React thinks, do the nearest thing that doesn't
 * throw: insert in front of whatever of ours now holds it (the translator's wrapper), or at the
 * end if it has gone altogether; remove it from the wrapper it was moved into, or let the removal
 * pass if it's already gone. Whatever the translator hasn't touched goes straight to the browser
 * as before.
 *
 * Components still keep text beside a changing icon in its own <span>, so the order and the words
 * stay right when translated; this is the net under the ones we haven't found.
 */
type Patched = typeof Node.prototype & { __survivesTranslation?: true };

export function surviveTranslation(): void {
  if (typeof Node !== "function") return;
  const proto = Node.prototype as Patched;
  if (proto.__survivesTranslation) return;
  proto.__survivesTranslation = true;

  const insertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(this: Node, node: T, child: Node | null): T {
    if (child && child.parentNode !== this) {
      let holder: Node | null = child;
      while (holder && holder.parentNode !== this) holder = holder.parentNode;
      return insertBefore.call(this, node, holder) as T;
    }
    return insertBefore.call(this, node, child) as T;
  };

  const removeChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // Moved into the translator's wrapper: take it out of there. Already gone: nothing to do.
      if (child.parentNode && this.contains(child)) child.parentNode.removeChild(child);
      return child;
    }
    return removeChild.call(this, child) as T;
  };
}

surviveTranslation();

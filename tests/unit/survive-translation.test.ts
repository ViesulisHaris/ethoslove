import { beforeAll, describe, expect, it } from "vitest";

/**
 * Just enough of the DOM to show what a translator does to React's nodes, with the real DOM's
 * rule: insertBefore and removeChild throw when the node named isn't a child of this one.
 */
class FakeNode {
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  constructor(public name: string) {}
  insertBefore(node: FakeNode, child: FakeNode | null): FakeNode {
    if (child && child.parentNode !== this) throw new Error("NotFoundError: insertBefore");
    if (node.parentNode) node.parentNode.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1);
    this.childNodes.splice(child ? this.childNodes.indexOf(child) : this.childNodes.length, 0, node);
    node.parentNode = this;
    return node;
  }
  removeChild(child: FakeNode): FakeNode {
    if (child.parentNode !== this) throw new Error("NotFoundError: removeChild");
    this.childNodes.splice(this.childNodes.indexOf(child), 1);
    child.parentNode = null;
    return child;
  }
  contains(other: FakeNode | null): boolean {
    for (let n = other; n; n = n.parentNode) if (n === this) return true;
    return false;
  }
  appendChild(node: FakeNode) {
    return this.insertBefore(node, null);
  }
}

const names = (n: FakeNode) => n.childNodes.map((c) => c.name);
/** What Chrome's translator does to a text node: puts its own <font> in its place. */
function translateByReplacing(text: FakeNode) {
  const font = new FakeNode("font(translated)");
  const parent = text.parentNode!;
  parent.insertBefore(font, text);
  parent.removeChild(text);
  return font;
}
/** What a translator that keeps the node does: wraps it. */
function translateByWrapping(text: FakeNode) {
  const font = new FakeNode("font");
  text.parentNode!.insertBefore(font, text);
  font.appendChild(text);
  return font;
}

describe("a translated page can't crash the app", () => {
  let surviveTranslation: () => void;
  beforeAll(async () => {
    (globalThis as { Node?: unknown }).Node = FakeNode;
    ({ surviveTranslation } = await import("@/lib/dom/survive-translation"));
  });

  it("puts a spinner in front of a label the translator replaced, instead of throwing", () => {
    const button = new FakeNode("button");
    const label = button.appendChild(new FakeNode("Unlock everything"));
    translateByReplacing(label);
    // This is error WAAC4V: React inserting the spinner before a text node that has left.
    expect(() => button.insertBefore(new FakeNode("spinner"), label)).not.toThrow();
    expect(names(button)).toEqual(["font(translated)", "spinner"]);
  });

  it("keeps the order when the translator wrapped the label rather than replacing it", () => {
    const p = new FakeNode("p");
    const label = p.appendChild(new FakeNode("Saved"));
    translateByWrapping(label);
    p.insertBefore(new FakeNode("check"), label);
    expect(names(p)).toEqual(["check", "font"]);
  });

  it("lets a removal of something the translator already took away pass", () => {
    const p = new FakeNode("p");
    const text = p.appendChild(new FakeNode("Saving…"));
    translateByReplacing(text);
    expect(() => p.removeChild(text)).not.toThrow();
    expect(names(p)).toEqual(["font(translated)"]);
  });

  it("takes a wrapped node out of the wrapper it was moved into", () => {
    const p = new FakeNode("p");
    const text = p.appendChild(new FakeNode("Saving…"));
    const font = translateByWrapping(text);
    p.removeChild(text);
    expect(font.childNodes).toEqual([]);
    expect(text.parentNode).toBeNull();
  });

  it("changes nothing on a page nobody translated", () => {
    const ul = new FakeNode("ul");
    const b = ul.appendChild(new FakeNode("b"));
    ul.insertBefore(new FakeNode("a"), b);
    ul.appendChild(new FakeNode("c"));
    expect(names(ul)).toEqual(["a", "b", "c"]);
    ul.removeChild(b);
    expect(names(ul)).toEqual(["a", "c"]);
  });

  it("patches once, however often it's loaded", () => {
    const patched = FakeNode.prototype.insertBefore;
    surviveTranslation();
    expect(FakeNode.prototype.insertBefore).toBe(patched);
  });
});

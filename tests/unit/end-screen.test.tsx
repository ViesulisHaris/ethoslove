import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GiftData } from "@/lib/gift/schema";
import { EndScreen } from "@/templates/_shared/EndScreen";
import { ReplyModeContext } from "@/templates/_shared/reply-mode";
import { GiftChromeContext } from "@/templates/_shared/gift-chrome";

const data = { locale: "en", senderName: "Mia", recipientName: "Leo", showReactionCta: false } as unknown as GiftData;

describe("end screen make-one button", () => {
  it("offers to send one back to the sender on a real gift", () => {
    const html = renderToStaticMarkup(
      <ReplyModeContext.Provider value>
        <EndScreen data={data} onMakeOne={() => {}} />
      </ReplyModeContext.Provider>,
    );
    expect(html).toContain("Send one back to Mia");
  });

  it("keeps the general invitation on demos", () => {
    expect(renderToStaticMarkup(<EndScreen data={data} onMakeOne={() => {}} />)).toContain("Make one for someone you love");
  });
});

describe("end screen and the free-tier badge", () => {
  it("carries the badge itself on a watermarked gift, so the floating one can step aside", () => {
    const html = renderToStaticMarkup(
      <GiftChromeContext.Provider value={{ watermarked: true }}>
        <EndScreen data={data} onMakeOne={() => {}} />
      </GiftChromeContext.Provider>,
    );
    expect(html).toContain("Made with Ethos");
    // In the flow, under the buttons — not floating over them.
    expect(html).not.toContain("absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))]");
  });

  it("leaves it out when the gift isn't watermarked", () => {
    expect(renderToStaticMarkup(<EndScreen data={data} onMakeOne={() => {}} />)).not.toContain("Made with Ethos");
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GiftData } from "@/lib/gift/schema";
import { EndScreen } from "@/templates/_shared/EndScreen";
import { ReplyModeContext } from "@/templates/_shared/reply-mode";

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

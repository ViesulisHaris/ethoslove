"use client";

import { useEffect, useState } from "react";
import type { GiftData } from "@/lib/gift/schema";
import { ShareScreen } from "@/components/editor/share-screen";

/**
 * The share screen as the editor's sheet shows it, drawn only in the browser: in the editor it only
 * ever exists after a publish, so its "made now" is the browser's clock, which a test may set.
 */
export function SharePreview({ data, paid }: { data: GiftData; paid: boolean }) {
  const [mounted, setMounted] = useState(false);
  // Mounted once in the browser, as the editor mounts it after a publish.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className="mx-auto w-full max-w-lg bg-paper">
      <ShareScreen shortId="prev2ew3k" status="live" data={data} giftId="00000000-0000-4000-8000-000000000000" paid={paid} />
    </div>
  );
}

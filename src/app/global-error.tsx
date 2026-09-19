"use client";

import { useEffect } from "react";
import { errorCode, reportClientError } from "@/lib/client-error";

/** Last-resort error boundary. Must render its own <html>/<body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error, "root");
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FAF7F2", color: "#1A1614", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something broke on our side</h1>
          <p style={{ opacity: 0.7 }}>Try again in a moment.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 20px", borderRadius: 999, border: 0, background: "#E8604C", color: "#fff", fontWeight: 600 }}>
            Try again
          </button>
          <p translate="no" style={{ marginTop: 20, fontSize: 12, opacity: 0.5 }}>Error code {errorCode(error)}</p>
        </div>
      </body>
    </html>
  );
}

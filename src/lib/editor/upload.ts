"use client";

/**
 * One upload to Supabase Storage over XMLHttpRequest, because fetch gives us neither upload
 * progress nor a way to notice a stalled connection. A phone that drops off Wi-Fi mid-upload
 * used to sit on "uploading" forever; now the attempt fails fast and can be retried.
 */
export type UploadFailure =
  | "timeout"
  | "stalled"
  | "network"
  | "unauthorized"
  | "server"
  /** Storage refused the file's type. Another try sends the same type. */
  | "unsupported_type"
  /** Over the project's upload limit. */
  | "too_big"
  /** The request arrived empty: the browser couldn't read the stored file. */
  | "unreadable";

export class UploadError extends Error {
  constructor(
    public readonly kind: UploadFailure,
    message?: string,
  ) {
    super(message ?? kind);
  }
}

/**
 * Storage says why in the JSON body and often answers 400 whatever the reason, so the status
 * alone can't tell a file it will never take from a hiccup worth retrying.
 */
export function failureFromResponse(status: number, body: string): UploadFailure {
  if (status === 401 || status === 403 || /row-level security|"error":"Unauthorized"/i.test(body)) return "unauthorized";
  if (status === 413 || /maximum allowed size|payload too large/i.test(body)) return "too_big";
  if (status === 415 || /mime type|invalid_mime_type/i.test(body)) return "unsupported_type";
  if (/no content provided/i.test(body)) return "unreadable";
  return "server";
}

const STALL_MS = 30_000;

export function uploadBlob(opts: {
  url: string;
  headers: Record<string, string>;
  blob: Blob;
  timeoutMs: number;
  onProgress?: (fraction: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stall: number | undefined;
    const armStall = () => {
      if (stall) window.clearTimeout(stall);
      stall = window.setTimeout(() => {
        xhr.abort();
        reject(new UploadError("stalled"));
      }, STALL_MS);
    };
    const done = () => stall && window.clearTimeout(stall);

    xhr.open("POST", opts.url, true);
    for (const [k, v] of Object.entries(opts.headers)) xhr.setRequestHeader(k, v);
    xhr.timeout = opts.timeoutMs;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded / e.total);
      armStall();
    };
    xhr.onload = () => {
      done();
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      reject(new UploadError(failureFromResponse(xhr.status, xhr.responseText), `${xhr.status} ${xhr.responseText.slice(0, 200)}`));
    };
    xhr.onerror = () => {
      done();
      reject(new UploadError("network"));
    };
    xhr.ontimeout = () => {
      done();
      reject(new UploadError("timeout"));
    };
    xhr.onabort = () => done();
    armStall();
    xhr.send(opts.blob);
  });
}

/** Generous but finite: a 600 KB photo gets ~65 s per attempt, a 12 MB song ~7 min. */
export function timeoutFor(bytes: number): number {
  return 45_000 + Math.ceil(bytes / 1_000_000) * 30_000;
}

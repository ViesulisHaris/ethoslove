import { z } from "zod";
import { CLIENT_ERROR_WHERE, type ClientErrorReport } from "./client-error";

/**
 * How the server checks a report from ./client-error before logging it. Server-only on purpose:
 * the browser builds reports, it never needs to validate one. Typed as the report, so the two
 * can't drift apart without failing to compile.
 */
export const clientErrorSchema: z.ZodType<ClientErrorReport> = z.object({
  where: z.enum(CLIENT_ERROR_WHERE),
  code: z.string().max(12),
  name: z.string().max(80),
  message: z.string().max(500),
  digest: z.string().max(80).optional(),
  stack: z.string().max(2000).optional(),
  path: z.string().max(300),
  template: z.string().max(40).optional(),
  build: z.string().max(64).optional(),
  translated: z.boolean().optional(),
});

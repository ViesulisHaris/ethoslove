import { z } from "zod";

/** What each candle stands for, in the order they are lit. */
export const DEFAULT_THANKS = [
  "the coffee you bring me before I ask",
  "your hand finding mine in the cinema",
  "how you laugh at your own jokes first",
  "every Sunday we did nothing at all",
  "you, coming home",
];

export const fieldsSchema = z.object({
  /** Up to five, one for each candle. */
  thanks: z.array(z.string().trim().max(60)).max(5).default(DEFAULT_THANKS),
  /** The table. */
  look: z.enum(["harvest", "linen", "plum"]).default("harvest"),
});

export type LightTheCandlesFields = z.infer<typeof fieldsSchema>;

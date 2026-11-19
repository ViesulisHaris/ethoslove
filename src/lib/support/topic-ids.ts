/**
 * The help chat's topics, in the order the chat lists them. Kept apart from topics.ts (which reads
 * both message catalogues on the server) so the chat panel can import the ids without them.
 */
export const TOPICS = ["paidMissing", "signIn", "prices", "edit", "wontOpen", "refunds", "etsy"] as const;
export type TopicId = (typeof TOPICS)[number];

/** Topics whose answer may not be enough: "I still can't find it" goes to the team. */
export const STUCK_TOPICS = ["paidMissing", "signIn", "wontOpen", "refunds", "etsy"] as const satisfies readonly TopicId[];
export type StuckTopicId = (typeof STUCK_TOPICS)[number];

export const isStuckTopic = (id: TopicId): id is StuckTopicId => (STUCK_TOPICS as readonly TopicId[]).includes(id);

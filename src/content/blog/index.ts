import type { GiftLocale } from "@/lib/gift/schema";
import type { BlogContent, BlogPost } from "./types";
import { post as virtualDateIdeasLongDistance } from "./posts/virtual-date-ideas-long-distance";
import { post as howToSurpriseYourGirlfriend } from "./posts/how-to-surprise-your-girlfriend";
import { post as firstAnniversaryIdeasForBoyfriend } from "./posts/first-anniversary-ideas-for-boyfriend";
import { post as anniversaryIdeasAtHome } from "./posts/anniversary-ideas-at-home";
import { post as longDistanceAnniversaryIdeas } from "./posts/long-distance-anniversary-ideas";
import { post as midnightBirthdaySurpriseIdeas } from "./posts/midnight-birthday-surprise-ideas";
import { post as lastMinuteBirthdayGiftForBoyfriend } from "./posts/last-minute-birthday-gift-for-boyfriend";
import { post as whatToGetABoyfriendWhoWantsNothing } from "./posts/what-to-get-a-boyfriend-who-wants-nothing";
import { post as photoGiftIdeasForBoyfriend } from "./posts/photo-gift-ideas-for-boyfriend";
import { post as howToMakeADigitalScrapbook } from "./posts/how-to-make-a-digital-scrapbook";
import { post as longDistanceChristmasGiftIdeas } from "./posts/long-distance-christmas-gift-ideas";
import { post as christmasLetterToBoyfriend } from "./posts/christmas-letter-to-boyfriend";
import { post as sorryMessageForGirlfriend } from "./posts/sorry-message-for-girlfriend";
import { post as loveLetterToHusband } from "./posts/love-letter-to-husband";
import { post as songsToDedicateToYourBoyfriend } from "./posts/songs-to-dedicate-to-your-boyfriend";
import { post as christmasMessageForGirlfriend } from "./posts/christmas-message-for-girlfriend";
import { post as sixMonthAnniversaryIdeas } from "./posts/6-month-anniversary-ideas";
import { post as anniversaryLetterToBoyfriend } from "./posts/anniversary-letter-to-boyfriend";
import { post as cuteThingsToSayToYourBoyfriend } from "./posts/cute-things-to-say-to-your-boyfriend";
import { post as cuteThingsToSayToYourGirlfriend } from "./posts/cute-things-to-say-to-your-girlfriend";
import { post as goodMorningMessagesForHer } from "./posts/good-morning-messages-for-her";
import { post as goodMorningMessagesForHim } from "./posts/good-morning-messages-for-him";
import { post as halloweenIdeasForCouples } from "./posts/halloween-ideas-for-couples";
import { post as howToApologizeToYourBoyfriend } from "./posts/how-to-apologize-to-your-boyfriend";
import { post as howToWriteALoveLetter } from "./posts/how-to-write-a-love-letter";
import { post as longDistanceBirthdayIdeas } from "./posts/long-distance-birthday-ideas-for-boyfriend";
import { post as monthiversaryIdeas } from "./posts/monthiversary-ideas";
import { post as openWhenLetterIdeas } from "./posts/open-when-letter-ideas";
import { post as paragraphsForYourGirlfriend } from "./posts/paragraphs-for-your-girlfriend";
import { post as reasonsWhyILoveYou } from "./posts/reasons-why-i-love-you";
import { post as thinkingOfYouMessagesForHim } from "./posts/thinking-of-you-messages-for-him";
import { post as whatToWriteInBoyfriendsBirthdayCard } from "./posts/what-to-write-in-boyfriends-birthday-card";

/**
 * Every post on /blog. A new post is one file in ./posts and one entry here; the list is sorted
 * newest first below, so the order here doesn't matter. docs/blog/PLAYBOOK.md is how they're written.
 */
const POSTS: BlogPost[] = [longDistanceBirthdayIdeas, halloweenIdeasForCouples, reasonsWhyILoveYou, cuteThingsToSayToYourBoyfriend, howToWriteALoveLetter, openWhenLetterIdeas, goodMorningMessagesForHer, paragraphsForYourGirlfriend, cuteThingsToSayToYourGirlfriend, goodMorningMessagesForHim, whatToWriteInBoyfriendsBirthdayCard, thinkingOfYouMessagesForHim, anniversaryLetterToBoyfriend, sixMonthAnniversaryIdeas, monthiversaryIdeas, howToApologizeToYourBoyfriend, virtualDateIdeasLongDistance, howToSurpriseYourGirlfriend, firstAnniversaryIdeasForBoyfriend, anniversaryIdeasAtHome, longDistanceAnniversaryIdeas, midnightBirthdaySurpriseIdeas, lastMinuteBirthdayGiftForBoyfriend, whatToGetABoyfriendWhoWantsNothing, photoGiftIdeasForBoyfriend, howToMakeADigitalScrapbook, longDistanceChristmasGiftIdeas, christmasLetterToBoyfriend, sorryMessageForGirlfriend, loveLetterToHusband, songsToDedicateToYourBoyfriend, christmasMessageForGirlfriend];

export const BLOG_POSTS: readonly BlogPost[] = [...POSTS].sort((a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug));

export function getPost(slug: string): BlogPost | null {
  return BLOG_POSTS.find((p) => p.slug === slug) ?? null;
}

/** The languages a post has been written in. */
export function postLocales(post: BlogPost): GiftLocale[] {
  return post.content.es ? ["en", "es"] : ["en"];
}

/** The post in a language, or in English when it hasn't been translated yet. */
export function postContent(post: BlogPost, locale: string): { content: BlogContent; locale: GiftLocale; translated: boolean } {
  if (locale === "es" && post.content.es) return { content: post.content.es, locale: "es", translated: true };
  return { content: post.content.en, locale: "en", translated: locale === "en" };
}

/** The date a post last changed. */
export function postModified(post: BlogPost): string {
  return post.updated ?? post.published;
}

/**
 * What to read next: posts for the same occasion, then posts that recommend the same templates,
 * then the newest. Never the post itself.
 */
export function relatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const score = (other: BlogPost) =>
    (post.occasion && other.occasion === post.occasion ? 2 : 0) + (other.templates.some((t) => post.templates.includes(t)) ? 1 : 0);
  return BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map(({ p }) => p);
}

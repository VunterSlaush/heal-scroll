/**
 * Structured-output contracts for generator decoration (AI_ON_DEVICE_PLAN §4/§6).
 * Zod schemas satisfy core's structural `OutputValidator<T>` directly.
 */
import { z } from 'zod';

/** One-line "why this is interesting", ≤ 20 words. */
export const whyInterestingSchema = z
  .object({ why: z.string().trim().min(1).max(160) })
  .refine((v) => v.why.split(/\s+/).length <= 20, { message: 'why must be ≤ 20 words' });
export type WhyInteresting = z.infer<typeof whyInterestingSchema>;

/** Recall-card question with the keyword an answer should contain. */
export const recallQuestionSchema = z.object({
  question: z.string().trim().min(1).max(200),
  keyword: z.string().trim().min(1).max(60),
});
export type RecallQuestion = z.infer<typeof recallQuestionSchema>;

/** Classification of an untagged RSS item into an existing topic id. */
export const topicTagSchema = z.object({ topicId: z.string().trim().min(1).max(40) });
export type TopicTag = z.infer<typeof topicTagSchema>;

/** One-sentence session recap. */
export const sessionRecapSchema = z.object({ recap: z.string().trim().min(1).max(200) });
export type SessionRecap = z.infer<typeof sessionRecapSchema>;

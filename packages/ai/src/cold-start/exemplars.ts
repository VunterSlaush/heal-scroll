/**
 * Curated exemplar card titles (AI_ON_DEVICE_PLAN §10.1): shipped in the app to
 * seed topic taste vectors before any behavioural data exists. Onboarding (or
 * a future first-run screen) asks the user to pick 3 of 9 — each pick becomes
 * a pinned interest via `addPinnedInterest`.
 */
export interface ExemplarCard {
  id: string;
  topicId: string;
  title: string;
}

export const ONBOARDING_EXEMPLARS: readonly ExemplarCard[] = [
  { id: 'ex-space-1', topicId: 'space', title: 'How the James Webb telescope sees the first galaxies' },
  { id: 'ex-space-2', topicId: 'space', title: 'Why Europa’s hidden ocean is the best bet for alien life' },
  { id: 'ex-science-1', topicId: 'science', title: 'The mitochondria that swapped genomes mid-evolution' },
  { id: 'ex-science-2', topicId: 'science', title: 'What octopus camouflage reveals about distributed brains' },
  { id: 'ex-tech-1', topicId: 'tech', title: 'How SQLite became the most deployed database on Earth' },
  { id: 'ex-ai-1', topicId: 'ai', title: 'Why small on-device language models are suddenly good' },
  { id: 'ex-history-1', topicId: 'history', title: 'The Roman concrete recipe that outlasted its empire' },
  { id: 'ex-health-1', topicId: 'health', title: 'What actually happens in your brain during deep sleep' },
  { id: 'ex-economics-1', topicId: 'economics', title: 'The shipping container that rewired world trade' },
];

/** Deterministic 9-card onboarding set; the seed rotates variety per install. */
export function pickOnboardingSet(seed = 0): ExemplarCard[] {
  const rotated = [...ONBOARDING_EXEMPLARS];
  const shift = Math.abs(seed) % rotated.length;
  return [...rotated.slice(shift), ...rotated.slice(0, shift)].slice(0, 9);
}

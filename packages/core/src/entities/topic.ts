export interface Topic {
  id: string;
  name: string;
  /** Search terms used by query-capable sources. User topics carry the raw term. */
  query: string;
}

/** "#Quantum Computing!" → { id: 'quantum-computing', name: 'Quantum Computing!', query: … }. */
export function createUserTopic(rawTerm: string): Topic {
  const name = rawTerm.replace(/#/g, ' ').replace(/\s+/g, ' ').trim();
  const id = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return { id, name, query: name };
}

/** First-run defaults (PLAN §3); seeded once, deletable like any user topic. */
export const DEFAULT_TOPICS: Topic[] = [
  { id: 'space', name: 'Space & astronomy', query: 'space exploration astronomy planets' },
  { id: 'science', name: 'Science & nature', query: 'scientific discovery biology physics' },
  { id: 'tech', name: 'Tech & programming', query: 'computer technology software internet' },
  { id: 'ai', name: 'AI & machine learning', query: 'artificial intelligence machine learning' },
  { id: 'history', name: 'History', query: 'ancient history empire civilization' },
  { id: 'economics', name: 'Economics & business', query: 'economics trade industry companies' },
  { id: 'markets', name: 'Markets & macro', query: 'stock market investment banking' },
  { id: 'finance', name: 'Personal finance & investing', query: 'personal finance money savings investment' },
  { id: 'health', name: 'Health & medicine', query: 'medicine disease treatment human health' },
  { id: 'nutrition', name: 'Nutrition & food science', query: 'nutrition food diet vitamins' },
  { id: 'longevity', name: 'Longevity & sleep', query: 'ageing sleep longevity lifespan' },
  { id: 'mindfulness', name: 'Mental health & mindfulness', query: 'meditation psychology mental health' },
];

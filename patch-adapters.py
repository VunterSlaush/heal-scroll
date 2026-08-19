import io

def patch(path, replacements):
    s = io.open(path, encoding='utf-8').read()
    for old, new in replacements:
        assert old in s, "NOT FOUND in %s: %s" % (path, old[:70])
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print('patched', path)

patch('packages/sources/src/wikipedia/wikipedia.adapter.ts', [
  ("""    'longevity',
    'mindfulness',
  ],
};""",
   """    'longevity',
    'mindfulness',
  ],
  dynamicTopics: true,
};"""),
  ("""      const terms = TOPIC_SEARCHES[topic.id];
      if (!terms || limit <= 0) return [];""",
   """      const terms = TOPIC_SEARCHES[topic.id] ?? topic.query;
      if (!terms || limit <= 0) return [];"""),
])

patch('packages/sources/src/guardian/guardian.adapter.ts', [
  ("""    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
};""",
   """    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
  dynamicTopics: true,
};"""),
  ("""      const filters = TOPIC_FILTERS[topic.id];
      if (!filters || limit <= 0) return [];""",
   """      const filters = TOPIC_FILTERS[topic.id] ?? (topic.query ? { q: topic.query } : undefined);
      if (!filters || limit <= 0) return [];"""),
])

patch('packages/sources/src/hacker-news/hacker-news.adapter.ts', [
  ("""  quality: 0.6,
  topicIds: ['tech', 'ai'],
};""",
   """  quality: 0.6,
  topicIds: ['tech', 'ai'],
  dynamicTopics: true,
};"""),
  ("""    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const topicQuery = TOPIC_QUERIES[topic.id];
      if (!topicQuery || limit <= 0) return [];""",
   """    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const topicQuery =
        TOPIC_QUERIES[topic.id] ??
        (topic.query
          ? "query=" + encodeURIComponent(topic.query) + "&tags=story&numericFilters=" + encodeURIComponent('points>20')
          : undefined);
      if (!topicQuery || limit <= 0) return [];"""),
])

patch('packages/sources/src/arxiv/arxiv.adapter.ts', [
  ("""  quality: 0.9,
  topicIds: ['space', 'science', 'ai'],
};""",
   """  quality: 0.9,
  topicIds: ['space', 'science', 'ai'],
  dynamicTopics: true,
};"""),
  ("""  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const category = TOPIC_CATEGORIES[topic.id];
    if (!category || limit <= 0) return [];
    const query = [
      `search_query=${encodeURIComponent(`cat:${category}`)}`,""",
   """  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const category = TOPIC_CATEGORIES[topic.id];
    const searchQuery = category ? `cat:${category}` : topic.query ? `all:"${topic.query}"` : undefined;
    if (!searchQuery || limit <= 0) return [];
    const query = [
      `search_query=${encodeURIComponent(searchQuery)}`,"""),
])

patch('packages/sources/src/pubmed/pubmed.adapter.ts', [
  ("""  quality: 0.85,
  topicIds: ['science', 'health', 'nutrition', 'longevity', 'mindfulness'],
};""",
   """  quality: 0.85,
  topicIds: ['science', 'health', 'nutrition', 'longevity', 'mindfulness'],
  dynamicTopics: true,
};"""),
  ("""  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const term = TOPIC_QUERIES[topic.id];
    if (!term || limit <= 0) return [];""",
   """  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const term =
      TOPIC_QUERIES[topic.id] ??
      (topic.query ? `${topic.query} AND hasabstract[text] AND review[pt]` : undefined);
    if (!term || limit <= 0) return [];"""),
])

patch('packages/sources/src/devto/devto.adapter.ts', [
  ("""  quality: 0.65,
  topicIds: ['tech', 'ai'],
};""",
   """  quality: 0.65,
  topicIds: ['tech', 'ai'],
  dynamicTopics: true,
};"""),
  ("""const API_URL = 'https://dev.to/api/articles';""",
   """const API_URL = 'https://dev.to/api/articles';

/** dev.to tags are bare alphanumerics: "Quantum Computing" -> "quantumcomputing". */
export function devtoTag(topic: Topic): string | undefined {
  const curated = TOPIC_TAGS[topic.id];
  if (curated) return curated;
  const slug = topic.query.toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug || undefined;
}"""),
  ("""  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const tag = TOPIC_TAGS[topic.id];
    if (!tag || limit <= 0) return [];""",
   """  async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
    const tag = devtoTag(topic);
    if (!tag || limit <= 0) return [];"""),
])

patch('packages/sources/src/twitter/twitter.adapter.ts', [
  ("""    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
};""",
   """    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
  dynamicTopics: true,
};"""),
  ("""function queryFor(topicId: string): string | undefined {
  const accounts = TOPIC_ACCOUNTS[topicId];
  if (!accounts || accounts.length === 0) return undefined;
  return `(${accounts.map((a) => `from:${a}`).join(' OR ')}) -is:retweet -is:reply`;
}""",
   """function queryFor(topic: Topic): string | undefined {
  const accounts = TOPIC_ACCOUNTS[topic.id];
  if (accounts && accounts.length > 0) {
    return `(${accounts.map((a) => `from:${a}`).join(' OR ')}) -is:retweet -is:reply`;
  }
  return topic.query ? `(${topic.query}) lang:en -is:retweet -is:reply` : undefined;
}"""),
  ("""      const topicQuery = queryFor(topic.id);""",
   """      const topicQuery = queryFor(topic);"""),
])

patch('packages/sources/src/reddit/reddit.adapter.ts', [
  ("""    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
};""",
   """    'finance', 'health', 'nutrition', 'longevity', 'mindfulness',
  ],
  dynamicTopics: true,
};"""),
  ("""    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const subreddits = TOPIC_SUBREDDITS[topic.id];
      if (!subreddits || subreddits.length === 0 || limit <= 0) return [];
      const bearer = await getToken();
      const base = bearer ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
      const headers: Record<string, string> = { 'User-Agent': REDDIT_CONFIG.userAgent };
      if (bearer) headers.Authorization = `Bearer ${bearer}`;

      const perSub = Math.ceil(limit / subreddits.length);""",
   """    async fetchCards(topic: Topic, limit: number): Promise<Card[]> {
      const subreddits = TOPIC_SUBREDDITS[topic.id];
      if ((!subreddits || subreddits.length === 0) && !topic.query) return [];
      if (limit <= 0) return [];
      const bearer = await getToken();
      const base = bearer ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
      const headers: Record<string, string> = { 'User-Agent': REDDIT_CONFIG.userAgent };
      if (bearer) headers.Authorization = `Bearer ${bearer}`;

      // User topics without curated subreddits use Reddit's site-wide search.
      if (!subreddits || subreddits.length === 0) {
        const response = await fetch(
          `${base}/search${bearer ? '' : '.json'}?q=${encodeURIComponent(topic.query)}&sort=top&t=week&limit=${Math.min(limit, 25)}&raw_json=1`,
          { headers },
        );
        if (!response.ok) throw new Error(`reddit: HTTP ${response.status} for search`);
        return postsToCards((await response.json()) as RedditListing, topic.id);
      }

      const perSub = Math.ceil(limit / subreddits.length);"""),
])
print('done')

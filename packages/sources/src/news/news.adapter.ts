import { createFeedAdapter, type FeedSpec } from '../rss/rss.adapter';

/**
 * News as a source (PLAN §3 spirit): key-free public RSS from broad outlets,
 * mapped per section to topics. Same parser/splitter as the blog RSS adapter.
 */
export const NEWS_FEEDS: FeedSpec[] = [
  {
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    name: 'BBC Business',
    topicIds: ['economics', 'markets', 'finance'],
  },
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', name: 'BBC Health', topicIds: ['health'] },
  {
    url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    name: 'BBC Science',
    topicIds: ['science', 'space'],
  },
  {
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    name: 'BBC Technology',
    topicIds: ['tech', 'ai'],
  },
  { url: 'https://feeds.npr.org/1006/rss.xml', name: 'NPR Business', topicIds: ['economics', 'finance'] },
  {
    url: 'https://feeds.npr.org/1128/rss.xml',
    name: 'NPR Health',
    topicIds: ['health', 'nutrition', 'mindfulness'],
  },
];

export const newsAdapter = createFeedAdapter({
  id: 'news',
  name: 'News',
  quality: 0.75,
  ttlHours: 12,
  feeds: NEWS_FEEDS,
});

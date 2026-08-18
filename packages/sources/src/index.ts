export { stripHtml } from './utils/strip-html';
export { truncateAtSentence } from './utils/truncate-at-sentence';
export { canonicalUrl } from './utils/canonical-url';
export { hashTitle } from './utils/hash-title';
export { extractFirstImage } from './utils/extract-first-image';
export { makeSeriesCards, MAX_SERIES_CARDS } from './splitters/make-series';

export { wikipediaAdapter, WIKIPEDIA_CONFIG } from './wikipedia/wikipedia.adapter';
export { arxivAdapter, ARXIV_CONFIG } from './arxiv/arxiv.adapter';
export { hackerNewsAdapter, HACKER_NEWS_CONFIG } from './hacker-news/hacker-news.adapter';
export { lobstersAdapter, LOBSTERS_CONFIG } from './lobsters/lobsters.adapter';
export { createNasaApodAdapter, NASA_APOD_CONFIG } from './nasa-apod/nasa-apod.adapter';
export {
  wikipediaOnThisDayAdapter,
  WIKIPEDIA_OTD_CONFIG,
} from './wikipedia-on-this-day/wikipedia-on-this-day.adapter';
export { rssAdapter, createFeedAdapter, CURATED_FEEDS } from './rss/rss.adapter';
export type { FeedSpec } from './rss/rss.adapter';
export { newsAdapter, NEWS_FEEDS } from './news/news.adapter';
export { pubmedAdapter, PUBMED_CONFIG } from './pubmed/pubmed.adapter';
export { createTwitterAdapter, TOPIC_ACCOUNTS, TWITTER_CONFIG } from './twitter/twitter.adapter';
export { createRedditAdapter, TOPIC_SUBREDDITS, REDDIT_CONFIG } from './reddit/reddit.adapter';
export type { RedditCredentials } from './reddit/reddit.adapter';
export { createWikipediaAdapter } from './wikipedia/wikipedia.adapter';
export { createWikipediaOnThisDayAdapter } from './wikipedia-on-this-day/wikipedia-on-this-day.adapter';

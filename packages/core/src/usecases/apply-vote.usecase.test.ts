import { describe, expect, it } from 'vitest';
import { FakeCardRepo, FakeTopicRepo, FakeTopicSourceRepo, makeCard } from '../testing/fakes';
import { applyVote, VOTE_LEARNING_RATE } from './apply-vote.usecase';

describe('applyVote', () => {
  it('stores the vote and nudges topic + source weights by the learning rate', async () => {
    const cardRepo = new FakeCardRepo();
    const topicRepo = new FakeTopicRepo();
    const topicSourceRepo = new FakeTopicSourceRepo();
    const card = makeCard('a');

    await applyVote({ cardRepo, topicRepo, topicSourceRepo }, card, 1);

    expect(cardRepo.votes.get('a')).toBe(1);
    expect(topicRepo.topics[0]?.weight).toBeCloseTo(1 + VOTE_LEARNING_RATE);
    expect(topicSourceRepo.states[0]?.weight).toBeCloseTo(1 + VOTE_LEARNING_RATE);
  });

  it('clearing a vote does not change weights', async () => {
    const cardRepo = new FakeCardRepo();
    const topicRepo = new FakeTopicRepo();
    const topicSourceRepo = new FakeTopicSourceRepo();

    await applyVote({ cardRepo, topicRepo, topicSourceRepo }, makeCard('a'), 0);

    expect(topicRepo.topics[0]?.weight).toBe(1);
    expect(topicSourceRepo.states).toHaveLength(0);
  });

  it('downvotes nudge weights down, clamped at the floor', async () => {
    const cardRepo = new FakeCardRepo();
    const topicRepo = new FakeTopicRepo();
    const topicSourceRepo = new FakeTopicSourceRepo();
    const card = makeCard('a');

    for (let i = 0; i < 50; i++) await applyVote({ cardRepo, topicRepo, topicSourceRepo }, card, -1);

    expect(topicRepo.topics[0]?.weight).toBeCloseTo(0.2);
    expect(topicSourceRepo.states[0]?.weight).toBeCloseTo(0.2);
  });
});

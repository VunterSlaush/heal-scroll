import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createAbsentGenerator } from './absent.generator';
import { extractJson, wrapNativeGenerator } from './wrap-native';
import { withTimeout } from './with-timeout';

const schema = z.object({ why: z.string() });

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves the value when it arrives in time', async () => {
    const result = withTimeout(Promise.resolve('ok'), 2_000);
    await expect(result).resolves.toBe('ok');
  });

  it('resolves null when the promise is slower than the timeout', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 5_000));
    const result = withTimeout(slow, 2_000);
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(result).resolves.toBeNull();
  });

  it('resolves null instead of rejecting on failure', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 2_000)).resolves.toBeNull();
  });
});

describe('extractJson', () => {
  it('parses plain JSON and JSON wrapped in prose or fences', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('Sure! ```json\n{"a":1}\n``` hope that helps')).toEqual({ a: 1 });
  });

  it('throws when there is no JSON object at all', () => {
    expect(() => extractJson('no json here')).toThrow(SyntaxError);
  });
});

describe('wrapNativeGenerator', () => {
  it('validates model output against the schema', async () => {
    const gen = wrapNativeGenerator('test', {
      generate: () => Promise.resolve('{"why":"tiny models got good"}'),
    });
    await expect(gen.generate('p', schema)).resolves.toEqual({ why: 'tiny models got good' });
  });

  it('retries once on parse failure, then succeeds', async () => {
    let calls = 0;
    const gen = wrapNativeGenerator('flaky', {
      generate: () => Promise.resolve(++calls === 1 ? 'garbage' : '{"why":"second try"}'),
    });
    await expect(gen.generate('p', schema)).resolves.toEqual({ why: 'second try' });
    expect(calls).toBe(2);
  });

  it('returns null after two schema failures or on binding refusal', async () => {
    const junk = wrapNativeGenerator('junk', { generate: () => Promise.resolve('{"nope":1}') });
    await expect(junk.generate('p', schema)).resolves.toBeNull();
    const refusing = wrapNativeGenerator('refusing', { generate: () => Promise.resolve(null) });
    await expect(refusing.generate('p', schema)).resolves.toBeNull();
  });

  it('degrades to null past the 2 s timeout', async () => {
    vi.useFakeTimers();
    try {
      const gen = wrapNativeGenerator('slow', {
        generate: () =>
          new Promise((resolve) => setTimeout(() => resolve('{"why":"too late"}'), 10_000)),
      });
      const result = gen.generate('p', schema);
      await vi.advanceTimersByTimeAsync(2_000);
      await expect(result).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('createAbsentGenerator', () => {
  it('always resolves null', async () => {
    await expect(createAbsentGenerator().generate('p', schema)).resolves.toBeNull();
  });
});

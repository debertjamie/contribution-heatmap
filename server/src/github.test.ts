import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchContributions, HttpError } from './github.js';
import { clearCache } from './cache.js';

/** Build a fake fetch Response for a successful GraphQL body. */
function graphqlOk(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    json: async () => body,
  } as unknown as Response;
}

/** Build a fake non-OK fetch Response. */
function graphqlError(
  status: number,
  statusText: string,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: false,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => ({}),
  } as unknown as Response;
}

const SAMPLE_CALENDAR = {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: 42,
          weeks: [
            {
              contributionDays: [
                { date: '2024-01-01', contributionCount: 1, weekday: 1, color: '#9be9a8' },
                { date: '2024-01-02', contributionCount: 2, weekday: 2, color: '#40c463' },
              ],
            },
            {
              contributionDays: [
                { date: '2024-01-08', contributionCount: 3, weekday: 1, color: '#30a14e' },
              ],
            },
          ],
        },
      },
    },
  },
};

describe('fetchContributions', () => {
  beforeEach(() => {
    clearCache();
    process.env.GITHUB_TOKEN = 'test-token';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GITHUB_TOKEN;
  });

  it('returns a well-formed, flattened ContributionsResult on success', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      graphqlOk(SAMPLE_CALENDAR)
    );

    const result = await fetchContributions('octocat', 2024);

    expect(result.username).toBe('octocat');
    expect(result.year).toBe(2024);
    expect(result.totalContributions).toBe(42);
    expect(result.days).toHaveLength(3);
    expect(result.days[0]).toEqual({
      date: '2024-01-01',
      count: 1,
      weekday: 1,
      color: '#9be9a8',
    });
    expect(result.days[2]).toEqual({
      date: '2024-01-08',
      count: 3,
      weekday: 1,
      color: '#30a14e',
    });
  });

  it('throws HttpError(500) when GITHUB_TOKEN is unset', async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(fetchContributions('octocat', 2024)).rejects.toMatchObject({
      status: 500,
    });
  });

  it('throws HttpError(404) when data.user is null', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      graphqlOk({ data: { user: null } })
    );
    await expect(fetchContributions('ghost', 2024)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('maps upstream 401 to HttpError(502)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      graphqlError(401, 'Unauthorized')
    );
    const err = await fetchContributions('octocat', 2024).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(502);
  });

  it('maps upstream 403 with x-ratelimit-remaining:0 to HttpError(429)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      graphqlError(403, 'Forbidden', { 'x-ratelimit-remaining': '0' })
    );
    const err = await fetchContributions('octocat', 2024).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(429);
  });

  it('caches by username:year and does not re-fetch within TTL', async () => {
    const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue(graphqlOk(SAMPLE_CALENDAR));

    const first = await fetchContributions('octocat', 2024);
    const second = await fetchContributions('octocat', 2024);

    expect(mockFetch.mock.calls.length).toBe(1);
    expect(second).toEqual(first);
  });
});

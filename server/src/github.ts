/**
 * GitHub GraphQL client for contribution-calendar data.
 *
 * The backend acts as a proxy so the GitHub PAT never reaches the browser.
 */

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export interface ContributionDay {
  date: string;
  count: number;
  weekday: number;
  color: string;
}

export interface ContributionsResult {
  username: string;
  year: number;
  totalContributions: number;
  days: ContributionDay[];
}

const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

const CONTRIBUTIONS_QUERY = `
query ($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            weekday
            color
          }
        }
      }
    }
  }
}
`;

interface GraphQLDay {
  date: string;
  contributionCount: number;
  weekday: number;
  color: string;
}

interface GraphQLResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: GraphQLDay[] }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
}

/**
 * Fetch a user's contribution calendar for the given calendar year.
 * Throws {@link HttpError} with an appropriate status on any failure.
 */
export async function fetchContributions(
  username: string,
  year: number
): Promise<ContributionsResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new HttpError(500, 'GITHUB_TOKEN is not configured on the server');
  }

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  let response: Response;
  try {
    response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'contribution-heatmap-3d',
      },
      body: JSON.stringify({
        query: CONTRIBUTIONS_QUERY,
        variables: { login: username, from, to },
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new HttpError(500, `Failed to reach GitHub GraphQL API: ${detail}`);
  }

  if (!response.ok) {
    throw new HttpError(
      500,
      `GitHub GraphQL API returned HTTP ${response.status} ${response.statusText}`
    );
  }

  let json: GraphQLResponse;
  try {
    json = (await response.json()) as GraphQLResponse;
  } catch {
    throw new HttpError(500, 'GitHub GraphQL API returned an invalid JSON response');
  }

  if (json.errors && json.errors.length > 0) {
    throw new HttpError(500, `GitHub GraphQL error: ${json.errors[0].message}`);
  }

  const user = json.data?.user;
  if (!user) {
    throw new HttpError(404, `GitHub user not found: ${username}`);
  }

  const calendar = user.contributionsCollection.contributionCalendar;
  const days: ContributionDay[] = [];
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      days.push({
        date: day.date,
        count: day.contributionCount,
        weekday: day.weekday,
        color: day.color,
      });
    }
  }

  return {
    username,
    year,
    totalContributions: calendar.totalContributions,
    days,
  };
}

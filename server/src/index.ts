import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fetchContributions, HttpError } from './github.js';

export const app = express();

/**
 * Allowed CORS origins, read from ALLOWED_ORIGINS (comma-separated).
 * Falls back to the Vite dev origin when unset/empty.
 */
function allowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  const parsed = (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return parsed.length > 0 ? parsed : ['http://localhost:5173'];
}

app.use(helmet());
app.use(cors({ origin: allowedOrigins() }));
app.use(express.json());

// Rate limiter applied only to the contributions API (not /health).
const contributionsLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res
      .status(429)
      .json({ error: 'Too many requests — please slow down and try again later.' });
  },
});

const GITHUB_LAUNCH_YEAR = 2008;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/api/contributions', contributionsLimiter);

app.get('/api/contributions/:username', async (req: Request, res: Response) => {
  const rawUsername = req.params.username;
  const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;

  const currentYear = new Date().getUTCFullYear();
  let year = currentYear;

  const rawYear = req.query.year;
  if (rawYear !== undefined) {
    const yearStr = Array.isArray(rawYear) ? String(rawYear[0]) : String(rawYear);
    const parsed = Number(yearStr);
    if (
      !Number.isInteger(parsed) ||
      parsed < GITHUB_LAUNCH_YEAR ||
      parsed > currentYear
    ) {
      throw new HttpError(
        400,
        `Invalid year: "${yearStr}". Expected an integer between ${GITHUB_LAUNCH_YEAR} and ${currentYear}.`
      );
    }
    year = parsed;
  }

  const result = await fetchContributions(username, year);
  res.json(result);
});

// Centralized error handler (Express 5 forwards rejected async handlers here).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;
  const message =
    err instanceof Error ? err.message : 'Unexpected server error';
  res.status(status).json({ error: message });
});

/** Start the HTTP server, binding to 0.0.0.0 so it works inside containers. */
export function start(): void {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log(`contribution-heatmap-3d server listening on http://localhost:${port}`);
  });
}

// Only start a listener when run as the entry point (not when imported by tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start();
}

import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { fetchContributions, HttpError } from './github.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const GITHUB_LAUNCH_YEAR = 2008;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

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

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`contribution-heatmap-3d server listening on http://localhost:${port}`);
});

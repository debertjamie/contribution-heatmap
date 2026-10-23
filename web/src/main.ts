import './style.css';
import { Scene } from './scene.js';
import type { Day, ThemeName } from './themes.js';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

interface ContributionsResponse {
  username: string;
  year: number;
  totalContributions: number;
  days: Day[];
}

const usernameInput = document.getElementById('username') as HTMLInputElement;
const yearSelect = document.getElementById('year') as HTMLSelectElement;
const themeSelect = document.getElementById('theme') as HTMLSelectElement;
const goButton = document.getElementById('go') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;
const totalEl = document.getElementById('total') as HTMLSpanElement;
const sceneMount = document.getElementById('scene') as HTMLDivElement;

// Populate the year dropdown: current year plus the previous 7 (8 options).
const currentYear = new Date().getFullYear();
for (let y = currentYear; y >= currentYear - 7; y -= 1) {
  const option = document.createElement('option');
  option.value = String(y);
  option.textContent = String(y);
  yearSelect.appendChild(option);
}

const scene = new Scene(sceneMount);

// Remember the last loaded dataset so a theme change can rebuild without refetch.
let lastDays: Day[] | null = null;
let lastMaxCount = 0;

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function currentTheme(): ThemeName {
  return themeSelect.value === 'ocean' ? 'ocean' : 'classic';
}

async function visualize(): Promise<void> {
  const username = usernameInput.value.trim();
  if (username === '') {
    setStatus('Enter a GitHub username.', true);
    return;
  }

  const year = yearSelect.value;
  setStatus('Loading…');
  totalEl.textContent = '';
  goButton.disabled = true;

  const url = `${API_BASE}/api/contributions/${encodeURIComponent(
    username
  )}?year=${encodeURIComponent(year)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      let message = `Request failed (HTTP ${response.status})`;
      try {
        const body = (await response.json()) as { error?: string };
        if (response.status === 404) {
          message = `User not found: ${username}`;
        } else if (body.error) {
          message = body.error;
        }
      } catch {
        // keep the generic message
      }
      setStatus(message, true);
      return;
    }

    const data = (await response.json()) as ContributionsResponse;
    const maxCount = data.days.reduce((max, d) => Math.max(max, d.count), 0);

    lastDays = data.days;
    lastMaxCount = maxCount;

    scene.build(data.days, maxCount, currentTheme());
    totalEl.textContent = `${data.totalContributions.toLocaleString()} contributions in ${data.year}`;
    setStatus('');
  } catch {
    setStatus('Network error — is the backend running?', true);
  } finally {
    goButton.disabled = false;
  }
}

goButton.addEventListener('click', () => {
  void visualize();
});

usernameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    void visualize();
  }
});

themeSelect.addEventListener('change', () => {
  if (lastDays) {
    scene.build(lastDays, lastMaxCount, currentTheme());
  }
});

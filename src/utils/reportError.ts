const API_URL = import.meta.env.VITE_API_URL || '';

export function reportError(source: string, error: unknown): void {
  console.error(`[${source}]`, error);
  fetch(`${API_URL}/api/report-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, error: String(error) }),
  }).catch(() => {
    // silently ignore reporting failures
  });
}

const API_URL = import.meta.env.VITE_API_URL || '';

function getErrorDetail(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function reportError(source: string, error: unknown): void {
  console.error(`[${source}]`, error);

  const { message, stack } = getErrorDetail(error);

  fetch(`${API_URL}/api/report-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source,
      error: message,
      stack,
      url: location.href,
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // silently ignore reporting failures
  });
}

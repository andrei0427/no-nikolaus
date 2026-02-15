import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { reportError } from './utils/reportError'

// Only report errors that indicate the service itself is broken.
// Filter out browser noise (ResizeObserver, extensions, Script error, etc.)
const IGNORED_PATTERNS = [
  /ResizeObserver/i,
  /Script error/i,
  /Loading chunk/i,
  /Failed to fetch dynamically imported module/i,
  /NetworkError/i,
  /Load failed/i,
];

function isIgnored(msg: string): boolean {
  return IGNORED_PATTERNS.some((re) => re.test(msg));
}

window.addEventListener('error', (event) => {
  const msg = event.error?.message ?? event.message ?? '';
  if (!isIgnored(msg)) {
    reportError('Uncaught', event.error ?? `${event.message} at ${event.filename}:${event.lineno}`)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? String(event.reason ?? '');
  if (!isIgnored(msg)) {
    reportError('Unhandled rejection', event.reason)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { reportError } from './utils/reportError'

window.addEventListener('error', (event) => {
  reportError('Uncaught', event.error ?? `${event.message} at ${event.filename}:${event.lineno}`)
})

window.addEventListener('unhandledrejection', (event) => {
  reportError('Unhandled rejection', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

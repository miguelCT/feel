import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { initDevClock } from './lib/devClock';
import { getInitialTheme } from './lib/theme';
import './styles/theme.css';

// Apply any dev-only ?now= time-travel override before the first render.
initDevClock();

// Apply the theme before first paint to avoid a flash of unstyled content.
document.documentElement.dataset.theme = getInitialTheme();

// Auto-update the service worker in the background; offline-ready on first load.
registerSW({ immediate: true });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root element');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

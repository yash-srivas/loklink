import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyAccentColor } from './lib/utils';

// ── Theme initialization ────────────────────────────────────────────────────
// Run BEFORE React mounts so there is no flash of wrong theme.
// Default: 'light'. Stored preference from Settings is respected.
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  const html = document.documentElement;
  if (saved === 'dark') {
    html.classList.add('dark');
  } else if (saved === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.toggle('dark', prefersDark);
  } else {
    // 'light' or anything else → ensure dark class is absent
    html.classList.remove('dark');
  }
  
  // Apply saved brand color variables immediately on boot!
  const savedAccent = localStorage.getItem('accent-color') || 'orange';
  applyAccentColor(savedAccent);
})();
// ───────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


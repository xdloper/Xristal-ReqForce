import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { applyThemeToDocument, resolveTheme } from './utils/theme';

// Apply OS theme before first paint (no inline <script> — MV3 CSP forbids it)
applyThemeToDocument(resolveTheme('system'));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

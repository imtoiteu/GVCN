// App shell: title + sidebar navigation + the active page.
//
// Navigation is plain in-memory state for this bridging milestone (no router dependency).
// The sidebar lists every SPEC §4 screen; selecting one renders its page (two are
// functional, the rest are placeholders). Vietnamese-first copy throughout.

import { useState } from 'react';
import { NAV_ITEMS } from './nav';
import { t } from './i18n';
import './app-shell.css';

export function AppShell() {
  const [activeId, setActiveId] = useState<string>('classes');
  const active = NAV_ITEMS.find((n) => n.id === activeId) ?? NAV_ITEMS[0];

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-title">{t.appTitle}</span>
          <span className="shell__brand-subtitle">{t.appSubtitle}</span>
        </div>
        <nav className="shell__nav" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                'shell__nav-item' + (item.id === active.id ? ' shell__nav-item--active' : '')
              }
              aria-current={item.id === active.id ? 'page' : undefined}
              onClick={() => setActiveId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shell__offline" title={t.offline}>
          <span className="shell__offline-dot" aria-hidden="true" />
          {t.offline}
        </div>
      </aside>
      <main className="shell__content">{active.render()}</main>
    </div>
  );
}

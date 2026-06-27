// App shell: title + sidebar navigation + the active page.
//
// Navigation is plain in-memory state for this bridging milestone (no router dependency).
// The sidebar lists every SPEC §4 screen; selecting one renders its page (two are
// functional, the rest are placeholders). Vietnamese-first copy throughout.

import { useEffect, useState } from 'react';
import { NAV_ITEMS } from './nav';
import { AppNavProvider } from './nav-context';
import {
  t,
  navLabel,
  loadLocale,
  saveLocale,
  setLocale,
  type Locale,
} from './i18n';
import './app-shell.css';

export function AppShell() {
  const [activeId, setActiveId] = useState<string>('dashboard');
  // Initialize the active dictionary synchronously (before children render) from the saved
  // preference, so a stored English choice shows immediately with no Vietnamese flash.
  const [locale, setLocaleState] = useState<Locale>(() => setLocale(loadLocale()));
  const active = NAV_ITEMS.find((n) => n.id === activeId) ?? NAV_ITEMS[0];

  // Keep the document language in sync for accessibility / spell-check (index.html ships vi).
  useEffect(() => {
    try {
      document.documentElement.lang = locale;
    } catch {
      /* no document (tests) — ignore */
    }
  }, [locale]);

  function changeLocale(next: Locale) {
    setLocale(next); // swap the live `t` binding
    saveLocale(next); // persist for next launch
    setLocaleState(next); // re-render the tree with the new strings
  }

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-title">{t.appTitle}</span>
          <span className="shell__brand-subtitle">{t.appSubtitle}</span>
          <span className="shell__copyright">{t.copyright}</span>
        </div>
        <div className="shell__lang">
          <label className="shell__lang-label" htmlFor="shell-lang">
            {t.lang.label}
          </label>
          <select
            id="shell-lang"
            className="shell__lang-select"
            value={locale}
            onChange={(e) => changeLocale(e.target.value as Locale)}
          >
            <option value="vi">{t.lang.vi}</option>
            <option value="en">{t.lang.en}</option>
          </select>
        </div>
        <nav className="shell__nav" aria-label={t.a11y.mainNav}>
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
              {navLabel(item.id)}
            </button>
          ))}
        </nav>
        <div className="shell__offline" title={t.offline}>
          <span className="shell__offline-dot" aria-hidden="true" />
          {t.offline}
        </div>
      </aside>
      <main className="shell__content">
        <AppNavProvider value={{ activeId, navigate: setActiveId, locale, setLocale: changeLocale }}>
          {active.render()}
        </AppNavProvider>
      </main>
    </div>
  );
}

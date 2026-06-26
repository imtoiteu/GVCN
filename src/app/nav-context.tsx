// M9.1 — Lightweight in-app navigation + locale context.
//
// The app deliberately has no router (in-memory page switching in AppShell). This context lets any
// page request a screen change (dashboard quick actions, empty-state "go to…" CTAs) and lets the
// Settings page change the UI language, without prop-drilling. A safe no-op default means a page
// rendered outside the provider (e.g. a future test) never crashes.

import { createContext, useContext } from 'react';
import type { Locale } from './i18n';

export interface AppNav {
  /** Id of the currently active nav screen. */
  activeId: string;
  /** Switch to another screen by nav id (see nav.tsx NAV_ITEMS). */
  navigate: (id: string) => void;
  /** Current UI locale. */
  locale: Locale;
  /** Change + persist the UI locale (mirrors the sidebar selector). */
  setLocale: (loc: Locale) => void;
}

const AppNavContext = createContext<AppNav>({
  activeId: 'dashboard',
  navigate: () => {},
  locale: 'vi',
  setLocale: () => {},
});

export const AppNavProvider = AppNavContext.Provider;

export function useAppNav(): AppNav {
  return useContext(AppNavContext);
}

// Navigation model for the app shell.
//
// Lists all 12 MVP screens from SPEC §4 so the shell reflects the real product surface.
// For this bridging milestone only two screens are functional (Classes, Import); the rest
// render a Vietnamese placeholder until their milestone lands. Navigation is plain in-memory
// state (no router dependency yet) — see AppShell.

import type { ReactNode } from 'react';
import { ClassesPage } from '../features/classes/ClassesPage';
import { ImportPage } from '../features/import/ImportPage';
import { WeeklyRecordPage } from '../features/weekly/WeeklyRecordPage';
import { CommentsPage } from '../features/comments/CommentsPage';
import { ParentMessagesPage } from '../features/parent/ParentMessagesPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ExportsPage } from '../features/exports/ExportsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export interface NavItem {
  /** Stable id; also the i18n key for the sidebar label (see `t.nav` / `navLabel`). */
  id: string;
  render: () => ReactNode;
}

// Labels come from `t.nav[id]` via `navLabel(id)` so the sidebar is bilingual — see i18n.ts.
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', render: () => <PlaceholderPage navId="dashboard" /> },
  { id: 'classes', render: () => <ClassesPage /> },
  { id: 'import', render: () => <ImportPage /> },
  { id: 'weekly', render: () => <WeeklyRecordPage /> },
  { id: 'comments', render: () => <CommentsPage /> },
  { id: 'parent', render: () => <ParentMessagesPage /> },
  { id: 'minutes', render: () => <ReportsPage initialKind="minutes" /> },
  { id: 'reports', render: () => <ReportsPage initialKind="weekly" /> },
  { id: 'exports', render: () => <ExportsPage /> },
  { id: 'claude', render: () => <PlaceholderPage navId="claude" /> },
  { id: 'settings', render: () => <PlaceholderPage navId="settings" /> },
];

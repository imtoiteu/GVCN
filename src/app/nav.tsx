// Navigation model for the app shell.
//
// Lists the MVP screens from SPEC §4. As of M9.1 every entry renders a real screen (dashboard and
// settings were the last placeholders). Navigation is plain in-memory state (no router dependency);
// cross-screen jumps use the AppNav context — see AppShell / nav-context.

import type { ReactNode } from 'react';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ClassesPage } from '../features/classes/ClassesPage';
import { ImportPage } from '../features/import/ImportPage';
import { WeeklyRecordPage } from '../features/weekly/WeeklyRecordPage';
import { CommentsPage } from '../features/comments/CommentsPage';
import { ParentMessagesPage } from '../features/parent/ParentMessagesPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { ExportsPage } from '../features/exports/ExportsPage';
import { ClaudeExportPage } from '../features/claude/ClaudeExportPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export interface NavItem {
  /** Stable id; also the i18n key for the sidebar label (see `t.nav` / `navLabel`). */
  id: string;
  render: () => ReactNode;
}

// Labels come from `t.nav[id]` via `navLabel(id)` so the sidebar is bilingual — see i18n.ts.
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', render: () => <DashboardPage /> },
  { id: 'classes', render: () => <ClassesPage /> },
  { id: 'import', render: () => <ImportPage /> },
  { id: 'weekly', render: () => <WeeklyRecordPage /> },
  { id: 'comments', render: () => <CommentsPage /> },
  { id: 'parent', render: () => <ParentMessagesPage /> },
  { id: 'minutes', render: () => <ReportsPage initialKind="minutes" /> },
  { id: 'reports', render: () => <ReportsPage initialKind="weekly" /> },
  { id: 'exports', render: () => <ExportsPage /> },
  { id: 'claude', render: () => <ClaudeExportPage /> },
  { id: 'settings', render: () => <SettingsPage /> },
];

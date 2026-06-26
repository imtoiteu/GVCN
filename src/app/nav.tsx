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
  id: string;
  /** Sidebar label (Vietnamese). */
  label: string;
  render: () => ReactNode;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Bảng điều khiển', render: () => <PlaceholderPage title="Bảng điều khiển" /> },
  { id: 'classes', label: 'Lớp & Học sinh', render: () => <ClassesPage /> },
  { id: 'import', label: 'Nhập từ Excel', render: () => <ImportPage /> },
  { id: 'weekly', label: 'Ghi nhận tuần', render: () => <WeeklyRecordPage /> },
  { id: 'comments', label: 'Nhận xét học sinh', render: () => <CommentsPage /> },
  { id: 'parent', label: 'Tin nhắn phụ huynh', render: () => <ParentMessagesPage /> },
  { id: 'minutes', label: 'Biên bản họp lớp', render: () => <ReportsPage initialKind="minutes" /> },
  { id: 'reports', label: 'Báo cáo tuần/tháng', render: () => <ReportsPage initialKind="weekly" /> },
  { id: 'exports', label: 'Xuất DOCX/PDF/XLSX', render: () => <ExportsPage /> },
  { id: 'claude', label: 'Claude Export', render: () => <PlaceholderPage title="Claude Export" /> },
  { id: 'settings', label: 'Cài đặt', render: () => <PlaceholderPage title="Cài đặt" /> },
];

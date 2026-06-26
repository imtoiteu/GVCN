// Navigation model for the app shell.
//
// Lists all 12 MVP screens from SPEC §4 so the shell reflects the real product surface.
// For this bridging milestone only two screens are functional (Classes, Import); the rest
// render a Vietnamese placeholder until their milestone lands. Navigation is plain in-memory
// state (no router dependency yet) — see AppShell.

import type { ReactNode } from 'react';
import { ClassesPage } from '../features/classes/ClassesPage';
import { ImportPage } from '../features/import/ImportPage';
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
  { id: 'weekly', label: 'Ghi nhận tuần', render: () => <PlaceholderPage title="Ghi nhận tuần" /> },
  { id: 'comments', label: 'Nhận xét học sinh', render: () => <PlaceholderPage title="Nhận xét học sinh" /> },
  { id: 'parent', label: 'Tin nhắn phụ huynh', render: () => <PlaceholderPage title="Tin nhắn phụ huynh" /> },
  { id: 'minutes', label: 'Biên bản họp lớp', render: () => <PlaceholderPage title="Biên bản họp lớp" /> },
  { id: 'reports', label: 'Báo cáo tuần/tháng', render: () => <PlaceholderPage title="Báo cáo tuần/tháng" /> },
  { id: 'exports', label: 'Xuất DOCX/PDF/XLSX', render: () => <PlaceholderPage title="Xuất DOCX/PDF/XLSX" /> },
  { id: 'claude', label: 'Claude Export', render: () => <PlaceholderPage title="Claude Export" /> },
  { id: 'settings', label: 'Cài đặt', render: () => <PlaceholderPage title="Cài đặt" /> },
];

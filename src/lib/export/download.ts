// M7/M9.2 — Save/print helpers (the only impure, DOM/Tauri-touching part of the export layer).
//
// Saving a file is environment-aware:
//   • Inside the Tauri desktop app (macOS/Windows/Linux) the browser's <a download> trick is
//     unreliable — macOS WKWebView ignores the `download` attribute, so a Blob "download" did
//     nothing and surfaced as an export error. We instead open the native Save dialog
//     (@tauri-apps/plugin-dialog) and write the chosen path with a tiny Rust command
//     (`write_file_bytes`, see src-tauri/src/lib.rs). No fs-plugin scope to misconfigure.
//   • In a plain browser (dev server / no Tauri) we keep the Blob + <a download> fallback.
// PDF is print-based but handled in the UI (ExportsPage): it switches into a top-level print mode
// and calls window.print() on the main window (a hidden iframe / popup print silently no-ops in the
// macOS Tauri webview). This module only saves binary files. Kept tiny and guarded so importing it
// never touches the DOM or Tauri at load time (the Tauri bits are dynamically imported on use).

/** True when a DOM is available (Tauri webview or browser), false in headless/Node. */
function hasDom(): boolean {
  return typeof document !== 'undefined' && typeof URL !== 'undefined';
}

/** True when running inside the Tauri desktop runtime (vs a plain browser or Node). */
function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Outcome of a save attempt: written to disk, or cancelled by the user at the dialog. */
export type SaveOutcome = 'saved' | 'cancelled';

/**
 * Save `data` as `filename`, choosing the most reliable mechanism for the runtime.
 * In the desktop app this opens a native Save dialog; in a browser it triggers a download.
 * Returns 'cancelled' only when the user dismisses the desktop Save dialog. Throws on real
 * failure (no DOM, write error) so the caller can show an error message.
 */
export async function saveBytes(
  filename: string,
  mimeType: string,
  data: Uint8Array,
): Promise<SaveOutcome> {
  if (inTauri()) return saveViaTauri(filename, data);
  if (hasDom()) {
    downloadBytes(filename, mimeType, data);
    return 'saved';
  }
  throw new Error('Tải tệp chỉ hoạt động trong ứng dụng (cần trình duyệt/webview).');
}

/** Native Save dialog + Rust write. The plugin/IPC modules are imported lazily (desktop only). */
async function saveViaTauri(filename: string, data: Uint8Array): Promise<SaveOutcome> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { invoke } = await import('@tauri-apps/api/core');
  const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.') + 1) : '';
  const path = await save({
    defaultPath: filename,
    filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [],
  });
  if (!path) return 'cancelled'; // user dismissed the dialog
  // Pass the bytes as a plain number array; these files are small (a few KB).
  await invoke('write_file_bytes', { path, contents: Array.from(data) });
  return 'saved';
}

/** Trigger a browser download of `data` as `filename` (fallback path). Throws if no DOM. */
export function downloadBytes(filename: string, mimeType: string, data: Uint8Array): void {
  if (!hasDom()) throw new Error('Tải tệp chỉ hoạt động trong ứng dụng (cần trình duyệt/webview).');
  // Copy into a fresh ArrayBuffer so Blob gets exactly the intended bytes.
  const copy = new Uint8Array(data.length);
  copy.set(data);
  const blob = new Blob([copy], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke after a tick so the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}


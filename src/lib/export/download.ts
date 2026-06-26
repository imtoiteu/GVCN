// M7 — Browser/webview save helpers (the only impure, DOM-touching part of the export layer).
//
// Files are saved with a Blob + temporary <a download> click, and PDF via a print window — both
// work in the Tauri webview and the dev-server browser with zero new dependencies and no Tauri
// fs/dialog plugin or capability change. A native "Save As" dialog (@tauri-apps/plugin-dialog +
// -fs) is the documented upgrade path; see docs/m7-exports.md. Not unit-tested (no DOM in the
// Node test env); kept tiny and guarded so import never touches the DOM.

/** True when a DOM is available (Tauri webview or browser), false in headless/Node. */
function hasDom(): boolean {
  return typeof document !== 'undefined' && typeof URL !== 'undefined';
}

/** Trigger a download of `data` as `filename`. Throws if no DOM is available. */
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

/** Open a print-ready HTML document in a new window (which auto-opens the print dialog). */
export function openPrintHtml(html: string): void {
  if (!hasDom() || typeof window === 'undefined') {
    throw new Error('In/Lưu PDF chỉ hoạt động trong ứng dụng (cần trình duyệt/webview).');
  }
  const win = window.open('', '_blank');
  if (!win) throw new Error('Không mở được cửa sổ in. Hãy cho phép cửa sổ bật lên rồi thử lại.');
  win.document.open();
  win.document.write(html);
  win.document.close();
}

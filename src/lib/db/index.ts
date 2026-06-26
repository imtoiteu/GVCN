// Public surface of the local data layer.
//
// Note: the runtime Tauri backend (./tauri) is intentionally NOT re-exported here, because
// importing it pulls in @tauri-apps/plugin-sql, which only loads inside the Tauri webview.
// App code that needs the live database imports `getDb` from './db/tauri' directly; tests
// import the better-sqlite3 adapter. Everything below is environment-agnostic.

export * from './types';
export * from './executor';
export * from './schema';
export * from './repositories';
export * from './seed';

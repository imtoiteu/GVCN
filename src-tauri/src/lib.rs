// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Write raw bytes to an absolute path the user already chose via the native save dialog.
///
/// Used by the export feature: the frontend builds the DOCX/XLSX bytes, the dialog plugin
/// returns a destination path, and this command writes the file. Using a tiny std::fs command
/// (instead of the fs plugin) keeps the save reliable in the macOS WKWebView without any fs
/// scope configuration — the path is one the user explicitly picked, never attacker-controlled.
#[tauri::command]
fn write_file_bytes(path: String, contents: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, &contents).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri_plugin_sql::{Migration, MigrationKind};

    // Schema migrations. The SQL is the single source of truth shared with the frontend
    // tests (see src/lib/db/schema.ts MIGRATION_FILES). Keep this list in sync with
    // src-tauri/migrations/*.sql and the connection string "sqlite:gvcn.db" (DB_NAME).
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_schema",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_observation_tag_catalog",
            sql: include_str!("../migrations/002_seed_tags.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:gvcn.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, write_file_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

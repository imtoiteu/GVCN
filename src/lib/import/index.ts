// Public surface of the M2 Excel-import slice.
//
// Like the db barrel, this is environment-agnostic. The exceljs dependency is only pulled
// in when app/test code actually imports the import engine, so the frontend bundle stays
// lean until the (future) import screen wires this up.

export * from './types';
export * from './studentImport';

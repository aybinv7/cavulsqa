/**
 * Everything that does not care how SQLite is reached: migrations, the write wrapper, the column
 * helpers.
 *
 * The package's main entry pulls in `@capacitor-community/sqlite` at runtime, which is right for an
 * app on the native plugin and wrong for one on the OPFS engine - it would keep a native dependency
 * in the project, and the plugin in the APK, for code that never runs. Importing from here lets an
 * app drop the plugin entirely.
 */
export * from "./handle.js";
export * from "./migrations.js";
export * from "./write.js";
export * from "./columns.js";
export * from "./ensureColumns.js";

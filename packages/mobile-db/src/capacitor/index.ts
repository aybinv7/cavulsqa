/**
 * SQLite through `@capacitor-community/sqlite`: a real file behind a native bridge.
 *
 * Behind its own entry point, like `/opfs` and `/wa`, because importing it pulls the native plugin
 * in at runtime - and an app on a worker engine must not need the plugin in its APK for code that
 * never runs.
 *
 * The OPFS engine is faster on every axis measured on a device except one, and that one is why this
 * exists: the worker is serial, where this dialect deliberately keeps reads outside the write lock.
 * An app that writes continuously while the UI reads - or that needs SQLCipher, or native access to
 * the file - should use this.
 */
export * from "./dialect.js";
export * from "./database.js";

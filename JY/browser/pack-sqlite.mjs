import initSqlJs from '../third-party/sql.js/sql-wasm-browser.mjs';

const wasmURL = new URL('../third-party/sql.js/sql-wasm-browser.wasm', import.meta.url);
let sqliteReady;

function loadSqlite() {
  if (!sqliteReady) {
    sqliteReady = fetch(wasmURL).then(async response => {
      if (!response.ok) throw new Error('无法加载 SQLite 浏览器组件。');
      return initSqlJs({ wasmBinary: new Uint8Array(await response.arrayBuffer()) });
    }).catch(error => {
      sqliteReady = undefined;
      throw error;
    });
  }
  return sqliteReady;
}

export async function openPackSqlite(bytes, { readOnly = true } = {}) {
  const SQLite = await loadSqlite();
  const db = new SQLite.Database(bytes);
  try {
    db.exec('PRAGMA trusted_schema = OFF');
    if (readOnly) db.exec('PRAGMA query_only = ON');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

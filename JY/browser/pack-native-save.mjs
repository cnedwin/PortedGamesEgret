import { createNativeSaveCodec } from '../src/kys-native-save.mjs';
import { openPackSqlite } from './pack-sqlite.mjs';

// The save rules use the same prepared-statement interface on Node and in the browser.
function statements(database) {
  return {
    prepare(sql) {
      return {
        all(...params) {
          const statement = database.prepare(sql, params);
          try {
            const rows = [];
            while (statement.step()) rows.push(statement.getAsObject());
            return rows;
          } finally {
            statement.free();
          }
        },
        run(...params) { database.run(sql, params); },
      };
    },
  };
}

async function withDatabase(bytes, write, operate) {
  const database = await openPackSqlite(bytes, { readOnly: !write });
  try {
    if (!write) return operate(statements(database));
    if (database.exec("SELECT 1 FROM sqlite_schema WHERE type = 'trigger' LIMIT 1").length) {
      throw new Error('Desktop save databases with triggers cannot be exported.');
    }
    database.run('PRAGMA journal_mode = MEMORY; BEGIN IMMEDIATE');
    operate(statements(database));
    database.run('COMMIT');
    return database.export();
  } finally {
    database.close();
  }
}

export function createBrowserNativeSaveCodec(data) {
  return createNativeSaveCodec({
    initialSave: data.initialArchive,
    openingSceneId: data.config.beginScene,
    withDatabase,
  });
}

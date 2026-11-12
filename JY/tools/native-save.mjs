import { mkdtemp, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createNativeSaveCodec as createSharedCodec } from '../src/kys-native-save.mjs';

async function withDatabase(bytes, temporaryDirectory, write, operate) {
  const directory = await mkdtemp(join(temporaryDirectory, 'kys-native-save-'));
  const path = join(directory, 'save.db');
  try {
    await writeFile(path, bytes, { flag: 'wx' });
    const database = new DatabaseSync(path, { readOnly: !write });
    try {
      database.exec('PRAGMA trusted_schema = OFF');
      if (write) {
        if (database.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'trigger' LIMIT 1").get()) {
          throw new Error('Desktop save databases with triggers cannot be exported.');
        }
        database.exec('PRAGMA journal_mode = MEMORY; BEGIN IMMEDIATE');
      }
      const result = operate(database);
      if (write) database.exec('COMMIT');
      else return result;
    } finally {
      database.close();
    }
    return await readFile(path);
  } finally {
    for (const suffix of ['', '-journal', '-shm', '-wal']) {
      await unlink(path + suffix).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    await rmdir(directory);
  }
}

export function createNativeSaveCodec({ temporaryDirectory = tmpdir(), ...options }) {
  return createSharedCodec({ ...options,
    withDatabase: (bytes, write, operate) => withDatabase(bytes, temporaryDirectory, write, operate),
  });
}

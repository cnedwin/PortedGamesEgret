import { existsSync } from 'node:fs';
import { join } from 'node:path';

const windowsTar = process.platform === 'win32' && process.env.SystemRoot
  ? join(process.env.SystemRoot, 'System32', 'tar.exe') : undefined;
export const tar = windowsTar && existsSync(windowsTar) ? windowsTar : 'tar';

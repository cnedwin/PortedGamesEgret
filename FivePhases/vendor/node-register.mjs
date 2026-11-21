// node --import ./vendor/node-register.mjs your-script.mjs
import * as module from 'node:module';
import { resolve } from './node-resolve.mjs';
// registerHooks runs in this thread (Node 22.15 and later); register is the older, separate-thread form.
if (typeof module.registerHooks === 'function') module.registerHooks({ resolve });
else module.register('./node-resolve.mjs', import.meta.url);

// The native failure dialog must remain useful when model assets are unavailable.
import assert from 'node:assert/strict';
import { launch, serve } from '../../tools/lib/browser.mjs';
import { ready, press } from './ui-actions.mjs';

const server=await serve(), browser=await launch();
let refused=0;const uncaught=[];
const page=await browser.newPage({viewport:{width:852,height:393},hasTouch:true,isMobile:true});
page.on('pageerror',error=>uncaught.push(error.message));
try {
  await page.route('**/assets/models/**/*.glb',async route=>{refused++;await route.abort('failed');});
  await page.goto(`${server.url}StarBanner/?quality=low&lang=zh&seed=3&map=wheat`);
  await ready(page,'button:重试');
  await ready(page,'button:先这样玩');
  assert.ok(refused>0,'the failure route must actually refuse model assets');
  await press(page,'button:先这样玩','touch');
  await ready(page,'button:遭遇战');
  assert.deepEqual(uncaught,[]);
  console.log(`${refused} deliberately refused models: native Retry/Continue controls and the restored title passed.`);
} finally { await browser.close();await server.close(); }

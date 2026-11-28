import assert from 'node:assert/strict';
import { test } from 'node:test';
import { useFixedWorldResolution } from '../src/view3d/canvas-policy.mjs';

test('fixed World3D backing size is only selected for mobile Apple WebKit',()=>{
  assert.equal(useFixedWorldResolution({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',maxTouchPoints:5}),true);
  assert.equal(useFixedWorldResolution({userAgent:'Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',maxTouchPoints:5}),true);
  assert.equal(useFixedWorldResolution({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1',maxTouchPoints:5}),true);
  assert.equal(useFixedWorldResolution({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1',maxTouchPoints:0}),false);
  assert.equal(useFixedWorldResolution({userAgent:'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',maxTouchPoints:5}),false);
  assert.equal(useFixedWorldResolution({userAgent:'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140 Safari/537.36',maxTouchPoints:0}),false);
  assert.equal(useFixedWorldResolution(),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { needsStableWorldCanvas } from '../src/world/presentation.mjs';

test('iPhone and iPad WebKit choose stable drawing resolution, including the iPad desktop user agent', () => {
  assert.equal(needsStableWorldCanvas({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/26.6 Mobile/15E148 Safari/604.1'}), true);
  assert.equal(needsStableWorldCanvas({userAgent:'Mozilla/5.0 (iPad) AppleWebKit/605.1.15 Mobile Safari/604.1'}), true);
  assert.equal(needsStableWorldCanvas({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.6 Safari/605.1.15',maxTouchPoints:5}), true);
});

test('other browsers retain adaptive rendering resolution', () => {
  assert.equal(needsStableWorldCanvas({userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/142 Mobile Safari/537.36',maxTouchPoints:5}), false);
  assert.equal(needsStableWorldCanvas({userAgent:'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/142 Safari/537.36'}), false);
  assert.equal(needsStableWorldCanvas({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.6 Safari/605.1.15'}), false);
  assert.equal(needsStableWorldCanvas(), false);
});

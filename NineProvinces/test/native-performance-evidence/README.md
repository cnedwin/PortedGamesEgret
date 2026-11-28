# 第五批实测画面 · Batch-five verification captures

2026-11-29，正式引擎 `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4` 不变。每张 JPEG 都来自下面的实际测试原图（质量 88、原尺寸、不裁剪），并已重新解码检查及视觉复看。不是原始像素断言参考、不是新创作的游戏美术。详细条件及未验证事项见 [QUALITY.md](../../QUALITY.md)。

The engine pin is unchanged. Each image is an actual test screenshot, encoded as an original-size, uncropped, quality-88 JPEG and reopened/visually reviewed. These are neither pixel-assertion references nor newly authored artwork. Full methods and exclusions are in QUALITY.md.

## 纯软件与 RTX 实际浏览器 · Software and hardware-backed PC

| 画面 · Capture | 出处 · Independent test condition |
|---|---|
| [标题改前](software-title-before.jpg) / [自动软件预算](software-title-automatic.jpg) | `b5-software-baseline` and `b5-software-candidate-noguard`; Windows Chromium/SwiftShader, 1280×800 CSS, automatically selected low quality. Four-second title intervals: 43→112, p95 120.9→41.6 ms, 3D canvas 896×560→435×272; UI density 2 unchanged. A deliberately lower 3D software budget, not equal-image-quality comparison. |
| [即时标题 A](pc-host-immediate-title.jpg) / [延迟同钟 B](pc-host-defer-title.jpg) | `host-ab-rtx-r1` A1/B2; real RTX 5090 Laptop GPU Edge/D3D11, explicit high, 1280×720; fresh local processes and caches disabled. A immediate/no text budget, B deferred/no text budget. |
| [原平原标牌 A](pc-label-before.jpg) / [文字调度 C](pc-label-budget.jpg) | Same host study A1/C3; C immediate + 4 ms text pacing, **not deferred**. Two text revisions per trial; steady p95 4.2–4.3 ms in all 24 windows (no demonstrated steady gain, no GPU duration measurement). |
| [洛阳 A](pc-terrain-sync.jpg) / [洛阳 C](pc-terrain-worker-prepared.jpg) | `b5-terrain-city-ab-r2` A1/C3, actual RTX explicit low, fixed paused camera (distance 52), 1280×800. A synchronous/no preparation, C worker/native geometry preparation. Luoyang terrain readiness 36.5→68.7 ms, local RAF p95 27.6→23.5; not every transition improves. |
| [襄阳 A](pc-xiangyang-sync.jpg) / [襄阳 C](pc-xiangyang-worker-prepared.jpg) | Same independent terrain study A1/C3, second camera target. Terrain readiness 77.4→32.8 ms, local p95 66.0→13.7 ms. Existing proxy stays visible; no proof of an additional preparation gain beyond worker alone (13.8 ms). Identical deterministic terrain/mesh/GLSL fingerprint, not asserted whole-frame pixel equality. |
| [真实键盘出征](pc-native-keyboard-destination.jpg) | `b5-native-keyboard-final`; real RTX Edge keyboard, 14/14; original target nanpi and path [nanpi]. Controller input simulated through actual browser polling; not a physical controller. |
| [配乐资源失败原生重试](pc-music-retry.jpg) | `b5-e2-retry-r1`, deliberately refuse only title-score.mp3. English native Retry remains focused. Actual retry requests twice and decodes second; persistent refusal can continue and start campaign. Independent software-browser fixture, not speaker verification. |

## 实体 Galaxy Z Fold7 · Physical cover display

Samsung SM-F966U1, Android 17 / Chrome 158 / Adreno 830; actual touch injection and physical rotation, outer landscape 873×325 CSS pixels (portrait 411×813). The landscape image assets are original screen dimensions 2292×1001; they are not resized PC viewport simulations.

| 画面 · Capture | 出处 · Independent test condition |
|---|---|
| [B4 公开定位](fold7-public-b4-locate.jpg) / [B5 早期本地定位](fold7-b5-locate.jpg) | `b4-public-fold7-baseline` vs `b5-candidate-fold7`: same Locate action at existing camera distance 45, zero→three visible plates including the selected one. B5 36 loaded-file hashes, 8 restorations, no errors; three five-second RAF windows p95/max 16.7 ms, no >50. Different network origins; cold times are not comparable. |
| [手机野战回放](fold7-b5-replay.jpg) | Same earlier candidate route, actual seek to 6.061/7.9 s and report. The board is roughly 200 CSS pixels on the shortest screen; not a complete field trial. |
| [英文提示](fold7-english-coach.jpg) / [归城名牌](fold7-home-nameplate.jpg) | `b5-english-final-fold7` later focused handset run after terrain and marker changes. 39 loaded-file hashes and 8 restorations, no errors; two-line Campaign paused and Dismiss 69.67×44, home marker 138×44; plate and separate 3D city touch resolve to the same original place. Separate from the earlier 36-hash Locating/replay test. |

## WebKit 配置 · WebKit browser profile

[开局竖屏 / Setup portrait](webkit-setup-portrait.jpg) · [天下图竖屏 / Realm portrait](webkit-realm-portrait.jpg) · [天下图横屏 / Realm landscape](webkit-realm-landscape.jpg)：`b5-webkit-local-final`, Windows Playwright WebKit 26.6 iPhone 15 Pro emulation; 393×659 ↔ 852×393 CSS/renderSize, fixed previous 393×659 backing, ratio1, six checked states and zero errors. The actual images are nonblank and show English coach layout. A separate initial title screenshot had partial streamed terrain at only two submitted frames, not a black frame. These are **not a physical iPhone/Mobile Safari or a performance test**; portrait and landscape JPEGs retain their original 3× screenshot dimensions.

## 自动验收 · Automated checks

- Node tests 291/291; original browser acceptance 56/56; separate portable native input 12/12; final ordinary engine verifier 8/8 (declared ready 4,071 ms, zero pending requests/engine warnings, one Chromium Canvas2D readback advisory).
- Latest software quality tool: 15/16 automatic checks pass; F1 still fails at p95 41.6 ms over 109 intervals. Six manual/device entries are not executed by that tool.
- Official realm screen matrix 126/126 (9 profiles ×14 named checkpoints), no reported findings or engine warnings. All 126 images visually reviewed; retained scroll requirements and short-title language-toggle behavior remain, not all controls appear simultaneously.
- Official battle screens 54/54: first 54 had five 42×44 touch-target warnings at 360 px portrait. Final affected five profiles reran 30/30 with no findings/warnings; all captures visually reviewed. The unchanged four landscape profiles contribute 24/24; final combined result has zero findings/warnings.
- No complete physical campaign, physical inner display, physical controller, actual iOS Safari device, long sustained high-load, GPU duration/compose timing, or subjective speaker listening is asserted. Candidate local results do not establish a B5 public deployment.

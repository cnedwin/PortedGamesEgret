# 河湾筑家 · Riverside Homestead

**验收范围 · Acceptance scope**

- 规则测试覆盖三处选址、改选、取消、重复确认和开销。Rule tests cover all three sites, changing a preview, cancelling, and charging exactly once.
- 浏览器用例固定种子 1 与 WebGL2，桌面采用减弱动态，纵向触屏模拟采用正常施工动画。The browser walk uses seed 1 and WebGL2, with reduced motion on desktop and an animated build in portrait touch emulation.
- 固定画面见 `test/baseline/`，包括横向空地、台地落成和窄屏开场。The baselines show the empty bank, the settled terrace and the narrow-screen opening.
- Windows 上使用 Chrome for Testing 157 与 SwiftShader，桌面为 960 × 540。触屏模拟覆盖选址、动工、落成和施工期间重载，木料只扣一次。On Windows, Chrome for Testing 157 runs with SwiftShader at 960 × 540 on desktop. Portrait touch emulation covers placement, construction, settlement and reloading during construction with a single timber charge.
- 320 × 690 纵向开场可同时看见三块地和两名渡工。检查三个标牌均在画面内，且没有遮住渡工。At 320 × 690, all three plot markers and both waiting workers fit in the opening scene. The browser walk checks that each marker stays within the viewport and clear of the workers.
- 手机 GPU、真实读屏、声学延迟和真人理解度待独立验收。Physical phone GPU, screen-reader speech, acoustic latency and human comprehension remain open.

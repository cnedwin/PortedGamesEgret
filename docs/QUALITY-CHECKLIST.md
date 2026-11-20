# 品质验收清单 · Quality checklist

每款游戏按这张清单验收，结果写进自己目录的 `QUALITY.md`。每一项都有可测的标准、测量方法和工具，并标明能否自动化。自动项由 `node tools/quality.mjs <游戏目录>` 在无头 Chromium 里实测并写入 `QUALITY.md`；人工项和真机项由人来做，没做的写「未运行」，不填数字。不达标的项写进 README 的「已知问题」。模板 `templates/egret-game/` 的自动项必须全部达标。

Every game is accepted against this list, and the results go into its own `QUALITY.md`. Each item has a measurable
standard, a method and a tool, and says whether it can be automated. `node tools/quality.mjs <folder>` measures the
automatic items in headless Chromium and writes `QUALITY.md`; items by hand or on a device are done by a person, and
until then they say "not run", with no number. Failing items go into the README's Known issues. Every automatic item of
the template `templates/egret-game/` must pass.

方式 · How: **自动** = `tools/quality.mjs` 测；**人工** = 人在浏览器里做；**真机** = 必须在真手机或真显卡上做。
**Automatic** = measured by `tools/quality.mjs`; **by hand** = a person in a browser; **device** = a real phone or GPU.

## 测量环境 · Where things are measured

- 自动项：无头 Chromium（Playwright 自带版本），没有显卡时用 SwiftShader 软件渲染；`QUALITY.md` 开头写明日期、浏览器版本和机器。 · Automatic items: headless Chromium with SwiftShader when there is no GPU; `QUALITY.md` records the date, browser version and machine.
- 真机项写明设备型号、系统和浏览器版本，例如「Redmi Note 12（骁龙 4 Gen 1），Android 14，Chrome 130」。 · Device items name the model, system and browser.
- 软件渲染下的帧时间只说明无头环境，不能代替真机 · Frame times under software rendering describe the headless run only.

## 1. 手机触屏 · Touch on phones

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| T1 | 只用触屏能走完主流程（开始、操作、暂停、设置、结算、回到标题） · the whole main path by touch alone | 在手机上从打开到一局结束，不接键盘 · on a phone, open to the end of a round, no keyboard | 真机 · a phone | 真机 · device |
| T2 | 页面上每个可点控件不小于 44×44 CSS 像素 · every page control at least 44 × 44 CSS px | 390×844 触屏视口，量所有可见的 button、链接、role=button/switch/slider 等元素（含语义层）的外框；画布里自己画的按钮另由人量 · measure every visible control's box at 390 × 844 with touch, the semantic layer included; buttons drawn only on the canvas are measured by hand | `tools/quality.mjs` | 自动 · automatic |
| T3 | 不会误触下拉刷新和双击缩放 · no pull-to-refresh, no double-tap zoom | 检查 `html`/`body` 的 `overscroll-behavior-y` 为 none/contain（或两者 `overflow: hidden`），画面中心元素的 `touch-action` 为 none/manipulation，或 viewport 禁止缩放 · computed styles at the centre of the screen | `tools/quality.mjs` | 自动 · automatic |

## 2. 帧时间 · Frame time

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| F1 | 桌面 p95 ≤ 16.7 ms · desktop p95 ≤ 16.7 ms | 1280×800 打开游戏，等就绪后用 `requestAnimationFrame` 连续记录 4 秒的帧间隔，取第 95 百分位，允许 0.5 ms 的计时抖动。场景：游戏打开后的第一屏（标题或主菜单）。游戏另有更重的场景时，在 `test/accept.mjs` 里再量一次并写进 `QUALITY.md` · rAF intervals for 4 s on the first screen at 1280 × 800; heavier scenes are measured again in the game's acceptance script | `tools/quality.mjs`（无头）；真显卡上用同样方法或 `@egret/devtools` · headless here, the same method or devtools on a real GPU | 自动 · automatic（无头 · headless） |
| F2 | 中端手机 p95 ≤ 33 ms · mid-range phone p95 ≤ 33 ms | 中端手机（参考：骁龙 6 系或天玑 7000 级，2022 年后上市）横屏，进入一局最忙的时刻（敌人最多、特效最多），用 Chrome 远程调试的 Performance 面板或页面里的帧时间记录 30 秒，取 p95 · a mid-range phone held sideways, the busiest moment of a round, 30 s recorded through remote debugging or an in-page recorder | Chrome DevTools 远程调试 · remote debugging | 真机 · device |

## 3. 首屏加载 · Start-up

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| L1 | 从打开网址到第一个可操作画面 ≤ 3 秒 · from the address to the first playable screen in 3 s or less | 固定限速：下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 4 倍，不用缓存；390×844 触屏视口。「可操作」= `window.egretGame.ready` 为真，没有这个标志的游戏取 load 事件后出现有尺寸的画布再等 1.5 秒；画面由页面元素组成的，取出现可见按钮且网络空闲后再等 1.5 秒 · fixed throttling (10/5 Mbps, 40 ms, CPU ×4, no cache) at 390 × 844; ready when `window.egretGame.ready` is true, otherwise a sized canvas after the load event plus 1.5 s, or for a screen of page elements a visible button and a quiet network plus 1.5 s | `tools/quality.mjs`（CDP 限速 · CDP throttling） | 自动 · automatic |

## 4. 横竖屏与窗口尺寸 · Orientation and window size

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| O1 | 1280×800、390×844、844×390、768×1024 都能打开，页面不横向溢出，画面至少占窗口的一半宽或一半高，打开后再改窗口大小也不出错 · opens at four sizes with no sideways overflow and a picture at least half the window, and survives live resizing | 四种尺寸各开一次；在 1280×800 里依次改成 844×390、390×844、1280×800 · each size once, then resized in place | `tools/quality.mjs` | 自动 · automatic |

## 5. 中英文 · Two languages

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| I1 | 能切到英文，英文下页面文字、读屏名称、`title` 和 `alt` 里没有中文（语言按钮上的「中文」除外），`<html lang>` 随之改变 · English can be chosen; then no Chinese is left in page text or accessible names, except the "中文" language button, and `<html lang>` follows | `?lang=en` 打开，取 `innerText` 和所有 `aria-label`/`title`/`alt` · open with `?lang=en` and read the text and names | `tools/quality.mjs` | 自动 · automatic |
| I2 | 画布上画的字也随语言切换，没有写死在代码里的中文或英文 · words drawn on the canvas follow the language; none is hard-coded | 英文模式走一遍主流程看画面；代码里界面文字只从文字表取（模板的 `test/words.test.mjs` 是这种检查的例子） · walk the main path in English; the template's words test shows a code check | 人 + 游戏自己的测试 · a person and the game's own test | 人工 · by hand |
| I3 | 长英文不溢出：390 宽英文模式下，页面元素的文字不超出自己的框 · long English does not overflow at 390 px | 找 `scrollWidth > clientWidth` 的文字元素；画布上的字由人看 · elements whose text is wider than their box; canvas text by eye | `tools/quality.mjs` | 自动 · automatic |

## 6. 无障碍 · Accessibility

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| A1 | Tab 能把焦点移到有名字的控件，焦点看得见（元素自己的轮廓，或游戏在画布上画的焦点框） · Tab reaches a named control and its focus shows | 连按 Tab，看 `document.activeElement` 和它的轮廓；画布上画的焦点框由截图基线或人确认 · press Tab and read the active element | `tools/quality.mjs` | 自动 · automatic |
| A1m | 只用键盘走完主流程 · the whole main path by keyboard | 人走一遍；模板在 `test/accept.mjs` 里用键盘走了一遍 · a person; the template's acceptance does it by keys | 人 / 验收脚本 · a person or the acceptance script | 人工 · by hand |
| A2 | 读屏能读出主要按钮的名字 · a screen reader names the main buttons | 读可访问性树（Playwright `ariaSnapshot`），至少有一个带名字的按钮或开关；真读屏（VoiceOver、TalkBack、NVDA）另测 · the accessibility tree has named controls; real screen readers separately | `tools/quality.mjs` | 自动 · automatic |
| A3 | 尊重 `prefers-reduced-motion`：减弱或停掉晃动、闪烁和镜头抖动 · motion, flashing and shake reduced when asked | 代码里读这项偏好或有对应设置；效果由人在系统里打开「减弱动态效果」后看 · the code reads the preference or offers a setting; the effect is checked by eye | `tools/quality.mjs`（读代码 · reads the code） | 自动 · automatic |

## 7. 存档 · Saves

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| S1 | 存档被改坏（不是 JSON）时照常启动，没有未捕获的异常 · starts with a corrupted save, no uncaught error | 把游戏用到的每个存储键写成 `{broken` 后打开 · every storage key the game uses set to `{broken` | `tools/quality.mjs` | 自动 · automatic |
| S2 | 存档版本不匹配（来自更新的版本）时照常启动 · starts with a save from a newer version | 写成 `{"version":9999,"savedAt":0,"data":{}}` 后打开 · that text in every key | `tools/quality.mjs` | 自动 · automatic |
| S3 | 浏览器存储不可用（无痕、被禁用）时照常启动 · starts with storage refused | 让 `localStorage`、`sessionStorage` 一访问就抛 `SecurityError` · both throw on access | `tools/quality.mjs` | 自动 · automatic |
| S4 | 出现以上情况时告诉玩家，并能重新开始 · the player is told, and can start again | 人看提示；模板在 `test/accept.mjs` 里断言了提示 · by eye; the template's acceptance asserts the notice | 人 / 验收脚本 · a person or the acceptance script | 人工 · by hand |

## 8. 其他 · Other

| 编号 · # | 标准 · Standard | 方法 · Method | 工具 · Tool | 方式 · How |
|---|---|---|---|---|
| E1 | 打开并停留 3 秒，没有控制台错误、未捕获异常或 4xx/5xx 请求 · a clean console for the first seconds | 记录 `console.error`、`pageerror` 和失败的请求（网页图标除外） · console errors, page errors and failed requests, the page icon aside | `tools/quality.mjs`；每个游戏的 `test/accept.mjs` 在整段流程上再查一次 · and each acceptance script over its whole walk | 自动 · automatic |
| E2 | 图片、声音、字体、数据文件加载失败时有错误界面和「重试」，没有未捕获异常 · a failed file shows an error screen with a retry, without an uncaught error | 拦截游戏目录下所有图片、媒体、字体和数据请求，看页面上有没有「重试 / Retry」；游戏没有这类文件时「不适用」 · refuse every image, media, font and data request, then look for a retry | `tools/quality.mjs` | 自动 · automatic |
| E3 | 切到后台再回来不出错，游戏或引擎的帧循环监听可见性 · hidden and shown again without errors | 发出 `visibilitychange`（隐藏 2 秒再显示），看错误；检查代码或引擎循环处理可见性 · dispatch hidden then visible | `tools/quality.mjs` | 自动 · automatic |
| E4 | 切回后声音和计时正常：后台期间不计时、不出声，回来后声音恢复 · sound and timers right after coming back | 手机上开一局，切到别的应用 30 秒再回来 · on a phone, leave for 30 s mid-round | 真机 · a phone | 真机 · device |

## 写进 QUALITY.md · Writing QUALITY.md

`tools/quality.mjs` 每次运行都重写 `QUALITY.md` 的结果表。人工和真机项做过之后，在表下面加一节「人工与真机结果 · By hand and on devices」，写明设备、日期和结果；工具再次运行时原样保留这一节。

`tools/quality.mjs` rewrites the results table each time it runs. When an item by hand or on a device has been done,
add a section "人工与真机结果 · By hand and on devices" under the table with the device, date and result; the tool
keeps that section as it is when it runs again.

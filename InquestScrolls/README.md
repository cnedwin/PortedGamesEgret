# 洗冤笔录 · The Inquest Scrolls

## 简介 · Introduction

洗冤笔录是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的宋代刑侦推理游戏 Demo。南宋淳祐年间，新到任的提点刑狱官沈砚巡按虚构的蘅州，翻出白蘋县四份结论“太干净”的检验格目，叫仵作老秦备好酒醋、银钗和红油伞，一案一案地覆检。

- 每一案是一幅定格在案发瞬间的宋画长卷：拖动看全图，双指或滚轮缩放。点人、点物，翻文书和账簿，在白描正背人形图上看伤痕，把关键的人名、器物、痕迹、死因、处所和情由收进词囊。
- 卷宗逐页填空：把词拖进同色的空位，把名字放到肖像下。一页填满才能核验——全对盖朱印，错两处以内只说“尚有两处以内不实”，再多只说“不实”，从不说错在哪里。提示分三级：先指区域，再指证物，最后问一个问题，永远不给答案。
- 六案分三卷，第一案由老秦手把手教，之后一案难过一案，六案连成一桩伪造会子的大案；最后一卷由玩家亲手写判词。笔录随时可写可改，和每案的进度、词囊、已填的空一起自动存档。
- 人物、地名、案情全部原创；验尸手法、检验格目、正背人形图、州县检验制度依《洗冤集录》与《宋史·刑法志》写成，出处见 [docs/DESIGN.md](docs/DESIGN.md)。画面是文生图生成的工笔重彩分层大图，界面全部由引擎绘制；配乐和音效全部由代码合成。

The Inquest Scrolls is a Song-dynasty detective deduction game demo built independently on the [new Egret engine,
Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). In the Chunyou years of the Southern Song, Shen Yan, a newly
arrived judicial intendant, tours the fictional prefecture of Hengzhou, finds four inquest forms from Baipin County whose
findings are "too clean", and with Old Qin, his coroner's aide, reopens them one by one.

- Each case is a Song-style handscroll frozen at the moment of the crime: drag to look around, pinch or scroll to zoom.
  Tap people and things, read letters and ledgers, see the wounds marked on the front and back body chart, and put the
  key names, objects, marks, causes, places and motives into your pouch.
- The dossier is filled in page by page: drag each word into a blank of its colour and each name under its portrait. A
  full page can be checked: all right and it is sealed in red; two or fewer wrong and it says only that; more and it
  says only "not true". It never says which. Hints come in three levels — where to look, which evidence, then a
  question — and never give the answer.
- Six cases in three scrolls: Old Qin teaches the first, each one after is harder, and the six join into one case of
  forged paper money; in the last scroll the player writes the verdict in their own words. Notes can be written and
  changed at any time and are saved with each case's progress, pouch and filled blanks.
- Every person, place and case is original; the inquest methods, the inquest form, the body chart and the county
  inquest procedure follow the *Collected Cases of Injustice Rectified* (洗冤集录) and the *History of Song* (see
  [docs/DESIGN.md](docs/DESIGN.md)). The art is generated in layers in the gongbi style; the interface is drawn by the
  engine; the music and sound are synthesized in code.

试玩 · Play: <https://cnedwin.github.io/PortedGamesEgret/InquestScrolls/>

## 玩法与操作 · How to play

**一案的流程 · A case**：读案情 → 在现场点人、点物、点文书，读它们写了什么，点带下划线的字收进词囊 → 打开卷宗，按颜色把词放进空位、把名字放到肖像下 → 一页填满就核验，全对盖印 → 所有页盖印即结案（最后一案还要写判词）。 · Read the report → tap people, things and documents in the scene and tap underlined words into the pouch → open the dossier and put words into blanks of their colour, names under portraits → check a full page; all right seals it → every page sealed closes the case (the last case also needs the verdict).

| 输入 · Input | 操作 · Controls |
|---|---|
| 鼠标 · Mouse | 点人、点物、点词；拖动画面平移，滚轮缩放；把词签拖到空位，或先点词签再点空位；点已填的空清掉它；悬停时显示证物名 · click people, things and words; drag to pan, scroll to zoom; drag a slip onto a blank, or click the slip then the blank; click a filled blank to empty it; hover names the evidence |
| 键盘 · Keys | Tab / Shift+Tab 换焦点（证物、按钮、空位、词签），Enter / 空格 确认，Esc 返回，J 卷宗，N 笔录，H 提示，方向键 / WASD 平移，+ / − 缩放 · Tab / Shift+Tab move the focus (evidence, buttons, blanks, slips), Enter / Space confirm, Esc back, J dossier, N notes, H hint, arrows / WASD pan, + / − zoom |
| 手柄 · Gamepad | 十字键 / 肩键换焦点，A 确认，B 返回，Y 卷宗，X 提示，摇杆平移，LT / RT 缩放 · d-pad / bumpers move the focus, A confirm, B back, Y dossier, X hint, stick pans, triggers zoom |
| 触屏 · Touch | 点按、拖动平移、双指缩放；拖词签进空位或点了再点 · tap, drag to pan, pinch to zoom; drag slips into blanks or tap one and then the other |

判词写在引擎的画布文字输入里（输入法照常可用）；微信小游戏里没有文本框，判词和笔录改用字盘点选。设置里可以切换语言、关音效和音乐、减弱动画、重读全卷。 · The verdict is typed into the engine's canvas text input (input methods work); a WeChat mini game has no text field, so there the verdict and the notes are tapped out on a board. The settings switch the language, turn sound and music off, reduce motion and start the book again.

网址参数 · URL parameters：`?lang=zh|en`、`?quality=low|high`、`?case=c1`…`c6`（直接进案 · straight into a case）、`?board=1`（字盘 · the word board）、`?plain=1`（不用 CanvasKit，像小游戏一样用标签拼段落 · paragraphs from labels, as in the mini game）。

## 案卷与史料 · The cases and the sources

| 卷 · Scroll | 案 · Case | 初检说 · The first inquest said | 覆检的关键 · What the second inquest turns on |
|---|---|---|---|
| 卷一 · 初检之疑 | 纸坊悬梁 · The Beam at the Paper Mill | 自缢 · hanged himself | 项下绳痕交过、指甲里的皮屑：勒死后吊起 · a mark crossing at the nape, skin under the nails: strangled, then hung |
| 卷一 · 初检之疑 | 渡口浮尸 · The Body at the Ferry | 醉酒落水 · drunk and drowned | 口鼻无水沫、指甲无沙泥、脑后他物伤：打死后推入水 · no froth, no sand under the nails, a blunt wound: killed, then put in the river |
| 卷二 · 城中之案 | 质库茶毒 · Tea at the Pawnshop | 急病暴卒 · a sudden illness | 银钗探喉青黑、皂角水洗不去：信石入盏 · the silver pin turns black and stays so: arsenic in the cup |
| 卷二 · 城中之案 | 刻坊夜火 · Fire at the Engraver's | 失火烧死 · burned in a fire | 口鼻无烟灰、刃伤在先：杀人后放火 · no ash in the mouth and nose, a blade wound first: killed, then burned |
| 卷三 · 合卷 | 镰刀聚蝇 · Flies on the Sickle | 沈砚亲临初检 · Shen Yan's own first inquest | 十几处镰刀斫伤而钱袋未失：寻仇不是劫财；全村镰刀摆在日头下，苍蝇只落一把，柄刻三道横 · a dozen sickle cuts and the purse untouched: revenge, not robbery; of the village's sickles laid in the sun the flies settle on one, marked with three bars |
| 卷三 · 合卷 | 县尉书房 · The Sheriff's Study | 畏罪自缢、留下认罪书 · hanged himself in guilt, with a confession | 真是自缢，可认罪书墨迹未干、砚台是干的：书是别人写的 · truly hanged, but the confession is wet and his inkstone dry: someone else wrote it |

规则、谜题的“线索 → 结论”数据、核验与提示，以及每一条史料的原文和出处见 [docs/DESIGN.md](docs/DESIGN.md)；图片的提示词和来源见 [docs/ASSETS.md](docs/ASSETS.md)。 · The rules, the clue → conclusion data, checking and hints, and the text and source of every historical detail are in docs/DESIGN.md; the prompt and origin of every picture are in docs/ASSETS.md.

## 平台 · Platforms

- 网页：电脑横屏 1280×720、手机竖屏 720×1280 两套布局，转屏时整屏重建。 · The page: 1280 × 720 wide and 720 × 1280 tall, rebuilt when the phone turns.
- 微信小游戏：竖屏。`node InquestScrolls/tools/wechat.mjs --engine <Egret_rebuild> --esbuild <esbuild> --playwright <playwright/index.mjs> --out <新目录>` 先整理一份小游戏用的目录（不带 CanvasKit、字体构建和高清背景，图片按手机屏缩小），交给引擎的 `tools/wechat/export-wechat.mjs` 打包（WebP 转 JPEG/PNG），再把 `assets/art/` 设成分包，开局后下载。实测主包 2.20 MB、图片分包 9.38 MB、合计 11.57 MB（上限 4 MB / 30 MB）。小游戏里段落用引擎的画布文字标签拼出来（`src/view/plainText.mjs`），判词和笔录用字盘。 · The WeChat mini game, upright: the script above puts together a copy fit for a mini game (no CanvasKit, no font build, no full-size backgrounds, pictures sized for a phone), packs it with the engine's exporter (WebP as JPEG or PNG) and makes `assets/art/` a subpackage downloaded after the start. Measured: main package 2.20 MB, picture subpackage 9.38 MB, 11.57 MB in all (limits 4 MB and 30 MB). In the mini game paragraphs are put together from the engine's canvas labels and the verdict and the notes use the board.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/play` · `play` | 画布、舞台、帧循环；横屏 1280×720、竖屏 720×1280 两套布局，`arrange` 转屏重建；键盘、指针、手柄、`onTap`、`tween`、`after` · canvas, stage and loop; the wide and tall layouts, rebuilt on turning; keys, pointer, pad, taps, tweens, timers | [src/main.mjs](src/main.mjs) |
| `play({ renderMode: 'on-demand' })` + `game.invalidate` | 标题、卷宗、证物这些静止画面保留上一帧，不再每帧重画；笔录编辑器提交后请求重画 · still screens keep their last frame; the notes editor asks for a redraw after it commits | [src/main.mjs](src/main.mjs), [src/view/notes.mjs](src/view/notes.mjs) |
| `game.gestures`（drag、pinch） | 拖动平移现场、双指缩放；词囊列表拖动滚动 · drag to pan the scene, pinch to zoom; drag to scroll the pouch | [src/view/casebook.mjs](src/view/casebook.mjs), [src/view/dossier.mjs](src/view/dossier.mjs) |
| `game.dragAndDrop`（source、target） | 把词签拖进卷宗空位：只接收同类的词，悬停变色，落下即填 · word slips dragged into blanks: a blank takes only its kind, shows the hover and fills on the drop | [src/view/dossier.mjs](src/view/dossier.mjs) |
| `@egret/engine/paragraph` · `createParagraphCache`、`createParagraph`（`textGeometry`、`runs`） | 卷宗、证物、序言、提示等长文由 CanvasKit 排版；带颜色的词段；用文字几何（`getSelectionRects`、`clusters`、`hitTest`）定位空位、找点中的词、画下划线 · every long text laid out by CanvasKit, with coloured runs; the text geometry places the blanks, finds the word under a finger and draws the underlines | [src/view/type.mjs](src/view/type.mjs), [src/view/dossier.mjs](src/view/dossier.mjs), [src/view/card.mjs](src/view/card.mjs) |
| `@egret/engine/web/paragraph` · `createCanvasKitFontSetProvider` | CanvasKit 段落提供者，字体集合来自资源清单 · the CanvasKit paragraph provider over the manifest's font set | [src/view/type.mjs](src/view/type.mjs) |
| `@egret/engine/web/resources` · `createManifestFontContentLoader` + `@egret/contracts/resources` · `admitResourceManifest` | 按清单（引擎内容构建工具生成、校验 SHA-256）载入宋体与书法两套子集字体 · the two subset fonts loaded from a manifest built by the engine's content tools and checked by SHA-256 | [src/view/type.mjs](src/view/type.mjs), [tools/assets/fonts.mjs](tools/assets/fonts.mjs) |
| `engine.createAssetGroup` + `createAssetType` + `@egret/engine/web/kit` · `createBrowserImageTextureProvider` | 每案的背景、人物、器物、人形图作为一组载入，案开时一并解码、案关时一并释放；WebP 走浏览器解码 · each case's pictures loaded as one group when it opens and let go when it closes; WebP decoded by the browser | [src/view/pictures.mjs](src/view/pictures.mjs), [src/view/scenes.mjs](src/view/scenes.mjs) |
| `@egret/engine/web/text-input` · `createBrowserTextInput` | 判词：点框在原处放一个平台文本框，输入法照常可用，写完收起，字由游戏画 · the verdict: a platform text field over the box, input methods working, closed when done | [src/view/verdict.mjs](src/view/verdict.mjs) |
| `@egret/engine/ui/editing` · `createUiTextEditor` + `@egret/engine/ui` · `createUiRoot` + `@egret/engine/web/editing` · `createBrowserTextEditor`、`createBrowserEditorFontProvider` | 笔录：托管界面里的多行编辑器，平时由段落画出，点一下换成原生多行文本框；字体与段落同一套 · the notes: a multi-line editor in managed UI, drawn as a paragraph at rest and swapped for the native field when tapped; one font set with the paragraphs | [src/view/notes.mjs](src/view/notes.mjs) |
| `@egret/engine/layout` · `planLinearLayout` | 卷宗页签、工具栏、词签行、菜单按钮的排列 · tabs, the tool bar, rows of slips and menu buttons | [src/view/dossier.mjs](src/view/dossier.mjs), [src/view/casebook.mjs](src/view/casebook.mjs), [src/view/screens.mjs](src/view/screens.mjs) |
| `@egret/engine/web/hover` · `createBrowserHoverInput` | 鼠标悬停证物时高亮并显示证物名，滚轮缩放 · hovering evidence lights it and names it; the wheel zooms | [src/view/casebook.mjs](src/view/casebook.mjs) |
| `@egret/engine/web/audio` · `createBrowserAudio` + `@egret/engine/kit` · `encodeWav` | 代码合成的古琴、洞箫、编钟、木鱼音色与音效，经引擎混音器播放；四段配乐预先合成为 MP3 · synthesized qin, xiao, bells and woodblock, played through the engine's mixer; four pieces pre-rendered to MP3 | [src/audio/sound.mjs](src/audio/sound.mjs), [src/audio/synth.mjs](src/audio/synth.mjs) |
| `@egret/engine/kit` · `createSaveStore` | 每案的进度、词囊、已填空位、提示和笔录，带版本；坏档另存后重开 · each case's progress, pouch, blanks, hints and notes, versioned; a broken save set aside | [src/saves.mjs](src/saves.mjs) |
| `browser.createLabel`（`game.browser`） | 标题、按钮、印文等短字；小游戏里段落也由它按行拼出 · titles, buttons and seal words; in the mini game paragraphs too, line by line | [src/view/type.mjs](src/view/type.mjs), [src/view/plainText.mjs](src/view/plainText.mjs) |

## 已验证 · Verified

- `node --test InquestScrolls/test/*.test.mjs`：28 项通过（Node 22）。案卷审计——六案在中英两套案卷里各自可解、每个空的答案唯一、词囊里没有能同时填进两个空的词，且审计能抓出改坏的案卷；规则（收词、填空、核验的三种结果、三级提示、判词按关键词判定）；存档（新档、坏档、版本）；文字表中英齐全；字体子集盖住全部用字；引擎副本与 import map 一致、规则不碰引擎和页面。 · 28 tests pass in Node 22: the case audit (each case solvable in both languages, every blank with one answer, no word fitting two blanks, a broken case caught), the rules, the save, the word table, the font subset and the engine copy.
- `node InquestScrolls/test/accept.mjs`：无头 Chromium（SwiftShader 软件渲染）里走完标题 → 序 → 案情 → 第一案：鼠标点掉老秦、点尸身、点词收进词囊，J 打开卷宗，用鼠标把词签拖进空位，先错一处得到“尚有两处以内不实”，改对盖印，人物页对上名字后结案；第二案连要三级提示；在原生文本框里写笔录并存档；设置里关音乐、切英文；最后一案用画布文字输入写判词、呈上、看到终卷；不用 CanvasKit、用字盘的小游戏模式下证物、笔录和判词都能完成；坏档重开；竖屏 720×1280 打开案件。标题与盖印的卷宗两张截图基线一致，没有控制台错误。 · The whole walk in headless Chromium with software rendering, as listed, with two matching baselines and a clean console.
- 微信小游戏：`tools/wechat.mjs` 导出（主包 2.20 MB，合计 11.57 MB），`node InquestScrolls/test/minigame.mjs` 在引擎的微信替身里（GameGlobal 只有 wx、控制台和计时器，390×844 竖屏，鼠标当手指）从标题一路点进第一案、点尸身收词、在卷宗里填空并点核验盖印、用字盘写笔录、在最后一案用字盘写判词并呈上结案；页面上没有多出元素，没有错误。 · Exported and played in the engine's WeChat stand-in, as listed, with no element leaked and no error.
- `node tools/check-standard.mjs InquestScrolls --strict`、`npm run check:showcase`、`node tools/capability-matrix.mjs --check` 通过。 · The standard, showcase and capability checks pass.

## 已知问题 · Known issues

- 没有在真机、微信开发者工具、真触屏和扬声器上运行过；帧时间只在无头浏览器里量过，见 [QUALITY.md](QUALITY.md)。 · Not run on a real phone, in WeChat DevTools, on a real touch screen or through speakers; frame times only in a headless browser (see QUALITY.md).
- 小游戏没有网页字体，标签用系统自带的中文字体，标题不是书法字；舞台按 720×1280 居中，长屏上下留边。 · The mini game has no page fonts: its labels use the system's Chinese face, so titles are not in the brush face; the 720 × 1280 stage is centred with bars on a tall screen.
- 小游戏的图片分包靠 `wx.loadSubpackage` 开局下载；替身没有这个接口，所以分包下载这一步只在代码里，没有被运行过。 · The picture subpackage is downloaded with `wx.loadSubpackage`; the stand-in has no such call, so that step has not been run.
- CanvasKit 运行库 8.5 MB，网页首次打开要先下载它和 1.7 MB 字体，并在标题出现前初始化 CanvasKit，所以限速限 CPU 的首屏测量远超 3 秒（L1）。 · The page downloads the 8.5 MB CanvasKit runtime and 1.7 MB of fonts and starts CanvasKit before the title shows, so the throttled start-up measurement is far over 3 s (L1).
- 竖屏时卷宗里的词签和空位约 37–46 个舞台单位高，在 390 CSS px 宽的手机上只有 20–25 CSS px，低于 44 px 的建议；标题、过场和工具栏的按钮已加高到 80 以上。 · Upright, the dossier's slips and blanks are 37–46 stage units tall, 20–25 CSS px on a 390 px phone, under the 44 px guideline; buttons on the title, the story pages and the tool bar were made 80+ tall.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-25，无头 Chromium + SwiftShader · headless, software rendering）：L1 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4）（13.9 s to the first playable screen, 2.7 MB）。

## 已解决 · Solved

- 软件渲染下标题的帧时间 p95 原来约 67 ms（F1 不达标）：随引擎 `95897d7` 改用 `renderMode: 'on-demand'`，静止的画面保留上一帧；标题和过场的背景不再慢慢平移，焦点框只在移动时重画。现在 p95 16.8 ms。现场里的灯焰、水纹等环境动态照常每帧画。 · The title's frame time was about 67 ms at p95 under software rendering: with the engine's on-demand drawing (`95897d7`) a still screen keeps its frame, the backdrops no longer drift and the focus ring is drawn only when it moves; now 16.8 ms. The scenes' flames and water still draw every frame.

- 按钮点不中：引擎只拿节点自己的绘制做命中区，按钮的底画在子节点上，所以点不到；按钮自己补一块透明命中区（ENGINE-NOTES 第 5 条）。 · Buttons could not be clicked: the engine hits only a node's own drawing; each button now draws a clear hit box of its own (ENGINE-NOTES 5).
- 标签在重排后消失或残留：移除精灵不会释放标签的光栅缓存，统一用 `type.discard` 先释放再移除（第 6 条）。 · Labels vanished or lingered after re-layout: removing a sprite does not free a label's raster, so `type.discard` lets it go first (item 6).
- 字盘五十个字签让一帧超过引擎的 64 张图上限（`FRAME_IMAGE_BUDGET`）：一行字签合成一个标签，打开卷宗时不画底下的现场（第 8 条）。 · A fifty-tile board went over the engine's 64 images a frame: each row of tiles is one label now, and the scene is not drawn under the dossier (item 8).
- `game.image` 只收 PNG：美术是 WebP，改用 `createBrowserImageTextureProvider` 注册成资源类型（第 2 条）。 · `game.image` takes PNG only: the WebP art goes through `createBrowserImageTextureProvider` as an asset type (item 2).
- 小游戏里舞台比游戏区大，指针坐标和 `localToGlobal` 差一个偏移：点词、悬停都先换算（第 9 条）。 · In the mini game the stage is larger than the game's area: pointer and `localToGlobal` points are converted before use (item 9).
- 宋体子集按游戏全部文字加 GB2312 一级字生成，CanvasKit 遇到缺字会整段拒排（`PARAGRAPH_GLYPH_UNRESOLVED`），所以 Node 测试检查每个字都在子集里；笔录里打出子集以外的字时换成方框。 · The body font subset holds every character of the game plus GB2312 level 1, since CanvasKit refuses a paragraph with a missing glyph; a test checks the subset, and notes show any other character as a square.

## 未完成 · Unfinished

- 竖排文字：引擎段落不支持竖排，标题的竖写是每行一个字的段落拼成的，卷宗正文仍是横排（第 1 条）。 · Vertical text: the engine's paragraphs do not set text vertically; the title is a one-character-wide paragraph and the dossier stays horizontal (item 1).
- 英文版的判词只认少数几种写法（名字的拼写、罪名关键词），没有做更宽的同义词。 · The English verdict accepts only a few spellings and keywords.
- 没有读屏语义树：画布上的按钮还不能被读屏软件读出。 · No semantic tree yet: screen readers cannot name the canvas buttons.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html` | 页面、import map、CanvasKit 脚本 · the page, the import map, the CanvasKit script |
| `src/main.mjs` | 入口：游戏、存档、声音、焦点、键位、画面切换、小游戏识别 · the entry |
| `src/sim/` | 规则（不碰页面和引擎）：`kinds.mjs` 词的六类，`cases/c1…c6.mjs` 案卷数据，`text.mjs` 文本解析，`audit.mjs` 谜题审计，`rules.mjs` 收词、填空、核验、提示、判词 · the rules, free of the page and the engine |
| `src/view/` | 画面：`casebook.mjs` 案件画面，`scene.mjs` / `scenes.mjs` 分层现场与布置，`card.mjs` 证物，`dossier.mjs` 卷宗，`notes.mjs` 笔录，`verdict.mjs` 判词，`board.mjs` 字盘，`screens.mjs` 标题与过场，`type.mjs` / `plainText.mjs` 文字，`pictures.mjs` 图片，`ui.mjs` 界面零件 · the view |
| `src/audio/` | 合成音色、曲谱与音效 · synthesized voices, music and effects |
| `src/saves.mjs`, `src/words.mjs` | 存档、中英文字表 · the save, the words in both languages |
| `assets/art/` | 场景、人物、器物、人形图（WebP）与尺寸表 · scenes, figures, things, body charts and their sizes |
| `assets/fonts/` | 子集字体的内容构建产物、字表、OFL 许可 · the built subset fonts, their characters and OFL licences |
| `assets/music/` | 预先合成的四段配乐 · the four pre-rendered pieces |
| `runtime/canvaskit/` | CanvasKit 运行库及其许可 · the CanvasKit runtime and its licences |
| `tools/assets/` | 美术提示词表、打包、预览、字体与配乐生成 · art prompts, packing, preview, fonts and music |
| `tools/wechat.mjs` | 微信小游戏导出 · the WeChat export |
| `test/` | Node 测试、浏览器验收、小游戏验收、截图基线 · tests, acceptance walks, baselines |
| `docs/` | 设计与史料、美术来源 · design and sources, art |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `95897d78095ae8fda9e34dbc13bbbd15db8eaa12`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`95897d78095ae8fda9e34dbc13bbbd15db8eaa12`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md).

```sh
node tools/vendor-game.mjs <this folder> @egret/engine @egret/engine/play @egret/engine/kit @egret/engine/web/kit @egret/engine/paragraph @egret/engine/web/paragraph @egret/engine/web/text-input @egret/engine/ui @egret/engine/ui/editing @egret/engine/web/editing @egret/engine/layout @egret/engine/resources @egret/engine/web/resources @egret/engine/input/hover @egret/engine/web/hover @egret/engine/web/audio @egret/engine/animation @egret/engine/web/gestures
```

## 许可 · Licences

- 字体：思源宋体（Noto Serif SC）与马善政楷书（Ma Shan Zheng）的子集，均为 SIL OFL 1.1，许可在 `assets/fonts/`。 · Fonts: subsets of Noto Serif SC and Ma Shan Zheng, both SIL OFL 1.1, licences in `assets/fonts/`.
- CanvasKit（Skia）与其中的 ICU、FreeType、libpng 等，各自的许可在 `runtime/canvaskit/licenses/`。 · CanvasKit (Skia) with ICU, FreeType, libpng and the rest, each licence in `runtime/canvaskit/licenses/`.
- 引擎：Apache-2.0，见 `vendor/LICENSE`。 · The engine: Apache-2.0, see `vendor/LICENSE`.

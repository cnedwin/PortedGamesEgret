# 品质验收 · Quality — Love Elective · 心动选修课

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs LoveElective` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs LoveElective`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-21
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 1 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 133.4 ms over 34 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 2.6 s to the first playable screen, 5.1 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | html lang "en", Chinese left: 心动选修课 校园恋爱养成游戏 点击或轻触进行操作 空格或回车继续对话 屏幕方向 |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "心动选修课：校园恋爱养成游戏。点击或轻触进行操作，空格或回车" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 不达标 · fail | no named control in the accessibility tree |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 不达标 · fail | prefers-reduced-motion is not read |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: love-elective-prefs-v1, love-elective-save-v1) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: love-elective-prefs-v1, love-elective-save-v1) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不达标 · fail | 23 files refused; no uncaught error; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1, I1, A2, A3, E2。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 白露特別篇与原生可访问控件 · Bai Lu interlude and native accessibility

用 Windows PC Edge 158 验收白鹭语义树及 Chromium 可访问树。标题按钮有可读名称，手机页签有选中状态，弹窗限制焦点，Escape 关闭后恢复到打开控件。焦点移出画布再返回后，Tab、Shift+Tab 和页签方向键可再次操作。配乐、语音和音效的静音按钮与音量按钮各有独立名称。

旧 v1 格式测试档在 PC 继续到第 8 天，保留体力、金钱、属性和已穿服饰的染色。另从按旧规则推进到白露第二章的存档实际操作五个节点，取得三条线索、染色外套、选择读信和牵手或留白，并分别走到两个结局。对白中途保存并刷新可从同一句恢复。两个结局保留日程、原章节进度和染过的外套，完成后再次刷新仍能续档。

25 个 MP3 均由 Edge 的原生 Web Audio 解码。白露首句通过游戏内重听按钮重新播放，语音期间配乐增益从 0.800 降至 0.224。角色语音为本地合成，音乐为原创，来源见 [音讯制作 · Audio credits](assets/audio/README.md)。

三星 Galaxy Z Fold7（SM-F966U1，Android 17，Chrome 157）在 960 × 411 CSS px 横屏完成同一组触屏回归。旧格式存档、两条结局和刷新续档均通过。使用浏览器的可访问树核对标题按钮、回信页签、手机弹窗和三组音量按钮。调整语音音量时，其余两路设置保持原值。白露首句在手机混音器的播放进度实际推进至 0.163 秒，同期配乐增益为 0.224。未进行扬声器声学测量或 TalkBack 逐句朗读验收。零页面与资源错误，测试标签和设备常亮设置已恢复。

# 河湾筑家 · Riverside Homestead

## 简介 · Introduction

两名渡工抵达柳渡。玩家替他们在河岸选址，预览屋舍，花费木料建造第一间屋。Three plots, one cottage, and a ferry family waiting on the bank. Choose where they will live and see the timber, family and village change together. [在线试玩 · Play](https://cnedwin.github.io/PortedGamesEgret/templates/management-game/) · [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)

## 玩法与操作 · How to play

渡工一家在桥边的小路上等候。点击或轻触地桩，选中后可以改选，也可取消。确认动工花费 8 份木料，两名住户入住。Tab 移动焦点，Enter 或空格激活，Esc 取消预览。再次进入可看到原来的屋址。声音按钮可静音，减弱动态沿用系统设置。

The ferry family waits on the path by the bridge. Choose a marked site with a mouse, finger or keyboard. Previewing and cancelling are free. Building uses eight timber and houses two residents. Tab moves focus, Enter or Space activates a control, and Escape cancels a preview. Returning restores the chosen site. Sound can be muted and the system reduced-motion setting skips construction movement.

## 引擎能力对照表 · Engine capabilities

| 能力 · Capability | 用法 · Use | 文件 · File |
|---|---|---|
| Play images | 地景、预览、木架、成屋与居民 · scenery, ghost, framing, completed cottage and residents | `src/main.mjs` |
| Frame update | 木架出现，渡工从渡口走到家门 · reveal the frame and walk the family to the doorstep | `src/main.mjs` |
| Play audio | 木作敲击与完工双音 · a two-tone construction cue | `src/main.mjs` |
| Play save | 提交时记住屋址和偏好 · save the plot and preferences on commit | `src/saves.mjs` |

## 已验证 · Verified

规则、存档与翻译测试见 `test/*.test.mjs`。浏览器流程检查键盘、指针、模拟触屏、取消、落成、恢复和重选，结果见 [QUALITY.md](QUALITY.md)。The rules, save and localization checks run with `node --test test/*.test.mjs`. Run `node test/accept.mjs` for the browser walk. A newly scaffolded game creates its own screenshot baselines with `node test/accept.mjs --update`.

## 已知问题 · Known issues

模拟触屏覆盖纵向布局；真实读屏朗读、手机音频和玩家理解度各需独立实测。Portrait touch emulation covers the layout. Physical phone audio, screen-reader output and player comprehension require separate observations.

## 已解决 · Solved

落成决定先存入进度，再播放过渡。施工时退出也能恢复同一间房屋。The build commits before the animation, so reopening during construction restores the same cottage.

## 未完成 · Unfinished

样板到第一户安家结束。扩展经营时可增加下一项与已建房屋有关的抉择。The sample ends when the first family settles. A follow-up decision can build on the house that the player just placed.

## 目录结构 · Layout

`src/sim/world.mjs` 管理选址与消耗；`src/main.mjs` 编排场景；`src/i18n.mjs` 管理双语正文。配套素材在 `assets/`。The simulation owns selection and cost, the scene owns presentation, and all on-screen words come from the bilingual table. Artwork and its source live in `assets/`.

## 引擎副本 · Engine copy

模板预览共享桃溪的公开引擎副本。生成工程会获得独立副本和来源说明。The preview shares the Peach Creek engine copy. Generated games have their own vendor directory and provenance. Baseline commit `91f350b1fc1062a46a4b8e789ed4e01a4cdebbed`.

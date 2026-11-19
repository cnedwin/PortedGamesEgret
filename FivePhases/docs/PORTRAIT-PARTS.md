# 立绘部件清单

> 这份文档由 `FivePhases/tools/parts-table.mjs` 从 `src/portrait/*.mjs` 生成，**不要手改**。
> 要改部件就改清单文件，然后 `node FivePhases/tools/parts-table.mjs` 重跑一遍。

## 换真美术的步骤

1. 跑 `node FivePhases/tools/spine-export.mjs`，得到 `assets/spine/<角色>.skeleton.json` 和 `.manifest.json`。
2. 照 manifest 的 `size` 一张张画/生成 PNG，轴心放在 `pivot` 指定的位置。
3. 用 TexturePacker 或 Spine 自带打包器把 PNG 打成图集（atlas 由打包器出，不手拼）。
4. 把图集和 skeleton.json 一起丢进游戏，`image` 字段就算接上了。

骨骼、槽位、绘制顺序全在 skeleton.json 里，换图不用改它。

## 坐标约定

清单用画布坐标（原点左上，y 向下，像素）。转 Spine 时：

```
spine_x = canvas_x - canvas.width / 2
spine_y = canvas.height - canvas_y
spine_rotation = -canvas_rotation
```

原点落在画布底边中心，人物正好站在 y = 0 上。附件存的是**图片中心**，
清单里的 `offset` 是**轴心**，两者差一个按部件旋转摆过去的向量——转换脚本负责，别手算。

## 约定俗成的三件事

- **四肢从骨骼算，不手填角度**：`limb()` 按两根骨的位置推长度和朝向，骨骼一动胳膊跟着走。
- **关节补一个同色圆**：两根胶囊在肘部交叠，不补就会被掐出一个细腰。
- **绘制顺序即 layer 顺序**：Spine 的槽位顺序就是渲染顺序，导出时按 layer 排，别乱。

## 五行 · 火 · 焰（fire）

- 职责：爆发直伤
- 画布：1024 × 1536
- 骨骼 **16** 根，部件 **40** 个
- 体检通过

### 骨骼

| 骨骼 | 父骨 | 画布坐标 |
| --- | --- | --- |
| `hip` | — | 512, 1150 |
| `spine` | `hip` | 512, 1000 |
| `chest` | `spine` | 512, 830 |
| `neck` | `chest` | 512, 700 |
| `head` | `neck` | 512, 520 |
| `hair-tail` | `head` | 368, 486 |
| `hair-lock-l` | `head` | 400, 430 |
| `hair-lock-r` | `head` | 624, 430 |
| `shoulder-near` | `chest` | 344, 756 |
| `elbow-near` | `shoulder-near` | 306, 896 |
| `hand-near` | `elbow-near` | 356, 1000 |
| `shoulder-far` | `chest` | 680, 756 |
| `elbow-far` | `shoulder-far` | 748, 886 |
| `hand-far` | `elbow-far` | 790, 952 |
| `skirt-l` | `hip` | 448, 1176 |
| `skirt-r` | `hip` | 576, 1176 |

### 部件（按绘制顺序，后面的压前面的）

| # | 部件 | 挂骨 | 层 | 形状 | 尺寸 | 轴心 | 旋转 | 偏移 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `hair-back` | `head` | 0 | path·弧 | 400 × 660 | 0.5, 0.1 | 0° | 0, -84 |
| 1 | `hair-tail` | `hair-tail` | 1 | path·弧 | 76 × 300 | 0.5, 0.03 | 14° | 0, 0 |
| 2 | `skirt-under` | `hip` | 2 | path·直 | 290 × 330 | 0.5, 0.02 | 0° | 0, 0 |
| 3 | `skirt-l` | `skirt-l` | 3 | path·直 | 330 × 350 | 0.5, 0.02 | -3° | 0, 0 |
| 4 | `skirt-r` | `skirt-r` | 4 | path·直 | 330 × 350 | 0.5, 0.02 | 3° | 0, 0 |
| 5 | `arm-far-upper` | `shoulder-far` | 5 | capsule | 108 × 191 | 0.5, 0.115 | -27.6° | 0, 0 |
| 6 | `elbow-far-joint` | `elbow-far` | 6 | ellipse | 104 × 104 | 0.5, 0.5 | 0° | 0, 0 |
| 7 | `arm-far-fore` | `elbow-far` | 7 | capsule | 96 × 102 | 0.5, 0.115 | -32.5° | 0, 0 |
| 8 | `hand-far` | `hand-far` | 8 | ellipse | 60 × 84 | 0.5, 0.2 | -33° | 0, -4 |
| 9 | `body-robe` | `spine` | 9 | path·直 | 392 × 600 | 0.5, 0.5 | 0° | 0, -30 |
| 10 | `sash` | `hip` | 10 | rect | 300 × 46 | 0.5, 0.5 | 0° | 0, -6 |
| 11 | `shoulder-near` | `shoulder-near` | 11 | ellipse | 126 × 96 | 0.5, 0.5 | -6° | 2, 4 |
| 12 | `arm-near-upper` | `shoulder-near` | 12 | capsule | 112 × 189 | 0.5, 0.115 | 15.2° | 0, 0 |
| 13 | `elbow-near-joint` | `elbow-near` | 13 | ellipse | 106 × 106 | 0.5, 0.5 | 0° | 0, 0 |
| 14 | `arm-near-fore` | `elbow-near` | 14 | capsule | 100 × 150 | 0.5, 0.115 | -25.7° | 0, 0 |
| 15 | `sword-grip` | `hand-near` | 15 | capsule | 44 × 138 | 0.5, 0.03 | 35° | 0, 0 |
| 16 | `sword-pommel` | `hand-near` | 16 | ellipse | 52 × 52 | 0.5, 0.5 | 0° | -78.0, 111.4 |
| 17 | `hand-near` | `hand-near` | 17 | ellipse | 82 × 88 | 0.5, 0.12 | 0° | 0, -4 |
| 18 | `sword-flame` | `hand-near` | 18 | path·弧 | 84 × 516 | 0.5, 0.06 | -145° | 0, 0 |
| 19 | `sword-blade` | `hand-near` | 19 | path·直 | 40 × 470 | 0.5, 0.05 | -145° | 0, 0 |
| 20 | `sword-guard` | `hand-near` | 20 | rect | 132 × 26 | 0.5, 0.5 | -55° | 0, 0 |
| 21 | `neck-part` | `neck` | 21 | path·直 | 84 × 110 | 0.5, 0.5 | 0° | 0, -34 |
| 22 | `collar` | `neck` | 22 | path·直 | 204 × 146 | 0.5, 0.5 | 0° | 0, -10 |
| 23 | `head-shape` | `head` | 23 | path·弧 | 216 × 258 | 0.5, 0.5 | 0° | 0, 0 |
| 24 | `eye-white-l` | `head` | 24 | ellipse | 62 × 50 | 0.5, 0.5 | 0° | -46, 4 |
| 25 | `eye-iris-l` | `head` | 25 | ellipse | 42 × 46 | 0.5, 0.5 | 0° | -46, 6 |
| 26 | `eye-shine-l` | `head` | 26 | ellipse | 16 × 16 | 0.5, 0.5 | 0° | -56, -6 |
| 27 | `eye-lash-l` | `head` | 27 | capsule | 70 × 12 | 0.5, 0.5 | -7° | -46, -18 |
| 28 | `eye-white-r` | `head` | 28 | ellipse | 62 × 50 | 0.5, 0.5 | 0° | 46, 4 |
| 29 | `eye-iris-r` | `head` | 29 | ellipse | 42 × 46 | 0.5, 0.5 | 0° | 46, 6 |
| 30 | `eye-shine-r` | `head` | 30 | ellipse | 16 × 16 | 0.5, 0.5 | 0° | 38, -6 |
| 31 | `eye-lash-r` | `head` | 31 | capsule | 70 × 12 | 0.5, 0.5 | 7° | 46, -18 |
| 32 | `brow-l` | `head` | 32 | rect | 50 × 8 | 0.5, 0.5 | -11° | -54, -48 |
| 33 | `brow-r` | `head` | 33 | rect | 50 × 8 | 0.5, 0.5 | 11° | 54, -48 |
| 34 | `mouth` | `head` | 34 | ellipse | 26 × 10 | 0.5, 0.5 | 0° | 0, 76 |
| 35 | `hair-fringe` | `head` | 35 | path·弧 | 312 × 140 | 0.5, 0.5 | 0° | 0, -110 |
| 36 | `hair-lock-l` | `hair-lock-l` | 36 | path·弧 | 96 × 300 | 0.5, 0.03 | 3° | 0, 0 |
| 37 | `hair-lock-r` | `hair-lock-r` | 37 | path·弧 | 96 × 300 | 0.5, 0.03 | -3° | 0, 0 |
| 38 | `earring-l` | `head` | 38 | ellipse | 24 × 56 | 0.5, 0 | 0° | -114, 22 |
| 39 | `earring-r` | `head` | 39 | ellipse | 24 × 56 | 0.5, 0 | 0° | 114, 22 |

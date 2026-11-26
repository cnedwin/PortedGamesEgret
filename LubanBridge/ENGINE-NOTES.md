# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `a7be833`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `a7be833`) while making this game, and suggestions, written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 距离关节连成桁架又软又偏，也读不到杆件受了多大的力 · Distance joints chained into a truss are soft and lopsided, and give no member force — 未解决 / open
<!-- engine-note: {"id": "LubanBridge#1", "status": "open", "topic": "physics2d-truss-joints", "workaround": ["src/sim/truss.mjs", "src/sim/run.mjs"]} -->

- **现象 · What happens**：用 `world.addJoint({ kind: 'distance' })` 把节点连成一座 6 格、12 米的桁架，两端固定，跨中挂 10 kN：`fixedStep` 1/60、8 轮迭代时跨中下垂 1.89 米，400 步之后还在晃（`vy` −2.3）；1/120、16 轮时仍下垂 0.2 米。对称的桁架在对称荷载下，各杆残余伸长却不对称（同一位置的左、右下弦一根受拉一根受压），是逐个求解的顺序造成的。关节只有 `distance()`，没有这一步出了多少力，没法按力判断拉断或压坏；`holdSpeed` 里算出的冲量没有交出来。 · A 12 m truss of six panels joined with distance joints, both ends fixed, 10 kN at mid-span: at a 1/60 step with 8 iterations it sags 1.89 m and still swings after 400 steps; at 1/120 with 16 it still sags 0.2 m. A symmetric truss under a symmetric load stretches unsymmetrically (the same chord member pulls on one side and pushes on the other), from the order joints are solved in. A joint gives only `distance()`, not the force it carried, so tearing or crushing cannot be judged; the impulse `holdSpeed` works out is not handed out.
- **绕过办法 · Workaround**：桥身由游戏自己的小步长位置约束求解（每帧 12 小步、每步一轮、正反顺序交替），每根杆件的力由约束的乘子直接算出（`src/sim/truss.mjs`）；在 Node 里与静定桁架的手算结果一致、左右对称。引擎的 2D 物理只用在刚体上：车轮、车与牲口之间的杆和绳（`addJoint`）、跟着桥身走的桥面运动刚体、断下来的碎木石（`src/sim/run.mjs`）。 · The frame is solved by the game's own small-step position constraints (twelve steps a frame, one round each, the order alternating), and each member's force comes straight from its constraint's multiplier (`src/sim/truss.mjs`); in Node it matches a hand-worked truss and is symmetric. The engine's 2D physics is used for bodies: the wheels, the rods and ropes between carts and beasts (`addJoint`), the kinematic deck bodies that follow the frame, and the broken timber and stone (`src/sim/run.mjs`).
- **建议 · Suggestion**：距离关节改用带柔度的位置约束（XPBD），每步交出 `joint.force`（拉为正、压为负）；加 `breakForce`（拉）与 `breakPush`（压），超过就断并发一个事件；`step` 支持小步（`substeps`）而不只是迭代次数。 · Make distance joints compliant position constraints (XPBD) that give `joint.force` each step (pull positive, push negative); add `breakForce` and `breakPush` with an event when one goes; let `step` take `substeps`, not only iterations.
- **状态 · Status**：未解决 · Open.

### 2. 刚体的 `angle` 是角度，文档和类型都没说 · A body's `angle` is in degrees, which neither the documents nor the types say — 未解决 / open
<!-- engine-note: {"id": "LubanBridge#2", "status": "open", "topic": "body-angle-degrees", "workaround": ["src/sim/run.mjs"]} -->

- **现象 · What happens**：`PhysicsBody.angle` 和 `PhysicsBodyOptions.angle` 的注释只写「angle」。按惯例传了弧度后，桥面刚体只转了不到一度，车轮撞在没有转过来的盒子的端面上，停在原地（速度正好是 0），看起来像碰撞有缺陷；`place()`（`physics2dGeometry.ts`）里才看出是 `degrees * Math.PI / 180`。 · The notes on `PhysicsBody.angle` and `PhysicsBodyOptions.angle` say only "angle". Given radians, as is usual, a deck body turned by less than a degree, and a wheel ran into the end of a box that had not turned and stopped dead (its speed exactly 0), which looked like a fault in the contacts; only `place()` in `physics2dGeometry.ts` shows it is `degrees * Math.PI / 180`.
- **绕过办法 · Workaround**：传角度（`src/sim/run.mjs` 的 `placePlanks` 和碎块）。 · Degrees are given (`placePlanks` and the debris in `src/sim/run.mjs`).
- **建议 · Suggestion**：在类型注释和 2D 物理文档里写明单位是角度（与显示对象的 `rotation` 一致）；或者加 `angleRadians`。 · Say in the type notes and the 2D physics document that the unit is degrees (as with a display object's `rotation`), or add `angleRadians`.
- **状态 · Status**：未解决 · Open.

### 3. 刚体不会自己转，没有铰链和马达 · Bodies do not spin by themselves, and there is no hinge or motor — 未解决 / open
<!-- engine-note: {"id": "LubanBridge#3", "status": "open", "topic": "physics2d-hinge-motor", "workaround": ["src/sim/run.mjs"]} -->

- **现象 · What happens**：刚体只有 `angle`，没有角速度和力矩；关节只有 `distance` 和 `rope`。车轮不会滚，只能滑；车不能按扭矩爬坡；断下来的木头落水时也不会翻转。（MechanismCity 第 1 条也记过刚体不转动。） · Bodies have an `angle` and no angular speed or torque; joints are only `distance` and `rope`. Wheels cannot roll, only slide; a cart cannot climb by torque; broken timber does not tumble as it falls. (MechanismCity item 1 noted that bodies do not turn.)
- **绕过办法 · Workaround**：车轮无摩擦，游戏每小步沿车轮所站的桥面切向把速度拉向车速（相当于马达，`src/sim/run.mjs`）；碎块的转动由游戏每步改 `angle`。 · Wheels have no friction, and each small step the game pulls a wheel's speed along the deck it stands on toward the cart's speed (a motor in effect, `src/sim/run.mjs`); debris turns by the game changing `angle` each step.
- **建议 · Suggestion**：加角速度、转动惯量、`applyTorque`，以及 `revolute`（铰链，可带马达和限位）、`wheel` 关节。 · Add angular speed, inertia and `applyTorque`, and `revolute` (a hinge, with a motor and limits) and `wheel` joints.
- **状态 · Status**：未解决 · Open.

### 4. 软件渲染下每一帧都画全部静止的背景 · Under software rendering every frame draws the whole still background — 已写入文档 / documented
<!-- engine-note: {"id": "LubanBridge#4", "status": "documented", "topic": "still-layer-cache", "workaround": ["src/main.mjs", "src/view/paint.mjs"]} -->

- **现象 · What happens**：试通时画面每帧都要变，`renderMode: 'on-demand'` 帮不上；无头 Chromium + SwiftShader、1280×720 下，一关的帧时间 p50 66.7 ms。逐层隐藏量出：只提交、什么都不改时也是 66 ms；隐藏整个世界层后 33 ms，隐藏背景（山水、岸）后 50 ms。也就是静止的背景和界面每帧都完整重画。 · During a test crossing the picture changes each frame, so `renderMode: 'on-demand'` cannot help; in headless Chromium with SwiftShader at 1280 × 720 a level ran at a p50 of 66.7 ms. Hiding layers in turn: 66 ms with nothing changed but a submit; 33 ms with the world layer hidden; 50 ms with the background (hills, water, banks) hidden. The still background and interface are drawn whole every frame.
- **绕过办法 · Workaround**：检测到软件渲染时 `play({ pixelRatio: 0.75 })`；天空改成不透明的色带（半透明的整屏叠层最贵）；网格单独一层，试通时隐藏（`src/main.mjs`、`src/view/paint.mjs`）。之后 p50 33.4 ms（第 1-5 关）到 49.9 ms（第 5-5 关）。 · `play({ pixelRatio: 0.75 })` when software rendering is found; the sky painted as opaque bands (translucent full-screen layers cost most); the grid on a layer of its own, hidden while testing (`src/main.mjs`, `src/view/paint.mjs`). After that, p50 33.4 ms (level 1-5) to 49.9 ms (level 5-5).
- **建议 · Suggestion**：同 CanalWatch 第 3 条、SandScroll 第 7 条：一个「静止层」，子树烘成一张纹理，内容不变时只合成，变了再烘；或者在只有部分节点变化时只重画脏区域。 · As CanalWatch item 3 and SandScroll item 7: a still layer whose subtree is baked to a texture and only composited until it changes, or redrawing only the dirty part when a few nodes change.
- **状态 · Status**：已写入文档（引擎 #485，`8637ace`）：与 CanalWatch 第 3 条同一个问题，已写进 guide 卡片 still-background；静止层本身还没有。 · Documented (engine #485, `8637ace`): the same as CanalWatch item 3, in the still-background guide card; a still layer itself is not there yet.

### 5. `web/input` 的鼠标输入只认左键 · The mouse input of `web/input` knows only the left button — 未解决 / open
<!-- engine-note: {"id": "LubanBridge#5", "status": "open", "topic": "mouse-right-button", "workaround": ["src/view/build.mjs"]} -->

- **现象 · What happens**：`createMouseInput` 的事件里 `button` 的类型就是 `0`；右键按下不派发。造桥游戏惯用右键拆杆件，只能自己在画布上听 `pointerdown`（`button === 2`）并挡掉 `contextmenu`。 · `button` in `createMouseInput`'s events is typed `0`, and a right press is not dispatched. A bridge builder takes members down with the right button, so the game listens for `pointerdown` with `button === 2` on the canvas itself and stops `contextmenu`.
- **绕过办法 · Workaround**：`src/view/build.mjs` 里直接听画布的 `pointerdown` 和 `contextmenu`；右键按下的那一下也会被手势当成一次点按，所以 0.4 秒内的点按不算。 · `src/view/build.mjs` listens to the canvas's `pointerdown` and `contextmenu` itself; the right press is also seen by the gestures as a tap, so taps within 0.4 s of it are ignored.
- **建议 · Suggestion**：鼠标输入派发 `button`（0/1/2）和 `buttons`，`createGestures` 的点按带上按键，右键默认不算点按。 · Dispatch `button` (0/1/2) and `buttons` from mouse input, carry the button on `createGestures` taps, and do not count a right press as a tap by default.
- **状态 · Status**：未解决 · Open.

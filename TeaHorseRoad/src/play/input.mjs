// 驾驶输入：键盘走引擎的命名动作（createInputActions + bindBrowserInputActions），手柄走 @egret/engine/web/gamepad
// 读摇杆和扳机的模拟量，触屏由界面上的控件把数值写进来。三者合成一份方向、油门、刹车。
//
// Driving input: keys through the engine's named actions (`createInputActions` + `bindBrowserInputActions`), a pad through
// `@egret/engine/web/gamepad` for the analogue stick and triggers, and touch written in by the on-screen controls. The
// three are merged into one steering, throttle and brake.
import { createInputActions } from '@egret/engine/kit';
import { bindBrowserInputActions } from '@egret/engine/web/kit';
import { createBrowserGamepadInput } from '@egret/engine/web/gamepad';

const BUTTONS = {
  horn: ['Key:KeyH', 'Key:KeyE'],
  camera: ['Key:KeyC'],
  handbrake: ['Key:Space'],
  pause: ['Key:Escape', 'Key:KeyP'],
  confirm: ['Key:Enter'],
  recover: ['Key:KeyR']
};
// Gamepad buttons by their standard names for the same actions.
const PAD = { horn: 'y', camera: 'r3', handbrake: 'x', pause: 'start', confirm: 'a', recover: 'select' };

export function createDriveInput({ onError } = {}) {
  const actions = createInputActions({
    steer: { kind: 'axis', negative: ['Key:KeyD', 'Key:ArrowRight'], positive: ['Key:KeyA', 'Key:ArrowLeft'] },
    throttle: { bindings: ['Key:KeyW', 'Key:ArrowUp'] },
    brake: { bindings: ['Key:KeyS', 'Key:ArrowDown'] },
    ...Object.fromEntries(Object.entries(BUTTONS).map(([name, bindings]) => [name, { bindings }]))
  });
  const keys = bindBrowserInputActions(actions, { passKeys: ['Tab', 'F5', 'F11', 'F12'], skipPrevented: true });
  const pads = createBrowserGamepadInput({ onError });
  const padDown = new Set(),
    padPressed = new Set();
  const touch = { steer: 0, throttle: 0, brake: 0, active: false };
  const state = { steer: 0, throttle: 0, brake: 0, handbrake: false, usingPad: false };
  let keySteer = 0;

  return {
    actions,
    pads,
    touch,
    state,
    /** Read every source once a frame, before the game asks what was pressed. */
    poll(seconds, time = performance.now()) {
      keys.poll();
      pads.poll(time);
      const pad = pads.input.pad(0);
      padPressed.clear();
      for (const [action, button] of Object.entries(PAD)) {
        const down = Boolean(pad?.pressed(button));
        if (down && !padDown.has(action)) padPressed.add(action);
        if (down) padDown.add(action);
        else padDown.delete(action);
      }
      // Keys steer gradually, as a wheel turned by hand, and centre faster than they turn.
      const wantKey = actions.value('steer');
      const rate = wantKey === 0 || Math.sign(wantKey) !== Math.sign(keySteer) ? 4.5 : 2.4;
      keySteer += Math.max(-rate * seconds, Math.min(rate * seconds, wantKey - keySteer));
      const stick = pad?.stick('left') ?? { x: 0, y: 0 },
        padThrottle = Math.max(pad?.value('r2') ?? 0, stick.y < -0.2 ? -stick.y : 0),
        padBrake = Math.max(pad?.value('l2') ?? 0, stick.y > 0.4 ? stick.y : 0);
      state.usingPad = Boolean(pad) && (Math.abs(stick.x) > 0.1 || padThrottle > 0.05 || padBrake > 0.05);
      state.steer = Math.max(-1, Math.min(1, keySteer - stick.x + touch.steer));
      state.throttle = Math.max(actions.value('throttle'), padThrottle, touch.throttle);
      state.brake = Math.max(actions.value('brake'), padBrake, touch.brake);
      state.handbrake = actions.value('handbrake') > 0 || padDown.has('handbrake');
      // Brake held at a standstill reverses, as in most driving games.
      return state;
    },
    /** Whether an action was pressed this frame, on the keys or the pad. */
    pressed: (name) => actions.justPressed(name) || padPressed.has(name),
    endFrame() {
      actions.endFrame();
    },
    rumble(strength = 0.5, duration = 120) {
      if (pads.input.pad(0)) pads.rumble(0, { duration, weak: strength, strong: strength * 0.6 });
    },
    dispose() {
      keys.dispose();
      pads.dispose();
    }
  };
}

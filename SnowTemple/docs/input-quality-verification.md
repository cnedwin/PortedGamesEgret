# Input and quality follow-up

Base: `921bc22ad5e3e28b43465bc8a67d1ada9075c39e` (main, #57).

## Changes
- Thumb-stick magnitude now scales walking, guard movement and snow-step speed; diagonal keyboard speed remains capped. Dodge distance and combat timings remain unchanged.
- Blur and hidden-document transitions clear held actions, queued taps and stick state; HUD stick anchor resets too. Lost pointer capture clears the stick.
- Each touch control tracks its owning pointer, so another finger cannot replace or release the stick. Action buttons also reset when pointer capture is lost.
- Opening settings suppresses gameplay input; closing clears all queued inputs. Key rebinding remains available inside settings.
- The view now honors the requested shadow map resolution (medium: 1024, high: 2048).
- Contextual one-shot reminders introduce guarding, the counterattack, stamina management and boss evasions. Tips raised during cinematics wait until the HUD returns. No combat stats or art assets were changed.

## Automated verification
From SnowTemple: `node --test test/*.test.mjs`.
Two additional regressions cover pointer ownership and settings input suppression, including rebinding and clean resumption. The four original regressions were observed failing before their fixes. The three lesson tests were observed failing against an empty implementation. The full SnowTemple suite passes 26 tests, including its existing seeded combat/completion tests.
`node --check` covers all changed modules; `git diff --check` checks whitespace.
The shadow-map test is a source-wiring regression, not a GPU render test. Input interruption tests use an event-surface shim around the real input module, not real OS focus changes.

## Still requires interactive/real-device validation
Local Chromium could not launch in this container: `socket() failed: Operation not permitted`. No screenshot, frame-rate, GPU, phone or human playtest pass is claimed.

1. Start the repository HTTP server; open `/SnowTemple/` on PC and a real touch phone.
2. Compare light and full stick deflection. Keep diagonal speed bounded. Check guarded movement and snow-step; dodge should still travel its full original distance.
3. Drag out of the stick area, cancel a touch, switch apps while moving/attacking, return, then start a fresh touch. Expect no residual move or queued attack. Verify moving and blocking with two fingers; put a second finger inside the stick region, lift it, and confirm the first finger still controls movement. Lose capture on each action button and confirm it releases. Open settings during motion, press attack/dodge keys there, close it, and confirm no pending actions execute. Check keyboard/mouse aim after returning.
4. Enter the yard, block/parry and counter, deliberately exhaust stamina, enter the boss arena. Each contextual reminder should show once; the boss reminder should appear after the introduction, never underneath hidden cinematic HUD.
5. Compare medium/high shadows on actual hardware (1024/2048) and measure frame-time under load. Rendering improvement is not implied solely by the configuration fix.

Known non-goals: full pause/resume UI, a complete interactive tutorial, LOD/assets rebaking, difficulty changes, online publication. The existing game loop can still advance when unfocused; this patch clears input, not a full pause feature.

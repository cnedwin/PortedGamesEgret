# Combat motion capture

The data used for the five body motion clips was obtained from the [Carnegie Mellon University Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/). The database was created with funding from NSF EIA-0196217. The lab's [reuse FAQ](https://mocap.cs.cmu.edu/faqs.php) permits copying, modifying, and redistributing the data. The database terms prohibit selling the data directly.

The original performer tracks were recorded at 120 Hz. The game resamples each selection into 33 keys. Each row gives the inclusive source frames for the ready pose, preparation, contact or deepest dip, follow-through and recovery. The weapon mesh and its orientation curves are game assets. The capture provides the body performance.

| Game clip | Official take | Selected source frames |
| --- | --- | --- |
| Thrust | [Subject 02, trial 08, swordplay](https://mocap.cs.cmu.edu/search.php?subjectnumber=2&trinum=8), forward hand extension adapted to the spear and glaive | 146, 171, 197, 204, 212 |
| Sweep | [Subject 02, trial 07, swordplay](https://mocap.cs.cmu.edu/search.php?subjectnumber=2&trinum=7), cross-body swing | 1538, 1575, 1608, 1635, 1667 |
| Overhead | Subject 02, trial 07, descending two-hand action | 109, 127, 156, 174, 193 |
| Diagonal slash | Subject 02, trial 07, angled downward action | 827, 851, 880, 898, 928 |
| Duck dodge | [Subject 128, trial 04, Run Duck Underneath](https://mocap.cs.cmu.edu/search.php?subjectnumber=128&trinum=4), dip and recovery | 58, 74, 96, 109, 132 |

## Rebuild the derived clips

Download [02.asf](https://mocap.cs.cmu.edu/subjects/02/02.asf), [02_07.amc](https://mocap.cs.cmu.edu/subjects/02/02_07.amc), [02_08.amc](https://mocap.cs.cmu.edu/subjects/02/02_08.amc), [128.asf](https://mocap.cs.cmu.edu/subjects/128/128.asf) and [128_04.amc](https://mocap.cs.cmu.edu/subjects/128/128_04.amc) into one directory. The converter checks the SHA-256 of each original. Run this from the game folder.

~~~sh
node tools/retarget-combat.mjs /path/to/originals src/view/combat-motion-data.mjs
node --test test/combat-motion.test.mjs
~~~

The converter reconstructs the ASF skeleton, aligns the performance to the game's forward direction and fits it to the existing body rig. It carries captured hip height and limb angles while the game supplies horizontal motion. The pose sampler maps the highlighted contact to the player's hit time or the foe's strike midpoint. The existing hand constraint seats the handle. Neither attack timings nor collision shapes are stored in the motion data.

# Locomotion motion capture

The data used in this project was obtained from [the Carnegie Mellon University Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/). The database was created with funding from NSF EIA-0196217. The lab's [FAQ](https://mocap.cs.cmu.edu/faqs.php) permits copying, modifying, and redistributing the motion data. The database home permits including the data in products and prohibits reselling the data directly, including in converted form.

The included file `src/view/locomotion-data.mjs` contains retargeted cycles derived from the lab's optical capture of subject 35. Each source trial was recorded at 120 Hz. Both source activities are level-ground locomotion.

| Clip | Official listing and original motion | Left plant, right plant, next left plant | Time per stride | Measured forward travel |
| --- | --- | --- | --- | --- |
| Walk | [Trial 08](https://mocap.cs.cmu.edu/search.php?subjectnumber=35&trinum=8), [35_08.amc](https://mocap.cs.cmu.edu/subjects/35/35_08.amc) | 110, 174, 246 | 1.1333 s | 1.3727 m |
| Run | [Trial 18, run/jog](https://mocap.cs.cmu.edu/search.php?subjectnumber=35&trinum=18), [35_18.amc](https://mocap.cs.cmu.edu/subjects/35/35_18.amc) | 31, 76, 126 | 0.7917 s | 2.4834 m |

The converter checks the three unmodified source files against these SHA-256 digests.

| Original file | SHA-256 |
| --- | --- |
| [35.asf](https://mocap.cs.cmu.edu/subjects/35/35.asf) | `2a8e2eda3c0d7d828566b2a9a8ab36b2b8b3864110574e8b73c8f069fded416c` |
| `35_08.amc` | `95d6b0b70eb12bed3dc8c1c284a8b7ba1ff845c93fa992ac0ba444fdf9e51762` |
| `35_18.amc` | `b83673d6f66b56eef95beda511ebca7ae9c759c1a1694c852bc602623430aa42` |

Place the three originals in one directory. From `SnowTemple/`, regenerate and verify with Node.

```sh
node tools/retarget-locomotion.mjs /path/to/cmu-subject-35 src/view/locomotion-data.mjs
node --test test/locomotion.test.mjs
```

The converter reconstructs the filmed skeleton with its ASF joint axes and AMC channels, then maps its measured bone directions onto the game's right-handed rig (+Y up, +Z forward, +X character left). The clip samples are in-place, with a vertical hip offset fit to the game boots at ground contacts. Each loop has 48 samples. The second foot plant is aligned at half a cycle so that both clips can share a phase during blending. Left and right contact weights are based on the observed heel plants and toe-offs. A small correction near the loop seam blends the two filmed left plants. Pose sampling linearly interpolates adjacent samples. Gameplay owns movement speed and horizontal position. Weapon holds and the weapon-hand constraint are applied separately by the figure pose code.

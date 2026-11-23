# River village art

[简体中文](README.zh-CN.md)

The bank, bridge, paddies and village share a hand-set pixel grid. Warm roof tiles distinguish an occupied house from its pale placement outline and exposed timber frame. The resident is separate so it can move independently of the house.

| File | Source pixels | Placement |
| --- | --- | --- |
| `village.png` | 480 × 270 | Fill the 960 × 540 stage. |
| `house-preview.png` | 80 × 64 | Align the bottom center with the selected site. |
| `house-frame.png` | 80 × 64 | Keep the preview's anchor during construction. |
| `house-ready.png` | 80 × 64 | Replace the frame at the same anchor. |
| `resident.png` | 12 × 20 | Align the bottom center with the resident's position. |

The site anchors are (254, 360), (506, 314) and (740, 348) in stage units. Render the sprites at twice their source dimensions. To change the setting, replace the PNGs at these sizes or update the site positions to match new artwork.

The PNGs and their source were created for this starter with AI assistance. The generator draws every shape from coordinates and uses seeded variation for vegetation. It reads no external images or fonts. The generator and the five PNGs are distributed under the [Apache License 2.0](LICENSE).

To rebuild the PNGs, run `python draw-village.py` with Python 3 and Pillow (tested with Pillow 13.0.0). The generator writes beside its own file. Running a game only requires the PNGs.

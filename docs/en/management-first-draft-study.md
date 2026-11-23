# A first draft of Mist Ferry

A management starter gives the author a placed object, an action and someone who depends on it. Riverside Homestead takes the choice of a building site from [Peach Creek](https://github.com/cnedwin/PortedGamesEgret/tree/d82e0abc18ba7ec8352bbedab48f587f8f63e05d/PeachCreek) and follows the family until it reaches the house. The comparison asked a separate authoring session to adapt each entry to a different game.

> 做一个叫《雾汀渡》的江南渡口经营小游戏，让玩家给摆渡人搭起第一座船棚，接上第一位等船的客人。

The identical request in both runs asks for a Jiangnan ferry settlement where the player puts up the ferryman's first shelter and takes on the first waiting passenger.

| | A · standard starter | B · management starter |
|---|---|---|
| Opening and first action | The wharf is below a page header, beside a task journal. The operator selected timber and reeds at 4 s and 8 s. | The bank has three named sites beside a journal. At 4 s the operator selected Willow and a frame preview appeared on that site. |
| Change seen after input | A shelter appeared at 12 s at the marked site. The 16 s boarding input seated a passenger. At 19 s the crossing counter was still zero. | At 8 s the operator confirmed construction at Willow. Timber fell from 12 to 4. After the 12 s boarding input, the boat crossed. At 19 s the passenger was on the far bank, with one crossing and three coins recorded. |
| Submitted edit size (24,000-byte cap) | 30,213 bytes · exceeded | 31,019 bytes · exceeded |
| Wall time (480-second cap) | 279.8 s | 275.5 s |
| Evidence | [20-second video](../first-creation-study/A.mp4) · [Playable ZIP](../first-creation-study/A.zip) · [Receipt](../first-creation-study/A-receipt.json) | [20-second video](../first-creation-study/B.mp4) · [Playable ZIP](../first-creation-study/B.zip) · [Receipt](../first-creation-study/B-receipt.json) |

Both first outputs are preserved byte for byte, including the overages. Neither submission qualified under the agreed edit budget. The recordings show what each raw draft did. One pair and zero human participants leave player understanding and any repeatable improvement open. In B the author drew new ferry scenery in `src/scenery.mjs`; the starter PNGs were available in the project. The recordings cannot isolate the effects of the art, the scene structure or the guide.

Both drafts retained a page header, a framed map and a permanent right-hand journal. The management entry carried a genuine location choice and on-site preview into this draft; the broad page layout survived as well. The published authoring guide now asks authors to try folding the side panel and to attach prompts to the affected object. Those changes and the short AGENTS.md pointer were added after capture and have not been evaluated in a fresh generation.

[A opening](../first-creation-study/A-opening.png) · [A at 19 s](../first-creation-study/A-result.png) · [B opening](../first-creation-study/B-opening.png) · [B at 19 s](../first-creation-study/B-result.png)

## Conditions and replay

Each session used `gpt-6.2-sol`, medium reasoning, a single response, no model tools and no execution feedback. We allowed up to 120,000 bytes of starter context in each session. A received 66,355 bytes and B received 35,091 bytes. Each had its own starting files and the same Egret API excerpt and engine files from commit `91f350b`. The submission limit counts the UTF-8 bytes of each edit's path, search string and replacement. No edits were applied by hand. The normalized ZIP contains all files used to serve the draft. Inherited starter tests and quality notes inside the ZIP describe the starter.

Both recordings start at navigation with fresh storage on Windows, Chrome for Testing 157, software WebGL2, 960 × 540. A scripted operator could perform one visible action every four seconds. The continuous silent clips run for 20 seconds and retain loading time. The timing describes this recorded route. To play locally, extract either ZIP to its own directory, run `python -m http.server 8000` there and open `http://localhost:8000/`. For a fresh observation use a new browser profile or port for each build.

The full prompts, raw edit responses, hashes and capture logs are kept beside the clips. For a first-time playtest, assign a single build to each participant and conceal the brief and the other build. Record the first action and ask the player to point to what changed. [Generation limits](../first-creation-study/generation-protocol.json) · [Capture protocol](../first-creation-study/protocol.md) · [Observation card](../first-creation-study/player-card.md) · [中文](../Cns/management-first-draft-study.md)

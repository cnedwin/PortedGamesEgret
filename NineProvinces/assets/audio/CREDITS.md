# 九州烽烟 · 原创声音 / Original sound

本目录的三首配乐、旋律、节奏编排，以及 `src/audio/synthesis.mjs` 的界面和战场音色，均为《九州烽烟》新编。没有使用第三方录音、采样包、已有歌曲或人声。丝弦、竹管、鼓皮和铜声均由数学模型合成；它们服务于汉末策略游戏的气质，不是历史乐器实录或考据复原。

The three scores, their melodies and arrangements, and the interface/battle sounds in `src/audio/synthesis.mjs` were newly authored for Nine Provinces Ablaze. They use no third-party recordings, sample libraries, pre-existing songs or voices. Instrument timbres are mathematical synthesis, inspired by silk strings, bamboo winds, skins and bronze, rather than recordings or a claim of historical reconstruction.

| 场景 / Scene | 曲名 / Title | 长度 / Length | 编排 / Arrangement |
| --- | --- | --- | --- |
| 首页 / Title | 銅雀未曉 · Before the Banners Rise | 1:41 | 拨弦问答、竹笛应句，后段留白 / Plucked questions, bamboo-wind answers, a restrained final phrase |
| 天下 / Realm | 山河有信 · Across the Living Realm | 2:00 | 疏朗丝弦与低音箫，避免持续低频铺底 / Spacious strings and breathy low winds, without a continuous bass drone |
| 战场 / Battle | 旌旗破陣 · Banners Through the Line | 1:47 | 三段强弱轮替的战鼓、拨弦及铜声 / Alternating drum intensity, plucked motifs and sparse bronze accents |

三曲共享动机而各有速度、调式色彩和段落，原始尾音环绕到曲首。MP3 使用 Xing 时长信息以便浏览器移除编码首尾填充。`manifest.json` 记录源 PCM 指标、时长和交付文件的 SHA-256；压缩后的实际浏览器解码结果需要另行验收，不能把源指标当成所有设备的测量。

The tracks share motifs but have distinct tempos, modal colors and sections. Note tails wrap into the beginning of the authored loop. MP3s include Xing duration information for gapless decoding. `manifest.json` records source PCM metrics, durations and delivered-file SHA-256 values; those source measurements do not replace verification of compressed playback on each device.

复生成需要 Python、NumPy 和带 libmp3lame 的 FFmpeg（只在制作时使用，玩家无需安装）：

```sh
python src/audio/compose-score.py --ffmpeg /path/to/ffmpeg
```

运行时仅使用白鹭原生音频混音器：配乐与音效独立音量/静音，场景换曲渐变，重要提示短时压低配乐。配乐按需加载，最多保留两个解码曲目，并受 112 MiB 解码预算限制；音效在初始化时生成和解码，战斗帧内不生成波形。攻击声轮换变体并限频，避免密集交战把声音堆满。

Runtime uses the native Egret audio mixer, with independent music/effect levels and mute controls, crossfaded scene transitions and brief music ducking for important cues. Music loads on demand, keeps at most two decoded tracks and obeys a 112 MiB decoded-audio budget. Short effects are prepared during initialization rather than synthesized inside battle frames. Impact variants and density limits prevent uncontrolled buildup.

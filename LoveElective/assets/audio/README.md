# 白露特别篇声音素材

voice/manifest.json 对应特别篇的 22 句繁体中文关键对白，编号与剧情节点保持一致。对白文本为本项目原创。语音使用 PrimeTTS v2.1 的 Xinran 台湾国语预设离线合成，以分句、停顿与语速调整表达。白露、清歌和知微使用同一女性合成预设的不同语速处理。这些预录文件为合成配音。

三首场景配乐为本项目原创编曲及代码合成，制作时使用自定义琴音、拨弦、柔和铺底和短空间反射。源码在 music/compose.py。文件为 44.1 kHz 双声道 MP3，128 kbps，分别约 80、69、74 秒。编码保留延迟与尾部补偿，制作时解码校验了帧数和循环接缝。音乐与语音分别按剧情需要加载。

| 场景编号 | 音乐与用途 |
| --- | --- |
| bailu-zero-night | 夜信与回忆，轻触琴音、低音与留白 |
| bailu-zero-mystery | 图书馆和终端查证，稀疏钟琴与拨弦应答 |
| bailu-zero-warm | 换装、观星和新的观测纪录，暖色钢琴和柔和拨弦 |

语音、音乐和音效由白鹭原生混音器的独立声道播放。对白播放时自动降低配乐，对白结束或被跳过后恢复。声音面板中的音量和静音设置会保存在当前浏览器。

## 制作来源

- 语音模型使用 [PrimeTTS v2.1](https://huggingface.co/Luigi/PrimeTTS/tree/main/v21_mbistft_16k)。其模型页声明 Apache-2.0，并列出 Xinran 为台湾国语女性合成预设。
- 既有本机制作套件取自 [PrismVoice-TW f2ce751](https://huggingface.co/PrismLive/PrismVoice-TW/tree/f2ce751a6bd50794c7df4c29d3a49cec4b781b9c)。模型与词典只在制作时使用。
- 注音词典源自 [McBopomofo](https://github.com/openvanilla/McBopomofo)，MIT 许可，版权声明保存在 voice/LICENSE-McBopomofo.txt。
- 模型 SHA-256 为 0cf64ad010a9b92201222533900ece31562a0181e7a8e435e5de83b3d72b4bdf。词典 SHA-256 为 0b70bde59e385b0387d733fdc095424962171eb6c24ec3197f038a3eda077a6d。
- 制作环境使用 Python、NumPy、ONNX Runtime 和 LAME。音乐生成不使用外部录音、乐曲或采样素材。模型文件、Python 依赖和 WAV 制作母带保留在制作环境。

## Audio production

The 22 key lines are original dialogue synthesized offline using the Taiwanese Mandarin Xinran preset from PrimeTTS v2.1. Clause timing and speaking rate shape the delivery. All three women use this female synthetic preset with delivery variations. The three original scene scores are composed and synthesized in code, with the reproducible score in music/compose.py. The Egret mixer plays music, voice and effects on independent buses and lowers music during dialogue.

PrimeTTS declares Apache-2.0. The authoring lexicon is derived from MIT-licensed McBopomofo. The game distributes the rendered MP3 clips and original composition source.

# 台湾国语女声 · Taiwanese Mandarin voice

这 67 段 MP3 是为《武林天下》原创文本离线生成的 AI 配音。包含序章三幕、九段战报或操作提示，以及 55 种交战武学的报招。`arts.json` 列出报招编号，对应 `art-<编号>.mp3`。

These 67 MP3 clips were synthesized offline from original Wulin text. They cover the three prologue scenes, nine announcements or prompts, and the 55 combat arts listed in `arts.json`.

- 声音 · Voice: **Xinran** (`sid=0`), [PrimeTTS v2.1](https://huggingface.co/Luigi/PrimeTTS), a Taiwanese Mandarin voice. The model author identifies its training voices as synthesized presets and publishes the model under Apache-2.0.
- 制作输入 · Production inputs: [PrismVoice-TW `f2ce751`](https://huggingface.co/PrismLive/PrismVoice-TW/tree/f2ce751) supplies the unchanged PrimeTTS ONNX model and a lexicon derived from [McBopomofo](https://github.com/openvanilla/McBopomofo) (MIT). The model and lexicon are used at authoring time. Players receive the audio clips.
- 音频规格 · Audio format: mono MP3, 16 kHz, 64 kbps. The build used ONNX Runtime 1.31.1, OpenCC 0.1.7 to convert dialogue to traditional characters, and LAME 1.8.5 bindings to encode the rendered audio. The production inputs' SHA-256 digests are recorded below.

| File | SHA-256 |
| --- | --- |
| `primetts_v21_3voice.onnx` | `0cf64ad010a9b92201222533900ece31562a0181e7a8e435e5de83b3d72b4bdf` |
| `lexicon.json` | `0b70bde59e385b0387d733fdc095424962171eb6c24ec3197f038a3eda077a6d` |
| PrimeTTS `scripts/symbol_table.json` | `af0eb8f165f8478d2d171d763dda6facb6fad29705bade75c2c91a604ca153e6` |

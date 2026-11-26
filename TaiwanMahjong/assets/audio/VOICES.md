# 島夜雀室 · 牌友語音

原創牌桌台詞使用 [PrimeTTS v2.1](https://huggingface.co/Luigi/PrimeTTS) 離線合成。小美使用 Xinran、阿德使用 Anchen、老陳使用 Bowen。這三種是台灣國語合成音色。

The 21 original lines are rendered offline with the Taiwanese Mandarin presets Xinran (Mei), Anchen (Ah-De) and Bowen (Old Chen). They cover five game calls, an opening line and a late-hand remark for each opponent.

The Apache-2.0 model and MIT McBopomofo-derived pronunciation lexicon were obtained from [PrismVoice-TW](https://huggingface.co/PrismLive/PrismVoice-TW/tree/f2ce751a6bd50794c7df4c29d3a49cec4b781b9c). They are used only to author the clips. The runtime loads one JSON bundle of 16 kHz mono MP3s and needs no voice package or external service.

The build tool is `tools/compose-voices.py`. Give it a directory containing the model, `lexicon.json` and the PrimeTTS v2.1 `symbol_table.json`, and run it using Python with NumPy, ONNX Runtime and LAME.

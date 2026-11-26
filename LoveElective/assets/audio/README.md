# 《心动选修课》剧情与日常声音素材

voice/manifest.json 收录 37 句繁体中文关键对白，其中白露特别篇 22 句，林夏泳池夜练、唐蜜睡衣小聚和白露泡汤后公共休息室各 5 句。角色、台词和剧情编号保持一致。

配音先为五位角色分别设计了原创合成声线，再以各自的试音固定声线，重新制作全部对白。按台湾国语日常对话安排重音、气口和停顿。

| 角色 | 声音与表演 |
| --- | --- |
| 林夏 | 明亮爽快，邀约轻扬，说到安全和承诺时落得稳 |
| 唐蜜 | 轻亮带笑，调侃后留半拍，认真说话时收住笑意 |
| 白露 | 柔和偏低，犹豫、释然和道谢各有节奏 |
| 沈清歌 | 平稳清楚，答应帮忙与说明界线时轻重分明 |
| 叶知微 | 节拍利落，推理先说重点，笑意藏在末句 |

四首场景配乐为本项目原创编曲及代码合成，制作时使用自定义琴音、拨弦、柔和铺底和短空间反射。源码在 music/compose.py。文件为 44.1 kHz 双声道 MP3，128 kbps，分别约 80、69、74、83 秒。编码保留延迟与尾部补偿，制作时解码校验了帧数和循环接缝。音乐与语音分别按剧情需要加载。

| 场景编号 | 音乐与用途 |
| --- | --- |
| bailu-zero-night | 夜信与回忆，轻触琴音、低音与留白 |
| bailu-zero-mystery | 图书馆和终端查证，稀疏钟琴与拨弦应答 |
| bailu-zero-warm | 换装、观星和新的观测纪录，暖色钢琴和柔和拨弦 |
| campus-social-day | 日常校园与公共休息室小聚，轻快钢琴、拨弦和柔和刷奏 |

语音、音乐和音效由白鹭原生混音器的独立声道播放。配乐在对白开始时以 8 毫秒压低，待语音结束 120 毫秒后再用 360 毫秒恢复。下一句或重听会取消正在等待的恢复。声音面板中的音量和静音设置会保存在当前浏览器。

常规校园默认播放 campus-social-day。网络未能提供该文件时，原有短合成曲继续作为备用。已经解码的音乐保留当前曲目与淡入曲目，旧曲退出后释放，避免多场景游玩时积累长音轨。

## 制作来源

- 原创试音使用 [Qwen3-TTS 1.7B VoiceDesign](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign)，并以 [Qwen3-TTS 0.6B Base](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base) 复用各角色的合成参考音色。两者模型页均声明 Apache-2.0。
- 制作时使用本机 Python、PyTorch 与 FFmpeg。对白成品为 24 kHz 单声道 MP3。游戏发布包含 MP3，不需要在玩家设备安装语音模型。

## Audio production

The 37 key lines include 22 for the White Dew episode and 15 for three optional campus social scenes. Five original synthetic voice profiles were designed with Taiwanese Mandarin delivery in mind and reused for the corresponding characters. Timing, emphasis and dynamics follow the dialogue. Qwen3-TTS VoiceDesign and Base are used for local audio production, and both model cards declare Apache-2.0. The game distributes 24 kHz mono MP3 dialogue, four original scene scores and the music composition source.

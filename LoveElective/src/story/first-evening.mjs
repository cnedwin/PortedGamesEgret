const n = (zh, en) => ['n', zh, en];
const me = (zh, en) => ['me', zh, en];
const linxia = (expression, zh, en) => ['linxia', expression, zh, en];

// The checkpoint remembers the choice. No reward or time effect lives in this
// short scene; the simulation awards completion once after the story finishes.
export const FIRST_EVENING_SCRIPT = [
  ['music', 'bailu-zero-warm'],
  ['bg', 'gate'],
  ['in', 'linxia', 'smile'],
  // Marker: first-evening-lanterns
  n('櫻花道的路燈亮了。林夏把手機的碼錶朝你晃了晃，沒有急著起跑。', 'The lights come on along the cherry-tree walk. Lin Xia shows you the stopwatch on her phone, in no hurry to start.'),
  linxia('smile', '我想跑一小段，風剛好。你願意幫我看一下時間嗎？不用替我喊快。', 'It is a lovely breeze for a short run. Would you time me? You do not have to tell me to go faster.'),
  me('好。今天想怎麼跑？', 'Sure. What kind of run are we doing?'),
  linxia('normal', '能邊跑邊說完一句話的速度。今天不跟秒數比賽。', 'Slow enough to finish a sentence while running. I am not racing the clock tonight.'),
  ['pick', [
    {
      t: ['我在這棵樹下等，幫你按開始和停止。', 'I will wait by this tree and start and stop the timer.'],
      then: [
        me('我在這裡等你。等你準備好，再說開始。', 'I will be right here. Say when you are ready.'),
        n('她跑過一小段路，又笑著回到同一盞燈下。你按停碼錶，先等她把呼吸放穩。', 'She runs a short stretch and returns to the same pool of light with a smile. You stop the timer and give her a moment to catch her breath.'),
        linxia('smile', '你真的沒催我。有人幫忙守著起點，原來可以這麼輕鬆。', 'You really did not rush me. Having someone waiting here takes the pressure off.'),
      ],
    },
    {
      t: ['先陪你走一小段，再回來計時。', 'Let us warm up with a short walk before I time you.'],
      then: [
        me('先走一小段。等你想跑，我再回來看時間。', 'Let us walk a little first. When you feel like running, I will head back here and time you.'),
        n('你們沿著櫻花道走過幾盞燈。她活動開腳踝，才請你留在原處按下碼錶，輕快地跑出去又回來。', 'You pass a few lamps together while she loosens her ankles. Then she asks you to stay by the timer and sets off for an easy run, returning a little later.'),
        linxia('smile', '剛剛那段慢走也算練習。下次我又想跑太急，記得把我喊回來。', 'That slow walk counts as practice too. Next time I am in too much of a hurry, remind me to ease off.'),
      ],
    },
  ]],
  linxia('normal', '對了，叫我林夏就好。計時員今天不用交成績單。', 'By the way, just call me Lin Xia. No report card required from the timekeeper tonight.'),
  me('下次還需要計時員嗎？', 'Will you need a timekeeper next time?'),
  linxia('smile', '需要啊。不過，也可以只是一起走走。', 'Of course. Though we could just take a walk together.'),
  n('她收好碼錶。今晚沒刷新紀錄，也留下了一個能再開口的話題。', 'She puts the stopwatch away. No records needed breaking tonight, and now you have something to talk about next time.'),
];

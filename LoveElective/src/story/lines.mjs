// Short reactions used outside the story chapters: everyday chats (by how the
// hero's approach landed), presents (by her taste) and dates.
// Each line is [expression, 中文, English].
export const CHAT_LINES = {
  qingge: {
    sweet: [
      [
        'smile',
        '“你上次说的那本书，我读完了。……结尾比我想的要好。”',
        '"That book you mentioned. I finished it. ...The ending was better than I expected."',
      ],
      ['shy', '“我在整理档案。你要是没事，可以坐那边。”', '"I\'m sorting archives. If you\'re free, you may sit over there."'],
    ],
    near: [
      ['normal', '“课业跟得上吗？有不懂的可以来问。”', '"Keeping up with classes? You may ask if you get stuck."'],
      ['normal', '“今天的会议很长。不过，不算糟。”', '"Today\'s meeting was long. Not dreadful, though."'],
    ],
    forward: [['angry', '“……距离。请保持学生会规定的社交距离。”', '"...Distance. Please observe council-approved personal space."']],
    distant: [['sad', '“最近很忙吗。……没什么，随口一问。”', '"Busy lately? ...Never mind. Idle question."']],
  },
  linxia: {
    sweet: [
      ['joy', '“来得正好！陪我拉伸，顺便听我讲今天的破纪录！”', '"Perfect timing! Help me stretch and hear about today\'s record!"'],
      ['shy', '“你今天这身……还挺精神的嘛。”', '"That outfit today... you look pretty sharp."'],
    ],
    near: [
      ['smile', '“吃了吗？运动前不能空腹哦！”', '"Eaten yet? Never train on an empty stomach!"'],
      ['smile', '“下次一起晨跑吧，六点，不许赖床。”', '"Morning run next time. Six sharp. No sleeping in."'],
    ],
    forward: [['surprise', '“等、等一下，太近了啦！我刚跑完一身汗！”', '"W-wait, too close! I just ran, I\'m all sweaty!"']],
    distant: [['sad', '“……你最近是不是在躲我？我说错什么了吗？”', '"...Are you avoiding me lately? Did I say something wrong?"']],
  },
  wanqing: {
    sweet: [
      ['smile', '“今天的光很好。我想把它留下来……也想让你看看。”', '"The light is lovely today. I want to keep it... and show it to you."'],
      ['shy', '“你来了。我、我正好画到需要有人说说话的地方。”', '"You came. I-I\'d just reached the part where I need someone to talk to."'],
    ],
    near: [
      ['normal', '“要喝花茶吗？美术社常备着。”', '"Would you like some flower tea? The club always keeps some."'],
      ['smile', '“颜料的味道，习惯了吗？”', '"Used to the smell of paint yet?"'],
    ],
    forward: [['shy', '“那、那个……太突然的话，我的手会抖，线会歪的。”', '"U-um... if you\'re that sudden my hand shakes and the lines go crooked."']],
    distant: [['sad', '“……最近的画，颜色有点冷。大概是我的心情吧。”', '"...My colours have been cold lately. Probably my mood."']],
  },
  xinglan: {
    sweet: [
      ['tease', '“来了也不出声。……还行，比那些咋咋呼呼的强。”', '"Shows up, says nothing. ...Not bad. Beats the noisy ones."'],
      ['normal', '“这段和声，你听。只放一遍。”', '"This harmony. Listen. I\'m playing it once."'],
    ],
    near: [
      ['normal', '“嗯。坐。别碰效果器。”', '"Mm. Sit. Don\'t touch the pedals."'],
      ['normal', '“今天嗓子状态一般。少说话。”', '"Voice isn\'t great today. Less talking."'],
    ],
    forward: [['angry', '“太黏了。退后三步，我要练琴。”', '"Too clingy. Three steps back. I\'m practising."']],
    distant: [['tease', '“哟，稀客。还以为你迷路了。”', '"Well, a rare guest. Thought you\'d got lost."']],
  },
  zhiwei: {
    sweet: [
      ['shy', '“你来得正好——不是我在等你！是这个算法缺个听众。”', '"Good timing— not that I was waiting! This algorithm needs an audience."'],
      ['joy', '“看！跑通了！快夸我……我是说，快看输出。”', '"Look! It runs! Praise m— I mean, look at the output."'],
    ],
    near: [
      ['normal', '“别站我后面，我写代码的时候后背有感应。”', '"Don\'t stand behind me. My back can tell when I\'m coding."'],
      ['normal', '“奶茶放左边。右边是鼠标的领地。”', '"Bubble tea on the left. The right belongs to the mouse."'],
    ],
    forward: [['angry', '“近、近到看得见我屏幕了！隐私！”', '"T-too close, you can see my screen! Privacy!"']],
    distant: [['angry', '“哼，三天没来。谁、谁数了，日志里自己写着的。”', '"Hmph. Three days. N-nobody counted. It\'s in the logs."']],
  },
  tangmi: {
    sweet: [
      ['tease', '“学弟今天的眼神很有进攻性呢～我接招了哦。”', '"Such a bold look today, junior~ challenge accepted."'],
      ['joy', '“来来来，新口味！张嘴——啊～”', '"Come, come, a new flavour! Open up— aah~"'],
    ],
    near: [
      ['smile', '“欢迎光临～老位置给你留着呢。”', '"Welcome~ your usual seat is waiting."'],
      ['smile', '“今天想喝甜一点，还是苦一点？”', '"Feeling sweet today, or bitter?"'],
    ],
    forward: [['surprise', '“哎呀哎呀，太着急可不行～慢慢来才有意思嘛。”', '"My, my. So hasty~ slow is where the fun is."']],
    distant: [['sad', '“这么冷淡……是我逗得太过分了吗？”', '"So distant... did I tease you too much?"']],
  },
  bailu: {
    sweet: [
      ['smile', '“……今晚的云会在九点散开。我想，你会想知道。”', '"...The clouds will clear at nine tonight. I thought you would want to know."'],
      ['shy', '“你的脚步声。我已经能听出来了。”', '"Your footsteps. I can tell them apart now."'],
    ],
    near: [
      ['normal', '“……坐。风有点大。”', '"...Sit. It\'s windy."'],
      ['normal', '“今天看得见木星。”', '"Jupiter is visible today."'],
    ],
    forward: [['surprise', '“……太亮了。靠得太近，会看不见星星。”', '"...Too bright. Come too close and the stars disappear."']],
    distant: [['sad', '“……最近的夜晚，有点长。”', '"...The nights have felt long lately."']],
  },
};

export const GIFT_LINES = {
  qingge: {
    love: ['shy', '“……这个，我很喜欢。谢谢你记得。”', '"...I like this very much. Thank you for remembering."'],
    like: ['smile', '“很实用。我会好好用的。”', '"Practical. I shall put it to good use."'],
    fine: ['normal', '“谢谢。心意我收下了。”', '"Thank you. I accept the thought."'],
    hate: ['angry', '“……你觉得我会用这个吗。”', '"...Do you imagine I would use this?"'],
  },
  linxia: {
    love: ['joy', '“哇——！你怎么知道我想要这个！爱死你了！……啊，口误！”', '"Whoa! How did you know I wanted this? I love y— slip of the tongue!"'],
    like: ['smile', '“嘿嘿，谢啦！够意思！”', '"Hee hee, thanks! You\'re a pal!"'],
    fine: ['normal', '“给我的？谢谢你呀！”', '"For me? Thanks!"'],
    hate: ['sad', '“呃……谢、谢谢？这个我不太会用……”', '"Er... th-thanks? I don\'t really know what to do with this..."'],
  },
  wanqing: {
    love: ['shy', '“好漂亮……我舍不得用，可以先摆在窗台上吗？”', '"It\'s lovely... I can\'t bear to use it. May I keep it on the windowsill first?"'],
    like: ['smile', '“谢谢你。看到它，我就会想起今天。”', '"Thank you. When I look at it, I\'ll remember today."'],
    fine: ['smile', '“你有心了，谢谢。”', '"That\'s thoughtful of you. Thank you."'],
    hate: ['sad', '“啊……谢谢。我会、会试着用用看的。”', '"Oh... thank you. I\'ll, um, try to use it."'],
  },
  xinglan: {
    love: ['surprise', '“……你从哪搞到的。行，算你有品位。”', '"...Where did you dig this up. Fine. You\'ve got taste."'],
    like: ['tease', '“还行。放那儿吧。”', '"Not bad. Leave it there."'],
    fine: ['normal', '“嗯。谢了。”', '"Mm. Thanks."'],
    hate: ['angry', '“……你看我像会要这个的人？”', '"...Do I look like someone who wants this?"'],
  },
  zhiwei: {
    love: [
      'shy',
      '“这、这个是限定款……！才不是特别开心，只是手感确实不错。”',
      '"Th-this is the limited run...! I\'m not especially happy. It just feels nice, that\'s all."',
    ],
    like: ['smile', '“哼，眼光勉强及格。”', '"Hmph. Your taste scrapes a pass."'],
    fine: ['normal', '“放桌上吧。……谢谢。”', '"Put it on the desk. ...Thanks."'],
    hate: ['angry', '“这个对写代码有什么帮助？你说说看。”', '"And how does this help me write code? Do explain."'],
  },
  tangmi: {
    love: ['joy', '“呀——！学弟好懂我！奖励你一个飞吻～啾。”', '"Eee! You get me, junior! Have a blown kiss~ mwah."'],
    like: ['smile', '“好可爱！我会好好珍惜的哦～”', '"So cute! I\'ll treasure it~"'],
    fine: ['smile', '“谢谢学弟～下次请你喝咖啡。”', '"Thanks, junior~ coffee\'s on me next time."'],
    hate: ['normal', '“嗯……心意满分，选品零分哦？”', '"Hmm... full marks for the thought, zero for the choice?"'],
  },
  bailu: {
    love: ['shy', '“……很暖。像把一小块夜空装进了手里。”', '"...It\'s warm. Like holding a small piece of the night sky."'],
    like: ['smile', '“……谢谢。我会带到天台去。”', '"...Thank you. I\'ll take it up to the roof."'],
    fine: ['normal', '“……谢谢。”', '"...Thank you."'],
    hate: ['sad', '“……这个，太吵了。”', '"...This is too loud."'],
  },
};

/** One line she says on a date, by how the evening went ('sweet' zone or not). */
export const DATE_LINES = {
  qingge: {
    good: ['shy', '“……今天没有看一次手表。这对我来说很少见。”', '"...I didn\'t check my watch once today. That is rare for me."'],
    ok: ['normal', '“偶尔这样，也不坏。”', '"Once in a while, this isn\'t bad."'],
  },
  linxia: {
    good: ['joy', '“今天超——开心！下次去更远的地方吧！”', '"Today was SO much fun! Let\'s go further next time!"'],
    ok: ['smile', '“走了好多路，正好当训练！”', '"So much walking. Counts as training!"'],
  },
  wanqing: {
    good: ['shy', '“今天的你，我想一笔一笔都记下来。”', '"I want to remember today\'s you, stroke by stroke."'],
    ok: ['smile', '“谢谢你陪我。很放松。”', '"Thank you for coming with me. It was restful."'],
  },
  xinglan: { good: ['shy', '“……不赖。下次，也可以。”', '"...Not bad. Next time is... fine too."'], ok: ['normal', '“嗯。还行。”', '"Mm. Okay."'] },
  zhiwei: {
    good: ['shy', '“才不是约会！是……线下联调。成功的那种。”', '"It\'s not a date! It\'s... an offline integration test. A successful one."'],
    ok: ['normal', '“偶尔离开屏幕，对视力有好处。”', '"Leaving the screen occasionally is good for the eyes."'],
  },
  tangmi: {
    good: ['shy', '“……糟糕。今天好像是我被逗到了。”', '"...Uh-oh. I think I was the one who got flustered today."'],
    ok: ['smile', '“今天也辛苦学弟陪我啦～”', '"Thanks for keeping me company again, junior~"'],
  },
  bailu: {
    good: ['smile', '“……今天，地上也有很好看的东西。”', '"...Today there were beautiful things on the ground, too."'],
    ok: ['normal', '“……人有点多。但还好。”', '"...Rather crowded. But all right."'],
  },
};

/** What a senior who caught the hero on a date with someone else says. */
export const JEALOUS_LINES = {
  qingge: ['sad', '“……原来如此。打扰了。”', '"...I see. Pardon the intrusion."'],
  linxia: ['sad', '“啊……你们要出去啊。嗯，玩得开心！”', '"Oh... you two are going out. Right. Have fun!"'],
  wanqing: ['sad', '“……”（她低下头，铅笔断了。）', '"..." (She lowers her head. Her pencil snaps.)'],
  xinglan: ['angry', '“呵。随便你。”', '"Heh. Suit yourself."'],
  zhiwei: ['angry', '“……笨蛋。大笨蛋。”', '"...Idiot. Enormous idiot."'],
  tangmi: ['tease', '“哎呀～学弟真受欢迎呢。”（她的笑没有到眼睛。）', '"My~ how popular you are, junior." (Her smile stops short of her eyes.)'],
  bailu: ['sad', '“……今晚的云，好像不会散了。”', '"...I don\'t think the clouds will clear tonight."'],
};

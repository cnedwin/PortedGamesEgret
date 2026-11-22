import{SOCIAL_SCENES}from'../data/social-stories.mjs';
const n=(zh,en)=>['n',zh,en],me=(zh,en)=>['me',zh,en],say=(who,expr,zh,en)=>[who,expr,zh,en];
const voice=(prefix,no,who,expr,zh,en)=>[['voice',`social-${prefix}-${String(no).padStart(2,'0')}`],say(who,expr,zh,en)];
const pick=(id,key,value,zh,en,then=[])=>({t:[zh,en],fx:{social:{id,key,value}},then});

export function socialScript(s,id,stage){
 const d=SOCIAL_SCENES[id],who=d.lead;
 const prefix=[['music',d.music],['bg',d.scene,id==='pajama'?'dusk':'night'],['in',who,'smile']];
 if(stage===2)return socialFollowupScript(s,id);
 if(stage===0)return[...prefix,
  n(...opening[id]),
  ...(id==='pool'?voice('pool',1,who,'smile','晚上的泳池人比較少。你想一起來練習嗎？','The pool is quieter in the evening. Would you like to practise together?'):id==='pajama'?voice('pajama',1,who,'tease','今天是公共休息室的睡衣小聚。要不要替你留一杯熱可可？','There is a pyjama gathering in the public lounge today. Shall I save you a hot cocoa?'):voice('lounge',1,who,'normal','泡湯之後，這裡的公共休息室可以坐到九點。','After the baths, this public lounge stays open until nine.')),
  say(who,'normal',...wardrobeLine[id]),
  ['pick',[
   pick(id,'outfit','borrow','試穿免費借用的活動服裝，再調整搭配與染色。','Try the free borrowed outfit, then adjust the pieces and dyes.'),
   pick(id,'outfit','own','先保留自己的造型，在衣櫥裡慢慢挑。','Keep our current looks and browse the wardrobe at our own pace.'),
  ]],
  ...(id==='pajama'?[say(who,'tease','衣櫥裡還有一雙過膝襪。你說，它配這套像要去睡覺，還是要去拍封面？','There are over-knee socks in the wardrobe. With this outfit, am I headed to bed or to a cover shoot?')]:[]),
  ['wardrobe',who,{tab:d.leadTab}],['wardrobe','hero',{tab:d.heroTab}],['social-outfit-note',id],
  say(who,'smile',...seeYou[id]),
  n('雙方實際穿搭與染色已保存。準備好後，從地圖或手機繼續這段邀約。','Both actual outfits and dyes are saved. Continue the invitation from the map or phone when ready.'),
 ];
 const outfit=s.socialStories[id].outfit;
 if(id==='pool')return[...prefix,
  n('林夏先把走道上的水擦乾，指了指岸邊的椅子。今晚沒有社團測驗，也沒有非贏不可的比賽。','Lin Xia dries a patch of walkway and points to the poolside chairs. There is no club test tonight, and nothing you have to win.'),
  ...(outfit?.hero.wear.top?.id==='swim-rashguard'?[say(who,'tease','你那件拼色上衣很顯眼。待會兒我抬頭找計時的人，應該不會認錯。','That two-tone top stands out. When I look up for my timekeeper, I will know exactly where to look.')]:[]),
  ...voice('pool',2,who,'normal','不用比快。你說停，我們就停。','No racing. When you say stop, we stop.'),
  ...voice('pool',3,who,'smile','你要我靠近一點教，還是先在旁邊示範？','Would you like me to teach closer, or demonstrate from beside you first?'),
  ['pick',[
   pick(id,'approach','closer','我想靠近學，但請先告訴我會怎麼扶。','I would like closer guidance; tell me how you would help first.',[
    ...voice('pool',4,who,'normal','好，那我先問一聲。可以扶一下你的手臂嗎？','Then let me ask first. May I support your arm?'),
    me('可以，只扶手臂。其他動作先跟我說。','Yes, just my arm. Please ask before anything else.'),
    n('她等你點頭才伸手，鬆開時也先提醒了一聲。你們練的是岸邊的姿勢，不會在沒有準備好的時候把誰拉下水。','She waits for your nod before reaching out and tells you before letting go. You practise the stance at the poolside; nobody is pulled into the water unprepared.'),
   ]),
   pick(id,'approach','respond','我其實有點緊張，想先聽你的經驗。','I am a little nervous. Tell me about your experience first.',[
    say(who,'smile','我第一次也一直抓著岸邊。厲害不是不會怕，是可以把害怕說出來。','I held onto the edge the first time too. Being good does not mean never being afraid; it means being able to say so.'),
    me('那今天先練一個小動作就好。','Then let us practise one small thing today.'),
   ]),
   pick(id,'approach','space','我想先在岸邊幫你計時，不急著下水。','I would like to time you from the poolside first, without rushing into the water.',[
    say(who,'joy','好啊！有人認真幫我按錶，也很重要。你不用下水，才算有參加。','Yes! Having someone who times carefully matters too. You do not have to get in the water to take part.'),
    n('她游完就回到你留的椅子旁，聽你把每一趟的時間念完。這一次，陪伴不是追著她的速度跑。','She returns to your chair after swimming and listens to every lap time. Company does not have to mean matching her speed.'),
   ]),
  ]],
  ...voice('pool',5,who,'smile','以後叫我林夏就好。下次的起跳練習，記得算我一個。','Call me Lin Xia from now on. Count me in for the next starting practice.'),
  ...response(id,who,'下一次練習','the next practice'),
  n('臨走前，你發現計時紙上多了一筆。她在最快的那趟旁邊畫了個小圈，寫著「你按的」。','Before you leave, you spot a new mark on the timing sheet. She circled her fastest lap and wrote “You timed this one.”'),
 ];
 if(id==='pajama')return[...prefix,
  n('公共休息室的長桌擺著熱可可和小點心。唐蜜沒有工作圍裙，笑容也不用一直維持在同一個角度。','Hot cocoa and snacks cover the shared lounge table. Without a work apron, Tang Mi does not have to keep the same smile all evening.'),
  ...(outfit?.lead.wear.legs?.id==='overknee-stockings'?[say(who,'tease','這雙襪子還真的配得上。下次店裡拍冬季菜單，你要不要來替我挑顏色？','The socks really do go with it. Will you come help me pick the colours when we shoot the café’s winter menu?')]:outfit?.lead.wear.top?.id==='pajama-top'?[say(who,'smile','你替我挑的睡衣，燈一關只剩滾邊還亮著。等會兒找我，用這個當暗號。','When the lights go down, all you will see on the pyjamas is the piping. Use that to find me later.')]:[]),
  ...voice('pajama',2,who,'tease','我想穿得舒服一點，不代表什麼都可以喔。','Wanting to dress comfortably does not mean anything goes.'),
  ...(s.flags.tangmi_mask?[say(who,'smile','你以前說過，沒有客人的時候可以不用笑。今天我想把那句話當真。','You once told me I did not have to smile without customers around. Tonight I want to take you at your word.')]:[say(who,'normal','今天不當店員，也不當誰的開心果。我們各自說真話，好嗎？','Tonight I am not a barista or anyone’s entertainer. Can we both be honest?')]),
  ...voice('pajama',3,who,'smile','你想聊聊，還是一起安靜吃點心？','Would you like to talk, or quietly share some snacks?'),
  ['pick',[
   pick(id,'approach','closer','我想坐你旁邊，可以嗎？不想的時候直接告訴我。','May I sit beside you? Tell me directly if you do not want that.',[
    ...voice('pajama',4,who,'smile','你願意先問我，我就不用一直猜你的意思。','When you ask first, I do not have to keep guessing what you mean.'),
    say(who,'tease','可以。杯子放中間就好，拍照要另外問。','Yes. We can put the cups between us. Ask separately before taking pictures.'),
    me('好，今天先把這杯喝完。','All right. Let us enjoy this cup first.'),
   ]),
   pick(id,'approach','respond','我想說真話：今天比較想喝不太甜的。','Honestly, I would prefer something less sweet today.',[
    say(who,'joy','終於有人不是為了哄我才點最甜的。等一下，我也想試試你的版本。','Finally, someone who does not order the sweetest thing just to flatter me. Wait, I want to taste your version too.'),
    me('那我們各留一小杯，交換意見，不用交換整杯。','We can each keep a small cup and trade opinions, without sharing the same cup.'),
   ]),
   pick(id,'approach','space','我先坐對面吃點心，不用一直找話題。','I will sit opposite with a snack. We do not have to keep finding things to say.',[
    say(who,'smile','好。你安靜的時候，我也不用負責把氣氛炒熱。','Good. When you are quiet, I do not have to keep the mood lively either.'),
    n('唐蜜把你喜歡的那盤點心推到你面前，自己也安心地吃了一口。','Tang Mi slides your preferred snacks toward you and comfortably takes a bite of her own.'),
   ]),
  ]],
  ...voice('pajama',5,who,'normal','下次不用點招牌甜。跟我說你今天真正想喝什麼就好。','You do not have to order the signature sweetness next time. Just tell me what you actually want to drink.'),
  ...response(id,who,'下一版可可的試喝','the next cocoa tasting'),
  say(who,'tease','下次紙杯上寫唐蜜就好。寫「學姐」的話，我可能以為又要加班了。','Write Tang Mi on the cup next time. If you write “senior,” I might think I am back on the clock.'),
 ];
 const robe=s.socialStories.lounge.outfit?.lead.wear.outer?.id==='lounge-robe';
 return[...prefix,
  n('浴場的公共休息室亮著暖燈，其他客人的聲音隔著長廊傳來。白露先選了靠窗、兩邊都方便起身的位置。','Warm lamps light the bathhouse’s public lounge, with other guests audible down the corridor. Bai Lu chooses a window seat with room for either of you to stand up.'),
  ...(robe?voice('lounge',2,who,'smile','浴衣穿好了。我們就在這裡喝茶，不用趕著靠近。','Our robes are on. We can drink tea here without hurrying to get closer.'):[say(who,'smile','你穿自己舒服的衣服就好。我們就在公共休息室喝茶。','Wear what is comfortable. We can have tea here in the public lounge.')]),
  ...(s.bailuZero?.stage===5?[say(who,'normal',s.bailuZero.ending==='renew'?'新的觀測紀錄，已經寫到第三頁了。知微昨天又在旁邊加了註解。':'望遠鏡交回去了，但我還是記得，和你一起等夜景亮起來的約定。',s.bailuZero.ending==='renew'?'Our new observation notes are three pages long. Zhiwei added more comments yesterday.':'The telescope is returned, but I still remember our promise to watch the night lights together.')]:[]),
  ...(s.bailuZero?.reading==='wait'?[say(who,'smile','那封舊信，我還沒有急著讀完。謝謝你到現在都沒有催。','I have not hurried to finish that old letter. Thank you for still not rushing me.')]:[]),
  ...voice('lounge',3,who,'normal','如果想坐近一點，先問我就好。','If you would like to sit closer, just ask me first.'),
  ['pick',[
   pick(id,'approach','closer','今天可以坐近一點嗎？我們重新確認一次。','May I sit closer today? Let us check with each other again.',[
    say(who,'shy','今天可以。先到這張椅子就好，其他的事情再慢慢說。','Today, yes. This chair is enough for now. Anything else can wait for another conversation.'),
    n('你等她指好位置才移動椅子。以前的親近，不會自動替今天回答。','You move your chair only after she points to the place. Being close before does not answer for today.'),
   ]),
   pick(id,'approach','respond','我怕安靜會讓你無聊，想聽聽你的感覺。','I worry that silence might bore you. How does it feel for you?',[
    say(who,'smile','我喜歡安靜。你有話可以說，沒有話也不必表演。','I like silence. Speak when you want to, but you do not have to perform when you have nothing to say.'),
    me('那我就不把每一分鐘都填滿了。','Then I will not try to fill every minute.'),
   ]),
   pick(id,'approach','space','我想保留這個距離，一起看看窗外。','I would like to keep this space and look out of the window together.',[
    ...voice('lounge',4,who,'smile','這樣的距離很舒服。謝謝你記得我說過的話。','This distance feels comfortable. Thank you for remembering what I said.'),
    n('她沒有把你的留白當作拒絕。兩杯茶隔著一小段空間，一起慢慢冷下來。','She does not treat your space as rejection. The two cups of tea cool slowly with a little room between them.'),
   ]),
  ]],
  ...voice('lounge',5,who,'smile','下次說好一起來，也可以只喝茶、看看夜景。','If we come together next time, we can simply have tea and enjoy the night view.'),
  ...response(id,who,'下次的公共茶會','the next public tea visit'),
  ['music','bailu-zero-warm'],n('走到門口，她才把忘在窗邊的外套拿回來。你聽見她說：「白露就好。你可以這樣叫我。」','At the door she returns for the coat she left by the window. You hear her say, “Bai Lu is fine. You can call me that.”'),
 ];
}

function response(id,who,zh,en){return[['pick',[
  pick(id,'response','yes',`我願意。把${zh}留給我們。`,`Yes. Let us save ${en} for us.`,[say(who,'smile',...nextVisit[id].yes)]),
  pick(id,'response','later','今天先到這裡，下次見面再一起決定。','Let us stop here today and decide together next time.',[say(who,'normal',...nextVisit[id].later)]),
]]];}

export function socialFollowupScript(s,id){
 const d=SOCIAL_SCENES[id],q=s.socialStories[id],who=d.lead;
 const lines=id==='pool'?{
  closer:['上次你說先告訴你怎麼扶，我記得。今天先示範，再由你決定要不要試。','You asked me to explain how I would help. I remember. Today I will demonstrate first, and you can decide whether to try.'],
  respond:['你上次說會緊張。所以今天先從同一個小動作開始，不加難度。','You said you felt nervous. We can start with the same small move today, without making it harder.'],
  space:['計時的位置還替你留著。這一次我會先問，你想幫忙按錶，還是也試一小段。','Your timing seat is saved. This time I will ask whether you want to time me or try a little yourself.']
 }:id==='pajama'?{
  closer:['旁邊的位置留著。不過今天還是先問一次，你想坐哪裡？','The seat beside me is free. But I will ask again today: where would you like to sit?'],
  respond:['不加糖的那杯做好了。這次我也想試，原來的味道是不是更清楚。','The unsweetened cup is ready. I want to see whether it brings out the original flavour too.'],
  space:['對面的點心盤留給你。我們不用先把話想好，才一起坐下。','The snack plate opposite is for you. We do not have to plan a conversation before sitting down together.']
 }:{
  closer:['上次你重新問了我，今天也一樣。先選座位，再決定想聊什麼。','You asked again last time, and today is the same. We can choose seats before deciding what to talk about.'],
  respond:['你不用擔心安靜。我很喜歡我們不用一直找話題的時候。','You do not have to worry about silence. I like the times when we do not have to keep finding things to say.'],
  space:['靠窗的兩張椅子還在。保留一點距離，也可以是我們認真選的相處方式。','The two window chairs are still here. A little space can be a way of being together that we choose with care.']
 };
 return[
  ['in',who,'smile'],
  say(who,'smile',...(lines[q.approach]??lines.respond)),
  ['pick',[
   pick(id,'followup','accept',`好，今天一起實現「${d.invitation[0]}」。`,`Yes. Let us make “${d.invitation[1]}” happen today.`,[
    ['music',d.music],['bg',d.scene,id==='pajama'?'dusk':'night'],['in',who,'smile'],
    n(id==='pool'?'林夏先完成一趟示範，再回到岸邊問你要不要加入。你們照說好的節奏完成了新的練習。':id==='pajama'?'唐蜜把兩種甜度分成小杯，和你一起記下真正喜歡的比例。這次的試喝有了你們共同選的名字。':'白露替你留了靠窗的位置。你們只點茶、看看夜景，也把這次約定好好完成。',id==='pool'?'Lin Xia demonstrates once and returns to ask whether you want to join. You complete the practice at the pace you agreed on.':id==='pajama'?'Tang Mi serves two small cups and records the proportions you both actually like. This tasting has a name you choose together.':'Bai Lu saves a window seat. You have tea, watch the night view, and fulfil the promise in your own way.'),
    say(who,'smile',...fulfilled[id]),
   ]),
   pick(id,'followup','later','我今天想先處理自己的事，改天再問我。','I would like to take care of my own plans today. Ask me another time.',[say(who,'smile','好。邀請還在，今天不用勉強。','Yes. The invitation can wait. There is no need to force it today.')]),
  ]],
 ];
}

const opening={
 pool:['更衣室外的長椅放著兩條乾毛巾。林夏用秒錶壓住自己的那條，免得被風掀走。','Two dry towels lie on the bench outside the changing rooms. Lin Xia weighs hers down with a stopwatch.'],
 pajama:['唐蜜把圍裙折好，放到沙發另一端。她已經下班，端著一杯還沒嚐過的可可。','Tang Mi folds her apron and puts it at the far end of the sofa. She is off the clock, holding a cocoa she has yet to taste.'],
 lounge:['走廊還留著熱水的氣味。白露已經坐在窗邊，兩杯焙茶上各壓著一張紙杯蓋。','The hall still smells of hot water. Bai Lu is already by the window with paper lids on two cups of roasted tea.'],
};
const wardrobeLine={
 pool:['櫃檯有泳衣可以借。你要留在岸上也可以，剛好少一個人笑我轉身踢歪。','The desk lends out swimwear. Stay on the deck if you like. One fewer person to laugh when I mess up the turn.'],
 pajama:['我拿了兩套睡衣。這件反光成這樣，等一下我打瞌睡，你應該找得到我。','I brought two sets of pyjamas. This one shines enough that you will find me if I fall asleep.'],
 lounge:['架上有可以罩在衣服外面的浴衣。我挑了半天，發現自己一直看著同一件。','There are robes on the rack to wear over your clothes. I spent ages choosing and kept looking at the same one.'],
};
const seeYou={
 pool:['那就說定了。待會兒下水前，我先試試秒錶還準不準。','It is settled. I will check the stopwatch before we get in.'],
 pajama:['我等你再加糖。冷掉了也沒關係，這次可以慢慢喝。','I will wait for you before adding the sugar. It can cool down. We can take our time tonight.'],
 lounge:['等一下還坐窗邊吧。第一杯容易放涼，我替你扣著蓋子。','Let us sit by the window again. The first cup cools fast. I will keep the lid on yours.'],
};
const nextVisit={
 pool:{yes:['好，這一格我先不填秒數。下次再一起寫。','Good. I am leaving this box blank so we can fill it in next time.'],later:['那我先把秒錶拿去換電池。等你哪天想按的時候，它還能用。','I will replace the battery in the stopwatch. It will be ready whenever you feel like using it.']},
 pajama:{yes:['那我留兩個小杯。這次真的不告訴你哪杯是店裡的配方。','I will set aside two small cups. This time I really will not tell you which is the shop recipe.'],later:['好啊。今天的杯底都還有一口呢。','Sure. There is still a sip left in each cup today.']},
 lounge:{yes:['那我把窗邊的位置記下來。下回換我請茶。','I will remember our seats by the window. Tea is on me next time.'],later:['好。我把那張窗邊的照片留著，有空再傳給你。','All right. I will keep the photo from the window and send it sometime.']},
};
const fulfilled={
 pool:['這次比上次快半秒。只有我們兩個知道，有點可惜。','Half a second faster this time. A shame only the two of us know.'],
 pajama:['配方上我寫的是兩個人的名字。客人問起來，我就說今天還沒開賣。','I put both our names on the recipe. If a customer asks, I will say it is not on the menu yet.'],
 lounge:['今天記得先喝了，茶還是熱的。下回也坐這裡吧。','We remembered to drink it this time. It is still warm. Let us sit here next time too.'],
};

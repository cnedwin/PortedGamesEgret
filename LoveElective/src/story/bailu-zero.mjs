const n=(zh,en)=>['n',zh,en];
const me=(zh,en)=>['me',zh,en];
const line=(who,expr,zh,en)=>[who,expr,zh,en];
const v=(id,who,expr,zh,en)=>[['voice',`bailu-zero-${String(id).padStart(2,'0')}`],line(who,expr,zh,en)];
const choice=(zh,en,key,value,then=[])=>({t:[zh,en],fx:{bailuZero:{key,value}},then});

// Authored, non-random appointments. Every intimate action has a local opt-in;
// both staying close and giving space carry a complete romantic callback.
export function bailuZeroScript(stage){
 if(stage===0)return[
  ['music','bailu-zero-night'],['bg','rooftop','night'],['in','bailu','normal'],
  n('白露特別篇 · 第零名社員的回信。你十九歲，白露二十一歲，知微二十歲，清歌二十一歲。這是一段發生在課餘的約定，不會消耗日常時段。','Bai Lu interlude · Letters from Member Zero. You are nineteen; Bai Lu and Qingge are twenty-one, Zhiwei twenty. These appointments take place between regular activities and do not spend daily time slots.'),
  n('天台上的望遠鏡已經蓋好，白露卻沒有要離開的意思。她把手機翻過來，又翻回去。','The telescope is covered, yet Bai Lu stays on the roof, turning her phone over and back.'),
  ...v(1,'bailu','shy','今晚十一點十七分，你可以陪我留一下嗎？','Could you stay with me until eleven seventeen tonight?'),
  ...v(2,'bailu','smile','不是約會。……如果你希望是，也可以。','It is not a date. ...Unless you would like it to be.'),
  me('我留下來。你想說的時候，再告訴我。','I will stay. Tell me when you are ready.'),
  n('23:17。沒有風，鐵門卻輕響了一聲。一封郵件跳上螢幕：明晚，記得留一個位置。','23:17. The door clicks in the still air. A message appears: Tomorrow night, remember to leave a seat.'),
  ...v(3,'bailu','sad','這封信，每晚都會準時寄到。寄件人卻不在社員名冊裡。','The letter arrives at the same time every night. But its sender is not on the club roster.'),
  line('bailu','normal','署名是「第零名社員」。附件是一張舊星圖，拍攝時間卻寫著明天。','It is signed Member Zero. The attached star chart is old, but the observation date says tomorrow.'),
  n('你沒有伸手拿她的手機。白露看了你一會兒，自己把螢幕轉向你。','You do not reach for her phone. After a moment, she turns the screen toward you herself.'),
  ...v(4,'bailu','sad','我知道密碼。只是，還沒有準備好看最後一封。','I know the password. I am just not ready to read the last letter.'),
  line('bailu','normal','先查公開的紀錄，好嗎？如果只是有人惡作劇，我想先知道。','Could we start with the public records? If it is a prank, I would like to know.'),
  me('好。至於最後一封，留給你決定。','Yes. The last letter is your decision.'),
  n('調查紀錄新增：準時寄達的觀測信。下一步：圖書館的社團名冊。','Investigation note: a scheduled observation letter. Next: the library club records.'),
 ];
 if(stage===1)return[
  ['music','bailu-zero-mystery'],['bg','library','day'],['in','qingge','normal'],
  n('清歌已經替你們留了一張桌子。桌上是社團年報和公開借閱登記，不是誰的私人資料。','Qingge has reserved a desk with club annuals and public equipment records, not anyone’s private files.'),
  ...v(5,'qingge','normal','公開的社團紀錄可以借你們。私人的信，請先問過本人。','You may borrow the public club records. Ask the owner before reading private letters.'),
  ['pick',[
   choice('先向白露確認，她希望我們查到哪裡。','Ask Bai Lu how far she wants us to look.','archive','ask',[me('我們只查寄送紀錄和公開名冊。信的內容，等她願意再說。','Only the send log and public roster. The contents can wait until she wants to share.'),line('qingge','smile','這樣很好。關心一個人，也包括知道哪裡該停下。','Good. Caring about someone includes knowing when to stop.')]),
   choice('從公開星圖的日期和設備編號查起。','Start with dates and device numbers on the public charts.','archive','public',[me('先把能公開核對的部分看清楚，不碰私人附件。','We can verify what is public without opening private attachments.'),line('qingge','smile','設備登記在右邊第二冊。需要我幫忙的話，直接說。','Equipment records are in the second volume on the right. Ask if you need help.')]),
  ]],
  n('三年前的名冊列著三個名字；設備表卻多了一列「零號」。它沒有入社日期，只有一串終端編號。','The roster from three years ago lists three people. The equipment list has an extra Zero, with no joining date, only a terminal number.'),
  me('這不是人的編號，是設備帳號。','This is a device account, not a member number.'),
  line('qingge','normal','當時的社長現在已經畢業。她留下過一份「未來觀測計畫」，不過系統遷移後，舊終端就沒有人管了。','The club president has since graduated. She left a future observation plan, but the old terminal was neglected after the system moved.'),
  ['in','bailu','sad'],line('bailu','sad','她畢業前說過，別因為少了一個人，就再也不抬頭看星星。','Before graduating, she told me not to stop looking up just because someone had left.'),
  n('白露把影本仔細摺好。你們約好請知微檢查終端，先不猜，也先不替誰下結論。','Bai Lu carefully folds the copies. You agree to ask Zhiwei about the terminal before drawing conclusions.'),
  line('bailu','smile','下一次要在外面待久一點。今晚，我想自己選一套新的觀星服。你也來吧。','We will be outside longer next time. Tonight I want to choose something new for stargazing. Come with me.'),
  n('調查紀錄新增：零號是共用帳號，不是失蹤社員。下一步：一起挑選夜觀服。','Investigation note: Zero is an account, not a missing member. Next: choose an observation outfit together.'),
 ];
 if(stage===2)return[
  ['music','bailu-zero-warm'],['bg','dorm','dusk'],['in','bailu','smile'],
  n('衣服鋪在課餘借用的公共整理桌上。白露把常穿的裙子和一件針織外套並排放好。','At a shared preparation table, Bai Lu lays her usual skirt beside a knitted cardigan.'),
  ...v(9,'bailu','shy','今晚會冷。你幫我看看，這件外套適不適合觀星？','It will be cold tonight. Could you help me see if this coat suits stargazing?'),
  line('bailu','normal','我比較喜歡文藝一點、安靜一點的顏色。不過不用猜標準答案，我也想看看你的喜好。','I like quiet, artsy colours. But there is no correct answer to guess. I want to see what you like too.'),
  ['pick',[
   choice('先試她選的針織外套和圍巾，再調整搭配。','Try her cardigan and scarf, then make it our own.','outfit','night'),
   choice('保留現在的造型，打開衣櫥一起慢慢挑。','Keep her current look and browse the wardrobe together.','outfit','own'),
  ]],
  ['wardrobe','bailu'],
  ['in','bailu','smile'],['outfit-note'],
  ...v(10,'bailu','shy','顏色很好看。我更在意的，是能不能和你待久一點。','The colours are lovely. What matters more to me is being able to stay with you a little longer.'),
  ...v(11,'bailu','smile','你不用為了我，穿成不喜歡的樣子。','You do not have to dress in a way you dislike for me.'),
  me('那我們都穿得像自己。冷了就回來，不勉強。','Then we can both be ourselves. If it gets cold, we come back.'),
  n('這套實際搭配和染色已經留在白露的衣櫥裡。下一次見面，她會繼續穿著它。','The actual outfit and dyes remain in Bai Lu’s wardrobe. She will keep wearing them next time.'),
 ];
 if(stage===3)return[
  ['music','bailu-zero-mystery'],['bg','lab','dusk'],['in','zhiwei','normal'],
  ...v(6,'zhiwei','normal','先別急著說鬧鬼。讓我看看寄送時間。','Do not call it a haunting yet. Let me check the send times.'),
  n('知微只讀取你們同意分享的寄送記錄。她把那個「明天」的日期，和三年前的星空祭行事曆放在一起。','Zhiwei checks only the logs you agreed to share, comparing tomorrow’s date with the festival calendar from three years ago.'),
  ...v(7,'zhiwei','smile','這是定時寄送的觀測紀錄。零號社員，是共用帳號。','These are scheduled observation records. Member Zero is a shared account.'),
  line('zhiwei','normal','舊行事曆轉成今年時，日期保留了，年份卻被重設。她當年寫的「明天」，現在又變成明天了。','When the calendar was moved to this year, the dates remained but the year reset. Her old tomorrow became tomorrow again.'),
  line('zhiwei','normal','沒有誰在監視你們。終端只是一直很認真地，完成一個早就沒人記得的約定。','Nobody is watching you. The terminal has simply kept a promise that everyone else forgot.'),
  ['music','bailu-zero-night'],['bg','rooftop','night'],['in','bailu','sad'],
  ...v(8,'bailu','sad','原來她留下的，不是叫我一直等下去。','So she did not leave this to make me wait forever.'),
  ['branch','archive:ask',[line('bailu','smile','清歌說，你先問了我想查到哪裡。……那時候，我就比較不害怕了。','Qingge told me you asked how far I wanted to look. ...I felt less afraid after that.')],[line('bailu','smile','謝謝你先把能確認的事查清楚，沒有拿猜測來安慰我。','Thank you for checking what could be verified, rather than comforting me with guesses.')]],
  line('bailu','normal','最後一封信還在。我想由我自己決定，什麼時候打開。','The last letter is still there. I want to decide when to open it.'),
  ['pick',[
   choice('如果你準備好了，我陪你一起讀。','If you are ready, I will read it with you.','reading','read',[...v(15,'bailu','shy','我想讀了。這一次，你可以陪我一起看嗎？','I want to read it now. Will you read it with me this time?'),n('信裡沒有預言，只有畢業學姐留下的一句話：有一天，這張星圖旁邊，會有你自己想寫下的新名字。','There is no prophecy, only a line from the alumna: One day you will have a new name of your own to write beside this chart.')]),
   choice('今晚先不讀。你不用為了調查趕上任何人。','We can leave it tonight. You do not have to hurry for anyone.','reading','wait',[...v(16,'bailu','smile','謝謝你沒有替我決定。今晚先看星星，好嗎？','Thank you for not deciding for me. Could we just watch the stars tonight?'),me('好。信在那裡，你也可以慢慢來。','Yes. The letter will still be there. You can take your time.')]),
  ]],
  n('燈依照知微的程式逐盞熄滅。天台暗下來，你們肩膀之間仍留著一小段距離。','Zhiwei’s program dims the lights one by one. A small space remains between your shoulders.'),
  ...v(12,'bailu','shy','你可以坐近一點。……我是說，如果你也願意。','You may sit a little closer. ...If you would like to.'),
  ['pick',[
   choice('我也願意。可以牽你的手嗎？','I would like to. May I hold your hand?','distance','close',[...v(13,'bailu','shy','那就把手借我一下。冷的時候，我會自己說。','Then lend me your hand for a while. I will tell you if I feel cold.'),n('她先伸出手，你才輕輕握住。沒有人需要把沉默解釋成同意。','She offers her hand first, and you gently take it. Neither of you has to mistake silence for permission.'),['fx','heart']]),
   choice('我想先坐在這裡，陪你慢慢看。','I would like to sit here and take it slowly with you.','distance','space',[...v(14,'bailu','smile','這個距離也很好。你不用靠近，才算陪著我。','This distance is good too. You do not have to move closer to be here with me.'),n('她把毯子放在你伸手就能拿到的位置，沒有把你拉過去。','She sets the blanket within your reach, without pulling you closer.')]),
  ]],
  n('調查紀錄新增：舊終端仍在寄送畢業學姐留下的紀錄。明天，你們要為社團的未來寫下答案。','Investigation note: the terminal is sending the alumna’s archived observations. Next, you will decide what comes after.'),
 ];
 return[
  ['music','bailu-zero-night'],['bg','rooftop','night'],['in','bailu','normal'],
  n('桌上放著一份新的入社申請表，也放著終端的關閉申請。白露沒有把筆交給你替她簽。','A fresh membership form lies beside a request to retire the terminal. Bai Lu keeps the pen in her own hand.'),
  ...v(17,'bailu','smile','我想留下的，也許不是這間社團，而是有人一起抬頭的晚上。','Perhaps what I want to keep is not this club, but having someone to look up with.'),
  ['branch','reading:wait',[line('bailu','normal','最後一封信，我還沒有讀。這次的選擇，不需要等我把所有事情都想明白。','I have not read the last letter yet. I do not need to understand everything before choosing my next step.')],[line('bailu','smile','那封信裡說的新名字，我想了很久。不是拿誰來代替誰，而是把今天也留下來。','I thought about that new name in the letter. It is not about replacing someone, but keeping a place for today too.')]],
  ['pick',[
   choice('一起招募第三位社員，讓社團從今天重新開始。','Find a third member and give the club a new beginning.','ending','renew',[
    ['music','bailu-zero-warm'],['in','zhiwei','smile'],...v(18,'zhiwei','smile','第三個名字，我來寫。先說好，我不是每天都能熬夜。','I will write the third name. Just so you know, I cannot stay up every night.'),
    n('你們寫下新的觀測計畫：每週一次，開放給所有願意抬頭的人。舊終端改成按需開啟，不再每天替誰等待。','You plan one observation a week for anyone who wants to look up. The old terminal will run when needed, no longer waiting for someone every night.'),
    ['in','bailu','smile'],...v(19,'bailu','smile','那就從明天開始，寫我們自己的觀測紀錄。','Then tomorrow we will start writing our own observations.'),
    n('特別篇結尾 · 第三個名字。留下來的，不只是社團。','Interlude ending · The Third Name. More than a club has found a place to stay.'),
   ]),
   choice('陪她為舊社團道別，把觀星留在你們的生活裡。','Say goodbye to the old club and keep stargazing in your lives.','ending','farewell',[
    line('bailu','normal','我想把望遠鏡交回去，讓下一個喜歡星星的人使用。信會留下，回憶也會。','I want to return the telescope so someone else who loves the stars can use it. I will keep the letters and the memories.'),
    n('白露親手按下關閉鍵。你等她放開滑鼠，才把自己的名字寫在下週的公共觀星活動旁。','Bai Lu shuts the terminal down herself. You wait until she releases the mouse, then write your name beside next week’s public stargazing event.'),
    ...v(20,'bailu','sad','關掉終端，不是忘記她。我只是，終於可以往前走了。','Turning it off does not mean forgetting her. It means I can finally move forward.'),['music','bailu-zero-warm'],
    n('特別篇結尾 · 不再等待的星光。離開一個地方，也可以是一起出發。','Interlude ending · Starlight Without Waiting. Leaving a place can mean starting out together.'),
   ]),
  ]],
  ['in','bailu','shy'],
  ['branch','distance:close',[n('她沒有再猜你的意思，而是先問你，要不要牽著手走下樓。你說好，她才伸出手。','She does not guess what you mean. She asks whether you want to hold hands on the stairs; after you say yes, she offers her hand.'),...v(21,'bailu','shy','下次等流星的時候，我想先等到你。','Next time I wait for meteors, I want you to arrive first.')],[n('她在下次活動的椅子旁畫了一顆小星星，替你留出你們都覺得舒服的距離。','She draws a little star beside next time’s seat, leaving the space that feels comfortable for both of you.'),...v(22,'bailu','smile','下次也坐在這裡吧。不用說話，我知道你在。','Sit here next time too. You do not have to speak. I will know you are here.')]],
  ['fx','heart'],n('回信已收好。你們的日常和星空祭，仍然可以繼續。','The letters are safe. Your ordinary days and the Star Festival can still continue.'),
 ];
}

// When the optional story was finished before the main third chapter, carry
// its decision forward. Rewards and chapter number match the original scene.
export function bailuMainChapter(s,chapter){
 if(chapter!==3||s.bailuZero?.stage!==5)return null;
 const renew=s.bailuZero.ending==='renew';
 return[
  ['bg','rooftop'],['in','bailu','normal'],
  n(renew?'原本的註銷通知旁，多了一張已經核准的新社員名冊。知微的名字寫在第三欄。':'原本的註銷通知已經收進檔案夾。桌上的器材歸還單，是白露自己填好的。',renew?'Beside the old dissolution notice is an approved new roster, with Zhiwei’s name in the third row.':'The old dissolution notice is filed away. Bai Lu has filled out the equipment return form herself.'),
  line('bailu','smile',renew?'清歌說，新社團的第一場觀測可以對全校開放。這次，不是為了湊人數。':'清歌幫我預留了公共觀星活動的位置。沒有社團名稱，我們也可以繼續看星星。',renew?'Qingge says our first observation can be open to everyone. This time it is not just to make up the numbers.':'Qingge saved places for us at the public observation. We can keep watching the stars without a club name.'),
  ['pick',[
   {t:renew?['一起準備第一場公開觀測，我來接待新朋友。','Prepare the first open observation together; I will welcome the newcomers.']:['一起歸還器材，下次再去公共觀星活動。','Return the equipment together, then go to the public observation.'],fx:{aff:10,pull:2,flag:'bailu_club'},then:[
    line('bailu','shy',renew?'好。這次的名冊，我想把今天也記在旁邊。':'好。謝謝你把下一次也當成約定。',renew?'Yes. I want to note today beside this new roster too.':'Yes. Thank you for making next time a promise too.'),
   ]},
   {t:['不用趕，我們先把今晚安排好。','No hurry. Let us start by planning tonight.'],fx:{aff:5,pull:8},then:[line('bailu','smile','嗯。不是每一件事，都要一口氣完成。','Mm. We do not have to do everything at once.')]},
  ]],
  ['branch','distance:close',[line('bailu','shy','如果今晚還想牽手，你也可以再問我。','If you would like to hold hands tonight, you can ask me again.')],[line('bailu','smile','你的椅子還是放在旁邊，保留你喜歡的距離。','Your chair is still beside mine, with the space you like.')]],
  n('你們照著自己選的方向走下去。社團的決定已經留下痕跡，星空祭的邀約還在前面。','You keep moving in the direction you chose. The club decision has left its mark, and the Star Festival is still ahead.'),
 ];
}

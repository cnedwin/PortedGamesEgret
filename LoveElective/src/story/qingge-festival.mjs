// These scenes recall Qingge's Chapter 3 choice without adding rewards or
// changing the shared chapter/ending rules. Both epilogues follow either
// existing rooftop ending, so neither assumes that a confession succeeded.
const n = (zh, en) => ['n', zh, en];
const me = (zh, en) => ['me', zh, en];
const qingge = (expression, zh, en) => ['qingge', expression, zh, en];

/** Legacy saves with both choices retain the earlier honest-route meaning. */
export function qinggeFestivalRoute(state) {
  if (state?.flags?.qingge_honest) return 'review';
  if (state?.flags?.qingge_reassure) return 'rehearsal';
  return null;
}

/** Linear scenes inserted before the original Chapter 4 library conversation. */
export function qinggeFestivalPreparation(state) {
  const route = qinggeFestivalRoute(state);
  if (route === 'review') return [
    ['music', 'campus-social-day'],
    ['bg', 'classroom', 'dusk'],
    ['in', 'qingge', 'normal'],
    // Marker: qingge-review-preparation
    n('最後一輪核對時，清歌在教室黑板上寫了兩欄：「核實」與「保留」。', 'For the final review, Qingge writes two headings on the classroom board: Verify and Keep.'),
    n('你帶來的試算表被她改過幾次。舞臺那一欄旁邊，還留著你當時畫的問號。', 'She has revised the worksheet you brought several times. Your question mark is still beside the stage budget.'),
    qingge('normal', '你說舞臺撐不起來。今天先別替我算一個更漂亮的總數，陪我把缺的東西找出來。', 'You said the stage budget would not hold up. Today, do not just make the total look better for me. Help me find what is missing.'),
    me('這份器材報價沒有含配線。輕音社說，他們可以少一排燈，不能唱到一半斷電。', 'This equipment quote does not include the cabling. The band says they can manage with fewer lights, but not a power cut halfway through a song.'),
    qingge('sad', '我把去年的數字直接帶進來了。場地換了，這一欄卻沒重問。', 'I carried last year’s figures over. The venue changed, but I never checked this part again.'),
    me('要不要先把這個改掉，其他的等會上再說？', 'Should we fix this part now and leave the rest for the meeting?'),
    qingge('normal', '要改，也要讓他們知道為什麼。漏算的是我，不該讓社團以為自己又被偷偷刪了什麼。', 'We should fix it, and explain why. I missed the cost. The clubs should not have to wonder what else has quietly been cut.'),
    n('她親自打給器材組，問清楚配電和雨備，再把一面能借用的拍照背板從採購單移開。', 'She calls the equipment team herself, checks the power and rain arrangements, and removes a photo backdrop from the purchase list after finding one they can borrow.'),
    qingge('normal', '配電和完整彩排留著。背板用借的，沒那麼整齊，我在會上說明。這一版由我負責。', 'We keep the power setup and the full rehearsal. We borrow the backdrop. It will not look as neat, and I will explain that at the meeting. This revision is my responsibility.'),
    me('我把不確定的那兩項也圈了。你要用紅筆改嗎？', 'I circled the two items I am still unsure about. Shall I pass you the red pen?'),
    qingge('smile', '紅筆留給錯題。你的意見用這支。', 'Keep the red pen for wrong answers. Use this one for your ideas.'),
    n('她把自己的藍筆推過來，沒有擦掉那個問號，而是在旁邊寫下下一位要一起核實的負責人。', 'She slides her blue pen across the desk. Instead of erasing your question mark, she writes the name of the next person they need to check it with.'),
    me('所以這張表可以交了？', 'So the worksheet is ready to hand in?'),
    qingge('normal', '還有最後一格。', 'There is one box left.'),
    n('她在頁尾寫了「核對的人也要吃晚餐」，把你的名字和自己的名字並排填上。', 'At the bottom she writes, The reviewers need dinner too, and puts your name beside hers.'),
    me('這一項也要會長批准？', 'Does that need the president’s approval too?'),
    qingge('shy', '我已經批了。你只要選想吃什麼。', 'It is already approved. You only have to choose what you want to eat.'),
    n('收好文件後，你們把那支藍筆留在兩份表格中間。她不再把每一個問號都當成對自己的否定。', 'When the papers are packed away, the blue pen rests between your two copies. She no longer treats every question mark as a verdict against her.'),
  ];
  if (route === 'rehearsal') return [
    ['music', 'campus-social-day'],
    ['bg', 'classroom', 'dusk'],
    ['in', 'qingge', 'normal'],
    // Marker: qingge-rehearsal-preparation
    n('最後一次說明會前，清歌把教室排成小講臺，最前排只留了一張空椅子。', 'Before the final briefing, Qingge turns the classroom into a small speaking space and leaves a single empty chair in the front row.'),
    qingge('normal', '今天你當社團代表。先讓我把話說完，再問最難聽的那一句。', 'Today you play the club representative. Let me finish, then ask the hardest question.'),
    me('哪一句最難聽？', 'Which one is the hardest?'),
    qingge('normal', '「憑什麼每次都由學生會決定？」', 'Why does the council get to decide every time?'),
    me('那……憑什麼？', 'Well... why does it?'),
    n('她握著講稿，第一句說到半截就停住。你沒有替她把後半句補完。', 'She grips her notes and stops halfway through her first sentence. You do not finish it for her.'),
    qingge('sad', '我又想先解釋自己沒有做錯。這樣誰都聽不到他們在擔心什麼。', 'I am trying to prove I did nothing wrong again. That way, nobody hears what they are worried about.'),
    me('要不要重來？這次先說，你聽見了什麼。', 'Would you like to start again? This time, tell them what you heard.'),
    qingge('normal', '你們最擔心的是時間臨時更動，排練了那麼久，最後卻連上臺的機會都沒有。', 'You are worried the schedule will change at the last minute, and that after all those rehearsals, you might not get to perform at all.'),
    qingge('normal', '我先把不能再動的時段說清楚。還沒定的安排，讓你們問完，再一起排。', 'I will first explain which times are fixed. For the parts still open, I will hear all your questions before we work out the order together.'),
    n('她放下那份寫滿標準答案的稿紙，重新留出一輪公開提問，也在自己的流程表上劃掉一段過長的開場白。', 'She sets aside the notes full of ready answers, makes room for a round of public questions, and crosses a long introduction out of her own running order.'),
    me('剛剛那段，比開會時更像你。', 'That sounded more like you than the meeting did.'),
    qingge('smile', '現在換你試。', 'Your turn now.'),
    me('我也要上臺？', 'I have to speak too?'),
    qingge('smile', '不用。你坐前排就好。要是我又開始只顧著照稿念，就把那杯茶舉起來。', 'No. Just sit in the front row. If I disappear into my notes again, lift that cup of tea.'),
    me('提醒你喝一口？', 'To remind you to take a sip?'),
    qingge('shy', '提醒我可以停一下。不是每個空白都要立刻填滿。', 'To remind me I can pause. I do not have to fill every silence right away.'),
    n('你們把那張空椅子留在講臺前。這次，她沒有急著把教室恢復成原來整齊的樣子。', 'You leave the empty chair in front of the speaking desk. This time, she does not hurry to put every chair back into its perfect row.'),
  ];
  return [];
}

/** Route callbacks after either original Qingge rooftop ending. */
export function qinggeFestivalEpilogue(state) {
  const route = qinggeFestivalRoute(state);
  if (route === 'review') return [
    ['music', 'bailu-zero-warm'],
    ['bg', 'rooftop', 'night'],
    ['in', 'qingge', 'normal'],
    // Marker: qingge-review-epilogue
    n('星空祭的燈還亮著，清歌口袋裡露出一角藍筆改過的預算表。', 'The festival lights are still on. A corner of the budget sheet revised in blue ink peeks from Qingge’s pocket.'),
    qingge('smile', '輕音社把最後一首唱完了，沒有斷電。借來的背板有一點歪，大家倒是搶著在前面合照。', 'The band finished their last song without a power cut. The borrowed backdrop was a little crooked, but everyone wanted a photo in front of it.'),
    me('你在會上承認漏算那一項的時候，我還以為會更吵。', 'When you told the meeting about the cost you had missed, I thought the argument would get worse.'),
    qingge('normal', '是有一點吵。可是後來他們開始補資料，不再只問我是不是偏心。', 'It did, for a while. Then they started filling in the missing details instead of only asking whose side I was on.'),
    n('她攤開那張表。第一個問號還在，旁邊多了幾個不同筆跡的確認記號。', 'She unfolds the sheet. Your first question mark is still there, now surrounded by confirmations in several different hands.'),
    qingge('normal', '你那天沒有順著我說，我才發現，我需要的也不只是有人替我算對。', 'When you disagreed with me that day, I realised I needed more than someone who could get the sums right for me.'),
    me('還需要有人提醒你吃晚餐？', 'Someone to remind you to have dinner, too?'),
    qingge('smile', '這一項，你可以繼續負責。', 'You may keep that responsibility.'),
    me('那藍筆呢？', 'And the blue pen?'),
    qingge('shy', '先放你那裡。下次有不同意見，別只在心裡改。拿來給我看。', 'Keep it for now. Next time you disagree, do not just revise it in your head. Show me.'),
    n('她在頁尾留了一行空白，沒有先替你寫好答案。樓下的掌聲慢慢散去，那一行仍等著你們下次一起填。', 'She leaves a blank line at the bottom without writing your answer for you. The applause below fades, and the line stays open for the next time you fill it in together.'),
  ];
  if (route === 'rehearsal') return [
    ['music', 'bailu-zero-warm'],
    ['bg', 'rooftop', 'night'],
    ['in', 'qingge', 'normal'],
    // Marker: qingge-rehearsal-epilogue
    n('星空祭的廣播剛安靜，清歌將一張折成四折的發言稿放在天台欄杆上。', 'The festival announcements have just fallen quiet. Qingge places her notes, folded in four, on the rooftop railing.'),
    qingge('normal', '我沒有照那份稿念完。', 'I did not read all of it.'),
    me('我看見你讓那個一直舉手的社員先問。', 'I saw you call on the club member who kept raising a hand.'),
    qingge('smile', '他問完，旁邊的人反而開始幫忙補辦法。後來還有人提醒我，輪到我喝口茶了。', 'Once he had asked, people beside him began suggesting ways to help. Later, someone even reminded me it was my turn to take a sip of tea.'),
    n('稿紙上最密的一段被整條劃掉，旁邊只寫著一句：「先聽完。」', 'The densest paragraph is crossed out. Beside it she has written only: Hear them out.'),
    me('原來我這個最難應付的代表已經失業了。', 'So your representative with the hardest questions is out of a job.'),
    qingge('smile', '沒有。你的職務變了。', 'No. Your role has changed.'),
    me('什麼職務？', 'To what?'),
    qingge('normal', '下次我又把所有人的事都攬過來，提醒我問一句：「你們願不願意一起來？」', 'Next time I take everybody’s work onto my own shoulders, remind me to ask, Would you like to help?'),
    me('這次不用先準備標準答案？', 'No ready answer this time?'),
    qingge('shy', '不用。你願意回答什麼，我就先聽什麼。', 'No. Whatever you want to say, I will hear it first.'),
    n('樓下還有人在收椅子。清歌把稿紙收起，沒有催促你填滿這段安靜。', 'Someone is still stacking chairs below. Qingge puts her notes away and does not ask you to fill the quiet.'),
  ];
  return [];
}

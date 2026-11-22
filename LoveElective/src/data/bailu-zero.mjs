// A deterministic, optional interlude; it never consumes the base term's slots.
export const BAILU_ZERO_TITLE=['第零名社員的回信','Letters from Member Zero'];
export const BAILU_ZERO_AGES={hero:19,bailu:21,zhiwei:20,qingge:21};
export const BAILU_ZERO_STAGES=[
 {place:'rooftop',name:['23:17 的來信','The 23:17 letter'],hint:['去天台，聽白露說完那封來信。','Go to the rooftop and hear about the letter.']},
 {place:'library',name:['名冊上的空格','A blank in the roster'],hint:['與清歌查閱公開社團紀錄。','Check the public club records with Qingge.']},
 {place:'dorm',name:['一起挑選觀星服','Dressing for the stars'],hint:['白露已邀請你幫忙搭配。可選現有服飾並染色。','Bai Lu invited you to help choose and dye an outfit.']},
 {place:'lab',name:['燈滅之後','After the lights go out'],hint:['請知微檢查觀測終端，再陪白露回天台。','Ask Zhiwei about the terminal, then join Bai Lu on the roof.']},
 {place:'rooftop',name:['第三個名字','The third name'],hint:['由白露決定留下什麼，一起選擇新的開始。','Help Bai Lu choose what to carry into a new beginning.']},
];
export const BAILU_ZERO_CLUES={
 mail:['準時寄達的觀測信','A scheduled observation letter'],
 roster:['零號是共用帳號，不是失蹤社員','Zero is a shared account, not a missing member'],
 timer:['舊終端仍在寄送畢業學姐留下的紀錄','The terminal is sending an alumna’s archived observations'],
};
export function freshBailuZero(){return{version:1,stage:0,clues:[],archive:null,outfitChoice:null,distance:null,reading:null,ending:null,outfit:null,playback:null};}

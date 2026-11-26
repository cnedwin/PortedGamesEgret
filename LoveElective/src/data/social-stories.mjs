// Public, adult social invitations. Clothing is borrowed freely after an
// invitation is accepted; there is no purchase or intimacy requirement.
export const SOCIAL_SCENES={
 pool:{id:'pool',lead:'linxia',age:20,aff:20,chapter:2,place:'field',scene:'pool',music:'bailu-zero-warm',
  name:['泳池晚風','Poolside Evening'],venue:['校園泳池','Campus pool'],topic:['起跳與岸邊計時','Starts and poolside timing'],invitation:['下一次泳池練習','The next pool practice'],
  leadItems:['swim-onepiece'],heroItems:['swim-trunks','swim-rashguard'],leadTab:'dress',heroTab:'bottom'},
 pajama:{id:'pajama',lead:'tangmi',age:20,aff:35,chapter:2,place:'cafe',scene:'lounge',music:'campus-social-day',
  name:['睡衣與不加糖的可可','Pyjamas and Unsweetened Cocoa'],venue:['公共休息室','Shared lounge'],topic:['真正喜歡的甜度','The sweetness you actually like'],invitation:['一起試下一版可可','Taste the next cocoa together'],
  leadItems:['pajama-top','pajama-bottom'],optionalLeadItems:['overknee-stockings'],heroItems:['pajama-top','pajama-bottom'],leadTab:'top',heroTab:'top'},
 lounge:{id:'lounge',lead:'bailu',age:21,aff:35,chapter:2,place:'rooftop',scene:'bath-lounge',music:'bailu-zero-night',
  name:['浴衣、茶與窗外的星光','Robes, Tea and Starlight'],venue:['浴場茶室','Bathhouse tea lounge'],topic:['安靜也算陪伴','Quiet company counts too'],invitation:['再來喝茶看夜景','Tea and the night view next time'],
  leadItems:['lounge-robe','spa-slippers'],heroItems:['lounge-robe','spa-slippers'],leadTab:'outer',heroTab:'outer'},
};
export const SOCIAL_IDS=Object.keys(SOCIAL_SCENES);
export const freshSocialStory=()=>({version:1,stage:0,invited:false,loanGranted:false,outfitChoice:null,approach:null,response:null,
 outfit:null,playback:null,nameUnlocked:false,topics:[],invitation:null,followup:'pending',followupAt:-1,followupDecision:null,followupRewarded:false});
export const freshSocialStories=()=>Object.fromEntries(SOCIAL_IDS.map(id=>[id,freshSocialStory()]));

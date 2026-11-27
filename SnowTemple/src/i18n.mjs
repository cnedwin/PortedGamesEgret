// Presentation language only: original rule tables, item IDs, grades and save values stay unchanged.
const WORDS = Object.freeze({
  '风雪山神庙':'Snow at the Mountain Temple','水浒':'Water Margin','水浒　第一回':'Water Margin · Chapter I',
  '第一回':'Chapter I','第一回　完':'Chapter I · End','踏雪上路':'Into the Snow','守草料场':'Hold the Fodder Yard',
  '低一重':'Lower tier','高一重':'Higher tier','一拨接一拨，倒下为止':'Wave after wave, until you fall.',
  '左手移动　右手出枪、格挡和闪避':'Move with the left hand; strike, guard and dodge with the right.',
  '移动':'Move','出枪':'Strike','格挡（按住）':'Guard (hold)','格挡':'Guard','寒星':'Three Stars',
  '梨花枪雨':'Pear-Blossom Rain','枪雨':'Rain','闪避':'Dodge','踏雪（按住）':'Snow Step (hold)','踏雪':'Snow Step',
  '饮酒':'Drink','向上':'Up','向下':'Down','向左':'Left','向右':'Right','行囊':'Satchel','反击':'Counter',
  '回马枪':'Returning Spear','出枪后按住不放，下一枪蓄成重劈。':'Hold after striking to charge the next heavy sweep.',
  '往草料场去':'Head to the fodder yard','清掉草料场里的人':'Clear the fodder yard','上山神庙':'Reach the mountain temple','守住草料场':'Defend the fodder yard',
  '气血':'Health','气力':'Stamina','枪意':'Resolve','银钱':'Silver','乘隙':'Opening','满壶':'Full gourd','养气':'Gather resolve',
  '葫芦一口未动，枪意涨得快':'An untouched gourd builds resolve faster.','酒意':'Wine surge','酒葫芦':'Wine gourd',
  '钱':'C','银':'S','药':'M','丹':'T','谱':'P','物':'Item','空':'Empty','正在准备战斗角色…':'Preparing combat characters…',
  '枪谱残页':'Spear Manual Fragment','还认得出三行，择一而习。':'Three lines remain legible. Study one.',
  '全屏':'Fullscreen','退出全屏':'Exit fullscreen','设置':'Settings','画质':'Graphics','模型':'Models','粒子':'Particles','声音':'Sound',
  '自动':'Auto','低':'Low','中':'Medium','高':'High','少':'Few','标准':'Normal','多':'Many','关':'Off','开':'On',
  '自动按帧率调整分辨率。高档草更密，阴影更清晰。':'Auto adjusts resolution to the frame rate. High adds denser grass and sharper shadows.',
  '人物、兵器和建筑的精细程度。高档约 23MB，脸和手最细，带布纹和皮肤细节；低档适合手机。重新载入后生效。':'Detail of characters, arms and buildings. High is about 23 MB with finer faces, hands, cloth and skin; Low suits phones. Reload to apply.',
  '枪光火星、雪尘和飘雪的数量。':'Controls spear sparks, drifting snow and snow dust.',
  '风声、配乐和兵刃声。':'Wind, music and weapon sounds.',
  '画质、模型和粒子设置在重新载入后生效。':'Graphics, models and particles take effect after a reload.',
  '重新载入':'Reload','按键':'Controls','恢复默认':'Restore defaults','关闭':'Close','请按键…':'Press a key…','语言':'Language',
  '中文':'Chinese','界面文字，语音仍为原版中文。':'Interface text; voices retain the original Chinese.',
  '战斗':'Combat',
  '按住':'Hold','出枪　按住':'Strike · hold','上一页':'Previous page','下一页':'Next page','上页':'Previous page','下页':'Next page',
  '重试':'Retry','先这样玩':'Continue','返回':'Back','继续':'Continue','等':'Grade','用时':'Time','弹反':'Parries',
  '倒地':'Falls','击倒':'Defeated','更上一重':'Next tier','重战陆谦':'Rematch Lu Qian','重走此章':'Replay chapter','再守一回':'Hold again','回到卷首':'Back to title',
  '这是守得最久的一回。':'A new longest stand.','这一重里，这是最好的一回。':'A new best result for this tier.',
  '所有人更耐打，下手更重。':'Everyone is tougher and hits harder.','倒在雪里':'Fallen in the snow',
  '烤了烤火，伤口不疼了，葫芦也灌满了。':'Warmth eases your wounds and refills the gourd.',
  '这一拨退了。':'This wave has fallen back.','这一拨退了，地上落下一页枪谱。':'The wave has fallen back, leaving a manual fragment.',
  '在火盆边缓过一口气。':'Catch your breath by the brazier.',
  '扫雪':'Clearing snow','点灯':'Lighting the lamps','栽松，铺雪':'Setting pines and laying snow',
  '请陆虞候入座':'Preparing Lu Qian','起风':'The wind rises','起风 · 无阴影诊断':'The wind rises · shadows-off diagnostic',
  '这台设备的浏览器不支持本游戏需要的 WebGL 2。\n请换一台较新的手机或电脑再试。':'This browser does not support the required WebGL 2.\nTry a newer phone or computer.',
  '出了点问题，画面停了。请重新载入。':'Something went wrong. Please reload.',
  '林冲':'Lin Chong','陆谦':'Lu Qian','草料场烧了……有人纵火。':'The fodder yard is burning… Someone set it ablaze.',
  '拦路的，报上名来！':'You who bar my path, name yourself!',
  '还来？好，尽管上！':'More of you? Very well. Come on!',
  '陆谦，林冲来了。':'Lu Qian. Lin Chong is here.',
  '林教头……好硬的命。':'Instructor Lin… You are hard to kill.',
  '太尉要你的命。拿来。':'The Grand Marshal demands your life. Give it to me.',
  '你也休想走！':'You shall not leave here alive!',
  '高太尉……不会放过你。':'Grand Marshal Gao… will never let you go.',
  '闪避后立刻出枪，是一记追身长刺。':'Strike immediately after dodging to deliver a chasing thrust.',
  '踏雪时出枪，回身横扫。':'Strike during Snow Step to turn into a sweeping attack.',
  '酒意十秒：出枪更重，挨打也更疼。':'Wine surge lasts ten seconds: harder strikes, but heavier damage taken.',
  '把人打进火里，他会烧起来。':'Knock enemies into fire to ignite them.',
  '草垛、石头和车能挡箭。':'Haystacks, stones and carts block arrows.',
  '看准抬手，快挨打时格挡可弹反。':'Watch the wind-up: guard just before impact to parry.',
  '金环亮起，出枪接回马枪。':'When the golden ring lights, strike with Returning Spear.',
  '拉开距离，松开格挡恢复气力。':'Make space and release guard to recover stamina.',
  '斜纹不可挡，闪避离开预警范围。':'Striped attacks cannot be guarded. Dodge out of the warning zone.',
  '寒星五点':'Five Stars','寒星由三道变为五道。':'Three Stars launches five strikes instead of three.',
  '透甲寒星':'Piercing Stars','寒星穿透敌人，一道可伤数人。':'Stars pierce enemies; each can damage several.',
  '挡回一口':'A Sip Returned','弹反成功，葫芦回一口酒（每十秒一次）。':'A successful parry restores a sip of wine (once per ten seconds).',
  '借力':'Borrowed Strength','弹反成功，气力回满。':'A successful parry restores all stamina.',
  '闪过攻击后三秒内，下一枪必定打断对手并重创。':'Within three seconds of evading an attack, the next strike interrupts and deals heavy damage.',
  '火燎原':'Wildfire','第三段重劈和蓄力劈在落点留下一圈火。':'The third heavy sweep and charged sweep leave a ring of fire.',
  '密雨':'Dense Rain','枪雨范围收窄三成，落枪多六成。':'Rain covers 30% less area with 60% more strikes.',
  '撞阵':'Break the Line','踏雪时撞开并撞伤挡路的人。':'Snow Step pushes aside and damages enemies in the way.',
  '磨枪':'Sharpened Spear','枪伤加两成。':'Spear damage increases by 20%.','枪意增长快五成。':'Resolve grows 50% faster.',
  '初上山':'First Ascent','原样。':'The original challenge.','添兵':'Reinforcements','第二拨多两个人，其中一个是铁甲头目。':'The second wave adds two enemies, including an iron-armored leader.',
  '火箭':'Fire Arrows','弓手改放火箭，落处起火。':'Archers shoot fire arrows that ignite the ground.',
  '带火':'Burning Blades','陆谦一开始就使地火和旋斩。':'Lu Qian uses ground fire and spinning slashes from the start.',
  '薄酒':'Scarce Wine','葫芦只有两口，敌人出手更快。':'Only two sips of wine; enemies attack faster.',
  '庄客':'Hired Blade','牌手':'Shieldman','弓手':'Archer','太尉府虞候':'Adjutant of the Grand Marshal',
  '铜钱':'Coins','碎银':'Silver','金创药':'Healing Salve','回气散':'Stamina Tonic','凡':'Common','良':'Fine','珍':'Rare',
  '快手':'Quickhand','走得快，出手也快':'Moves and attacks faster','铁甲':'Iron Armor','血厚，轻击打不动他':'More health; light strikes cannot stagger him',
  '火把':'Torchbearer','打到哪里烧到哪里，自己不怕火':'Sets fire wherever he strikes and ignores fire',
  '左键':'LMB','中键':'MMB','右键':'RMB','空格':'Space','右Shift':'Right Shift','回车':'Enter','小键盘':'Numpad',
  '甲':'A','乙':'B','丙':'C','丁':'D','是':'Yes','否':'No','无':'None'
});
const phrases = Object.entries(WORDS).sort((a,b)=>b[0].length-a[0].length);
const numberChars='零一二三四五六七八九十';
export const normalizeLanguage = (value, fallback='zh') => value==='zh'||value==='en'?value:fallback;

/** The original Chinese values remain in state. Language is selected only for presentation. */
export function createSnowLocale(initial='zh') {
  let lang=normalizeLanguage(initial);
  function t(value, fallback) {
    if(value===null||value===undefined)return '';
    const text=String(value);
    if(lang==='zh'||!text)return text;
    if(fallback!==undefined)return String(fallback);
    if(Object.hasOwn(WORDS,text))return WORDS[text];
    if(!/[\u3400-\u9fff]/.test(text))return text;
    let output=text
      .replace(/^守到第\s*(\d+)\s*拨$/,'Reached wave $1')
      .replace(/^最远第\s*(\d+)\s*拨$/,'Best wave: $1')
      .replace(/^第\s*(\d+)\s*拨$/,'Wave $1')
      .replace(/^第([零一二三四五六七八九十]|\d+)重[　 ]*/,(m,n)=>'Tier '+(numberChars.includes(n)?numberChars.indexOf(n):n)+' · ')
      .replace(/^习得[　 ]+/,'Learned: ')
      .replace(/^头目「(.+?)」[　 ]*/, 'Leader: $1 · ')
      .replace(/^上面还有一重：/,'The next tier is open: ')
      .replace(/酒葫芦\s*\+1/g,'Wine gourd +1')
      .replace(/气力回满/g,'Stamina restored')
      .replace(/气血\s*\+/g,'Health +')
      .replace(/枪意\s*\+/g,'Resolve +');
    for(const [source,english] of phrases)if(output.includes(source))output=output.replaceAll(source,english);
    return output.replace(/　/g,' · ').replace(/。/g,'.').replace(/，/g,', ');
  }
  return {
    get lang(){return lang;}, set(value){lang=normalizeLanguage(value,lang);return lang;}, t,
    wave(number){return lang==='en'?'Wave '+number:'第 '+number+' 拨';},
    tier(number,name,mark){return lang==='en'?'Tier '+number+' · '+t(name)+(mark?' · '+t(mark):''):'第'+(numberChars[number]??number)+'重　'+name+(mark?'　'+mark+'等':'');}
  };
}
export const SNOW_WORDS=WORDS;

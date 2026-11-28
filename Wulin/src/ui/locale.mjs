// Localize presentation only. The rules and saves keep the original
// Chinese text and identifiers so changing a language cannot alter a world.
import { createTextTable, pickLanguage } from '@egret/engine/kit';
import { DATA_TERMS, parsePairs } from './locale-data.mjs';
import { SHEET_TERMS } from './locale-sheets.mjs';
import { pageDynamicEnglish, pageEnglish, pageTranslations } from './native-page-en.mjs';
import { LORE_TERMS } from './locale-lore.mjs';
import { RUNTIME_TERMS } from './locale-runtime.mjs';

const EXTRA = parsePairs(`
武林天下|Wulin
大昭|Great Zhao
承和元年|First Chenghe year
禁武令已下。山门未闭。|The Edict against Arms has fallen. Our gates remain open.
加载|Loading
加载中|Loading…
重新加载|Reload
重新载入|Reload
返回指令|Back to commands
点按|Tap
正在展开画卷|Opening the scroll
载入失败|Loading failed
战报|Report
主要功能|Main functions
请确认|Please confirm
确认|Confirm
可领赏|Reward ready
退出|Exit
重试|Retry
返回标题|Back to title
存档|Saves
山门|Seat
弟子|Disciples
江湖|Realm
战阵|Battle
纪事|Chronicle
设置|Settings
帮助|Help
选择|Choose
已暂停|Paused
行进中|Running
时间|Time
日期|Date
全部|All
暂停|Pause
行|Run
快|Fast
疾|Rapid
日|days
年|years
月|months
现有|Current
不适用|Not available
确定|Confirm
是|Yes
否|No
下一步|Next
上一步|Back
选项|Options
中文|Chinese
已|Done
未|Not yet
空|Empty
空手|Unarmed
已有此建筑|Already built
资质平平，去采集|Ordinary aptitude; assign gathering
告示|Announcement
第一回合|Round one
第一招|First move
第二招|Second move
第三招|Third move
“弟子不敢忘师门栽培。”|“I will never forget my sect's teachings.”
“不过是比旁人多练了几遍。”|“I simply practised a little more than others.”
“早知道这么累……不过，还挺痛快。”|“Had I known it would be so tiring… but it was exhilarating.”
“这有何难？”|“What was so difficult?”
“练成了，月例是不是也该涨一涨？”|“Now that I've mastered it, may I have a raise?”
“掌门，什么时候让我下山试试手？”|“Master, when may I put my skills to the test?”
“越往上走，越觉得不懂的还多。”|“The more I learn, the more I realise I don't know.”
“都是师兄师姐们教得好。”|“My senior brothers and sisters taught me well.”
“尚有三处破绽，容弟子再练。”|“Three openings still remain. Let me practise further.”
“谢掌门成全。”|“Thank you, Master, for your support.”
的|of
和|and
与|and
在|at
有|has
第|No.
门中|in the sect
我方|Our side
对方|Opponent
一统江湖！|The martial realm is united!
武林大会推举你为盟主！|The Summit chose you as its leader!
朝廷封你为武林都指挥使，禁武令自此废除。|The court has appointed you commander of the realm and abolished the Edict against Arms.
本门已不复存在。|Your sect has fallen.
`);
const TERMS = {...Object.fromEntries(pageTranslations),...DATA_TERMS,...SHEET_TERMS,...LORE_TERMS,...RUNTIME_TERMS,...EXTRA};
const pinyin = Object.create(null);
const addPinyin = (characters, spellings) => {
  [...characters].forEach((ch,i)=>{pinyin[ch]=spellings.split(' ')[i];});
};
// The complete authored pools in core/persons.mjs, plus recurring names
// in the story catalogue. The player's own characters are never guessed.
addPinyin('赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季','Zhao Qian Sun Li Zhou Wu Zheng Wang Feng Chen Chu Wei Jiang Shen Han Yang Zhu Qin You Xu He Lü Shi Zhang Kong Cao Yan Hua Jin Wei Tao Jiang Qi Xie Zou Yu Bai Shui Dou Zhang Yun Su Pan Ge Xi Fan Peng Lang Lu Wei Chang Ma Miao Feng Hua Fang Yu Ren Yuan Liu Feng Bao Shi Tang Fei Lian Cen Xue Lei He Ni Tang Teng Yin Luo Bi Hao Wu An Chang Yue Yu Shi Fu Pi Bian Qi Kang Wu Yu Yuan Bu Gu Meng Ping Huang He Mu Xiao Yin Yao Shao Zhan Wang Qi Mao Yu Di Mi Bei Ming Zang Ji Fu Cheng Dai Tan Song Mao Pang Xiong Ji Shu Qu Xiang Zhu Dong Liang Du Ruan Lan Min Xi Ji');
addPinyin('山川海岳峰石松柏云霆雷锋毅刚强勇武威远志鸿飞鹏翔龙虎豹麟骏驰安平宁定和顺德仁义礼信忠孝廉明哲思敏达通玄真清虚静','Shan Chuan Hai Yue Feng Shi Song Bai Yun Ting Lei Feng Yi Gang Qiang Yong Wu Wei Yuan Zhi Hong Fei Peng Xiang Long Hu Bao Lin Jun Chi An Ping Ning Ding He Shun De Ren Yi Li Xin Zhong Xiao Lian Ming Zhe Si Min Da Tong Xuan Zhen Qing Xu Jing');
addPinyin('兰梅竹菊莲荷蓉蕙芷若琴瑟筝箫月霜雪露霞虹烟雨晴岚素青碧紫丹朱婉柔静淑慧敏灵秀雅清宁婵娟瑶琼珠璧','Lan Mei Zhu Ju Lian He Rong Hui Zhi Ruo Qin Se Zheng Xiao Yue Shuang Xue Lu Xia Hong Yan Yu Qing Lan Su Qing Bi Zi Dan Zhu Wan Rou Jing Shu Hui Min Ling Xiu Ya Qing Ning Chan Juan Yao Qiong Zhu Bi');
const HAN = /\p{Script=Han}/u;
const HAN_RUN = /\p{Script=Han}+/gu;
function romanize(value) {
  const chars=[...value];
  if(!chars.length||chars.some(ch=>!pinyin[ch]))return undefined;
  return pinyin[chars[0]] + (chars.length>1?' '+pinyin[chars[1]]+chars.slice(2).map(ch=>pinyin[ch].toLowerCase()).join(''):'');
}
const punctuation = value => value.replace(/[，。？！；：、（）《》「」]/g,ch=>({'，':', ','。':'. ','？':'? ','！':'! ','；':'; ','：':': ','、':', ','（':' (','）':')','《':'“','》':'”','「':'“','」':'”'})[ch]);
const spaceWords=value=>value.replace(/ +([,.!?;:)])/g,'$1').replace(/([(]) +/g,'$1').replace(/\s+/g,' ').trim();

export function createLocale(initial='zh') {
  const chosen=pickLanguage(['zh','en'],[initial]);
  const table=createTextTable({languages:{zh:Object.fromEntries(Object.keys(TERMS).map(key=>[key,key])),en:TERMS},fallback:'zh',language:chosen});
  const names=new Map(), unknown=new Set();
  // Longest exact phrase matching preserves authored translations around live
  // values, rather than blindly replacing short labels inside a paragraph.
  const trie=Object.create(null);
  function insert(key) {
    let node=trie;
    for(const ch of key)node=node[ch]??=Object.create(null);
    node.key=key;
  }
  Object.keys(TERMS).filter(k=>HAN.test(k)).forEach(insert);
  function substitute(source) {
    const chars=[...source], output=[];
    for(let i=0;i<chars.length;){
      let node=trie, found, end=i;
      for(let j=i;j<chars.length && node[chars[j]];j++){
        node=node[chars[j]];
        if(node.key){found=node.key;end=j+1;}
      }
      if(found){
        output.push(' '+(names.get(found)??table.text(found))+' ');
        i=end;
      }else output.push(chars[i++]);
    }
    return spaceWords(pageEnglish(punctuation(output.join(''))));
  }
  function translate(value) {
    const source=String(value??'');
    if(table.language==='zh'||!HAN.test(source))return source;
    if(names.has(source))return names.get(source);
    if(table.has(source))return table.text(source);
    let english=substitute(source);
    if(HAN.test(english)) {
      const alternate=substitute(pageDynamicEnglish(source));
      const count=s=>[...s].filter(ch=>HAN.test(ch)).length;
      if(count(alternate)<count(english))english=alternate;
    }
    const unresolved=[...english.matchAll(HAN_RUN)].map(match=>match[0]);
    if(unresolved.length)unknown.add(source);
    return english;
  }
  return {
    get language(){return table.language;},
    setLanguage(next){table.setLanguage(pickLanguage(['zh','en'],[next]));},
    translate,
    registerNames(list){
      for(const entry of list??[]){
        const name=String(entry??'').trim();
        if(!name||!HAN.test(name)||names.has(name)||Object.hasOwn(TERMS,name))continue;
        const english=romanize(name);
        if(english){names.set(name,english);insert(name);}
      }
    },
    missing:()=>[...unknown].sort(),
  };
}

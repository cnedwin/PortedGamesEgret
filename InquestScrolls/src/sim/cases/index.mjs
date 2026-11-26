// 三卷六案。每卷两案，前一案结了，后一案才打开。
// Three scrolls, two cases each. A case opens when the one before it is closed.
import c1 from './c1.mjs';
import c2 from './c2.mjs';
import c3 from './c3.mjs';
import c4 from './c4.mjs';
import c5 from './c5.mjs';
import c6 from './c6.mjs';

export const CASES = [c1, c2, c3, c4, c5, c6];

export const SCROLLS = [
  { id: 1, title: { zh: '卷一 · 初检之疑', en: 'Scroll One · Doubts' }, cases: ['c1', 'c2'] },
  { id: 2, title: { zh: '卷二 · 城中之案', en: 'Scroll Two · In Town' }, cases: ['c3', 'c4'] },
  { id: 3, title: { zh: '卷三 · 合卷', en: 'Scroll Three · Closing' }, cases: ['c5', 'c6'] }
];

export const caseById = (id) => CASES.find((c) => c.id === id);

/** The opening of the whole book, shown once before the first case. */
export const PROLOGUE = {
  zh: [
    '淳祐年间，沅湘路提点刑狱司新到一位提刑，姓沈名砚。',
    '巡按蘅州时，他翻到白蘋县的四份检验格目：一人自缢，一人落水，一人病死，一人火死。四份格目都由县尉韦衡签押，字迹工整，结论干净。',
    '太干净了。沈砚命仵作老秦备好酒醋、银钗、红油伞，叫画工按格目与口供重画现场，一案一案地覆检。'
  ],
  en: [
    'In the Chunyou years a new judicial intendant comes to the Yuanxiang circuit. His name is Shen Yan.',
    'Touring the prefecture, he reads four inquest forms from Baipin County: a hanging, a drowning, a sudden illness, a fire. All four are signed by the county sheriff, Wei Heng. The writing is neat and the findings are clean.',
    'Too clean. Shen Yan has Old Qin, his coroner\'s aide, pack wine, vinegar, a silver pin and a red oiled umbrella, has a painter redraw each scene from the forms and the statements, and reopens them one by one.'
  ]
};

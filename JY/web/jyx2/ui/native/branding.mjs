export const titleHelpSections = [
  { label:{zh:'探索與互動',en:'Exploration'},lines:[
    {zh:'方向鍵／WASD 移動；點地面尋路。',en:'Move with arrows or WASD; tap ground to travel.'},
    {zh:'Enter 對話；B 背包；Esc 開啟選單。',en:'Enter to interact, B for bag, Esc for menu.'},
    {zh:'觸屏也可點方向鍵或各個功能按鈕。',en:'Touch directional and action controls.'}
  ]},
  { label:{zh:'回合操作',en:'Turn commands'},lines:[
    {zh:'M 移動；I 武學；方向鍵選格、Enter 確認。',en:'M move; I skill; arrows and Enter select a tile.'},
    {zh:'也可直接點格；B 藥品／暗器；T 醫療／用毒。',en:'Tap tiles; B supplies; T treatment or poison.'},
    {zh:'V 人物；Q／F 切換武學；L 休息結束回合。',en:'V status; Q/F switch skill; L end turn.'},
    {zh:'Tab 切換自動戰鬥。',en:'Tab switches automatic play.'}
  ]},
  { label:{zh:'手柄',en:'Controller'},lines:[
    {zh:'方向鍵／左搖杆 移動；A 確認；B 返回。',en:'D-pad or left stick; A confirm; B back.'},
    {zh:'Start 開啟選單。',en:'Start opens the menu.'}
  ]}
];

export const titleBranding={size:34,name:{zh:'金庸群俠傳 · 致敬 Demo',en:'Wuxia Tribute Demo'},
  kicker:{zh:'群俠江湖 · 行旅卷',en:'A JOURNEY THROUGH THE HILLS'},
  subtitle:{zh:'一卷山河，一程江湖。',en:'Beyond the hills, a new road awaits.'}};


// This PNG is a 960x640, non-interlaced RGBA8 encoding of the demo's own
// web/title-art/wuxia-dawn.webp (1536x1024). The original remains untouched.
// Kept separate so the engine's strict PNG decoder has a compatible profile.
export const titleArt = new URL('../../../title-art/wuxia-dawn-egret.png', import.meta.url).href;

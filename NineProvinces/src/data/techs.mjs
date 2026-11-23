// 科技树：霸道（兵马与征伐）和王道（民生与教化）两条路线，外加两路共有的基础。研究点来自各城官署和文官；每项科技要
// 前置。两条路线的第四、五层互相排斥：走了一条的高层，另一条的高层就关上了。
// The tree of inventions: the way of dominance (troops and conquest) and the way of benevolence (livelihood and
// teaching), and a common root. Research comes from each city's offices and its officials; each invention needs the one
// before. The fourth and fifth tiers of the two ways shut each other out: climb one high, and the other closes.

// Rows: id, Chinese, English, way (base, ba dominance, wang benevolence), tier, cost, needs (comma list or -), effects
// (as in traits; unit unlocks are given by the units' own needs).
const ROWS = `
writing 文书 Records base 1 120 - order=4
granary 仓廪 Granaries base 1 120 - farm=5
stables 马政 Stud_Farms ba 1 160 - cav=4
crossbow 弩机 Crossbow_Triggers ba 1 160 - bow=4
shipyard 船坞 Shipyards ba 1 160 - navy=4
levy 军制 Muster_Rolls ba 1 140 - recruit=10
engines 器械 Siege_Engines ba 2 280 levy siege=10
mounted 骑射 Mounted_Archery ba 2 300 stables cav=4
towerships 楼船 Tower_Ships ba 2 320 shipyard navy=8
garrison 军屯 Garrison_Farms ba 2 260 levy,granary supply=15
drill 操练 Drill_Grounds ba 2 260 levy train=15
lawharsh 严刑峻法 Harsh_Laws ba 2 240 writing order=15,support=-5
barding 马铠 Horse_Armour ba 3 480 mounted def=4
repeater 连弩 Repeating_Crossbows ba 3 480 crossbow bow=6
catapult 霹雳车 Thunderbolt_Carts ba 3 500 engines siege=10
vanguard 锐卒 Picked_Men ba 3 460 drill atk=5
annex 兼并 Annexation ba 4 760 vanguard,lawharsh persuade=10,capture=15
blitz 长驱 Deep_Strikes ba 4 760 vanguard,garrison march=15,spd=5
hegemony 霸业 The_Hegemon's_Way ba 5 1200 annex,blitz atk=10,morale=10
farming 劝农 Encourage_Farming wang 1 140 granary farm=10
trade 通商 Open_Markets wang 1 140 - trade=10
lighttax 轻徭薄赋 Light_Taxes wang 1 140 - support=10
schools 兴学 Schools wang 2 260 writing tech=15
irrigation 水利 Irrigation wang 2 280 farming farm=15,build=5
worthies 礼贤下士 Courting_Worthies wang 2 260 writing search=20,persuade=10
walls 筑城 City_Walls wang 2 260 granary wall=20,build=10
relays 驿传 Post_Relays wang 2 260 trade march=10
refugees 招抚流民 Settling_Refugees wang 3 460 lighttax,irrigation support=8,farm=5
virtue 德化 Moral_Example wang 3 480 schools,worthies order=10,loyal=5
righteous 仁义之师 Righteous_Army wang 3 480 lighttax,walls morale=6,resist=6
harmony 礼乐 Rites_and_Music wang 4 760 virtue fame=20,diplo=15
granaries2 常平仓 Ever-Normal_Granaries wang 4 760 refugees farm=10,trade=10
paradise 王道乐土 The_Kingly_Way wang 5 1200 harmony,granaries2 support=15,farm=10,trade=10
`;

export const TECHS = {};
for (const line of ROWS.trim().split('\n')) {
  const [id, zh, en, way, tier, cost, needs, list] = line.trim().split(/\s+/);
  const effects = {};
  for (const pair of list.split(',')) {
    const [k, v] = pair.split('=');
    effects[k] = +v;
  }
  TECHS[id] = { id, zh, en: en.replace(/_/g, ' '), way, tier: +tier, cost: +cost, needs: needs === '-' ? [] : needs.split(','), effects };
}

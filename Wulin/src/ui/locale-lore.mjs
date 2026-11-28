// These strings follow the authored event catalogue; descriptions and
// outcomes remain separate so a translated option states the actual effect.
import { EVENTS, TRIALS, WANDERERS } from '../data/jianghu.mjs';
import { GOALS, LAST_WORD } from '../core/goals.mjs';
import { FEATURES } from '../core/unlocks.mjs';
import { parsePairs } from './locale-data.mjs';

const terms = {};
const goalRows = [
 ['Open the Gate','Nothing happens while time stands still. Let the first ten days pass.','Choose Run in the top bar.'],
 ['Gather Disciples','Applicants often wait by the board. Meet them and raise your membership to twelve.','Seat · Recruitment · Meet'],
 ['Raise Buildings','Build a new structure or upgrade an existing one.','Seat · Select a building to upgrade or select empty ground.'],
 ['Teach According to Talent','Have a disciple apprentice to an elder or leader to accelerate training.','Disciples · Select someone · Apprenticeship'],
 ['Find Income','Open a shop to earn silver and sell goods every ten days.','Seat · Local · Open shop'],
 ['Earn a Name','Raise renown to 200 through charity, duels and well-handled encounters.','Battle · Duel, or Seat · Charity'],
 ['Spread Your Banner','Gain a second stronghold: found a branch on vacant land or capture an occupied site.','Realm · Select an adjacent stronghold'],
 ['Distant Friends','Raise relations with a sect to forty to open a trade route.','Realm · Diplomacy · Gift'],
 ['A Flourishing Sect','Raise membership to twenty. Expand dormitories and maintain food supplies.','Seat · Recruitment; dormitories determine capacity.'],
 ['One of the Great Powers','Hold four strongholds to become a major power.','Realm · March or found a branch'],
 ['Renowned Across the Realm','Raise renown to 500 to attract support at the martial summit.','Perform good deeds and win battles.'],
];
GOALS.forEach((g,i)=>{const [title,description,how]=goalRows[i];terms[g.title]=title;terms[g.text]=description;terms[g.how]=how;});
terms[LAST_WORD.title]='Claim the Martial Realm';
terms[LAST_WORD.text]='Unite the realm, become leader at the Summit, or earn the court’s appointment — any one is victory.';
terms[LAST_WORD.how]='Realm · Chronicle';
const features = [
 ['Realm','Strongholds and the sects’ movements appear here. Found branches and choose your next goal.','Complete the first ten days'],
 ['Apprenticeship','Assign a master. A more accomplished teacher speeds a disciple’s training.','After one month'],
 ['Local Affairs & Shops','Open local shops for ten-day income and choose a specialty at each stronghold.','After two months'],
 ['Sect Duties','Set house rules, appoint officers, brew pills and practise charity from Seat · Duties.','After two months'],
 ['Battles & Duels','Win renown through duels, plan attacks on rival neighbours and view the triennial Sword Meet.','After one season'],
 ['Moves & Position','Set a disciple’s moves and front/back row for combat.','After one season'],
 ['Equipment & Pills','Craft equipment, gift legendary weapons and use pills.','After four months'],
 ['Diplomacy','Improve relations with gifts, request arts, and establish trade when friendly.','After four months'],
 ['Meridians','Unlock meridians with sufficient inner art training, choosing one of two paths each.','After one year'],
 ['Spies','Embed spies to gain an attack advantage, at the risk of discovery.','Hold two sites or reach two years'],
];
FEATURES.forEach((f,i)=>{const [name,about,hint]=features[i];terms[f.name]=name;terms[f.about]=about;terms[f.hint]=hint;});

// Titles, introductions, and each choice's label / effect / result / risk result.
const events = {
 famine:['Famine in the Valley','Famine struck several villages below the mountain. Their elders kneel at your gate and beg for grain.',[
  ['Open the granary','Grain −30; alignment +30; renown +10','Grain carts descend the mountain; villagers burn incense in thanks.'],
  ['Serve porridge for three days','Silver −80; alignment +10','Porridge stalls open for three days. Better than nothing.'],
  ['Keep the gates closed','Alignment −20','Your gates remain closed. The villagers depart cursing.']]],
 challenge:['A Challenger','An outsider carries a board declaring himself invincible and demands a match with your finest fighter.',[
  ['Send a master to fight','Likely victory: renown +15; risk of injury','Within thirty moves, the challenger’s board breaks in two.','The challenger is genuinely skilled; your fighter returns wounded and defeated.'],
  ['Welcome him with a meal','Alignment +5','After a meal the visitor feels awkward and carries his board away.'],
  ['Drive him away','Alignment −10; renown −5','Word spreads; the realm disapproves.']]],
 caravan:['A Caravan Requests Passage','A large caravan asks to cross your land and offers a toll.',[
  ['Accept toll and let them pass','Silver +150','The caravan crosses safely and pays the promised toll.'],
  ['Escort without payment','Alignment +15; renown +8','The owner praises the sect’s honour everywhere.'],
  ['Seize the cargo','Silver +500; alignment −60; court −10','The goods enter storage, followed by official wanted notices.']]],
 census:['Arms Registry','Officials arrive under the Edict to register your disciples and confiscate weapons.',[
  ['Register honestly; surrender old arms','Court +15; all loyalty −3','The official leaves satisfied, but disciples grumble in private.'],
  ['Offer a payment','Silver −200; court +5','The official weighs the silver and casually marks the register.'],
  ['Refuse the edict','Court −20; renown +15','The official leaves furious; the realm praises your resolve.']]],
 bounty:['Wanted Notice','The Arms Bureau offers three hundred silver for information about a neighbouring sect hiding weapons.',[
  ['Ignore the notice','All relations +3','Other sects quietly approve your refusal.'],
  ['Report the neighbour','Silver +300; court +10; all relations −15','You receive the reward, but fellow sects now look at you with suspicion.']]],
 manual:['Fragmented Manual','A poor scholar visits with half a damaged fist manual and asks a high price.',[
  ['Buy it','Silver −250; all loyalty +2; possible discovery','Several pages enlighten your disciples despite the missing sections.','The book proves to be a commonplace copy; the silver was wasted.'],
  ['Decline politely','No effect','The scholar collects his manuscript and looks for another buyer.']]],
 vein:['New Mineral Vein','Disciples discover an exposed vein behind the mountain. Mining requires initial investment.',[
  ['Fund the mining','Silver −150; iron +40; stone +30','Carts of ore descend the mountain.'],
  ['Seal it for now','No effect','The vein is marked for another day.']]],
 feud:['Disciples Quarrel','Two disciples fight over a sunny dormitory room, each backed by friends.',[
  ['Discipline them both','All loyalty −2; renown +3','Discipline restores order at the seat.'],
  ['Mediate and buy more beds','Silver −60; all loyalty +3','Both reconcile and jointly thank you.']]],
 envoy:['Neighbouring Envoy','A neighbouring sect sends letters and gifts, hoping for closer ties.',[
  ['Return a generous gift','Silver −120; all relations +6','The envoy returns with a full burden of gifts.'],
  ['Accept and reply by letter','All relations +2','The exchange is courteous and dignified.']]],
 plague:['Epidemic','An outbreak spreads through the town below; disciples are falling ill.',[
  ['Hire physicians and help villagers','Silver −180; alignment +25; renown +8','The epidemic stops in half a month. Villagers send a plaque honouring your compassion.'],
  ['Seal the mountain','All loyalty −2; alignment −10','The seat remains safe, but cries below last half a month.']]],
 prodigy:['Remarkable Child','A woodcutter brings a child who supposedly can snap saplings by hand.',[
  ['Invite the child to stay','A gifted applicant arrives','The child waits at the recruitment board.'],
  ['Give travel money and send them off','Silver −20','The woodcutter leaves with the child, deeply thankful.']]],
 harvest:['Bountiful Harvest','Favourable weather brings abundant grain. Village elders plan a gift for the sect.',[
  ['Accept the gift','Grain +40','The granary is filled to the brim.'],
  ['Take half; let villages keep the rest','Grain +20; alignment +10','The elders praise your consideration.']]],
 thief:['Storehouse Theft','Someone forces the storehouse lock at night. A novice was seen acting suspiciously.',[
  ['Investigate thoroughly','May recover silver; all loyalty −1','The stolen goods are found in a tree hollow; the culprit is a notorious local thief.','Half a month of investigation reveals nothing, leaving everyone nervous.'],
  ['Increase patrols instead','Silver −80','There are no further thefts.']]],
 tournament:['Friendly Contest','Nearby sects invite disciples to a friendly martial gathering.',[
  ['Send disciples','Renown +12; all relations +3; risk of injury','Your disciples win three bouts to widespread applause.','Your disciples are defeated and injured, but retain their manners.'],
  ['Decline the invitation','All relations −2','The invitation is returned unopened.']]],
 pardon:['A Pardon','The Arms Bureau suggests a contribution could erase past resistance to the edict.',[
  ['Pay the contribution','Silver −400; court +30','After the silver arrives, the notices quietly come down.'],
  ['Refuse to pay','Renown +8; court −5','The martial world praises your backbone.']]],
 raid:['Troops Besiege the Seat','Imperial forces surround the gate and demand the sect surrender its arms and disperse its disciples.',[
  ['Hold the defences','Renown +25; court −10; possible injuries','The troops withdraw after three days of failed attacks.'],
  ['Pay to end the crisis','Silver −600; court +25','The commander accepts payment and reports a lack of evidence.'],
  ['Surrender arms','Court +40; renown −40; all loyalty −8','Most weapons are confiscated. Your disciples bear the disgrace.']]],
 favour:['Imperial Envoy','An imperial envoy passing through your territory wishes to meet your leader.',[
  ['Host a banquet','Silver −150; court +15','The envoy promises the court will value your sect in time.'],
  ['Claim illness and refuse','Renown +5; court −8','The envoy departs coldly.']]],
 bandits:['Mountain Bandits','A band occupies the nearby pass, robs travellers and threatens to take grain from your mountain.',[
  ['Drive them out','Alignment +20; renown +12; silver +100; risk of injury','The camp burns and half the recovered property is returned to the victims.','The band resisted fiercely; your fighters suffered injuries before prevailing.'],
  ['Recruit them as an outer band','Silver +200; alignment −30','Their leader pays tribute and thereafter acts under your banner.'],
  ['Guard the gate and stay clear','No effect','They see the gate’s defences and dare not approach.']]],
 scroll:['Damaged Books','An impoverished scholar displays worm-eaten family manuals outside the gate, hoping to buy passage home.',[
  ['Buy at the asking price','Silver −200; gain an unknown manual','One genuine book emerges from hours of searching; the rest are worthless.'],
  ['Invite him to make a copy','Silver −60; likely manual, possible forgery','The scholar spends half a month copying a clean manuscript and departs gratefully.','After three days you discover the texts are forgeries. The scholar has at least eaten well.'],
  ['Decline','No effect','The scholar packs up and proceeds to another sect.']]],
 duelbook:['Exchange Martial Knowledge','A passing master admires the training yard and offers to write down his signature art if he loses a match.',[
  ['Send a fighter','Likely victory: manual and renown +8; risk of injury','After fifty moves the visitor concedes and writes out a flawless manual.','The visitor hides great skill; your defeated fighter watches him depart with a smile.'],
  ['Discuss martial arts over tea','Renown +3','Both sides learn something through discussion, but neither reveals their secrets.'],
  ['Decline politely','No effect','The visitor drinks water and leaves without insisting.']]],
 relic:['A Legendary Weapon','A collapsed ancient tomb reveals an inscribed stone case. Several groups are approaching it.',[
  ['Send skilled disciples','Possible legendary weapon; risk of injury','A legendary weapon returns to your stock and can be bestowed on a suitable disciple.','The case is already empty; your fighters have clashed with rivals.'],
  ['Buy it from the finder','Silver −800; guaranteed legendary weapon','The exchange is completed and the weapon enters storage.'],
  ['Stay away','No effect','Rumours speak of many deaths over the stone case.']]],
 pirates:['Coastal Pirates','Urgent news from the coast: pirate fleets are offshore, fishing villages already burn, and your coastal strongholds are at risk.',[
  ['Meet them in battle','Renown +20; alignment +15; court +8; possible injuries','The pirates lose vessels near the beach and retreat to sea.'],
  ['Hire imperial forces','Silver −300; court +5','Imperial warships arrive; the pirates flee before them.'],
  ['Secure supplies and stockade','Silver −150; grain −20','Pirates seize the grain and goods not moved in time.']]],
};
for (const e of EVENTS) {
  const row=events[e.id];
  if(!row)continue;
  terms[e.title]=row[0];terms[e.text]=row[1];
  e.choices.forEach((choice,i)=>{
    const c=row[2][i];if(!c)return;
    terms[choice.label]=c[0];terms[choice.hint]=c[1];terms[choice.text]=c[2];
    if(choice.risk?.text&&c[3])terms[choice.risk.text]=c[3];
  });
}
const wishes=[
 'She once promised an old ferryman a map of thirty-six shoals. He died before it was done; half the map still lies in her chest.',
 'The bell in his hometown temple was cast badly by his master. It has lain cracked for thirty years; he wants to recast it.',
 'A fellow escort once took a blade for her. She has sought his missing orphan daughter for twenty years.',
 'An old tea guest left her an incomplete prescription; missing herbs grow only in the miasmic south.',
 'A passenger left a letter for collection after three days. Eleven years later, he wants to deliver it himself.',
 'His woodblock manual lacks its last two blocks. The old engraver lives hidden in Shu, and he seeks to complete it.',
 'A friend gave her the qin and was buried beyond the frontier. She wants to play their unfinished tune at the grave.',
 'He once lost tracks in the snow — of his younger brother. He refuses to believe him dead.',
 'Her childhood theatre troupe was forced to disband. She wants to repay the troupe master’s debt.',
 'An old fellow guard died unburied; his bones remain beneath an earthen platform beyond the border.',
 'A former kitchen apprentice was abducted into forced labour, reportedly in a northern mine.',
 'After forty years she understands why a child she treated died and wants to give the remedy to that family.',
 'A scheme stole her family’s old business. She wants to redeem its signboard.',
 'One mountain remains unsurveyed after a lifetime of surveying; he wants to finish while he can.',
 'Her home among the reeds is being turned into a hunting enclosure. Her neighbours ask her to negotiate.',
 'An old colleague died seeking a desert well. Its platform collapsed, and he wants to rebuild it.',
 'Her master’s old puppets are held by a pawnshop; the redemption period is ending.',
 'An early horoscope he gave ruined half a man’s life. He wants to admit his error face to face.',
 'An old caravan chief entrusted her with a lame horse to heal and release onto the grasslands.',
 'His first bridge collapsed in a flood and injured people. He wants to rebuild it without payment.',
 'Her old drumming teacher is deaf; she seeks a drum whose vibrations even the deaf can feel.',
 'A duel opponent failed to arrive through illness. He wants to honour their ten-year-delayed appointment.',
 'An unjust case is buried in the archives. She has copied it and wants to petition for the family.',
 'Each year on his migration he passes his father’s abandoned grave and wants to erect a marker.',
 'Only a few cold silkworm nests remain; their valley will be cleared by fire. She wants to buy it.',
 'He once carried every beam of a mountain temple uphill. Now it is collapsing and the monk cannot pay.',
 'A friend’s confiscated poetry manuscript was scattered among booksellers. She seeks each missing page.',
 'An old deal of his cheated an honest man. The family is now struggling; he wants to repay them quietly.',
 'She won a petition but the plaintiff suffered revenge. She wants to rescue the child who remains.',
 'His senior monk guards a ruined western temple alone and writes yearly about the leaking roof.',
];
WANDERERS.forEach((w,i)=>{terms[w.wish]=wishes[i];});
const trials=[
 'After three days watching practice, the visitor stops the morning class, insisting the sect’s stance has been wrong for twenty years.',
 'Disliking the disorder in the clinic, the visitor rearranges every medicine drawer and requests unfamiliar herbs.',
 'After studying the accounts all night, the visitor finds three unfair bargains and wants to renegotiate in town.',
 'The visitor dismantles a workshop furnace, saying its vents are wrong and insisting on rebuilding it.',
 'After seven days in the hills with two novices, the visitor returns with a map of three untouched sites.',
 'The visitor tours the seat, finds four vulnerable approaches and asks to set guarded posts overnight.',
 'Watching a sparring match, the visitor shakes their head and asks to train ten recruits in the mountains.',
 'After half a month travelling, the visitor brings a register of gifted youngsters from three hundred li around.',
 'While copying a manual, the visitor stops and says its annotation is wrong from the root, proposing a lecture.',
 'The visitor examines storage, finds ten percent of grain missing monthly and proposes a system of inventories.',
 'Finding the mountain too quiet, the visitor wishes to hold a Mid-Autumn lantern fair for all the villagers.',
 'The visitor knows the new Arms Bureau official and wishes to pay a courtesy visit with a modest gift.',
];
Object.values(TRIALS).forEach((t,i)=>{terms[t.text]=trials[i];});

export const LORE_TERMS = parsePairs(`
该处土地不足|Insufficient land
本门无人能授，阁中亦无秘笈|No available teacher or manual in this sect
非本门武学|Not an art of this sect
需为内门弟子|Requires inner disciple rank
需为亲传弟子|Requires direct disciple rank
需达五重|Requires mastery 5
需达七重|Requires mastery 7
需闭关领悟|Requires a breakthrough in seclusion
银两不足|Insufficient silver
粮草不足|Insufficient grain
威望不足|Insufficient renown
条件不足|Requirements not met
放手让其施为|Give them a free hand
其忠诚|Personal loyalty
本派多少有些进益|The sect benefits
按本派的规矩来|Follow the sect rules
门中尚无合适的传人|No suitable successor
传人习得同样的天赋，此艺不因一人去留而断|The successor inherits the talent even if its holder departs
需有内门以上、尚无天赋的弟子|Requires an inner disciple or higher without a talent
著书立说|Write a treatise
全派忠诚|All loyalty
倾力相助|Offer full support
其天赋之效加倍|Talent effect doubles
好言宽慰|Offer comforting words
重金延揽|Offer generous payment
必定留下|Guaranteed recruitment
以诚相邀|Invite sincerely
留下；威望越高越易成|chance to join, increased by renown
礼送下山|Bid farewell politely
入门不久，|Recently joined the sect:
在本派已逾一年，这天说起身后事：一身本事不想带进土里，愿在门中择一人倾囊相授，或是著书留给后来人。|has been with the sect for over a year and discusses their legacy: rather than let their skills die with them, they wish to teach a successor or leave a written record.
入门已有时日，这天来见掌门，说起一桩放不下的旧事：|has been with the sect for some time and speaks of an unfinished duty:
此去需要些盘缠和人手；若能了此心愿，此人愿倾囊相授。|They will need money and help; if the wish is fulfilled they will share all their knowledge.
此人|This person
身负|has the talent
古剑|ancient sword
`, terms);

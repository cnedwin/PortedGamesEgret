// Presentation-only campaign guidance. Closing it never spends a day or changes
// a historical event; the player decides when the simulation begins.
import { button, h } from './dom.mjs';
import { dayWords, pair } from './text.mjs';
import { placeName } from '../view/names.mjs';

export function renderFirstMonth(app) {
  let host = document.querySelector('#firstMonth');
  if (!host) {
    host = h('section#firstMonth.firstMonth');
    document.querySelector('#hud').append(host);
  }
  const guide = app.firstMonth;
  const visible = app.screen === 'play' && guide && !guide.dismissed && app.state.day < guide.day + 30;
  host.hidden = !visible;
  if (!visible) return;
  const key = [app.state, app.language(), app.paused, guide.day, guide.dismissed];
  if (host.flowKey?.every((value, i) => value === key[i])) return;
  host.flowKey = key;
  const capital = app.state.factions[app.state.player].capital;
  const nanpiOpening = app.state.player === 'liubei' && capital === 'pingyuan' && !app.state.founding;
  const close = () => { guide.dismissed = true; renderFirstMonth(app); };
  host.replaceChildren(...[
    h('header', h('h3', pair(app.paused ? ['开局准备 · 已暂停', 'Prepare your campaign · Paused'] : ['首月建议', 'Your first month'])),
      h('button.x', { type: 'button', 'aria-label': pair(['收起首月建议', 'Dismiss first-month advice']), onclick: close }, '×')),
    h('p', pair(['起家城池：', 'Starting town: ']) + placeName(capital) + pair(['。查看城中命令后，再开始推演。', '. Review its orders before starting time.'])),
    h('ol',
      h('li', pair(['先看钱粮的月收支，再择一扩建农田或市场。', 'Check monthly coin and grain income, then improve a farm or market.'])),
      h('li', pair(['查看本城武将；寻访、调任和出征都从城中命令开始。', 'Review local officers. Search, transfer and muster orders begin in a town.'])),
      h('li', nanpiOpening
        ? pair(['若要攻南皮，给平原留足守军，再分批出征。到城后，军议会显示能立即出战的部队和援军到达时间。', 'If you march on Nanpi, leave a garrison in Pingyuan and send separate armies. At the walls, the council shows who can fight now and when help will arrive.'])
        : pair(['留足守军与军粮，先看外交盟约，再决定行军目标。', 'Keep a garrison and provisions. Check treaties before choosing a march.']))),
    app.state.founding?.withdrawalTruceUntil ? h('p.firstMonthPact', pair(['与原领主的撤离停战至', 'Your withdrawal truce expires: ']) + dayWords(app.state.founding.withdrawalTruceUntil)) : null,
    h('p.firstMonthKeys', pair(['随时可暂停；PC：空格暂停／继续，H归城。手机：点顶部暂停键。', 'Pause at any time. PC: Space pauses/resumes; H returns home. Phone: tap Pause above.'])),
    h('div.row', button(pair(['查看本城', 'Review this town']), () => app.goHome()),
      button(pair(['准备好了，开始推演', 'Ready — start time']), () => { close(); app.setPaused(false); }, { kind: 'main' }))
  ].filter(Boolean));
}

export const progressPrompt = reason => reason === 'overwrite'
  ? {
      title: pair(['覆盖这个存档？', 'Replace this save?']),
      text: pair(['这个手动档位已有一局记录。覆盖只影响该档位，其他档位和自动存档不变。', 'This manual slot already contains a campaign. Only this slot will be replaced; other slots and the autosave stay unchanged.']),
      action: pair(['确认覆盖', 'Replace save'])
    }
  : {
      title: pair(['还有尚未保存的进展', 'You have unsaved progress']),
      text: pair(['从上次成功保存起，局势或命令已经改变。可以先返回存档，或放弃这段进展继续。镜头、选中与设置变化不会触发此提示。', 'The campaign has changed since the last successful save. Return to save it, or continue and discard those changes. Camera, selection and settings alone never trigger this warning.']),
      action: pair(['放弃进展并继续', 'Discard progress and continue'])
    };

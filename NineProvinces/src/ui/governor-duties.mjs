import { getLanguage, num, t } from '../i18n.mjs';
import { generalName } from '../view/names.mjs';
import { button, h } from './dom.mjs';
import { dayWords } from './text.mjs';

function dutyRow(name, label, view, status, detail, last, toggle) {
  const control = button(label, () => toggle(!view.enabled), {
    why: !view.enabled && view.why ? t('governorDuty_' + view.why) : null,
  });
  control.classList.add('governorDutyToggle');
  control.dataset.k = 'governor-' + name;
  control.setAttribute('aria-pressed', String(view.enabled));
  return h('li.governorDutyRow', h('div.governorDutyReadout',
    h('p.governorDutyStatus', status),
    detail ? h('p.governorDutyMeta', detail) : null,
    last ? h('p.governorDutyLast', last) : null
  ), control);
}

/** A readout of city plans. Forecasts and receipts come from the simulation. */
export function renderGovernorDuties(app, id, node, { recruit, duties }) {
  const { governor, build, search } = duties;
  const buildStatus = t('governorDuty_' + build.status);
  const searchStatus = t('governorDuty_' + search.status);
  const buildDetail = node.work
    ? t('building', { kind: t(node.work.kind), days: node.work.left })
    : build.kind ? t('governorBuildQuote', { kind: t(build.kind), days: build.days, coin: num(build.coin) }) : null;
  const searchDetail = search.status === 'searching'
    ? t('governorSearchRemaining', { days: search.daysLeft })
    : search.enabled && search.status === 'waiting'
      ? t('governorDutyNext', { days: search.daysLeft })
      : governor && search.why !== 'noGovernor' && Number.isFinite(search.chance) && Number.isFinite(search.days)
        ? t('governorSearchQuote', { days: search.days, chance: num(Math.round(search.chance * 100)) }) : null;
  const found = search.last?.found.map(generalName).join(getLanguage() === 'en' ? ', ' : '、');
  const rules = h('details.governorDutyRules',
    h('summary', { dataset: { k: 'governor-duty-rules' } }, t('governorDutyRules')),
    h('p', t('governorRecruitAbout', { grain: num(recruit.reserveGrain) })),
    h('p', t('governorBuildAbout', { coin: num(build.reserveCoin) })),
    h('p', t('governorSearchAbout'))
  );
  return h('section.governor-duties', { 'aria-labelledby': 'governor-duties-title' },
    h('header.governorDutyHead',
      h('h4#governor-duties-title', t('governorDutyTitle')),
      governor ? h('span', generalName(governor)) : h('span', t('noGovernor'))),
    h('ul.governorDutyList',
      dutyRow('recruit', t('governorDutyRecruit'), recruit, t('governorRecruitStatus', {
        status: t('governorRecruit_' + recruit.status), troops: num(node.troops), target: num(recruit.target),
      }), recruit.enabled && recruit.status === 'waiting' ? t('governorRecruitNext', { days: recruit.daysLeft }) : null,
      recruit.lastGot > 0 ? t('governorRecruitLast', { n: num(recruit.lastGot) }) : null,
      enabled => app.act('governorRecruit', id, enabled)),
      dutyRow('build', t('governorDutyBuild'), build, buildStatus,
        build.enabled && build.status === 'waiting' ? t('governorDutyNext', { days: build.daysLeft }) : buildDetail,
        build.last ? t('governorBuildLast', { date: dayWords(build.last.day), kind: t(build.last.kind), days: build.last.days }) : null,
        enabled => app.act('governorDuty', id, 'build', enabled)),
      dutyRow('search', t('governorDutySearch'), search, searchStatus, searchDetail,
        search.last ? t(found ? 'governorSearchFound' : 'governorSearchNoFind', { date: dayWords(search.last.day), found }) : null,
        enabled => app.act('governorDuty', id, 'search', enabled))
    ), rules);
}

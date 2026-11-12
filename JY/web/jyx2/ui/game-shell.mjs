import { autoSlot, createSaveSlot, manualSlots } from '../../save-slot.mjs';

const preferenceKey = 'kys-game-preferences';
const visualStyles = ['jyx2', 'enhanced', 'classic'];

export function readPreferences() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(preferenceKey)); } catch {}
  return { visual: visualStyles.includes(saved?.visual) ? saved.visual : 'jyx2', sound: saved?.sound !== false };
}

export function returnToTitle() {
  const url = new URL(location.href);
  url.searchParams.delete('preview');
  url.searchParams.set('title', '1');
  location.assign(url);
}

export async function nativeSaveRequest(action, body) {
  const response = await fetch(`/api/native-save/${action}`, {
    method: 'POST', body, headers: { 'Content-Type': action === 'import' ? 'application/zip' : 'application/json' },
  });
  if (!response.ok) throw new Error(await response.text());
  return response;
}

export async function pickNativeSave() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip,application/zip';
  const file = await new Promise(resolve => {
    input.addEventListener('change', () => resolve(input.files[0]), { once: true });
    input.addEventListener('cancel', () => resolve(undefined), { once: true });
    input.click();
  });
  return file ? (await nativeSaveRequest('import', file)).json() : undefined;
}

export function showTitle({ initial, baseline, autoSave, save, preferences, search }) {
  const title = document.querySelector('#title-screen');
  const play = document.querySelector('#play-screen');
  const status = document.querySelector('#title-status');
  const dialog = document.querySelector('#title-dialog');
  const choices = [...title.querySelectorAll('[data-title-action]')];
  const resume = choices[0];
  const listeners = new AbortController();
  const { signal } = listeners;
  let busy = false;
  let slotHeading;
  let places;

  title.hidden = false;
  play.hidden = true;
  title.ownerDocument.querySelector('#game').dataset.phase = 'title';
  resume.disabled = !save;
  (save ? resume : choices[1]).focus({ preventScroll: true });

  function button(label, action, primary = false) {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    if (primary) element.className = 'title-primary';
    element.addEventListener('click', action, { signal });
    return element;
  }

  function showPanel(heading, ...content) {
    const label = document.createElement('h2');
    label.id = 'title-dialog-heading';
    label.textContent = heading;
    const back = button('返回', () => dialog.close());
    back.className = 'title-back';
    dialog.replaceChildren(label, ...content, back);
    if (!dialog.open) dialog.showModal();
    slotHeading = label;
  }

  function paragraph(text) {
    const element = document.createElement('p');
    element.textContent = text;
    return element;
  }

  return new Promise(resolve => {
    function start(selected) {
      if (dialog.open) dialog.close();
      listeners.abort();
      title.hidden = true;
      play.hidden = false;
      const url = new URL(location.href);
      url.searchParams.delete('title');
      if (!search.has('visual')) url.searchParams.delete('visual');
      history.replaceState(history.state, '', url);
      resolve(selected);
    }

    async function run(action) {
      if (busy) return;
      busy = true;
      status.textContent = '';
      try { await action(); } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (dialog.open) showPanel('無法繼續', paragraph(message));
        else status.textContent = message;
      } finally { busy = false; }
    }

    async function loadSlots() {
      showPanel('讀取存檔', paragraph('正在讀取…'));
      places ??= await fetch('/api/scenes').then(response => response.ok ? response.json() : []);
      if (!dialog.open || slotHeading?.textContent !== '讀取存檔') return;
      const manual = await Promise.allSettled(manualSlots.map(async number => ({
        number, data: await createSaveSlot(initial.saveIdentity, number).read(),
      })));
      if (!dialog.open || slotHeading?.textContent !== '讀取存檔') return;
      const entries = [{ number: autoSlot, data: save }, ...manual.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])]
        .filter(entry => entry.data);
      const list = document.createElement('div');
      list.className = 'title-save-list';
      for (const { number, data } of entries) {
        const where = data.flags?.finished ? '已通關' : data.location.id === 'world' ? '江湖大地圖'
          : places.find(row => row.id === data.location.id)?.name ?? '原作場景';
        const choice = button(`${number === autoSlot ? '自動存檔' : `第 ${number} 槽`} · ${where}`, () => void run(async () => {
          start(number === autoSlot ? data : await autoSave.write(data));
        }));
        choice.dataset.titleSlot = number;
        list.append(choice);
      }
      const importSave = button('匯入桌面存檔', () => void run(async () => {
        const imported = await pickNativeSave();
        if (imported) start(await autoSave.write(imported));
      }));
      importSave.dataset.titleImport = '';
      const body = [entries.length ? list : paragraph('目前沒有存檔。'), importSave];
      if (manual.some(result => result.status === 'rejected')) body.push(paragraph('有不相容的存檔槽，其他存檔仍可讀取。'));
      showPanel('讀取存檔', ...body);
    }

    function showSettings() {
      const form = document.createElement('form');
      const display = document.createElement('select');
      const displayLabel = document.createElement('label');
      display.name = 'visual';
      for (const [value, label] of [['jyx2', '重製 3D'], ['enhanced', '增強 2D'], ['classic', '經典 2D']]) {
        display.append(new Option(label, value));
      }
      display.value = visualStyles.includes(search.get('visual')) ? search.get('visual') : preferences.visual;
      displayLabel.append('畫面', display);
      const audio = document.createElement('input');
      audio.type = 'checkbox';
      audio.name = 'sound';
      audio.checked = preferences.sound;
      const audioLabel = document.createElement('label');
      audioLabel.append('音樂與音效', audio);
      const apply = button('套用', () => {
        preferences.visual = display.value;
        preferences.sound = audio.checked;
        try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch {}
        if (search.has('visual')) {
          search.delete('visual');
          const url = new URL(location.href);
          url.searchParams.delete('visual');
          history.replaceState(history.state, '', url);
        }
        dialog.close();
      }, true);
      form.append(displayLabel, audioLabel, apply);
      showPanel('設定', form);
    }

    const actions = {
      continue: () => start(save),
      new() {
        if (!save) return start(undefined);
        showPanel('開始新遊戲', paragraph('這會替換自動存檔。手動存檔可在讀取存檔中繼續。'),
          button('確定開始', () => void run(async () => start(await autoSave.write(baseline))), true));
      },
      load: loadSlots,
      settings: showSettings,
      help() {
        showPanel('操作說明',
          paragraph('探索時用方向鍵或 WASD 移動，也可點擊地圖。Enter 對話或確認，B 開背包，Esc 開江湖選單。'),
          paragraph('回合中按 M 選擇移動、I 選擇武學，使用方向鍵選格並按 Enter 確定，也可直接點選戰場。B 使用藥品或暗器，T 選擇醫療或用毒，V 查看人物狀態，L 休息並結束回合，Q / F 切換武學，Tab 切換自動戰鬥。'),
          paragraph('標準手柄可用方向鍵或左搖杆移動。A 確認，B 返回，Start 開啟選單。'));
      },
    };
    for (const choice of choices) choice.addEventListener('click', () => void run(actions[choice.dataset.titleAction]), { signal });
    title.addEventListener('keydown', event => {
      if (dialog.open || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const active = choices.filter(choice => !choice.disabled);
      const index = active.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      active[(index + (event.key === 'ArrowDown' ? 1 : active.length - 1)) % active.length].focus();
    }, { signal });
  });
}

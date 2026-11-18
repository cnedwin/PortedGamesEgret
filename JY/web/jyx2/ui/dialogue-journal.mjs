export function createDialogueJournal(entries, { signal, restoreFocus }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'title-dialog dialogue-journal';
  dialog.setAttribute('aria-labelledby', 'dialogue-journal-title');
  const heading = document.createElement('h2');
  heading.id = 'dialogue-journal-title';
  heading.textContent = '對話回看';
  const list = document.createElement('ol');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '返回';
  dialog.append(heading, list, close);
  document.querySelector('main').append(dialog);
  close.addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener('close', restoreFocus, { signal });
  signal.addEventListener('abort', () => {
    if (dialog.open) dialog.close();
    dialog.remove();
  }, { once: true });

  return {
    get open() { return dialog.open; },
    get hasEntries() { return entries.length > 0; },
    record(speaker, text) {
      entries.push({ speaker, text });
      if (entries.length > 60) entries.shift();
    },
    show() {
      if (dialog.open || !entries.length) return;
      list.replaceChildren(...entries.map(({ speaker, text }) => {
        const entry = document.createElement('li');
        const name = document.createElement('strong');
        name.textContent = speaker;
        const line = document.createElement('p');
        line.textContent = text;
        entry.append(name, line);
        return entry;
      }));
      dialog.showModal();
      // Start at the speaker of the latest page, even if its text still needs scrolling.
      const newest = list.lastElementChild;
      list.scrollTop += newest.getBoundingClientRect().top - list.getBoundingClientRect().top;
    },
  };
}

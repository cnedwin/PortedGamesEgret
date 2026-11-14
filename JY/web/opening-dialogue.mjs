import { Bitmap, NineSliceBitmap, Sprite, createAssetRef, createAssetType, createImageData2D, createTexture, isTexture } from '@egret/engine';
import { createTextField } from '@egret/engine/text';

// KYS Talk uses forty width units per line and four lines per page.
export function paginateDialogue(text, lineSeparator = '\n') {
  const lines = [];
  let line = '';
  let units = 0;
  for (const character of text) {
    line += character;
    units += character.codePointAt(0) > 128 ? 2 : 1;
    if (units >= 40) {
      lines.push(line);
      line = '';
      units = 0;
    }
  }
  if (line || !lines.length) lines.push(line);

  const pages = [];
  for (let index = 0; index < lines.length; index += 4) {
    pages.push(lines.slice(index, index + 4).join(lineSeparator));
  }
  return pages;
}

function drawFrame(graphics, x, y, width, height, color) {
  graphics.beginFill(color)
    .drawRect(x, y, width, 1)
    .drawRect(x, y + height - 1, width, 1)
    .drawRect(x, y, 1, height)
    .drawRect(x + width - 1, y, 1, height)
    .endFill();
}

async function createJyx2Skin(engine, owned, panel, scale, panelWidth, panelHeight, portraitWidth, portraitHeight) {
  const type = createAssetType('jyx2-chat-frame', isTexture);
  engine.assets.register(type, {
    async load() {
      const response = await fetch('/jyx2/ui/image-kuangjy.png');
      if (!response.ok) throw new Error(`讀取 JYX2 對話框失敗（${response.status}）`);
      const image = await createImageBitmap(await response.blob());
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const pixels = new Uint8Array(context.getImageData(0, 0, image.width, image.height).data.buffer);
        return createTexture(createImageData2D({ width: image.width, height: image.height, pixels }));
      } finally {
        image.close();
      }
    },
    dispose(texture) { texture.dispose(); },
  });
  const group = engine.createAssetGroup(owned, [createAssetRef(type, 'image-kuangjy.png')]);
  const [lease] = await group.ready;
  const root = panel.addChildAt(owned.use(new Sprite()), 0);
  const background = root.addChild(owned.use(new Sprite()));
  // Unity imports image-kuangjy with 25/27-pixel borders at a 1920-wide reference scale.
  const insets = { left: 25, top: 27, right: 25, bottom: 27 };
  function frame(width, height) {
    const node = root.addChild(owned.use(new NineSliceBitmap(lease, { width: width / scale, height: height / scale, insets })));
    node.scaleX = node.scaleY = scale;
    return node;
  }
  return { root, background, content: frame(panelWidth, panelHeight), portrait: frame(portraitWidth, portraitHeight), name: frame(106, 25) };
}

export function createOpeningDialogue({
  engine, scope, cache, width, height, requestFrame, presentFrame, loadPortrait, speakerName, portraitUrl, onPage, density = 1, bottomDocked,
}) {
  const owned = scope.use(engine.createScope());
  const panel = engine.stage.addChild(owned.use(new Sprite()));
  const margin = 12;
  const panelWidth = width - margin * 2;
  const classicHeight = Math.min(152, height - margin * 2);
  const enhancedHeight = Math.min(166, height - margin * 2);
  const jyx2Height = Math.min(113, height - margin * 2);
  const jyx2PortraitWidth = Math.min(148, Math.round(panelWidth * .24));
  const jyx2PortraitHeight = Math.min(148, jyx2Height + 35);
  let jyx2Skin;
  const classicSkin = panel.addChild(owned.use(new Sprite()));
  const enhancedSkin = panel.addChild(owned.use(new Sprite()));
  const nameBand = enhancedSkin.addChild(owned.use(new Sprite()));
  const portraitFrame = panel.addChild(owned.use(new Sprite()));
  const name = panel.addChild(createTextField(engine, owned, cache));
  const text = panel.addChild(createTextField(engine, owned, cache));
  classicSkin.graphics.beginFill(0x121712, 0.94).drawRect(0, 0, panelWidth, classicHeight).endFill();
  drawFrame(classicSkin.graphics, 0, 0, panelWidth, classicHeight, 0xb39a62);
  enhancedSkin.graphics.beginFill(0x121d17, 0.97).drawRect(0, 0, panelWidth, enhancedHeight).endFill();
  nameBand.graphics
    .beginFill(0x213128).drawRect(5, 5, panelWidth - 10, 30).endFill()
    .beginFill(0x725e3e).drawRect(6, 35, panelWidth - 12, 1).endFill();
  drawFrame(enhancedSkin.graphics, 0, 0, panelWidth, enhancedHeight, 0xc9a86b);
  drawFrame(enhancedSkin.graphics, 4, 4, panelWidth - 8, enhancedHeight - 8, 0x594c37);
  const cardWidth = 112;
  const cardHeight = enhancedHeight - 24;
  portraitFrame.y = 12;
  portraitFrame.graphics.beginFill(0x29362a).drawRect(0, 0, cardWidth, cardHeight).endFill();
  drawFrame(portraitFrame.graphics, 0, 0, cardWidth, cardHeight, 0xa78854);
  drawFrame(portraitFrame.graphics, 3, 3, cardWidth - 6, cardHeight - 6, 0x505840);
  panel.x = margin;
  panel.visible = false;

  const dock = globalThis.document?.getElementById('mobile-dialogue');
  // Keep the gameplay view's aspect ratio while giving dialogue its own space on portrait screens.
  const portraitLayout = dock && globalThis.matchMedia?.('(max-width: 680px) and (orientation: portrait)');
  const dockPortrait = dock?.querySelector('img');
  const dockSpeaker = dock?.querySelector('.mobile-dialogue-speaker');
  const dockCounter = dock?.querySelector('.mobile-dialogue-page');
  const dockText = dock?.querySelector('p');
  let dockPage;
  let portrait;
  let waiter;
  let active = false;
  let closed = false;
  const closedError = new DOMException('Dialogue closed', 'AbortError');

  function closeDock() {
    if (!dockPage) return;
    dockPage = undefined;
    dock.hidden = true;
  }

  function updateDock() {
    dock.hidden = !dockPage || !portraitLayout.matches;
    if (dock.hidden) return;
    const { url, heading, counter, body } = dockPage;
    dockPortrait.hidden = !url;
    if (url && dockPortrait.getAttribute('src') !== url) dockPortrait.src = url;
    dockSpeaker.textContent = heading;
    dockCounter.textContent = counter;
    dockText.textContent = body;
  }

  function resizeDialogue() {
    if (!dockPage) return;
    updateDock();
    panel.visible = !portraitLayout.matches;
    requestFrame();
  }

  portraitLayout?.addEventListener('change', resizeDialogue);

  function abortWait() {
    closed = true;
    portraitLayout?.removeEventListener('change', resizeDialogue);
    closeDock();
    const current = waiter;
    waiter = undefined;
    current?.reject(closedError);
  }

  function close() {
    if (closed) return;
    abortWait();
    owned.dispose();
  }

  owned.signal.addEventListener('abort', abortWait, { once: true });

  function acknowledge(skipRemainingPages) {
    if (!waiter) return false;
    const current = waiter;
    waiter = undefined;
    current.resolve(skipRemainingPages);
    return true;
  }

  function prepareLabel(field, value, fontSize, lineHeight, fontWeight, fillColor) {
    field.setRequest({
      text: value,
      fontFamily: 'Microsoft YaHei',
      fontSize,
      lineHeight,
      fontWeight,
      fontStyle: 'normal',
      locale: 'zh-TW',
      direction: 'ltr',
      density,
      fillColor,
    });
    return field.prepare();
  }

  function placePortrait(lease, right, panelHeight, enhanced) {
    if (!lease) {
      if (portrait) portrait.visible = false;
      return;
    }
    if (portrait) portrait.textureLease = lease;
    else portrait = panel.addChild(owned.use(new Bitmap(lease)));
    const portraitWidth = enhanced ? cardWidth - 10 : 94;
    const heightLimit = panelHeight - (enhanced ? 34 : 24);
    const scale = Math.min(portraitWidth / portrait.naturalWidth, heightLimit / portrait.naturalHeight);
    const visualWidth = portrait.naturalWidth * scale;
    portrait.scaleX = portrait.scaleY = scale;
    portrait.x = enhanced ? portraitFrame.x + Math.round((cardWidth - visualWidth) / 2)
      : right ? panelWidth - 12 - visualWidth : 12;
    portrait.y = Math.round((panelHeight - portrait.naturalHeight * scale) / 2);
    portrait.visible = true;
  }

  async function talk({ text: content, head, style, voice, item, speakerName: overrideName }) {
    if (closed) throw closedError;
    if (active) throw new Error('Another dialogue is already active');
    active = true;
    try {
      const compact = bottomDocked?.();
      const lower = compact || style % 2 === 1;
      const wantsJyx2 = globalThis.document?.body?.dataset.art === 'jyx2';
      const lease = head >= 0 && style !== 2 && style !== 3 ? await loadPortrait(head) : undefined;
      if (wantsJyx2 && jyx2Skin === undefined) {
        jyx2Skin = await createJyx2Skin(engine, owned, panel, Math.min(1 / 3, width / 1920), panelWidth,
          jyx2Height, jyx2PortraitWidth, jyx2PortraitHeight).catch(error => {
            if (closed) throw closedError;
            console.warn(error);
            return null;
          });
      }
      const jyx2 = wantsJyx2 && Boolean(jyx2Skin);
      const right = jyx2 ? head === 0 : style === 1 || style === 4;
      if (closed) throw closedError;
      const enhanced = globalThis.document?.body?.dataset.visual !== 'classic';
      const panelHeight = jyx2 && !item ? jyx2Height : enhanced ? enhancedHeight : classicHeight;
      const hasPortrait = Boolean(lease && !item);
      const portraitWidth = jyx2 ? jyx2PortraitWidth : enhanced ? cardWidth : 94;
      const fontSize = Math.max(10, Math.min(22, Math.floor((panelWidth - portraitWidth - 32) / 21)));
      const textSize = jyx2 ? Math.min(compact ? 14 : 18, fontSize) : fontSize;
      const heading = enhanced && !item && head >= 0 ? overrideName ?? speakerName?.(head) : undefined;
      classicSkin.visible = !enhanced;
      enhancedSkin.visible = enhanced && !jyx2;
      nameBand.visible = name.visible = Boolean(heading);
      portraitFrame.visible = enhanced && !jyx2 && hasPortrait;
      portraitFrame.x = right ? panelWidth - 12 - cardWidth : 12;
      panel.y = lower ? height - panelHeight - margin : margin;
      text.x = hasPortrait && !right ? portraitWidth + (enhanced ? 22 : 24) : enhanced ? 17 : 14;
      text.y = item ? Math.round(panelHeight * 0.63) : heading ? 43 : enhanced ? 19 : 15;
      name.x = text.x;
      name.y = 10;
      placePortrait(item ?? lease, right, panelHeight, enhanced && !item);
      if (jyx2Skin) jyx2Skin.root.visible = jyx2;
      if (jyx2) {
        const { content, background, portrait: frame, name: badge } = jyx2Skin;
        const portraitHeight = hasPortrait ? jyx2PortraitHeight : panelHeight;
        panel.y = lower ? height - panelHeight - margin : margin + Math.max(0, portraitHeight - panelHeight);
        const contentWidth = hasPortrait ? panelWidth - jyx2PortraitWidth : panelWidth;
        content.x = hasPortrait && !right ? jyx2PortraitWidth : 0;
        content.resize(contentWidth / content.scaleX, panelHeight / content.scaleY);
        frame.visible = hasPortrait;
        frame.x = right ? panelWidth - jyx2PortraitWidth : 0;
        frame.y = panelHeight - portraitHeight;
        badge.visible = Boolean(heading);
        badge.x = right && hasPortrait ? contentWidth - 106 : content.x;
        badge.y = -24;
        background.graphics.clear();
        background.graphics.beginFill(0x101313, .69).drawRect(content.x + 4, 3, contentWidth - 8, panelHeight - 6).endFill();
        if (heading) background.graphics.beginFill(0x101313, .8).drawRect(badge.x + 3, badge.y + 3, 100, 19).endFill();
        if (!hasPortrait && heading && !lower) panel.y += 24;
        text.x = content.x + 14;
        if (!item) text.y = 12;
        name.x = badge.x + Math.max(8, Math.round((106 - Array.from(heading ?? '').length * 15) / 2));
        name.y = -20;
        if (hasPortrait) {
          const scale = Math.min((jyx2PortraitWidth - 12) / portrait.naturalWidth, (portraitHeight - 12) / portrait.naturalHeight);
          portrait.scaleX = portrait.scaleY = scale;
          portrait.x = frame.x + Math.round((jyx2PortraitWidth - portrait.naturalWidth * scale) / 2);
          portrait.y = frame.y + Math.round((portraitHeight - portrait.naturalHeight * scale) / 2);
        }
      }
      if (item) {
        portrait.scaleX = portrait.scaleY = Math.min(2, 70 / portrait.naturalHeight, 100 / portrait.naturalWidth);
        portrait.x = Math.round((panelWidth - portrait.naturalWidth * portrait.scaleX) / 2);
        portrait.y = 10;
        text.x = Math.max(14, Math.round((panelWidth - content.length * textSize) / 2));
      }
      if (heading) await prepareLabel(name, heading, jyx2 ? 15 : 17, 22, jyx2 ? 400 : 700, jyx2 ? 0xffffff : 0xe9c78c);
      const pages = paginateDialogue(content);
      const dockPages = portraitLayout && !item && paginateDialogue(content, '');
      const url = dockPages && hasPortrait && portraitUrl?.(head);
      for (let index = 0; index < pages.length; index++) {
        const pageText = pages[index];
        await prepareLabel(text, pageText, textSize, textSize + (enhanced ? 5 : 8), 400, jyx2 ? 0xffffff : enhanced ? 0xf9ecd0 : 0xfff4dc);
        if (closed) throw closedError;
        panel.visible = !dockPages || !portraitLayout.matches;
        requestFrame();
        await presentFrame();
        if (closed) throw closedError;
        try {
          const skipped = await new Promise((resolve, reject) => {
            waiter = { resolve, reject };
            if (dockPages) {
              dockPage = { url, heading: heading ?? '', counter: pages.length > 1 ? `${index + 1}/${pages.length}` : '', body: dockPages[index] };
              updateDock();
            }
            onPage?.({ text: pageText, head, style, voice, page: index + 1, pages: pages.length });
          });
          if (skipped) break;
        } finally {
          waiter = undefined;
        }
      }
    } finally {
      active = false;
      closeDock();
      if (!closed) {
        panel.visible = false;
        requestFrame();
      }
    }
  }

  return {
    talk,
    confirm: () => acknowledge(false),
    skip: () => acknowledge(true),
    close,
    get waiting() { return waiter !== undefined; },
  };
}

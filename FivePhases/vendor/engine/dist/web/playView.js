// SPDX-License-Identifier: Apache-2.0
// Views of play: a screen described as data (./view.js), drawn with the game's own sprites and texts on its ui layer
// in a skin, and kept to the game's state by a table of bindings read every frame. Named parts reach code through
// `get`, tests and assistive technology through the semantic tree when the game gives one, and a screen stack through
// the handle a view is.
import { EgretError } from '@egret/runtime';
import { checkView, planView } from './view.js';
import { keyCap } from './viewParts.js';
import { createPlayViewScrolls } from './playViewScroll.js';
// Keep declarative loads within BrowserGame's image budget across all views in this host.
const MAX_VIEW_IMAGE_LOADS = 4;
const KEYS_OF = {
    panel: ['visible', 'color', 'tap', 'pointerOnly', 'badge'],
    text: ['text', 'pick', 'format', 'roll', 'visible', 'color', 'badge'],
    button: ['text', 'pick', 'format', 'roll', 'disabled', 'visible', 'color', 'tap', 'badge'],
    bar: ['value', 'visible', 'color'],
    toggle: ['text', 'checked', 'disabled', 'visible', 'tap', 'badge'],
    space: ['visible'],
    image: ['visible']
};
/** Views of one play game: made by `game.view`, read every frame, placed again when the screen changes. */
export function createPlayViews(game, hooks) {
    const live = new Set();
    const scrollInput = createPlayViewScrolls(game);
    const makeScroll = scrollInput.create;
    let paragraphModule;
    let counter = 0;
    const waitingImages = new Set();
    let loadingImages = 0;
    function startWaitingImages() {
        for (const load of waitingImages) {
            if (loadingImages >= MAX_VIEW_IMAGE_LOADS)
                break;
            waitingImages.delete(load);
            loadingImages++;
            void load().finally(() => {
                loadingImages--;
                startWaitingImages();
            });
        }
    }
    function queueImage(load) {
        waitingImages.add(load);
        startWaitingImages();
        return () => {
            waitingImages.delete(load);
        };
    }
    let focused, modalOwner;
    const beforeModal = new WeakMap();
    const topModal = () => {
        let modal;
        for (const view of live)
            if (view.modal())
                modal = view;
        return modal;
    };
    const inView = (owner, modal = topModal()) => modal === undefined || modal === owner;
    const targets = (only) => {
        const modal = topModal();
        return [...live]
            .filter(owner => inView(owner, modal) && (only === undefined || owner === only))
            .flatMap(owner => owner.targets().map(name => ({ owner, name })));
    };
    const eligible = (target) => target !== undefined && live.has(target.owner) && inView(target.owner) && target.owner.eligible(target.name);
    const focus = (next) => {
        if (next?.owner === focused?.owner && next?.name === focused?.name)
            return;
        focused?.owner.focusMark(focused.name, false);
        focused = next;
        focused?.owner.focusMark(focused.name, true);
    };
    const syncModalFocus = () => {
        const modal = topModal();
        if (modal === modalOwner)
            return;
        const previous = modalOwner;
        modalOwner = modal;
        if (modal !== undefined && !beforeModal.has(modal)) {
            beforeModal.set(modal, focused);
            const name = modal.initialFocus;
            focus(name !== undefined && modal.reveal(name) ? { owner: modal, name } : targets().find(eligible));
            return;
        }
        let restore = previous === undefined ? undefined : beforeModal.get(previous);
        if (previous !== undefined)
            beforeModal.delete(previous);
        // A covered dialog can be dismissed before the one covering it.
        while (restore !== undefined && !live.has(restore.owner)) {
            const saved = beforeModal.get(restore.owner);
            beforeModal.delete(restore.owner);
            restore = saved;
        }
        focus(eligible(restore) ? restore : targets().find(eligible));
    };
    const moveFocus = (step, wrap, only) => {
        const choices = targets(only);
        const current = choices.findIndex(next => next.owner === focused?.owner && next.name === focused.name);
        const start = current < 0 ? (step > 0 ? 0 : choices.length - 1) : current + step;
        for (let offset = 0; offset < choices.length; offset++) {
            let index = start + offset * step;
            if (index < 0 || index >= choices.length) {
                if (!wrap)
                    break;
                index = (index + choices.length) % choices.length;
            }
            const next = choices[index];
            if (next.owner.reveal(next.name)) {
                focus(next);
                return true;
            }
        }
        return false;
    };
    function view(description, options = {}) {
        const names = checkView(description);
        if (options === null || typeof options !== 'object')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'options' });
        const bind = options.bind ?? {};
        if (bind === null || typeof bind !== 'object')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'bind' });
        for (const [name, binding] of Object.entries(bind)) {
            const type = names.get(name);
            if (type === undefined)
                throw new EgretError('UI_VIEW_BINDING_UNKNOWN', {
                    cause: name + ' is not a name of the view; it has ' + ([...names.keys()].join(', ') || 'no names')
                });
            if (binding === null || typeof binding !== 'object')
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': a binding is an object' });
            for (const [key, value] of Object.entries(binding)) {
                if (!KEYS_OF[type].includes(key))
                    throw new EgretError('UI_VIEW_BINDING_INVALID', {
                        cause: name + ' is a ' + type + ', which binds ' + KEYS_OF[type].join(', ') + ', not ' + key
                    });
                const ok = key === 'roll'
                    ? typeof value === 'number' && Number.isFinite(value) && value >= 0
                    : key === 'pointerOnly'
                        ? typeof value === 'boolean'
                        : typeof value === 'function';
                if (!ok)
                    throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': ' + key });
            }
            if (binding.text !== undefined && binding.pick !== undefined)
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': text or pick, not both' });
            if (binding.pointerOnly === true && binding.tap === undefined)
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': pointerOnly needs tap' });
        }
        const initialFocus = options.initialFocus;
        if (initialFocus !== undefined) {
            const type = typeof initialFocus === 'string' ? names.get(initialFocus) : undefined;
            const interactive = type === 'button' ||
                type === 'toggle' ||
                (type === 'panel' && bind[initialFocus]?.tap !== undefined && bind[initialFocus]?.pointerOnly !== true);
            if (description.modal !== true || !interactive)
                throw new EgretError('UI_VIEW_BINDING_INVALID', {
                    cause: 'initialFocus names a focusable part on a modal view'
                });
        }
        if (options.built !== undefined && typeof options.built !== 'function')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'built' });
        const richStyle = (part) => (part.type === 'text' || part.type === 'button' ? part.paragraph : undefined);
        const usesParagraph = (part) => richStyle(part) !== undefined || (part.type === 'panel' && (part.children?.some(usesParagraph) ?? false));
        const paragraphCache = options.paragraphCache;
        if (paragraphCache === undefined &&
            (usesParagraph(description.root) || (description.portrait !== undefined && usesParagraph(description.portrait))))
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'paragraph parts need a paragraphCache' });
        if (options.gamepad !== undefined && typeof options.gamepad !== 'boolean')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'gamepad takes a boolean' });
        for (const key of ['dismiss', 'resume'])
            if (options[key] !== undefined && (description.modal !== true || typeof options[key] !== 'function'))
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: key + ' takes a callback on a modal view' });
        const invoke = (callback) => {
            try {
                callback?.(api);
            }
            catch (cause) {
                hooks.failed(cause);
            }
        };
        const id = 'view' + ++counter;
        const state = () => (typeof options.state === 'function' ? options.state() : options.state);
        const root = game.sprite(undefined, game.ui);
        let dim;
        let plan;
        let paragraphScope;
        let made = [];
        let shown = true, active = true, ended = false;
        const rolls = new Map();
        const removals = [];
        const scrollHandles = new Map();
        let scrollItems = [];
        const frame = () => ({ screen: game.screen, safe: game.safe, orientation: game.orientation });
        const colourOf = (part, item) => {
            const skin = plan.skin;
            if (item.color !== undefined)
                return item.color;
            if (part.type === 'button')
                return item.disabled ? skin.disabled : (part.color ?? skin.button);
            if (part.type === 'bar')
                return part.color ?? skin.accent;
            if (part.type === 'panel')
                return part.color ?? skin.panel;
            if (part.type === 'text')
                return part.color ?? skin.text;
            return skin.text;
        };
        const borderWidth = ({ part, rect }) => Math.min(part.border?.width ?? 0, rect.width / 2, rect.height / 2);
        const placeImage = (item) => {
            if (item.image === undefined)
                return;
            const { width, height } = item.rect;
            const border = borderWidth(item);
            const source = item.image.getBounds();
            // The cover fits inside the same edge used by the border paint.
            const scale = source.width > 0 && source.height > 0
                ? Math.min((width - border * 2) / source.width, (height - border * 2) / source.height)
                : 0;
            item.image.visible = scale > 0;
            item.image.x = width / 2;
            item.image.y = height / 2;
            item.image.scaleX = item.image.scaleY = scale;
        };
        const paintParagraph = (item) => {
            const { paragraph, part, rect } = item;
            if (part.type !== 'text' && part.type !== 'button')
                return;
            const style = part.paragraph;
            if (paragraph === undefined || style === undefined)
                return;
            const button = part.type === 'button';
            const at = button ? Math.min(8, rect.width / 2) : 0;
            const y = button ? Math.min(rect.height, Math.ceil((part.size ?? Math.round(plan.skin.size * 0.9)) + 12)) : 0;
            const width = rect.width - at * 2;
            const height = rect.height - y;
            paragraph.box.x = at;
            paragraph.box.y = y;
            paragraph.box.visible = width >= 1 && height > 0;
            if (!paragraph.box.visible) {
                paragraph.key = undefined;
                return;
            }
            paragraph.box.clipRect = { x: 0, y: 0, width, height };
            const text = button ? part.description : item.text;
            const size = button ? Math.ceil((part.size ?? plan.skin.size) * 0.72) : (part.size ?? plan.skin.size);
            const color = button ? (part.textColor ?? plan.skin.buttonText) : colourOf(part, item);
            const key = JSON.stringify([text, size, color, width]);
            if (key === paragraph.key)
                return;
            paragraph.key = key;
            paragraph.text.setRequest({
                ...style,
                text,
                width,
                fontSize: size,
                direction: style.direction ?? 'ltr',
                locale: style.locale ?? 'en',
                textAlign: !button && part.type === 'text' ? (part.align ?? 'left') : 'center',
                fillColor: color,
                density: 1
            });
            void paragraph.text.prepare().catch(cause => {
                if (!(cause instanceof EgretError && cause.code === 'PARAGRAPH_STALE') &&
                    !ended &&
                    !paragraph.text.isDisposed &&
                    paragraph.key === key)
                    hooks.failed(cause);
            });
        };
        // Draws one part at its size; called when it is made, placed again or changed.
        const paint = (item) => {
            const { part, node, rect } = item, skin = plan.skin, g = node.graphics, r = skin.radius;
            g.clear();
            node.hitArea = { x: 0, y: 0, width: rect.width, height: rect.height };
            if (part.type === 'panel' && (part.card === true || part.color !== undefined || item.color !== undefined))
                g.beginFill(colourOf(part, item), part.alpha ?? skin.panelAlpha)
                    .drawRoundRect(0, 0, rect.width, rect.height, r * 2)
                    .endFill();
            if (part.type === 'button')
                g.beginFill(colourOf(part, item))
                    .drawRoundRect(0, 0, rect.width, rect.height, r * 2)
                    .endFill();
            if (part.type === 'bar') {
                g.beginFill(skin.track)
                    .drawRoundRect(0, 0, rect.width, rect.height, Math.min(r * 2, rect.height))
                    .endFill();
                const fill = Math.max(0, Math.min(1, item.value)) * rect.width;
                if (fill > 0)
                    g.beginFill(colourOf(part, item))
                        .drawRoundRect(0, 0, fill, rect.height, Math.min(r * 2, rect.height, fill))
                        .endFill();
            }
            if (part.type === 'toggle') {
                const h = Math.min(rect.height * 0.7, 30), w = h * 1.8, x = rect.width - w, y = (rect.height - h) / 2;
                g.beginFill(item.disabled ? skin.disabled : item.checked ? skin.accent : skin.track)
                    .drawRoundRect(x, y, w, h, h)
                    .endFill()
                    .beginFill(0xffffff)
                    .drawCircle(item.checked ? x + w - h / 2 : x + h / 2, y + h / 2, h / 2 - 3)
                    .endFill();
            }
            if (part.border !== undefined) {
                const { width, height } = rect;
                const edge = borderWidth(item);
                if (edge > 0) {
                    g.beginFill(part.border.color)
                        .drawRect(0, 0, width, edge)
                        .drawRect(0, height - edge, width, edge)
                        .drawRect(0, edge, edge, height - edge * 2)
                        .drawRect(width - edge, edge, edge, height - edge * 2)
                        .endFill();
                }
            }
            const words = item.words;
            if (words !== undefined) {
                words.text = item.text;
                if (part.type === 'button') {
                    words.x = rect.width / 2;
                    words.color = part.textColor ?? skin.buttonText;
                }
                else if (part.type === 'text') {
                    words.x = part.align === 'center' ? rect.width / 2 : part.align === 'right' ? rect.width : 0;
                    words.color = colourOf(part, item);
                }
                else
                    words.x = 0;
                words.y =
                    part.type === 'button' && part.description !== undefined
                        ? Math.min(rect.height / 2, (part.size ?? Math.round(skin.size * 0.9)) / 2 + 6)
                        : rect.height / 2;
                if (part.type === 'toggle')
                    words.alpha = item.disabled ? 0.5 : 1;
            }
            paintParagraph(item);
            placeImage(item);
            node.visible = item.visible;
            if (item.dot !== undefined) {
                const { node: dot, words: count } = item.dot;
                dot.visible = item.badge !== false;
                if (item.badge !== false) {
                    const label = item.badge === true ? '' : item.badge > 99 ? '99+' : String(item.badge), h = label === '' ? 12 : 20, w = label === '' ? 12 : Math.max(20, label.length * 8 + 10);
                    dot.x = rect.width - w / 2 - 2;
                    dot.y = 2 - h / 4;
                    dot.graphics
                        .clear()
                        .beginFill(0xef4444)
                        .drawRoundRect(-w / 2, -h / 2, w, h, h)
                        .endFill();
                    count.text = label;
                    count.x = 0;
                    count.y = 0;
                }
            }
        };
        const nameOf = (item) => item.part.name;
        const bindingOf = (item) => {
            const name = nameOf(item);
            return name === undefined ? undefined : bind[name];
        };
        const hasAction = (item) => item.part.type === 'button' ||
            item.part.type === 'toggle' ||
            (item.part.type === 'panel' && bindingOf(item)?.tap !== undefined);
        const pointerOnly = (item) => bindingOf(item)?.pointerOnly === true;
        const isShown = () => !ended && shown && visibleOnStage(root, game.browser.stage);
        const allowsInput = () => active && isShown() && inView(record);
        const hasInput = (item) => active &&
            item.visible &&
            !item.disabled &&
            hasAction(item) &&
            visibleOnStage(item.node, game.browser.stage, true);
        const followsInput = (item) => allowsInput() && hasInput(item);
        const followsFocus = (item) => followsInput(item) && !pointerOnly(item);
        const stageRect = (item) => visibleRect(item.node, item.node.hitArea ?? { x: 0, y: 0, width: item.rect.width, height: item.rect.height }, game.screen);
        const actionable = (item) => followsInput(item) && stageRect(item) !== undefined;
        const canFocus = (item) => actionable(item) && !pointerOnly(item);
        const revealForTab = (item) => {
            if (!followsFocus(item))
                return false;
            const offsets = [];
            const box = item.node.hitArea ?? { x: 0, y: 0, width: item.rect.width, height: item.rect.height };
            for (let above = item.scrollParent; above !== undefined; above = above.scrollParent) {
                const viewport = above.scroll;
                offsets.push({ viewport, offset: viewport.offset });
                viewport.reveal(item.node, box);
            }
            if (canFocus(item))
                return true;
            // A candidate hidden by an unrelated clip cannot move the list during keyboard traversal.
            for (const { viewport, offset } of offsets)
                viewport.scrollTo(offset);
            return false;
        };
        const press = (item) => {
            if (!actionable(item))
                return;
            const name = nameOf(item);
            if (name !== undefined && !pointerOnly(item))
                focus({ owner: record, name });
            const binding = bindingOf(item);
            try {
                binding?.tap?.(state());
            }
            catch (cause) {
                hooks.failed(cause);
            }
            refresh();
        };
        const visibleUp = (item) => {
            for (let at = made.indexOf(item); at >= 0; at = plan.parts[at].parent)
                if (!made[at].visible)
                    return false;
            return true;
        };
        const syncScrollLayout = () => {
            if (scrollItems.length === 0)
                return;
            const sizes = new Map();
            const visible = [];
            for (const [index, item] of made.entries()) {
                const { parent, rect } = plan.parts[index];
                if (item.scroll !== undefined && item.part.type === 'panel')
                    sizes.set(item, { y: rect.y, padding: item.part.padding ?? 0, contentLength: 0 });
                visible[index] = item.visible && (parent < 0 || visible[parent] === true);
                if (!visible[index] || item.scrollParent === undefined)
                    continue;
                const viewport = sizes.get(item.scrollParent);
                // A nested viewport contributes its own bounds. Its children belong only to that viewport.
                const end = rect.y - viewport.y + rect.height + viewport.padding;
                viewport.contentLength = Math.max(viewport.contentLength, end);
            }
            for (const item of scrollItems)
                item.scroll.layout(item.rect.width, item.rect.height, sizes.get(item).contentLength);
        };
        const disposeScrolls = () => {
            for (const item of scrollItems)
                item.scroll.dispose();
            scrollItems = [];
        };
        // Each part is inside its panel; a scroll panel holds the parts in its moving content.
        const build = (offsets = new Map()) => {
            plan = planView(description, frame());
            made = [];
            for (const planned of plan.parts) {
                const { part } = planned;
                const container = planned.parent < 0 ? undefined : made[planned.parent];
                const parent = container?.scroll?.content ?? container?.node ?? root;
                const node = game.sprite(undefined, parent);
                const scroll = part.type === 'panel' && part.scroll === 'vertical'
                    ? makeScroll(node, offsets.get(part.name ?? '') ?? 0, () => allowsInput() && visibleOnStage(node, game.browser.stage, true))
                    : undefined;
                const start = part.type === 'text' || part.type === 'button' || part.type === 'toggle' ? String(part.text ?? '') : '';
                const words = (part.type === 'text' && part.paragraph === undefined) || part.type === 'button' || part.type === 'toggle'
                    ? game.text(start, {
                        layer: node,
                        size: part.size ?? (part.type === 'text' ? plan.skin.size : Math.round(plan.skin.size * 0.9)),
                        align: part.type === 'button' ? 'center' : part.type === 'text' ? (part.align ?? 'left') : 'left',
                        baseline: 'middle',
                        ...(part.type === 'text' && part.bold !== undefined ? { bold: part.bold } : {}),
                        ...(part.type === 'button' ? { bold: true } : {})
                    })
                    : undefined;
                const previous = rolls.get(part.name ?? '');
                const item = {
                    part,
                    node,
                    scroll,
                    scrollParent: container?.scroll === undefined ? container?.scrollParent : container,
                    words,
                    paragraph: undefined,
                    image: undefined,
                    rect: relative(planned.rect, planned.parent < 0 ? undefined : plan.parts[planned.parent].rect),
                    visible: part.visible ?? true,
                    disabled: false,
                    checked: part.type === 'toggle' ? (part.checked ?? false) : false,
                    value: part.type === 'bar' ? (part.value ?? 1) : 0,
                    color: undefined,
                    text: previous !== undefined ? String(previous.shown) : start,
                    badge: false,
                    dot: undefined,
                    focusMark: undefined
                };
                if (richStyle(part) !== undefined) {
                    paragraphScope ??= game.engine.createScope();
                    const box = game.sprite(undefined, node);
                    const owner = paragraphScope;
                    paragraphModule ??= import('./playViewParagraph.js');
                    void paragraphModule
                        .then(({ createParagraph }) => {
                        if (ended || !made.includes(item) || owner.state !== 'open')
                            return;
                        const text = createParagraph(game.engine, owner, paragraphCache);
                        box.addChild(text);
                        item.paragraph = { box, text, key: undefined };
                        paintParagraph(item);
                    })
                        .catch(cause => {
                        if (!ended && made.includes(item))
                            hooks.failed(cause);
                    });
                }
                if (part.type === 'image') {
                    item.cancelImage = queueImage(() => game.image(part.src, { layer: node }).then(image => {
                        if (ended || !made.includes(item)) {
                            game.remove(image);
                            return;
                        }
                        item.image = image;
                        placeImage(item);
                    }, cause => {
                        if (!ended && made.includes(item))
                            hooks.failed(cause);
                    }));
                }
                if (part.name !== undefined && bind[part.name]?.badge !== undefined) {
                    const dot = game.sprite(undefined, node);
                    item.dot = {
                        node: dot,
                        words: game.text('', {
                            layer: dot,
                            size: 13,
                            align: 'center',
                            baseline: 'middle',
                            bold: true,
                            color: 0xffffff
                        })
                    };
                }
                node.x = item.rect.x;
                node.y = item.rect.y;
                made.push(item);
                if (scroll !== undefined)
                    scrollItems.push(item);
                const binding = part.name === undefined ? undefined : bind[part.name];
                if (part.type === 'button' || part.type === 'toggle' || (part.type === 'panel' && binding?.tap !== undefined))
                    game.onTap(node, () => press(item));
            }
            if (description.modal === true && dim === undefined) {
                // Behind the parts and over all else: presses that miss the view end here.
                dim = game.sprite(undefined, root);
                root.setChildIndex(dim, 0);
                game.onTap(dim, () => { });
            }
            placeDim();
            read(0);
            for (const item of made)
                paint(item);
            syncScrollLayout();
            if (options.built !== undefined) {
                try {
                    options.built(api);
                }
                catch (cause) {
                    hooks.failed(cause);
                }
            }
        };
        const placeDim = () => {
            if (dim === undefined)
                return;
            const screen = game.screen;
            dim.graphics
                .clear()
                .beginFill(0x000000, plan.skin.dim)
                .drawRect(screen.x, screen.y, screen.width, screen.height)
                .endFill();
            dim.hitArea = { x: screen.x, y: screen.y, width: screen.width, height: screen.height };
        };
        // Reads every binding; repaints only what changed.
        const read = (seconds) => {
            if (ended)
                return false;
            let any = false;
            let scrollLayoutChanged = false;
            const now = state();
            for (const item of made) {
                const binding = bindingOf(item);
                if (binding === undefined)
                    continue;
                const before = `${item.visible}|${item.disabled}|${item.checked}|${item.value}|${item.color}|${item.text}|${item.badge}`;
                if (binding.badge !== undefined) {
                    const value = binding.badge(now);
                    item.badge = value === true ? true : typeof value === 'number' && value >= 1 ? Math.floor(value) : false;
                }
                if (binding.visible !== undefined) {
                    const visible = binding.visible(now) === true;
                    if (item.visible !== visible)
                        scrollLayoutChanged = true;
                    item.visible = visible;
                }
                if (binding.disabled !== undefined)
                    item.disabled = binding.disabled(now) === true;
                if (binding.checked !== undefined)
                    item.checked = binding.checked(now) === true;
                if (binding.value !== undefined) {
                    const value = binding.value(now);
                    item.value = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
                }
                if (binding.color !== undefined) {
                    const value = binding.color(now);
                    item.color = Number.isInteger(value) && value >= 0 && value <= 0xffffff ? value : undefined;
                }
                if (binding.text !== undefined)
                    item.text = String(binding.text(now));
                if (binding.pick !== undefined) {
                    const target = binding.pick(now);
                    const name = item.part.name;
                    let roll = rolls.get(name);
                    if (typeof target === 'number' && Number.isFinite(target)) {
                        if (roll === undefined) {
                            roll = { from: target, to: target, shown: target, left: 0 };
                            rolls.set(name, roll);
                        }
                        else if (roll.to !== target) {
                            roll.from = roll.shown;
                            roll.to = target;
                            roll.left = binding.roll ?? 0;
                        }
                        if (roll.left > 0 && seconds > 0) {
                            roll.left = Math.max(0, roll.left - seconds);
                            const t = 1 - roll.left / (binding.roll ?? 1);
                            const eased = 1 - (1 - t) * (1 - t);
                            roll.shown = roll.left === 0 ? roll.to : roll.from + (roll.to - roll.from) * eased;
                        }
                        else if (roll.left <= 0)
                            roll.shown = roll.to;
                        const whole = roll.left > 0 ? Math.round(roll.shown) : roll.shown;
                        item.text = binding.format !== undefined ? String(binding.format(whole)) : String(Math.round(whole));
                    }
                }
                const after = `${item.visible}|${item.disabled}|${item.checked}|${item.value}|${item.color}|${item.text}|${item.badge}`;
                if (after !== before) {
                    paint(item);
                    any = true;
                }
            }
            if (scrollLayoutChanged)
                syncScrollLayout();
            return any;
        };
        const refresh = () => {
            try {
                read(0);
            }
            catch (cause) {
                hooks.failed(cause);
            }
        };
        const find = (name) => {
            const index = typeof name === 'string' ? plan.names.get(name) : undefined;
            if (index === undefined)
                throw new EgretError('UI_VIEW_NAME_UNKNOWN', {
                    cause: String(name) + ' is not a name of the view; it has ' + ([...plan.names.keys()].join(', ') || 'no names')
                });
            return made[index];
        };
        // Semantics: the view as a group, or a dialog when modal, and each named part as what it is.
        const semantics = hooks.semantics();
        const registerSemantics = () => {
            if (semantics === undefined)
                return;
            const top = semantics.add({
                id,
                role: description.modal === true ? 'dialog' : 'group',
                describe: () => ({
                    ...(description.label !== undefined ? { name: description.label } : {}),
                    bounds: stageRect(made[0]) ?? EMPTY,
                    hidden: !isShown(),
                    ...(description.modal === true ? { modal: active } : {})
                })
            });
            removals.push(() => top.remove());
            // Named parts in the order of the first tree; each inside its nearest named panel.
            const first = planView(description, frame());
            for (const planned of first.parts) {
                const name = planned.part.name;
                if (name === undefined || planned.part.type === 'space')
                    continue;
                let parent = id;
                for (let at = planned.parent; at >= 0; at = first.parts[at].parent) {
                    const above = first.parts[at].part;
                    if (above.name !== undefined) {
                        parent = id + ':' + above.name;
                        break;
                    }
                }
                const type = planned.part.type;
                const role = type === 'panel'
                    ? 'group'
                    : type === 'text'
                        ? 'text'
                        : type === 'button'
                            ? 'button'
                            : type === 'bar'
                                ? 'progressbar'
                                : type === 'image'
                                    ? 'image'
                                    : 'switch';
                const label = planned.part.label;
                semantics.add({
                    id: id + ':' + name,
                    role,
                    parent,
                    describe: () => {
                        const item = find(name);
                        const rect = stageRect(item), hidden = !isShown() ||
                            !visibleOnStage(item.node, game.browser.stage) ||
                            (role !== 'group' && rect === undefined), enabled = rect !== undefined && hasInput(item), base = {
                            bounds: rect ?? EMPTY,
                            hidden,
                            focused: enabled && !pointerOnly(item) && allowsInput() && focused?.owner === record && focused.name === name
                        };
                        if (role === 'group')
                            return { ...base, name: label ?? name, disabled: hasAction(item) && !pointerOnly(item) && !enabled };
                        if (role === 'image') {
                            const imageLabel = item.part.type === 'image' ? item.part.label : undefined;
                            return { ...base, name: imageLabel ?? '', hidden: hidden || !imageLabel };
                        }
                        if (role === 'progressbar')
                            return { ...base, name: label ?? name, range: { now: Math.round(item.value * 100), min: 0, max: 100 } };
                        if (role === 'switch')
                            return { ...base, name: item.text, checked: item.checked, disabled: !enabled };
                        if (role === 'button') {
                            const detail = item.part.type === 'button' ? item.part.description?.replace(/\s+/gu, ' ').trim() : '';
                            // Preserve the title and keep its optional detail within the semantic name limit.
                            const detailLimit = 1024 - item.text.length - 2;
                            const suffix = detailLimit > 0
                                ? detail
                                    ?.slice(0, detailLimit)
                                    .replace(/[\uD800-\uDBFF]$/u, '')
                                    .trimEnd()
                                : '';
                            return { ...base, name: suffix ? item.text + '. ' + suffix : item.text, disabled: !enabled };
                        }
                        return { ...base, name: item.text };
                    },
                    ...(role === 'button' ||
                        role === 'switch' ||
                        (role === 'group' && bind[name]?.tap !== undefined && bind[name]?.pointerOnly !== true)
                        ? {
                            onActivate: () => press(find(name)),
                            onFocus() {
                                if (canFocus(find(name)))
                                    focus({ owner: record, name });
                            }
                        }
                        : {})
                });
            }
        };
        const releaseContent = () => {
            paragraphScope?.dispose();
            paragraphScope = undefined;
            for (const item of made) {
                item.cancelImage?.();
                for (const child of [item.words, item.dot?.words, item.image])
                    if (child !== undefined)
                        game.remove(child);
            }
        };
        const api = {
            get: name => find(name).node,
            rect: name => {
                const item = find(name);
                return Object.freeze({ ...plan.parts[made.indexOf(item)].rect });
            },
            shows: name => shown && !ended && visibleUp(find(name)),
            badge: name => find(name).badge,
            scroll(name) {
                const current = () => {
                    const viewport = find(name).scroll;
                    if (viewport === undefined)
                        throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': expected a scroll panel' });
                    return viewport;
                };
                current();
                let handle = scrollHandles.get(name);
                if (handle === undefined) {
                    handle = Object.freeze({
                        get offset() {
                            return current().offset;
                        },
                        get maximum() {
                            return current().maximum;
                        },
                        scrollTo: (position) => current().scrollTo(position),
                        scrollBy: (delta) => current().scrollBy(delta),
                        page: (direction) => current().page(direction)
                    });
                    scrollHandles.set(name, handle);
                }
                return handle;
            },
            get variant() {
                return plan.variant;
            },
            get visible() {
                return shown && !ended;
            },
            get focused() {
                return focused?.owner === record && eligible(focused) ? focused.name : undefined;
            },
            focus(name) {
                if (!live.has(record) || !allowsInput() || !revealForTab(find(name)))
                    return false;
                focus({ owner: record, name });
                return true;
            },
            refresh,
            show() {
                if (ended)
                    return;
                shown = true;
                root.visible = true;
                syncModalFocus();
            },
            hide() {
                shown = false;
                root.visible = false;
                syncModalFocus();
            },
            cover() {
                api.hide();
            },
            reveal() {
                api.show();
            },
            activate() {
                active = true;
                root.touchChildren = true;
                syncModalFocus();
            },
            deactivate() {
                active = false;
                root.touchChildren = false;
                syncModalFocus();
            },
            close() {
                api.dispose();
            },
            dispose() {
                if (ended)
                    return;
                record.end();
            }
        };
        const record = {
            view: api,
            initialFocus,
            modal: () => description.modal === true && active && isShown(),
            padNavigation: () => options.gamepad === true && active && isShown(),
            targets: () => made.flatMap(item => (item.part.name !== undefined && followsFocus(item) ? [item.part.name] : [])),
            keeps: name => followsFocus(find(name)),
            eligible: name => canFocus(find(name)),
            reveal: name => revealForTab(find(name)),
            focusMark(name, visible) {
                const item = find(name);
                if (item.node.isDisposed)
                    return;
                if (item.focusMark === undefined) {
                    if (!visible)
                        return;
                    item.focusMark = game.sprite(undefined, item.node);
                    setFocusOutline(item, plan.skin.accent);
                }
                item.focusMark.visible = visible;
            },
            press: name => press(find(name)),
            dismiss: options.dismiss === undefined ? undefined : () => invoke(options.dismiss),
            start: () => invoke(options.resume),
            tick(seconds) {
                read(seconds);
            },
            arrange() {
                const next = planView(description, frame());
                if (next.variant !== plan.variant) {
                    const offsets = new Map();
                    for (const item of scrollItems)
                        if (item.part.name !== undefined)
                            offsets.set(item.part.name, item.scroll.offset);
                    disposeScrolls();
                    releaseContent();
                    for (const item of made)
                        game.remove(item.node);
                    build(offsets);
                    if (focused?.owner === record)
                        record.focusMark(focused.name, eligible(focused));
                    return;
                }
                plan = next;
                placeDim();
                made.forEach((item, index) => {
                    const planned = plan.parts[index];
                    item.rect = relative(planned.rect, planned.parent < 0 ? undefined : plan.parts[planned.parent].rect);
                    item.node.x = item.rect.x;
                    item.node.y = item.rect.y;
                    paint(item);
                    if (item.focusMark?.visible === true)
                        setFocusOutline(item, plan.skin.accent);
                });
                syncScrollLayout();
            },
            end() {
                if (ended)
                    return;
                ended = true;
                live.delete(record);
                syncModalFocus();
                if (focused?.owner === record)
                    focus(undefined);
                for (const remove of removals.splice(0))
                    remove();
                disposeScrolls();
                releaseContent();
                game.remove(root);
            }
        };
        build();
        if (!ended) {
            registerSemantics();
            live.add(record);
            syncModalFocus();
        }
        return api;
    }
    // Questions asked one at a time; each waits for the one before it to be answered.
    let asked = Promise.resolve(), open, 
    // A question opened this frame does not take the key that opened it.
    openedAt = -1, frame = 0;
    const confirm = (message, options = {}) => {
        if (typeof message !== 'string' || options === null || typeof options !== 'object')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'confirm takes words and { yes, no, title }' });
        for (const key of ['yes', 'no', 'title'])
            if (options[key] !== undefined && typeof options[key] !== 'string')
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'confirm: ' + key + ' is words' });
        const turn = asked.then(() => new Promise(resolve => {
            const width = Math.min(440, Math.max(240, game.safe.width - 32));
            let view;
            const answer = (yes) => {
                if (open?.answer !== answer)
                    return;
                open = undefined;
                view?.close();
                resolve(yes);
            };
            view = api({
                label: options.title ?? message,
                modal: true,
                root: {
                    type: 'panel',
                    card: true,
                    alpha: 1,
                    anchor: 'center',
                    width,
                    height: options.title === undefined ? 168 : 212,
                    padding: 20,
                    layout: 'column',
                    gap: 14,
                    children: [
                        ...(options.title === undefined
                            ? []
                            : [{ type: 'text', text: options.title, align: 'center', bold: true, size: 26 }]),
                        { type: 'text', name: 'question', text: message, align: 'center' },
                        { type: 'space', height: 'fill' },
                        {
                            type: 'panel',
                            layout: 'row',
                            gap: 12,
                            height: 48,
                            children: [
                                { type: 'button', name: 'no', text: options.no ?? 'Cancel', width: 'fill', color: 0x475569 },
                                { type: 'button', name: 'yes', text: options.yes ?? 'OK', width: 'fill' }
                            ]
                        }
                    ]
                }
            }, {
                initialFocus: 'yes',
                dismiss: () => answer(false),
                bind: { no: { tap: () => answer(false) }, yes: { tap: () => answer(true) } }
            });
            open = { answer, view };
            openedAt = frame;
        }));
        asked = turn;
        return turn;
    };
    const hints = (list) => {
        let current = [], view, device = '', shown = [], ended = false;
        const check = (next) => {
            if (!Array.isArray(next))
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'hints take a list' });
            for (const hint of next)
                if (hint === null ||
                    typeof hint !== 'object' ||
                    typeof hint.action !== 'string' ||
                    ['key', 'pad', 'touch'].some(key => hint[key] !== undefined && typeof hint[key] !== 'string'))
                    throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'a hint is { action, key, pad, touch }' });
            return Object.freeze([...next]);
        };
        const capOf = (hint, on) => on === 'gamepad'
            ? hint.pad === undefined
                ? undefined
                : keyCap(hint.pad, 'gamepad')
            : on === 'touch'
                ? hint.touch
                : hint.key === undefined
                    ? undefined
                    : keyCap(hint.key, 'keyboard');
        // A rough width of words, for the bar is laid out before they are drawn: wide characters take a whole size.
        const across = (words, size) => [...words].reduce((sum, character) => sum + ((character.codePointAt(0) ?? 0) >= 0x2e80 ? size : size * 0.56), 0);
        const draw = () => {
            view?.close();
            view = undefined;
            device = game.device;
            const shownHints = current.flatMap(hint => {
                const cap = capOf(hint, device);
                return cap === undefined || cap === '' ? [] : [{ hint, cap }];
            });
            shown = Object.freeze(shownHints.map(({ hint, cap }) => cap + ' ' + hint.action));
            if (ended || shownHints.length === 0)
                return;
            view = api({
                area: 'safe',
                root: {
                    type: 'panel',
                    anchor: 'bottom',
                    y: 8,
                    height: 36,
                    layout: 'row',
                    gap: 20,
                    justify: 'center',
                    children: shownHints.map(({ hint, cap }) => ({
                        type: 'panel',
                        layout: 'row',
                        gap: 8,
                        align: 'center',
                        width: Math.ceil(Math.max(30, across(cap, 16) + 18) + 8 + across(hint.action, 18)),
                        children: [
                            {
                                type: 'panel',
                                color: 0x334155,
                                alpha: 0.95,
                                width: Math.ceil(Math.max(30, across(cap, 16) + 18)),
                                height: 30,
                                children: [
                                    {
                                        type: 'text',
                                        text: cap,
                                        size: 16,
                                        bold: true,
                                        align: 'center',
                                        width: 'fill',
                                        height: 'fill'
                                    }
                                ]
                            },
                            { type: 'text', text: hint.action, size: 18, width: 'fill' }
                        ]
                    }))
                }
            });
        };
        current = check(list);
        const record = {
            tick() {
                if (!ended && game.device !== device)
                    draw();
            },
            end() {
                ended = true;
                hintBars.delete(record);
                view?.close();
                view = undefined;
            }
        };
        hintBars.add(record);
        draw();
        return {
            set(next) {
                current = check(next);
                draw();
            },
            get visible() {
                return view?.visible === true;
            },
            get shown() {
                return shown;
            },
            dispose: () => record.end()
        };
    };
    const hintBars = new Set();
    const loading = async (tasks, options = {}) => {
        if (!Array.isArray(tasks) || options === null || typeof options !== 'object')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'loading takes a list of promises or functions' });
        const atOnce = options.atOnce ?? 4;
        if (!Number.isInteger(atOnce) || atOnce < 1)
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'loading: atOnce is a whole number above 0' });
        const total = tasks.length, label = options.label ?? 'Loading';
        const state = { done: 0 };
        const view = api({
            label,
            modal: true,
            root: {
                type: 'panel',
                card: true,
                alpha: 1,
                anchor: 'center',
                width: 320,
                height: 96,
                padding: 18,
                layout: 'column',
                gap: 12,
                children: [
                    { type: 'text', name: 'count', align: 'center' },
                    { type: 'bar', name: 'progress', label, height: 12 }
                ]
            }
        }, {
            state,
            bind: {
                count: { text: s => label + ' ' + s.done + ' / ' + total },
                progress: { value: s => (total === 0 ? 1 : s.done / total) }
            }
        });
        const results = new Array(total);
        let next = 0;
        const worker = async () => {
            while (next < total) {
                const index = next++, task = tasks[index];
                results[index] = await (typeof task === 'function' ? task() : task);
                state.done++;
            }
        };
        try {
            await Promise.all(Array.from({ length: Math.min(atOnce, Math.max(1, total)) }, worker));
            view.refresh();
            return results;
        }
        finally {
            view.close();
        }
    };
    const api = view;
    const noPadButtons = new Set();
    const navigationPadButtons = new Set(['up', 'down', 'left', 'right', 'a']);
    const modalPadButtons = new Set([...navigationPadButtons, 'b']);
    const pausedModalPadButtons = new Set([...modalPadButtons, 'start']);
    return {
        view,
        confirm,
        hints,
        loading,
        get asking() {
            return open !== undefined;
        },
        get modalActive() {
            return topModal() !== undefined;
        },
        wheel: scrollInput.wheel,
        keyDown(event, embedded) {
            if (event.altKey || event.ctrlKey || event.metaKey)
                return false;
            if (event.code !== 'Escape' && event.code !== 'Tab' && event.code !== 'Enter' && event.code !== 'Space')
                return false;
            syncModalFocus();
            if (event.code === 'Escape') {
                if (modalOwner?.dismiss === undefined)
                    return false;
                if (!event.repeat)
                    modalOwner.dismiss();
                return true;
            }
            if (event.code !== 'Tab') {
                if (!eligible(focused))
                    return modalOwner !== undefined;
                if (!event.repeat)
                    focused.owner.press(focused.name);
                return true;
            }
            if (moveFocus(event.shiftKey ? -1 : 1, !embedded || modalOwner !== undefined))
                return true;
            if (modalOwner !== undefined)
                return true;
            focus(undefined);
            return false;
        },
        padButtons(pressed, legacyAsking) {
            syncModalFocus();
            const modal = modalOwner;
            let owner = modal;
            if (owner === undefined && !legacyAsking)
                for (const record of live)
                    if (record.padNavigation())
                        owner = record;
            if (owner === undefined)
                return noPadButtons;
            const claimed = modal === undefined ? navigationPadButtons : game.paused ? pausedModalPadButtons : modalPadButtons;
            // Keep this sample with its original owner even when a callback closes or replaces the view.
            if (modal !== undefined && pressed.has('b')) {
                modal.dismiss?.();
            }
            else if (claimed.has('start') && pressed.has('start')) {
                owner.start();
            }
            else {
                if (pressed.has('up') || pressed.has('left'))
                    moveFocus(-1, true, owner);
                else if (pressed.has('down') || pressed.has('right'))
                    moveFocus(1, true, owner);
                if (pressed.has('a')) {
                    if (focused?.owner !== owner || !eligible(focused))
                        moveFocus(1, true, owner);
                    if (focused?.owner === owner && eligible(focused))
                        owner.press(focused.name);
                }
            }
            return claimed;
        },
        tick(seconds) {
            frame++;
            if (open !== undefined && topModal()?.view === open.view && frame > openedAt + 1) {
                const keys = game.keys;
                // Virtual touch buttons can also send these key names. Hardware decisions go through the active view above.
                if (keys.pressed('enter', 'space', 'pad:a'))
                    open.answer(true);
                else if (keys.pressed('escape', 'pad:b'))
                    open.answer(false);
            }
            for (const record of [...hintBars])
                record.tick(seconds);
            for (const record of [...live]) {
                try {
                    record.tick(seconds);
                }
                catch (cause) {
                    hooks.failed(cause);
                }
            }
            syncModalFocus();
            if (focused !== undefined) {
                if (!focused.owner.keeps(focused.name))
                    focus(undefined);
                else
                    focused.owner.focusMark(focused.name, eligible(focused));
            }
        },
        arrange() {
            for (const record of [...live]) {
                try {
                    record.arrange();
                }
                catch (cause) {
                    hooks.failed(cause);
                }
            }
        },
        reset() {
            // A restart has taken the sprites away; what is left is to forget the views and their semantics. A question
            // still open is answered no, so what awaits it goes on.
            open?.answer(false);
            for (const record of [...hintBars])
                record.end();
            for (const record of [...live])
                record.end();
            live.clear();
        }
    };
}
const EMPTY = Object.freeze({ x: 0, y: 0, width: 0, height: 0 });
function setFocusOutline(item, colour) {
    const g = item.focusMark.graphics, { x, y, width, height } = item.node.hitArea ?? EMPTY;
    g.clear();
    if (width > 4 && height > 4)
        g.lineStyle(2, colour)
            .drawRect(x + 1, y + 1, width - 2, height - 2)
            .lineStyle();
}
function visibleOnStage(node, stage, input = false) {
    if (input && !node.touchEnabled)
        return false;
    for (let at = node; at !== undefined; at = at.parent) {
        if (at.isDisposed || !at.visible)
            return false;
        if (at === stage)
            return true;
        if (input && at.parent?.touchChildren === false)
            return false;
    }
    return false;
}
const edge = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function corners({ x, y, width, height }, node) {
    if (width <= 0 || height <= 0)
        return [];
    const points = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
    ];
    return node === undefined ? points : points.map(at => node.localToGlobal(at.x, at.y));
}
/** Clip the two actual shapes before enclosing them for the rectangular accessibility projection. */
function intersect(points, clip) {
    if (clip.length === 0 || points.length === 0)
        return [];
    const winding = Math.sign(edge(clip[0], clip[1], clip[2]));
    if (!winding)
        return [];
    for (let index = 0; index < clip.length && points.length > 0; index++) {
        const from = clip[index], to = clip[(index + 1) % clip.length], distances = points.map(point => winding * edge(from, to, point)), out = [];
        for (let at = 0; at < points.length; at++) {
            const prior = (at + points.length - 1) % points.length, start = points[prior], end = points[at], a = distances[prior], b = distances[at];
            if (a < 0 !== b < 0) {
                const fraction = a / (a - b);
                out.push({ x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction });
            }
            if (b >= 0)
                out.push(end);
        }
        points = out;
    }
    return points;
}
function visibleRect(node, area, screen) {
    if (node.isDisposed)
        return undefined;
    let points = corners(area, node);
    if (points.length === 0 || !edge(points[0], points[1], points[2]))
        return undefined;
    for (let at = node; at !== undefined && points.length !== 0; at = at.parent) {
        const clip = at.clipRect;
        if (clip !== undefined)
            points = intersect(points, corners(clip, at));
    }
    points = intersect(points, corners({ x: 0, y: 0, width: screen.width, height: screen.height }));
    if (points.length < 3)
        return undefined;
    let areaTwice = 0;
    for (let index = 1; index + 1 < points.length; index++)
        areaTwice += edge(points[0], points[index], points[index + 1]);
    if (!Number.isFinite(areaTwice) || areaTwice === 0)
        return undefined;
    const xs = points.map(point => point.x), ys = points.map(point => point.y), x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
/** A rectangle measured from the corner of the one it is in. */
function relative(rect, parent) {
    return parent === undefined
        ? rect
        : { x: rect.x - parent.x, y: rect.y - parent.y, width: rect.width, height: rect.height };
}

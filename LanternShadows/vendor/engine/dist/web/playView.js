// SPDX-License-Identifier: Apache-2.0
// Views of play: a screen described as data (./view.js), drawn with the game's own sprites and texts on its ui layer
// in a skin, and kept to the game's state by a table of bindings read every frame. Named parts reach code through
// `get`, tests and assistive technology through the semantic tree when the game gives one, and a screen stack through
// the handle a view is.
import { EgretError } from '@egret/runtime';
import { directViewActivation, viewTapActivation } from './playActivation.js';
import { TABLET_SHORT_SIDE, checkView, planView } from './view.js';
import { keyCap } from './viewParts.js';
import { createPlayViewScrolls } from './playViewScroll.js';
// Keep declarative loads within BrowserGame's image budget across all views in this host.
const MAX_VIEW_IMAGE_LOADS = 4;
const KEYS_OF = {
    panel: ['label', 'disabled', 'visible', 'color', 'tap', 'tapTargetOnly', 'pointerOnly', 'badge'],
    text: ['label', 'text', 'pick', 'format', 'roll', 'visible', 'color', 'badge'],
    button: ['label', 'text', 'pick', 'format', 'roll', 'disabled', 'visible', 'color', 'tap', 'tapTargetOnly', 'badge'],
    bar: ['label', 'value', 'visible', 'color'],
    toggle: ['label', 'text', 'checked', 'disabled', 'visible', 'tap', 'tapTargetOnly', 'badge'],
    space: ['visible'],
    image: ['label', 'visible', 'src']
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
        if (options === null || typeof options !== 'object')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'options' });
        const supplied = options.bind ?? {};
        if (supplied === null || typeof supplied !== 'object')
            throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'bind' });
        let bind = Object.assign(Object.create(null), supplied);
        const validate = (description, bind) => {
            const names = checkView(description);
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
                        : key === 'pointerOnly' || key === 'tapTargetOnly'
                            ? typeof value === 'boolean'
                            : typeof value === 'function';
                    if (!ok)
                        throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': ' + key });
                }
                if (binding.text !== undefined && binding.pick !== undefined)
                    throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': text or pick, not both' });
                if (binding.pointerOnly === true && binding.tap === undefined)
                    throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': pointerOnly needs tap' });
                if (binding.tapTargetOnly === true && binding.tap === undefined)
                    throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': tapTargetOnly needs tap' });
            }
            const checkPanelRoles = (part) => {
                if (part.type !== 'panel')
                    return;
                if (part.role === 'button' && (bind[part.name]?.tap === undefined || bind[part.name]?.pointerOnly === true))
                    throw new EgretError('UI_VIEW_BINDING_INVALID', {
                        cause: part.name + ': button role needs a non-pointerOnly tap'
                    });
                for (const child of part.children ?? [])
                    checkPanelRoles(child);
            };
            for (const parts of variantsOf(description))
                checkPanelRoles(parts);
            return names;
        };
        const names = validate(description, bind);
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
        if (paragraphCache === undefined && variantsOf(description).some(usesParagraph))
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
        let readingBindings = false, replacingRows = false;
        const removals = [];
        const scrollHandles = new Map();
        let scrollItems = [];
        // A view is drawn `uiScale` times larger than the game's units: its root is scaled, and it is planned in an area
        // that much smaller, so that it fills the same part of the screen.
        const scaled = (area, by) => by === 1 ? area : { x: area.x / by, y: area.y / by, width: area.width / by, height: area.height / by };
        const frame = () => {
            const by = hooks.uiScale?.() ?? 1;
            root.scaleX = root.scaleY = by;
            // A tablet's screen: its shorter side, in CSS pixels, at least TABLET_SHORT_SIDE.
            const plan = game.browser.screen, form = Math.min(plan.width, plan.height) * plan.scale >= TABLET_SHORT_SIDE ? 'tablet' : 'phone';
            return { screen: scaled(game.screen, by), safe: scaled(game.safe, by), orientation: game.orientation, form };
        };
        const colourOf = (part, item) => {
            const skin = plan.skin;
            if (part.type === 'panel' && item.disabled && hasAction(item))
                return skin.disabled;
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
        const requestImage = (item, address) => {
            if (address !== undefined && typeof address !== 'string')
                throw new EgretError('UI_VIEW_BINDING_INVALID', {
                    cause: item.part.name + ': src takes an address or undefined'
                });
            const src = address === '' ? undefined : address;
            if (item.imageRevision !== undefined && item.imageSrc === src)
                return;
            const revision = (item.imageRevision ?? 0) + 1;
            item.imageRevision = revision;
            item.imageSrc = src;
            item.cancelImage?.();
            item.cancelImage = undefined;
            if (src === undefined) {
                if (item.image !== undefined)
                    game.remove(item.image);
                item.image = undefined;
                return;
            }
            const current = () => !ended && made.includes(item) && item.imageRevision === revision;
            item.cancelImage = queueImage(() => game.image(src, { layer: item.node }).then(image => {
                if (!current()) {
                    game.remove(image);
                    return;
                }
                const previous = item.image;
                item.image = image;
                placeImage(item);
                if (previous !== undefined)
                    game.remove(previous);
            }, cause => {
                if (current())
                    hooks.failed(cause);
            }));
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
            const density = style.density ?? 1;
            const key = JSON.stringify([text, size, color, width, density]);
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
                density
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
        // A leaf panel is one accessible control; its drawn children must not add duplicate or unreachable focus targets.
        const semanticsAllows = (item) => {
            const index = item.part.name === undefined ? made.indexOf(item) : plan.names.get(item.part.name);
            for (let at = index; at >= 0; at = plan.parts[at].parent) {
                const part = plan.parts[at].part;
                if (part.semantic === false || (at !== index && part.type === 'panel' && part.role === 'button'))
                    return false;
            }
            return true;
        };
        const followsFocus = (item) => followsInput(item) && !pointerOnly(item) && semanticsAllows(item);
        const stageRect = (item) => visibleRect(item.node, item.node.hitArea ?? { x: 0, y: 0, width: item.rect.width, height: item.rect.height }, game.screen);
        const actionable = (item) => followsInput(item) && stageRect(item) !== undefined;
        const canFocus = (item) => actionable(item) && !pointerOnly(item) && semanticsAllows(item);
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
        const press = (item, activation) => {
            if (!actionable(item) || (bindingOf(item)?.tapTargetOnly === true && !activation.isTarget))
                return;
            const name = nameOf(item);
            if (name !== undefined && !pointerOnly(item) && semanticsAllows(item))
                focus({ owner: record, name });
            const binding = bindingOf(item);
            try {
                binding?.tap?.(state(), activation);
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
        const makeItem = (planned, offsets = new Map(), restoreRoll = true) => {
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
                    ...(part.type === 'button' ? { bold: true } : {}),
                    ...(part.fontFamily !== undefined ? { fontFamily: part.fontFamily } : {}),
                    ...(part.fontWeight !== undefined ? { fontWeight: part.fontWeight } : {}),
                    ...(part.italic !== undefined ? { italic: part.italic } : {})
                })
                : undefined;
            const previous = restoreRoll ? rolls.get(part.name ?? '') : undefined;
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
                semanticLabel: undefined,
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
            if (part.type === 'image' && (part.name === undefined || bind[part.name]?.src === undefined))
                requestImage(item, part.src);
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
            const binding = part.name === undefined ? undefined : bind[part.name];
            if (part.type === 'button' || part.type === 'toggle' || (part.type === 'panel' && binding?.tap !== undefined))
                game.onTap(node, activation => press(item, viewTapActivation(activation, nameOf(item), made.find(candidate => candidate.node === activation.target)?.part.name)));
            return item;
        };
        const build = (offsets = new Map()) => {
            plan = planView(description, frame());
            made = [];
            for (const planned of plan.parts) {
                const item = makeItem(planned, offsets);
                made.push(item);
                if (item.scroll !== undefined)
                    scrollItems.push(item);
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
            const screen = frame().screen;
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
            if (readingBindings)
                throw new EgretError('UI_VIEW_BINDING_INVALID', {
                    cause: 'bindings cannot refresh the same view while being read'
                });
            readingBindings = true;
            try {
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
                    if (binding.label !== undefined) {
                        const label = binding.label(now);
                        item.semanticLabel =
                            typeof label === 'string' && /\S/u.test(label)
                                ? label
                                    .slice(0, 1024)
                                    .replace(/[\uD800-\uDBFF]$/u, '')
                                    .trimEnd() || undefined
                                : undefined;
                    }
                    if (binding.text !== undefined)
                        item.text = String(binding.text(now));
                    if (binding.src !== undefined)
                        requestImage(item, binding.src(now));
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
            }
            finally {
                readingBindings = false;
            }
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
        const semanticNodes = new Map();
        let semanticRoot;
        // Named parts in reading order, each inside its nearest named panel.
        const registerParts = (from = 0, to = plan.parts.length) => {
            if (semantics === undefined)
                return;
            const first = plan;
            for (const planned of first.parts.slice(from, to)) {
                const name = planned.part.name;
                if (name === undefined || planned.part.type === 'space' || !semanticsAllows(made[planned.index]))
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
                    ? planned.part.type === 'panel'
                        ? (planned.part.role ?? 'group')
                        : 'group'
                    : type === 'text'
                        ? 'text'
                        : type === 'button'
                            ? 'button'
                            : type === 'bar'
                                ? 'progressbar'
                                : type === 'image'
                                    ? 'image'
                                    : 'switch';
                const semantic = semantics.add({
                    id: id + ':' + name,
                    role,
                    parent,
                    describe: () => {
                        const item = find(name);
                        const label = item.semanticLabel ?? item.part.label;
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
                            const imageName = label ?? imageLabel;
                            return { ...base, name: imageName ?? '', hidden: hidden || !imageName };
                        }
                        if (role === 'progressbar')
                            return { ...base, name: label ?? name, range: { now: Math.round(item.value * 100), min: 0, max: 100 } };
                        if (role === 'switch')
                            return { ...base, name: label ?? item.text, checked: item.checked, disabled: !enabled };
                        if (role === 'button') {
                            if (item.part.type === 'panel')
                                return { ...base, name: label ?? name, disabled: !enabled };
                            if (item.semanticLabel !== undefined)
                                return { ...base, name: item.semanticLabel, disabled: !enabled };
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
                        // Optional noninteractive text has no semantic content while blank.
                        // Retain an explicit accessible label, and keep interactive names strict.
                        const textName = label ?? item.text;
                        return { ...base, name: textName, hidden: hidden || !/\S/u.test(textName) };
                    },
                    ...(role === 'button' ||
                        role === 'switch' ||
                        (role === 'group' && bind[name]?.tap !== undefined && bind[name]?.pointerOnly !== true)
                        ? {
                            onActivate: () => press(find(name), directViewActivation(name, 'semantic')),
                            onFocus() {
                                if (canFocus(find(name)))
                                    focus({ owner: record, name });
                            }
                        }
                        : {})
                });
                semanticNodes.set(name, semantic);
            }
        };
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
            semanticRoot = top;
            removals.push(() => {
                top.remove();
                semanticRoot = undefined;
                semanticNodes.clear();
            });
            registerParts();
        };
        const removeRowSemantics = (names) => {
            for (const name of names) {
                semanticNodes.get(name)?.remove();
                semanticNodes.delete(name);
            }
        };
        const releaseItem = (item) => {
            item.cancelImage?.();
            item.imageRevision = (item.imageRevision ?? 0) + 1;
            item.paragraph?.text.dispose();
            for (const child of [item.words, item.dot?.words, item.image])
                if (child !== undefined)
                    game.remove(child);
        };
        const releaseContent = () => {
            for (const item of made)
                releaseItem(item);
            paragraphScope?.dispose();
            paragraphScope = undefined;
        };
        // Plans are pre-order; a root's descendants occupy one contiguous interval.
        const endOf = (p, at) => {
            let end = at + 1;
            while (end < p.parts.length && p.parts[end].parent >= at)
                end++;
            return end;
        };
        const rowNames = (children) => {
            const names = new Set();
            const collect = (part) => {
                if (part.name !== undefined)
                    names.add(part.name);
                if (part.type === 'panel')
                    for (const child of part.children ?? [])
                        collect(child);
            };
            for (const child of children) {
                if (child?.name === undefined)
                    throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'collection rows need stable names' });
                collect(child);
            }
            return names;
        };
        const collectionPanel = (root, name) => {
            if (root.type !== 'panel')
                return undefined;
            if (root.name === name)
                return root;
            for (const child of root.children ?? []) {
                const result = collectionPanel(child, name);
                if (result !== undefined)
                    return result;
            }
            return undefined;
        };
        const withChildren = (root, name, children) => {
            if (root.type !== 'panel')
                return root;
            if (root.name === name)
                return { ...root, children };
            const nested = root.children?.map(child => withChildren(child, name, children));
            return nested === undefined || nested.every((child, index) => child === root.children[index])
                ? root
                : { ...root, children: nested };
        };
        // Descriptions are data. Property order is not a reason to renew a retained node.
        const sameDescription = (a, b) => {
            if (Object.is(a, b))
                return true;
            if (a === null ||
                b === null ||
                typeof a !== 'object' ||
                typeof b !== 'object' ||
                Array.isArray(a) !== Array.isArray(b))
                return false;
            const left = a, right = b;
            const keys = Object.keys(left);
            return (keys.length === Object.keys(right).length &&
                keys.every(key => Object.hasOwn(right, key) && sameDescription(left[key], right[key])));
        };
        const compatible = (before, after) => {
            const a = before ?? {}, b = after ?? {};
            const keys = Object.keys(a);
            return (keys.length === Object.keys(b).length &&
                keys.every(key => (typeof a[key] === 'function' ? typeof b[key] === 'function' : a[key] === b[key])));
        };
        const layoutItems = () => {
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
        };
        // Membership changes are explicit rather than reallocating a collection descriptor every frame.
        const replaceRows = (name, children, replacement) => {
            if (ended ||
                !Array.isArray(children) ||
                (replacement !== undefined && (replacement === null || typeof replacement !== 'object')))
                throw new EgretError('UI_VIEW_BINDING_INVALID', {
                    cause: 'replaceChildren needs a live named panel, rows and a binding table'
                });
            const original = collectionPanel(description.root, name);
            if (original === undefined)
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: name + ': expected a named panel' });
            const oldNames = rowNames(original.children ?? []);
            for (const parts of variantsOf(description).slice(1)) {
                const other = collectionPanel(parts, name);
                const otherNames = other === undefined ? undefined : rowNames(other.children ?? []);
                if (otherNames === undefined ||
                    otherNames.size !== oldNames.size ||
                    [...oldNames].some(key => !otherNames.has(key)))
                    throw new EgretError('UI_VIEW_VARIANT_MISMATCH', {
                        cause: name + ': collection descendants must belong to the same panel in every variant'
                    });
            }
            const nextDescription = {
                ...description,
                root: withChildren(description.root, name, children),
                ...(description.portrait === undefined ? {} : { portrait: withChildren(description.portrait, name, children) }),
                ...(description.tablet === undefined ? {} : { tablet: withChildren(description.tablet, name, children) }),
                ...(description.tabletPortrait === undefined
                    ? {}
                    : { tabletPortrait: withChildren(description.tabletPortrait, name, children) })
            };
            // Validate shape, size, depth and globally unique names before traversing supplied rows.
            checkView(nextDescription);
            const newNames = rowNames(children), nextBind = Object.create(null);
            for (const [key, binding] of Object.entries(bind))
                if (!oldNames.has(key) || (replacement === undefined && newNames.has(key)))
                    nextBind[key] = binding;
            if (replacement !== undefined)
                for (const [key, binding] of Object.entries(replacement)) {
                    if (!newNames.has(key))
                        throw new EgretError('UI_VIEW_BINDING_UNKNOWN', { cause: key + ' is outside the replacement rows' });
                    nextBind[key] = binding;
                }
            validate(nextDescription, nextBind);
            if (paragraphCache === undefined && variantsOf(nextDescription).some(usesParagraph))
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'paragraph parts need a paragraphCache' });
            const nextPlan = planView(nextDescription, frame());
            const oldPlan = plan, oldMade = made, oldBind = bind, oldDescription = description;
            const at = oldPlan.names.get(name), nextAt = nextPlan.names.get(name);
            if (nextAt !== at || nextPlan.variant !== oldPlan.variant)
                throw new EgretError('UI_VIEW_BINDING_INVALID', { cause: 'arrange the view before replacing rows' });
            const oldEnd = endOf(oldPlan, at), nextEnd = endOf(nextPlan, at);
            const reuse = new Map();
            for (let i = 0; i <= at; i++)
                reuse.set(i, oldMade[i]);
            for (let i = nextEnd; i < nextPlan.parts.length; i++)
                reuse.set(i, oldMade[oldEnd + i - nextEnd]);
            for (let i = at + 1; i < nextEnd;) {
                const planned = nextPlan.parts[i], end = endOf(nextPlan, i);
                const old = oldPlan.names.get(planned.part.name);
                if (old !== undefined &&
                    oldPlan.parts[old].parent === at &&
                    endOf(oldPlan, old) - old === end - i &&
                    sameDescription(oldPlan.parts[old].part, planned.part)) {
                    let stable = true;
                    for (let n = i; n < end; n++) {
                        const key = nextPlan.parts[n].part.name;
                        if (key !== undefined && !compatible(oldBind[key], nextBind[key]))
                            stable = false;
                    }
                    if (stable)
                        for (let n = i; n < end; n++)
                            reuse.set(n, oldMade[old + n - i]);
                }
                i = end;
            }
            const previousFocus = focused?.owner === record ? focused.name : undefined;
            const previousTargets = previousFocus === undefined ? [] : record.targets();
            const previousIndex = previousFocus === undefined ? -1 : previousTargets.indexOf(previousFocus);
            if (previousFocus !== undefined)
                focus(undefined);
            const created = [];
            // Do not release the old resource graph until the new semantic tree is admitted.
            description = nextDescription;
            bind = nextBind;
            plan = nextPlan;
            made = [];
            let semanticsReplaced = false;
            try {
                for (const planned of plan.parts) {
                    let item = reuse.get(planned.index);
                    if (item === undefined) {
                        // Rebuilt rows are new content, unlike the same named parts rebuilt by orientation.
                        item = makeItem(planned, new Map(), false);
                        created.push(item);
                    }
                    made.push(item);
                }
                // Keep the root and other parts mounted in the semantic tree. Replacing a row
                // in a covered view cannot change the reading order or priority of other dialogs.
                // built() can populate the collection before the outer view registers
                // semantics (also when switching portrait variant). That outer registration
                // will see this new plan; there is no attached subtree to replace yet.
                if (semanticRoot?.attached === true) {
                    semanticsReplaced = true;
                    removeRowSemantics(oldNames);
                    registerParts(at + 1, nextEnd);
                }
            }
            catch (cause) {
                if (semanticsReplaced)
                    removeRowSemantics(newNames);
                description = oldDescription;
                bind = oldBind;
                plan = oldPlan;
                made = oldMade;
                for (const item of created) {
                    item.scroll?.dispose();
                    releaseItem(item);
                    game.remove(item.node);
                }
                if (semanticsReplaced)
                    registerParts(at + 1, oldEnd);
                if (previousFocus !== undefined && record.reveal(previousFocus))
                    focus({ owner: record, name: previousFocus });
                throw cause;
            }
            const kept = new Set(made);
            for (const item of oldMade)
                if (!kept.has(item)) {
                    item.scroll?.dispose();
                    releaseItem(item);
                    game.remove(item.node);
                    const key = item.part.name;
                    if (key !== undefined) {
                        rolls.delete(key);
                        if (!plan.names.has(key))
                            scrollHandles.delete(key);
                    }
                }
            // Reordering retained row roots, rather than renewing their sprite identities,
            // also reorders pointer hit testing and the semantic registration above.
            const parent = made[at].scroll?.content ?? made[at].node;
            let position = 0;
            for (let i = at + 1; i < nextEnd; i = endOf(plan, i))
                parent.setChildIndex(made[i].node, position++);
            scrollItems = made.filter(item => item.scroll !== undefined);
            // The structure is now committed. Establish its authored geometry and
            // recover focus even if an application binding throws while reading it.
            layoutItems();
            try {
                read(0);
            }
            catch (cause) {
                // Runtime bindings are not description validation. Reconcile any values
                // already assigned and keep the committed result arranged before reporting.
                layoutItems();
                throw cause;
            }
            finally {
                if (previousFocus !== undefined) {
                    if (record.reveal(previousFocus))
                        focus({ owner: record, name: previousFocus });
                    else {
                        const choices = record.targets(), start = Math.min(previousIndex, choices.length - 1);
                        const order = [...choices.slice(Math.max(0, start)), ...choices.slice(0, Math.max(0, start)).reverse()];
                        const fallback = order.find(key => record.reveal(key));
                        if (fallback !== undefined)
                            focus({ owner: record, name: fallback });
                    }
                }
            }
        };
        const replaceChildren = (name, children, replacement) => {
            if (readingBindings || replacingRows)
                throw new EgretError('UI_VIEW_BINDING_INVALID', {
                    cause: 'collection replacement cannot reenter the view from a binding or a replacement'
                });
            replacingRows = true;
            try {
                replaceRows(name, children, replacement);
            }
            finally {
                replacingRows = false;
            }
        };
        const api = {
            get: name => find(name).node,
            rect: name => {
                const item = find(name);
                return Object.freeze({ ...plan.parts[made.indexOf(item)].rect });
            },
            visibleRect: name => {
                const item = find(name);
                if (!isShown() || !visibleOnStage(item.node, game.browser.stage))
                    return undefined;
                const rect = stageRect(item);
                return rect === undefined ? undefined : Object.freeze({ ...rect });
            },
            textReady: name => (ended ? undefined : made[plan.names.get(name) ?? -1]?.words?.ready),
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
            replaceChildren,
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
            keeps: name => plan.names.has(name) && followsFocus(find(name)),
            eligible: name => plan.names.has(name) && canFocus(find(name)),
            reveal: name => plan.names.has(name) && revealForTab(find(name)),
            focusMark(name, visible) {
                if (!plan.names.has(name))
                    return;
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
            press: (name, source) => {
                if (plan.names.has(name))
                    press(find(name), directViewActivation(name, source));
            },
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
                    for (const remove of removals.splice(0))
                        remove();
                    build(offsets);
                    if (!ended)
                        registerSemantics();
                    if (focused?.owner === record)
                        record.focusMark(focused.name, eligible(focused));
                    return;
                }
                plan = next;
                layoutItems();
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
            const width = Math.min(440, Math.max(240, game.safe.width / (hooks.uiScale?.() ?? 1) - 32));
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
                    focused.owner.press(focused.name, 'keyboard');
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
                        owner.press(focused.name, 'gamepad');
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
/** The parts of every variant a description has: `root` first, then portrait, tablet and tablet upright. */
function variantsOf(description) {
    return [description.root, description.portrait, description.tablet, description.tabletPortrait].filter((parts) => parts !== undefined);
}

// SPDX-License-Identifier: Apache-2.0
// The optional entry @egret/engine/web/view. A screen described as data: panels, rows and columns of texts, buttons,
// bars and toggles, each placed against an edge, the middle or its neighbours, and the controls a game reads or
// changes named. Pure: it checks a description and plans where each part of it goes on a screen of a given size, in
// the game's units. What draws it, `game.show` of play for one, paints the plan with a skin and binds the names.
import { EgretError } from '@egret/runtime';
export { createBadges, createRequest, formatCompact, keyCap } from './viewParts.js';
/** A dark skin that reads on any game: words in white on slate cards, blue buttons and a green accent. */
export const DEFAULT_VIEW_SKIN = Object.freeze({
    text: 0xf8fafc,
    panel: 0x1e293b,
    panelAlpha: 0.92,
    button: 0x3b82f6,
    buttonText: 0xffffff,
    disabled: 0x64748b,
    accent: 0x22c55e,
    track: 0x334155,
    radius: 10,
    size: 24,
    dim: 0.55
});
/** The shorter side, in CSS pixels, from which a screen is a tablet's for the `tablet` parts of a view. */
export const TABLET_SHORT_SIDE = 600;
const MAX_PARTS = 1024, MAX_DEPTH = 32, NAME = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/;
const ANCHORS = new Set([
    'top-left',
    'top',
    'top-right',
    'left',
    'center',
    'right',
    'bottom-left',
    'bottom',
    'bottom-right'
]);
const BASE_KEYS = ['type', 'name', 'anchor', 'x', 'y', 'width', 'height', 'visible', 'border', 'semantic'];
const KEYS = {
    panel: new Set([
        ...BASE_KEYS,
        'layout',
        'gap',
        'padding',
        'align',
        'justify',
        'card',
        'color',
        'alpha',
        'label',
        'scroll',
        'role',
        'children'
    ]),
    text: new Set([
        ...BASE_KEYS,
        'text',
        'size',
        'color',
        'align',
        'bold',
        'paragraph',
        'fontFamily',
        'fontWeight',
        'italic'
    ]),
    button: new Set([
        ...BASE_KEYS,
        'role',
        'selected',
        'text',
        'size',
        'color',
        'textColor',
        'description',
        'paragraph',
        'fontFamily',
        'fontWeight',
        'italic'
    ]),
    bar: new Set([...BASE_KEYS, 'value', 'color', 'label']),
    toggle: new Set([...BASE_KEYS, 'text', 'checked', 'size', 'fontFamily', 'fontWeight', 'italic']),
    space: new Set(BASE_KEYS),
    image: new Set([...BASE_KEYS, 'src', 'label'])
};
const SKIN_KEYS = Object.keys(DEFAULT_VIEW_SKIN);
const invalid = (where, what) => new EgretError('UI_VIEW_INVALID', { cause: where + ': ' + what });
const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const colour = (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffff;
const size = (value) => value === 'fill' ||
    (finite(value) && value >= 0) ||
    (typeof value === 'string' && /^\d+(?:\.\d+)?%$/.test(value) && Number.parseFloat(value) <= 100);
function partOptions(value, keys, label, field) {
    if (value === null ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.keys(value).some(key => !keys.includes(key)))
        throw invalid(label, field);
    return value;
}
function checkParagraph(value, label) {
    const row = partOptions(value, ['fontFamilies', 'lineHeight', 'locale', 'direction', 'maxLines', 'density'], label, 'paragraph');
    const families = row['fontFamilies'], lineHeight = row['lineHeight'], maxLines = row['maxLines'], density = row['density'];
    if (!Array.isArray(families) ||
        families.length === 0 ||
        families.length > 16 ||
        families.some(family => typeof family !== 'string' || !family.trim() || family.length > 256))
        throw invalid(label, 'paragraph fontFamilies');
    if (lineHeight !== undefined && (!finite(lineHeight) || lineHeight < 1 || lineHeight > 1024))
        throw invalid(label, 'paragraph lineHeight');
    if (row['locale'] !== undefined && (typeof row['locale'] !== 'string' || !row['locale'].trim()))
        throw invalid(label, 'paragraph locale');
    if (row['direction'] !== undefined && row['direction'] !== 'ltr' && row['direction'] !== 'rtl')
        throw invalid(label, 'paragraph direction');
    if (maxLines !== undefined && (!finite(maxLines) || !Number.isInteger(maxLines) || maxLines < 1 || maxLines > 256))
        throw invalid(label, 'paragraph maxLines');
    if (density !== undefined && (!finite(density) || density < 0.25 || density > 4))
        throw invalid(label, 'paragraph density');
}
/** Checks one tree, including the semantic ancestry of explicit native tabs. */
function checkTree(root, where) {
    const names = new Map(), tabRoles = new Map();
    let count = 0;
    const visit = (value, at, depth, parentRole, semanticParent = true) => {
        if (++count > MAX_PARTS)
            throw invalid(at, 'a view has at most ' + MAX_PARTS + ' parts');
        if (depth > MAX_DEPTH)
            throw invalid(at, 'parts are at most ' + MAX_DEPTH + ' deep');
        if (value === null || typeof value !== 'object' || Array.isArray(value))
            throw invalid(at, 'a part is an object');
        const part = value;
        const type = part['type'];
        if (typeof type !== 'string' || !Object.hasOwn(KEYS, type))
            throw invalid(at, 'type is panel, text, button, bar, toggle, space or image');
        const keys = KEYS[type];
        for (const key of Object.keys(part))
            if (!keys.has(key))
                throw invalid(at, 'a ' + type + ' has no ' + key);
        const name = part['name'];
        if (name !== undefined) {
            if (typeof name !== 'string' || !NAME.test(name))
                throw invalid(at, 'name ' + String(name) + ' is not a name');
            if (names.has(name))
                throw invalid(at, 'the name ' + name + ' is used twice');
            names.set(name, type);
        }
        const label = name === undefined ? at : at + ' (' + name + ')';
        if (part['semantic'] !== undefined && part['semantic'] !== false)
            throw invalid(label, 'semantic is false');
        const role = part['role'];
        if (type === 'panel') {
            if (role !== undefined && role !== 'group' && role !== 'button' && role !== 'tablist')
                throw invalid(label, 'panel role');
            if (role === 'button' && (name === undefined || part['semantic'] === false))
                throw invalid(label, 'a button role needs a named semantic panel');
            if (role === 'tablist') {
                if (typeof name !== 'string' || part['semantic'] === false || !semanticParent)
                    throw invalid(label, 'a tablist role needs a named semantic panel');
                tabRoles.set(name, role);
            }
        }
        if (type === 'button') {
            if (role !== undefined && role !== 'tab')
                throw invalid(label, 'button role');
            if (part['selected'] !== undefined && (role !== 'tab' || typeof part['selected'] !== 'boolean'))
                throw invalid(label, 'selected is a boolean on a tab');
            if (role === 'tab') {
                if (typeof name !== 'string' || part['semantic'] === false || !semanticParent || parentRole !== 'tablist')
                    throw invalid(label, 'a tab role needs a named semantic button inside a named tablist');
                tabRoles.set(name, role);
            }
        }
        if (part['anchor'] !== undefined && !ANCHORS.has(part['anchor']))
            throw invalid(label, 'anchor');
        for (const key of ['x', 'y'])
            if (part[key] !== undefined && !finite(part[key]))
                throw invalid(label, key);
        for (const key of ['width', 'height'])
            if (part[key] !== undefined && !size(part[key]))
                throw invalid(label, key);
        if (part['border'] !== undefined) {
            const border = partOptions(part['border'], ['color', 'width'], label, 'border');
            if (!colour(border['color']) || !finite(border['width']) || border['width'] <= 0)
                throw invalid(label, 'border');
        }
        if (part['paragraph'] !== undefined) {
            checkParagraph(part['paragraph'], label);
            if (part['height'] === undefined || part['height'] === 0)
                throw invalid(label, 'paragraph needs a height');
        }
        if (type === 'button' &&
            ((part['description'] !== undefined && typeof part['description'] !== 'string') ||
                (part['description'] === undefined) !== (part['paragraph'] === undefined)))
            throw invalid(label, 'button description and paragraph are used together');
        if (type === 'image' &&
            (typeof part['src'] !== 'string' || !part['src'].trim() || part['width'] === 0 || part['height'] === 0))
            throw invalid(label, 'image source and size');
        for (const key of ['size', 'gap', 'padding'])
            if (part[key] !== undefined && (!finite(part[key]) || part[key] < 0))
                throw invalid(label, key);
        if (part['size'] !== undefined && part['size'] === 0)
            throw invalid(label, 'size');
        for (const key of ['color', 'textColor'])
            if (part[key] !== undefined && !colour(part[key]))
                throw invalid(label, key);
        for (const key of ['alpha', 'value'])
            if (part[key] !== undefined && (!finite(part[key]) || part[key] < 0 || part[key] > 1))
                throw invalid(label, key + ' is 0 to 1');
        for (const key of ['visible', 'card', 'bold', 'checked', 'italic'])
            if (part[key] !== undefined && typeof part[key] !== 'boolean')
                throw invalid(label, key + ' is true or false');
        const family = part['fontFamily'];
        if (family !== undefined && (typeof family !== 'string' || !family.trim() || family.length > 256))
            throw invalid(label, 'fontFamily');
        const weight = part['fontWeight'];
        if (weight !== undefined && (!Number.isInteger(weight) || weight < 1 || weight > 1000))
            throw invalid(label, 'fontWeight is an integer from 1 to 1000');
        for (const key of ['text'])
            if (part[key] !== undefined && typeof part[key] !== 'string' && !finite(part[key]))
                throw invalid(label, 'text');
        if ((type === 'button' || type === 'toggle') && part['text'] === undefined)
            throw invalid(label, 'a ' + type + ' has text');
        if (part['label'] !== undefined && typeof part['label'] !== 'string')
            throw invalid(label, 'label');
        const choices = {
            layout: ['free', 'row', 'column'],
            align: type === 'text' ? ['left', 'center', 'right'] : ['start', 'center', 'end', 'stretch'],
            justify: ['start', 'center', 'end', 'between'],
            scroll: ['vertical']
        };
        for (const [key, allowed] of Object.entries(choices))
            if (part[key] !== undefined && !allowed.includes(part[key]))
                throw invalid(label, key + ' is ' + allowed.join(', '));
        const children = part['children'];
        if (children !== undefined) {
            if (!Array.isArray(children))
                throw invalid(label, 'children is a list');
            const nextParent = name !== undefined && type === 'panel' ? (role === 'tablist' ? 'tablist' : 'other') : parentRole;
            const nextSemantic = semanticParent && part['semantic'] !== false && !(type === 'panel' && role === 'button');
            children.forEach((child, index) => {
                visit(child, at + '/' + index, depth + 1, nextParent, nextSemantic);
            });
        }
    };
    visit(root, where, 1);
    return { names, tabRoles };
}
/**
 * Checks a description: every part of a known kind with only the fields of its kind, names that are names and are
 * used once, and portrait parts with the same names, of the same kinds, as the others. Returns the named parts with
 * their kinds. What is wrong is refused with `UI_VIEW_INVALID` or `UI_VIEW_VARIANT_MISMATCH`, saying where.
 */
export function checkView(description) {
    if (description === null || typeof description !== 'object')
        throw invalid('view', 'a description is an object');
    for (const key of Object.keys(description))
        if (!['label', 'root', 'portrait', 'tablet', 'tabletPortrait', 'area', 'modal', 'skin', 'uiScale'].includes(key))
            throw invalid('view', 'a view has no ' + key);
    if (description.label !== undefined && typeof description.label !== 'string')
        throw invalid('view', 'label');
    if (description.area !== undefined && description.area !== 'safe' && description.area !== 'screen')
        throw invalid('view', "area is 'safe' or 'screen'");
    if (description.modal !== undefined && typeof description.modal !== 'boolean')
        throw invalid('view', 'modal is true or false');
    if (description.uiScale !== undefined && typeof description.uiScale !== 'boolean')
        throw invalid('view', 'uiScale is true or false');
    if (description.skin !== undefined) {
        if (description.skin === null || typeof description.skin !== 'object')
            throw invalid('skin', 'a skin is an object');
        for (const [key, value] of Object.entries(description.skin)) {
            if (!SKIN_KEYS.includes(key))
                throw invalid('skin', 'a skin has no ' + key);
            const ok = key === 'panelAlpha' || key === 'dim'
                ? finite(value) && value >= 0 && value <= 1
                : key === 'radius' || key === 'size'
                    ? finite(value) && value >= 0 && (key === 'radius' || value > 0)
                    : colour(value);
            if (!ok)
                throw invalid('skin', key);
        }
    }
    const { names, tabRoles } = checkTree(description.root, 'root');
    for (const variant of ['portrait', 'tablet', 'tabletPortrait']) {
        const parts = description[variant];
        if (parts === undefined)
            continue;
        const { names: other, tabRoles: otherRoles } = checkTree(parts, variant);
        const missing = [...names.keys()].filter(name => !other.has(name)), extra = [...other.keys()].filter(name => !names.has(name)), changed = [...names].filter(([name, type]) => other.has(name) && other.get(name) !== type).map(([name]) => name), changedRoles = [...names.keys()].filter(name => other.has(name) && tabRoles.get(name) !== otherRoles.get(name));
        if (missing.length + extra.length + changed.length + changedRoles.length > 0)
            throw new EgretError('UI_VIEW_VARIANT_MISMATCH', {
                cause: [
                    missing.length ? 'not in ' + variant + ': ' + missing.join(', ') : '',
                    extra.length ? 'only in ' + variant + ': ' + extra.join(', ') : '',
                    changed.length ? 'of another kind in ' + variant + ': ' + changed.join(', ') : '',
                    changedRoles.length ? 'of another tab role in ' + variant + ': ' + changedRoles.join(', ') : ''
                ]
                    .filter(Boolean)
                    .join('; ') + '.'
            });
    }
    return names;
}
/** The size a part takes when it gives none. */
function natural(part, axis, skin) {
    switch (part.type) {
        case 'panel':
            return 'fill';
        case 'text':
            return axis === 'width' ? 'fill' : Math.ceil((part.size ?? skin.size) * 1.4);
        case 'button':
            return axis === 'width' ? 160 : Math.ceil(Math.max(44, (part.size ?? skin.size) * 1.9));
        case 'bar':
            return axis === 'width' ? 200 : 16;
        case 'toggle':
            return axis === 'width' ? 220 : Math.ceil(Math.max(44, (part.size ?? skin.size) * 1.8));
        case 'space':
            return 0;
        case 'image':
            return 64;
    }
}
/** A size against the room it is in; `'fill'` is all of the room. */
const measure = (value, room) => value === 'fill' ? room : typeof value === 'number' ? value : (room * Number.parseFloat(value)) / 100;
/** Plans where each part of a view goes on a screen: the parts for its shape, each rectangle in the game's units. */
export function planView(description, frame) {
    checkView(description);
    const rect = (value) => value !== null &&
        typeof value === 'object' &&
        ['x', 'y', 'width', 'height'].every(key => finite(value[key])) &&
        value.width >= 0 &&
        value.height >= 0;
    if (frame === null ||
        typeof frame !== 'object' ||
        !rect(frame.screen) ||
        !rect(frame.safe) ||
        (frame.orientation !== 'landscape' && frame.orientation !== 'portrait') ||
        (frame.form !== undefined && frame.form !== 'phone' && frame.form !== 'tablet'))
        throw new EgretError('UI_VIEW_FRAME_INVALID');
    const skin = Object.freeze({ ...DEFAULT_VIEW_SKIN, ...description.skin });
    const upright = frame.orientation === 'portrait', tablet = frame.form === 'tablet';
    // A tablet's own parts first, then the parts of the shape, then the root.
    const variant = tablet && upright && description.tabletPortrait !== undefined
        ? 'tabletPortrait'
        : tablet && !upright && description.tablet !== undefined
            ? 'tablet'
            : upright && description.portrait !== undefined
                ? 'portrait'
                : 'landscape';
    const chosen = variant === 'landscape' ? description.root : description[variant];
    const area = Object.freeze({ ...(description.area === 'screen' ? frame.screen : frame.safe) });
    const parts = [];
    const names = new Map();
    const put = (part, parent, at) => {
        const index = parts.length;
        parts.push(Object.freeze({ index, parent, part, rect: Object.freeze({ ...at }) }));
        if (part.name !== undefined)
            names.set(part.name, index);
        if (part.type !== 'panel' || part.children === undefined || part.children.length === 0)
            return;
        const pad = part.padding ?? 0, inner = {
            x: at.x + pad,
            y: at.y + pad,
            width: Math.max(0, at.width - pad * 2),
            height: Math.max(0, at.height - pad * 2)
        };
        const layout = part.layout ?? 'free';
        if (layout === 'free') {
            for (const child of part.children)
                put(child, index, placeFree(child, inner, skin));
            return;
        }
        // A row or a column: fixed sizes first, then what is left shared by the parts that fill.
        const along = layout === 'row' ? 'width' : 'height', across = layout === 'row' ? 'height' : 'width';
        const room = inner[along], gap = part.gap ?? 0, gaps = gap * (part.children.length - 1);
        const wants = part.children.map(child => child[along] ?? natural(child, along, skin));
        const fixed = wants.reduce((sum, want) => sum + (want === 'fill' ? 0 : measure(want, room)), 0);
        const fills = wants.filter(want => want === 'fill').length;
        const share = fills > 0 ? Math.max(0, room - gaps - fixed) / fills : 0;
        const used = fixed + share * fills + gaps;
        const justify = fills > 0 ? 'start' : (part.justify ?? 'start');
        let cursor = justify === 'center' ? (room - used) / 2 : justify === 'end' ? room - used : 0;
        const spread = justify === 'between' && part.children.length > 1 ? (room - used) / (part.children.length - 1) : 0;
        part.children.forEach((child, i) => {
            const length = wants[i] === 'fill' ? share : measure(wants[i], room);
            const align = part.align ?? 'stretch';
            const crossWant = child[across] ?? (align === 'stretch' ? 'fill' : natural(child, across, skin));
            const crossRoom = inner[across], crossLength = measure(crossWant, crossRoom);
            const crossAt = align === 'center' ? (crossRoom - crossLength) / 2 : align === 'end' ? crossRoom - crossLength : 0;
            const box = layout === 'row'
                ? { x: inner.x + cursor, y: inner.y + crossAt, width: length, height: crossLength }
                : { x: inner.x + crossAt, y: inner.y + cursor, width: crossLength, height: length };
            put(child, index, { ...box, x: box.x + (child.x ?? 0), y: box.y + (child.y ?? 0) });
            cursor += length + gap + spread;
        });
    };
    put(chosen, -1, placeFree(chosen, area, skin));
    return Object.freeze({ variant, area, parts: Object.freeze(parts), names, skin });
}
/** A part in a panel that lays out freely: its size against the panel, then its place from its anchor, inward. */
function placeFree(part, inner, skin) {
    const width = measure(part.width ?? natural(part, 'width', skin), inner.width), height = measure(part.height ?? natural(part, 'height', skin), inner.height);
    const anchor = part.anchor ?? 'top-left', dx = part.x ?? 0, dy = part.y ?? 0;
    const across = anchor.endsWith('left') ? 'start' : anchor.endsWith('right') ? 'end' : 'middle', down = anchor.startsWith('top') ? 'start' : anchor.startsWith('bottom') ? 'end' : 'middle';
    const horizontal = anchor === 'left' ? 'start' : anchor === 'right' ? 'end' : across, vertical = anchor === 'left' || anchor === 'right' || anchor === 'center' ? 'middle' : down;
    return {
        x: horizontal === 'start'
            ? inner.x + dx
            : horizontal === 'end'
                ? inner.x + inner.width - width - dx
                : inner.x + (inner.width - width) / 2 + dx,
        y: vertical === 'start'
            ? inner.y + dy
            : vertical === 'end'
                ? inner.y + inner.height - height - dy
                : inner.y + (inner.height - height) / 2 + dy,
        width,
        height
    };
}

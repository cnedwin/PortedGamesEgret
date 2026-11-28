// SPDX-License-Identifier: Apache-2.0
// A scope-owned, measured native paragraph. The existing Paragraph and cache own revision,
// cancellation, wrapping, ellipsis, image preparation and delivery.
import { createParagraph, createParagraphCache } from '@egret/engine/paragraph';
import { EgretError } from '@egret/runtime';
import { createCanvasParagraphProvider } from './CanvasParagraphProvider.js';
import { gameFontFamilies } from './browserGameFamilies.js';
export function createGameParagraphs(engine) {
    const provider = createCanvasParagraphProvider();
    const cache = createParagraphCache(engine.assets, { provider });
    const emptyBounds = Object.freeze({ x: 0, y: 0, width: 0, height: 0 });
    return {
        create(scope, given, density, onFailure) {
            const display = createParagraph(engine, scope, cache);
            let request = {
                text: '',
                width: 1,
                fontFamilies: ['sans-serif'],
                fontSize: 24,
                locale: 'en',
                direction: 'ltr',
                fillColor: 0xffffff,
                density
            };
            let ready = Promise.resolve();
            const set = (next) => {
                if (next === null || typeof next !== 'object')
                    throw new EgretError('BROWSER_GAME_OPTIONS_INVALID');
                const families = gameFontFamilies(next, request.fontFamilies);
                const lineHeight = 'lineHeight' in next ? next.lineHeight : request.lineHeight;
                const textAlign = 'textAlign' in next ? next.textAlign : request.textAlign;
                const maxLines = 'maxLines' in next ? next.maxLines : request.maxLines;
                const proposed = {
                    text: next.text === undefined ? request.text : next.text,
                    width: next.width === undefined ? request.width : next.width,
                    fontFamilies: families,
                    fontSize: next.fontSize === undefined ? request.fontSize : next.fontSize,
                    locale: next.locale === undefined ? request.locale : next.locale,
                    direction: next.direction === undefined ? request.direction : next.direction,
                    fillColor: next.color === undefined ? request.fillColor : next.color,
                    density,
                    ...(lineHeight === undefined ? {} : { lineHeight }),
                    ...(textAlign === undefined ? {} : { textAlign }),
                    ...(maxLines === undefined ? {} : { maxLines })
                };
                // The public Paragraph snapshots and validates before superseding the old request.
                display.setRequest(proposed);
                request = proposed;
                const job = display.prepare().then(() => undefined);
                ready = job;
                void job.catch(cause => {
                    if (ready === job &&
                        !display.isDisposed &&
                        !(cause instanceof EgretError && cause.code === 'PARAGRAPH_STALE'))
                        onFailure(cause);
                });
            };
            try {
                set(given);
            }
            catch (cause) {
                display.dispose();
                throw cause;
            }
            return Object.freeze({
                display,
                get text() {
                    return request.text;
                },
                set text(value) {
                    if (request.text !== value)
                        set({ text: value });
                },
                get ready() {
                    return ready;
                },
                get metrics() {
                    return display.getStatus().metrics;
                },
                get bounds() {
                    const metric = display.getStatus().metrics;
                    return metric === undefined
                        ? emptyBounds
                        : Object.freeze({ x: 0, y: 0, width: metric.width, height: metric.height });
                },
                set,
                dispose() {
                    display.dispose();
                }
            });
        },
        dispose() {
            try {
                cache.dispose();
            }
            finally {
                provider.dispose();
            }
        }
    };
}

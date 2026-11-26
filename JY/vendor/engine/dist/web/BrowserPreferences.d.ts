/**
 * Whether the player has asked the system for less motion (`prefers-reduced-motion: reduce`): then leave out shakes,
 * flashes, parallax and large moves that are only for show. False where the page cannot tell.
 */
export declare function prefersReducedMotion(): boolean;
/** Calls `listener` with the new answer whenever the player changes it. The function returned stops it. */
export declare function watchReducedMotion(listener: (reduced: boolean) => void): () => void;
/** The languages the player's browser asks for, most wanted first, such as `['zh-CN', 'en']`; empty where unknown. */
export declare function browserLanguages(): readonly string[];
//# sourceMappingURL=BrowserPreferences.d.ts.map
import type { SemanticBounds, UiSemantics } from './semanticTypes.js';
/**
 * The rows of a managed virtual list, as nodes of a semantic tree.
 *
 * A virtual list realizes the rows that show and recycles the rest, so its nodes come and go with
 * every commit. This keeps one node for the list and one for each row that shows, reads their
 * places from what the root committed, and reports each row's position in the whole set of
 * records. It reads the root; it changes nothing in it but the focus a row is asked to take.
 */
/** What is read of a managed UI root. The root `createUiRoot` returns is one. */
export interface SemanticListSource {
    readonly id: string;
    snapshot(): {
        readonly committedRevision: number;
        readonly origin: {
            readonly x: number;
            readonly y: number;
        };
        readonly boxes: readonly {
            readonly id: string;
            readonly x: number;
            readonly y: number;
            readonly width: number;
            readonly height: number;
        }[];
    };
    list(id: string): {
        snapshot(): {
            readonly rows: readonly {
                readonly key: string;
                readonly index: number;
                readonly visible: boolean;
                readonly box: SemanticBounds;
            }[];
            readonly counters: {
                readonly recordCount: number;
            };
        };
        getFocus(): {
            readonly key: string | undefined;
        };
        focus(key: string | undefined, options?: {
            readonly visible?: boolean;
        }): void;
    };
}
export interface SemanticListRow {
    /** What the row is called. An option needs a name; a list item may leave it to the nodes inside it. */
    readonly name?: string;
    /** Options only. An option that does not say is not selected. */
    readonly selected?: boolean;
    /** Options only. */
    readonly disabled?: boolean;
}
export interface UiListSemanticsOptions {
    readonly semantics: UiSemantics;
    readonly root: SemanticListSource;
    /** The id of the virtual list in the tree of the root. */
    readonly list: string;
    /** The id of the list node. Defaults to the id of the root, a slash, and the id of the list. A row adds a slash and its key. */
    readonly id?: string;
    /** The node the list is inside. */
    readonly parent?: string;
    /** A 'list' of list items, which may hold other nodes, or a 'listbox' of options. Defaults to 'list'. */
    readonly role?: 'list' | 'listbox';
    readonly name?: string;
    /**
     * Read at each publication. A list that says it is hidden is left out with its rows: the list of a
     * popup or a modal layer while that layer is closed. Its rows are then not asked.
     */
    readonly hidden?: () => boolean;
    /** Read at each publication for each row that shows. */
    readonly describeRow?: (key: string, index: number) => SemanticListRow;
    /** The activation of a row, the one a press or a key on it reaches. Without it a row cannot be activated. */
    readonly onActivateRow?: (key: string) => void;
    /** Whether a row may be asked to take the keyboard focus. The root then needs a keyboard. Defaults to false. */
    readonly focusable?: boolean;
    /** Called after the node of a row was added, so that nodes inside it can be added under `id`. They go with the row. */
    readonly onRowAdded?: (key: string, id: string) => void;
}
export interface UiListSemantics {
    readonly id: string;
    /** The id of the node of a row, whether or not the row shows now. */
    rowId(key: string): string;
    /**
     * Brings the nodes to the rows of the last commit: removes those that no longer show, moves those
     * that stayed, adds those that show now. Returns the committed revision, which is what `publish`
     * takes. When the tree refuses a new row, none of the new rows is added and the refusal is thrown.
     */
    sync(): number;
    /** Removes the list node and every row. */
    dispose(): void;
}
/**
 * The rectangle on the stage of a box a managed UI root laid out: a leaf, a row, a column or a
 * list, by its id in the tree of the root. It is read from the last commit when it is called, so
 * call it from `describe`. A box the root has not laid out has no size, at the origin of the root.
 */
export declare function semanticBoxOf(root: Pick<SemanticListSource, 'snapshot'>, id: string): SemanticBounds;
export declare function createUiListSemantics(options: UiListSemanticsOptions): UiListSemantics;
//# sourceMappingURL=semanticList.d.ts.map
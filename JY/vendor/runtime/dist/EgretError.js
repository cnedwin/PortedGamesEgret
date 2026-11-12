/** Stable machine-readable code, original cause, and associated cleanup failures. */
export class EgretError extends Error {
    code;
    cleanupErrors;
    constructor(code, options = {}) {
        super(code, { cause: options.cause });
        this.name = "EgretError";
        this.code = code;
        // Copy and freeze the list without replacing the original failure cause.
        this.cleanupErrors = Object.freeze([...(options.cleanupErrors ?? [])]);
    }
}
//# sourceMappingURL=EgretError.js.map
export class Math3DError extends Error {
    code;
    constructor(code, cause) {
        super(code, { cause });
        this.code = code;
        this.name = 'Math3DError';
    }
}
function source(operation) {
    // Only the actual source operation is caught; a caller's error class/code
    // never turns its throw into a trusted validation result.
    try {
        return operation();
    }
    catch (cause) {
        throw new Math3DError('MATH3D_INPUT_READ_FAILED', cause);
    }
}
function native(operation) {
    // Owned allocation/publication faults retain their original cause. Shape,
    // finite and arithmetic checks execute outside this narrow native boundary.
    try {
        return operation();
    }
    catch (cause) {
        throw new Math3DError('MATH3D_NATIVE_FAILED', cause);
    }
}
function publish(values) {
    return native(() => Object.freeze(values));
}
function write(values, index, value) {
    native(() => { values[index] = value; });
}
function capture(input, count) {
    if (!source(() => Array.isArray(input)))
        throw new Math3DError('MATH3D_INPUT_INVALID');
    const array = input;
    if (source(() => array.length) !== count)
        throw new Math3DError('MATH3D_INPUT_INVALID');
    const values = native(() => new Array(count));
    let hole = false;
    // Capture own slots in order before semantic checks. A later source fault
    // wins over an earlier hole/bad component, without reading inherited slots.
    for (let index = 0; index < count; index++) {
        if (source(() => Object.hasOwn(array, String(index))))
            write(values, index, source(() => array[index]));
        else
            hole = true;
    }
    if (hole)
        throw new Math3DError('MATH3D_INPUT_INVALID');
    for (let index = 0; index < count; index++) {
        const value = values[index];
        if (typeof value !== 'number' || !Number.isFinite(value))
            throw new Math3DError('MATH3D_INPUT_INVALID');
        write(values, index, value === 0 ? 0 : value);
    }
    // This private ordinary array becomes the tuple; no caller storage survives.
    return publish(values);
}
export function createMatrix4(input) {
    return capture(input, 16);
}
export function createVector4(input) {
    return capture(input, 4);
}
function finite(value) {
    if (!Number.isFinite(value))
        throw new Math3DError('MATH3D_ARITHMETIC_RANGE');
    return value;
}
function component(matrix, row, right, offset) {
    // Four binary64 products k0..3 precede all sums. Each product and the fixed
    // ((p0+p1)+p2)+p3 sequence is checked; cancellation cannot repair overflow.
    const p0 = finite(matrix[row] * right[offset]);
    const p1 = finite(matrix[4 + row] * right[offset + 1]);
    const p2 = finite(matrix[8 + row] * right[offset + 2]);
    const p3 = finite(matrix[12 + row] * right[offset + 3]);
    const s01 = finite(p0 + p1);
    const s012 = finite(s01 + p2);
    return finite(s012 + p3);
}
export function multiplyMatrix4(left, right) {
    // Ordered argument snapshots also apply when both arguments are one object.
    const a = createMatrix4(left);
    const b = createMatrix4(right);
    const result = native(() => new Array(16));
    // Column-major storage and column vectors require columns before rows.
    for (let column = 0; column < 4; column++) {
        for (let row = 0; row < 4; row++) {
            const value = component(a, row, b, column * 4);
            write(result, column * 4 + row, value === 0 ? 0 : value);
        }
    }
    return publish(result);
}
export function transformHomogeneous4(matrix, vector) {
    const m = createMatrix4(matrix);
    const v = createVector4(vector);
    const result = native(() => new Array(4));
    for (let row = 0; row < 4; row++) {
        const value = component(m, row, v, 0);
        write(result, row, value === 0 ? 0 : value);
    }
    // Keep all four raw homogeneous components, including changed/zero/negative
    // w. Division, clipping, visibility and float32 conversion are later policies.
    return publish(result);
}

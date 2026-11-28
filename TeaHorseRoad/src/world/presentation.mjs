/** Mobile WebKit may omit the composited World3D canvas after its buffer is resized dynamically. */
export function needsStableWorldCanvas({ userAgent = '', maxTouchPoints = 0 } = {}) {
  return /AppleWebKit\//.test(userAgent) && (
    /\b(?:iPhone|iPad|iPod)\b/.test(userAgent) || (/\bMacintosh\b/.test(userAgent) && maxTouchPoints > 1)
  );
}

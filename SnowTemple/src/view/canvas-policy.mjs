/** Mobile Apple WebKit can retain a blank composited canvas after backing-size changes. */
export function useFixedWorldResolution({userAgent='',maxTouchPoints=0}={}) {
  if(!userAgent.includes('AppleWebKit/'))return false;
  if(/\b(?:iPhone|iPad|iPod)\b/.test(userAgent))return true;
  return userAgent.includes('Macintosh')&&maxTouchPoints>1;
}

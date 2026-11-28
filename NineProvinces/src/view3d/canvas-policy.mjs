/** Mobile Apple WebKit can retain a blank composited canvas after backing-size changes. */
export function useFixedWorldResolution({userAgent='',maxTouchPoints=0}={}) {
  if(!userAgent.includes('AppleWebKit/'))return false;
  if(/\b(?:iPhone|iPad|iPod)\b/.test(userAgent))return true;
  return userAgent.includes('Macintosh')&&maxTouchPoints>1;
}

/** Keep map rendering affordable on a processor without reducing the native UI density.
 * An explicit quality choice always retains the usual engine resolution range. */
export function automaticWorldResolution({software=false,automatic=false,fixed=false}={}) {
  if(fixed)return null;
  return software&&automatic?{min:.34,max:.50,step:.08,lowFps:45,highFps:57,downAfter:.65,upAfter:6}:{};
}

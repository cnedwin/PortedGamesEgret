// Optional desktop hardware rendering for the official device-profile verifier.
// The viewport/touch profiles are still emulated; no physical-phone evidence is implied.
// Without explicit opt-in this forwards the verifier's default software options unchanged.
import {chromium as real} from 'playwright';
const hardware=process.env.SNOW_HARDWARE==='1';
const executablePath=process.env.CHROMIUM_PATH;
if(hardware&&!executablePath)throw Error('SNOW_HARDWARE=1 requires CHROMIUM_PATH');
export const chromium={launch(options={}){
 if(!hardware)return real.launch(options);
 const args=(options.args??[]).filter(a=>!a.startsWith('--use-angle')&&a!=='--enable-unsafe-swiftshader');
 return real.launch({...options,executablePath,headless:true,args:[...args,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-software-rasterizer']});
}};

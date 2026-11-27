// Explicit opt-in for official screen verification when the full real race on
// SwiftShader is impractically slow. The profile geometry is still emulated;
// only the local Windows GPU backend is changed. No vendor script is edited.
import {chromium as real} from 'playwright';
if(process.env.RALLY_HARDWARE!=='1'||!process.env.CHROMIUM_PATH)throw Error('Explicit RALLY_HARDWARE=1 and CHROMIUM_PATH required');
export const chromium={launch(options={}){const args=(options.args??[]).filter(x=>x!=='--use-angle=swiftshader'&&x!=='--enable-unsafe-swiftshader');return real.launch({...options,executablePath:process.env.CHROMIUM_PATH,headless:true,args:[...args,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-software-rasterizer']});}};

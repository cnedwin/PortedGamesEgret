// Use real hardware for costly World3D captures; device sizes are still browser emulation.
import {chromium as actual} from 'playwright';
const hardware=process.env.FPS_HARDWARE==='1';
if(hardware&&!process.env.CHROMIUM_PATH)throw Error('FPS_HARDWARE requires CHROMIUM_PATH');
export const chromium={launch(options={}){if(!hardware)return actual.launch(options);const args=(options.args??[]).filter(x=>!x.startsWith('--use-angle')&&x!=='--enable-unsafe-swiftshader');return actual.launch({...options,headless:true,executablePath:process.env.CHROMIUM_PATH,args:[...args,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--disable-software-rasterizer']});}};
// Build a standalone, diagnostic-only page; the game and vendored engine are read-only inputs.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {instrumentEnginePlugin} from './engine-instrument.mjs';
import {denseClientSource} from './dense-harness.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT=path.resolve(HERE,'../..');
const args=process.argv.slice(2);
function option(name,fallback){
  const i=args.indexOf(name);
  if(i<0)return fallback;
  if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+name);
  return args[i+1];
}
const exists=async p=>{try{await fs.stat(p);return true}catch(e){if(e.code==='ENOENT')return false;throw e}};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function within(parent,child){
  const rel=path.relative(parent,child);
  return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));
}
async function readMap(root){
  const html=await fs.readFile(path.join(root,'index.html'),'utf8');
  const match=html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if(!match)throw Error('Official import map missing');
  return {html,map:JSON.parse(match[1]).imports};
}
async function fingerprint(root,map){
  const hash=createHash('sha256'),files=[];
  async function walk(dir,extension){
    for(const e of (await fs.readdir(path.join(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
      const name=path.posix.join(dir,e.name);
      if(e.isDirectory())await walk(name,extension);
      else if(e.isFile()&&name.endsWith(extension))files.push(name);
    }
  }
  await walk('src','.mjs');await walk('vendor','.js');
  for(const name of files)hash.update(name).update(await fs.readFile(path.join(root,name)));
  for(const name of ['index.html','style.css','assets/manifest.json'])hash.update(name).update(await fs.readFile(path.join(root,name)));
  return hash.update(JSON.stringify(map)).digest('hex');
}
function testPage(html){
  // Force the isolated instrumented bundle even if someone adds ?dev. Do not route to production source.
  const entry=/new URLSearchParams\(location\.search\)\.has\(["']dev["']\)\s*\?\s*['"]\.\/src\/main\.mjs['"]\s*:\s*['"]\.\/build\/lantern\.js['"]/g;
  const matches=[...html.matchAll(entry)];
  if(matches.length!==1)throw Error('Expected one game bundle selector');
  if(!html.includes('<script type="module">'))throw Error('Expected module entry');
  return html.replace(entry,"'./build/lantern.js'")
    .replace('<script type="module">','<script src="./profile-client.js"></script>\n  <script type="module">')
    .replace('<head>','<head>\n  <!-- Diagnostic profile only; not for publication. -->');
}
export async function buildProfile({root=DEFAULT_ROOT,out,compact=false,backpressure=false,spineDetail=false}={}){
  root=await fs.realpath(path.resolve(root));
  const {html,map}=await readMap(root);
  if(!(await exists(path.join(root,'src/main.mjs'))) || !(await exists(path.join(root,'vendor/SOURCE.md'))))throw Error('Expected a LanternShadows game source checkout');
  const startHash=await fingerprint(root,map);
  if(out){
    const requested=path.resolve(out);
    // Resolve the existing parent before writing, so a symlink cannot place the output in game source.
    out=path.join(await fs.realpath(path.dirname(requested)),path.basename(requested));
    if(within(root,out))throw Error('Output must be outside the input game directory');
    if(await exists(out))throw Error('Output already exists; provide a fresh directory');
    await fs.mkdir(out);
  }else out=await fs.mkdtemp(path.join(os.tmpdir(),'lantern-profile-'));
  const esbuildRef=process.env.ESBUILD??'esbuild';
  const esbuild=await import(await exists(esbuildRef)?pathToFileURL(path.resolve(esbuildRef)).href:esbuildRef);
  await fs.mkdir(path.join(out,'build'));
  const clientSource=spineDetail?(await import("./dense-spine-harness.mjs")).denseClientSource:denseClientSource;
  const instrument=spineDetail?(await import("./spine-instrument.mjs")).instrumentEnginePlugin:instrumentEnginePlugin;
  if(spineDetail)backpressure=true;
  const result=await esbuild.build({
    entryPoints:[path.join(root,'src/main.mjs')],outfile:path.join(out,'build/lantern.js'),
    bundle:true,format:'esm',target:'es2022',minify:true,keepNames:true,legalComments:'none',metafile:true,
    banner:{js:'/*! Lantern Shadows isolated diagnostic build; engine and Spine notices in vendor/; not a release bundle. */'},
    plugins:[{
      name:'game-import-map',setup(build){build.onResolve({filter:/^[^./]/},a=>{
        if(a.kind==='entry-point')return;
        return map[a.path]?{path:path.join(root,map[a.path])}:{errors:[{text:'Unmapped import '+a.path}]};
      });}
    },instrument({root,compact,backpressure})]
  });
  // Assets and CSS keep their ordinary relative paths. The source and vendor trees are not modified/copied.
  await fs.cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true,errorOnExist:true});
  const css=await fs.readFile(path.join(root,'style.css'),'utf8');
  await fs.writeFile(path.join(out,'style.css'),css+(compact?'\n/* QA only: both variants use one compact logical stage and identical CSS booth. */\n.booth { width:min(100vw,calc(100dvh * 16 / 9)); height:min(100dvh,calc(100vw * 9 / 16)); aspect-ratio:16 / 9; }\n':''));
  await fs.writeFile(path.join(out,'index.html'),testPage(html));
  await fs.writeFile(path.join(out,'profile-client.js'),clientSource+'\n');
  await fs.mkdir(path.join(out,'vendor'));
  // Preserve the bundled dependencies' notices and individual third-party license files.
  for(const name of ['SOURCE.md','NOTICE','LICENSE']){
    const input=path.join(root,'vendor',name);
    if(await exists(input))await fs.copyFile(input,path.join(out,'vendor',name));
  }
  for(const name of ['@esotericsoftware__spine-core','robust-predicates']){
    for(const entry of ['LICENSE','LICENSE.md','LICENSE.txt','NOTICE']){
      const input=path.join(root,'vendor',name,entry);
      if(await exists(input)){await fs.mkdir(path.join(out,'vendor',name),{recursive:true});await fs.copyFile(input,path.join(out,'vendor',name,entry));}
    }
  }
  const sourceMd=await fs.readFile(path.join(root,'vendor/SOURCE.md'),'utf8');
  const packed=await fs.readFile(path.join(out,'build/lantern.js'));
  if(startHash!==await fingerprint(root,map))throw Error('Input changed during the diagnostic build');
  const record={diagnostic:true,compact,backpressure,engineCommit:sourceMd.match(/commit `([0-9a-f]{40})`/)?.[1]??null,gameInputs:startHash,esbuild:esbuild.version,modules:Object.keys(result.metafile.inputs).length,bytes:packed.length,bundleSha256:sha(packed),profileSha256:sha(clientSource),...(spineDetail?{spineDetail:true,protocol:"lantern-dense-fixed-step/2"}:{})};
  await fs.writeFile(path.join(out,'build/profile.json'),JSON.stringify(record,null,2)+'\n');
  return {out,record};
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.atlas':'text/plain; charset=utf-8','.wasm':'application/wasm'};
export async function serveProfile(root,{host='127.0.0.1',port=0}={}){
  root=await fs.realpath(root);
  const server=createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
      const file=await fs.realpath(path.resolve(root,relative));
      if(!within(root,file))throw Error('Outside profile output');
      const data=await fs.readFile(file);
      res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream','cache-control':'no-store'});
      res.end(req.method==='HEAD'?undefined:data);
    }catch{res.writeHead(404).end();}
  });
  await new Promise((done,fail)=>server.once('error',fail).listen(port,host,done));
  return {server,url:'http://'+host+':'+server.address().port+'/?clones=100&lang=en&seed=734'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(args.includes('--help')){console.log('node build-profile.mjs [--root GAME] [--out NEW_DIRECTORY] [--serve] [--host 127.0.0.1] [--port 0] [--compact] [--backpressure] [--spine-detail]');}
  else{
    const built=await buildProfile({root:option('--root',DEFAULT_ROOT),out:option('--out'),compact:args.includes('--compact'),backpressure:args.includes('--backpressure'),spineDetail:args.includes('--spine-detail')});
    console.log(JSON.stringify(built,null,2));
    if(args.includes('--serve')){
      const {url}=await serveProfile(built.out,{host:option('--host','127.0.0.1'),port:Number(option('--port','0'))});
      console.log('Open '+url+' and follow test/perf/README.md. Ctrl+C to stop.');
    }
  }
}

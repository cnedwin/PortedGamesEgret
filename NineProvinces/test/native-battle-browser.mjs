// Use the actual native view geometry and semantic IDs, never DOM hit boxes.
export const currentView=()=>{const a=window.egretGame.app;return a.lab?.controller?.nativeView??a.battle?.nativeView??a.nativeTitle?.view;};
export async function nativePart(page,id,{focus=false,method='pointer',timeout=15000}={}){
  await page.waitForFunction(({id,focus})=>{
    const a=window.egretGame?.app,v=a?.lab?.controller?.nativeView??a?.battle?.nativeView??a?.nativeTitle?.view;if(!v)return false;
    let node=a.uiHost.semantics.publish().nodes.find(n=>n.id.endsWith(':'+id)&&!n.hidden&&!n.inert);
    if(!node||focus||!v.visibleRect(id)){try{v.focus(id);}catch{}node=a.uiHost.semantics.publish().nodes.find(n=>n.id.endsWith(':'+id)&&!n.hidden&&!n.inert);}
    return !!node&&!node.disabled&&Boolean(v.visibleRect(id));
  },{id,focus},{timeout});
  const target=await page.evaluate(id=>{const a=window.egretGame.app,v=a.lab?.controller?.nativeView??a.battle?.nativeView??a.nativeTitle?.view,n=a.uiHost.semantics.publish().nodes.find(n=>n.id.endsWith(':'+id)&&!n.hidden&&!n.inert),r=v.visibleRect(id),frame=a.game.browser.frame,c=a.game.canvas.getBoundingClientRect();return {name:n.name,role:n.role,id:n.id,x:c.left+(r.x+r.width/2)*c.width/frame.width,y:c.top+(r.y+r.height/2)*c.height/frame.height,width:r.width*c.width/frame.width,height:r.height*c.height/frame.height};},id);
  if(focus)return target;
  if(method==='semantic'){await page.evaluate(id=>{const a=window.egretGame.app,n=a.uiHost.semantics.publish().nodes.find(n=>n.id===id);return a.uiHost.tester.press(`${n.role}:${n.name}`);},target.id);}
  else await page.mouse.click(target.x,target.y);
  return target;
}
export async function nativeGeometry(page,id){return page.evaluate(id=>{const a=window.egretGame.app,v=a.lab?.controller?.nativeView??a.battle?.nativeView??a.nativeTitle?.view,r=v?.visibleRect(id),plan=v?.rect(id),c=a.game.canvas.getBoundingClientRect(),f=a.game.browser.frame;if(!r||!plan)return null;const css=x=>({x:c.left+x.x*c.width/f.width,y:c.top+x.y*c.height/f.height,width:x.width*c.width/f.width,height:x.height*c.height/f.height});return{visible:css(r),planned:css(plan),canvas:{x:c.left,y:c.top,width:c.width,height:c.height}};},id)}
export const waitFrames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
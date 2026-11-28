// Attached Play currently has no World3DOverlay object; the official
// createOverlayScreenMarkers3D layer also deliberately rejects pointer hits.
// Use the native World3D projection and the *same* real Play display, input
// and semantic tree for interactive nameplates rather than constructing a
// fake overlay object or adding a second canvas/clock.
import {projectToViewport3D} from '@egret/engine/world3d';
import {NODES} from '../data/map.mjs';
import {nm,getLanguage} from '../i18n.mjs';
import {createMapPlatePool} from '../ui/native-map-plates.mjs';
import {placePlate,armyPlate,plateExtent} from '../ui/native-map-plate-model.mjs';
import {placedRect,selectVisibleMarkers,markerHitArea,reliefDrop} from './map-marker-math.mjs';

export function createNativeMapMarkers(host,{camera,sceneCanvas,onNode,onArmy,onWarning}={}){
  const game=host.game,layer=game.sprite(undefined,game.ui),records=new Map();
  const pool=createMapPlatePool(host,layer,record=>{
    if(record.type==='place')onNode?.(record.entity);
    else if(record.type==='army')onArmy?.(record.entity);
  },onWarning);
  let closed=false,active=0,visiblePortraits=0;
  const releaseVisual=record=>{
    if(record.visual){pool.give(record.type,record.visual);record.visual=null;}
  };
  function add(type,entity,target,options={}){
    if(closed)throw Error('Realm markers closed');
    const id=type+':'+entity;if(records.has(id))throw Error('Duplicate realm marker '+id);
    const record={id,type,entity,target,offset:options.offset??[0,0,0],maxDistance:options.maxDistance??Infinity,
      label:options.label,enabled:true,visual:null,projected:{x:0,y:0,depth:0,onScreen:false,inFront:false},world:new Float32Array(3)};
    records.set(id,record);
    return {get visible(){return Boolean(record.visual);},get point(){return record.projected;},
      setVisible(on){record.enabled=Boolean(on);if(!on)releaseVisual(record);},retarget(next){record.target=next;},
      dispose(){releaseVisual(record);records.delete(id);}};
  }
  function model(record,state,selection,player,sieges,far){
    if(record.type==='place')return placePlate(state,record.entity,selection,player,sieges);
    if(record.type==='army')return armyPlate(state,record.entity,selection,player,far);
    const words=nm(record.label);return {id:record.entity,type:'relief',name:words,words,priority:0,key:getLanguage()+':'+words};
  }
  function update({state,selection,player,visible,distance,showRelief}){
    if(closed)return;
    if(!visible){for(const record of records.values())releaseVisual(record);active=visiblePortraits=0;return;}
    const {screen,safe,scale}=host.metrics(),scene=sceneCanvas.getBoundingClientRect(),mapper=host.mapper();
    if(!(scene.width>0&&scene.height>0&&scale>0))return;
    camera.updateViewMatrices();const eye=camera.matrixWorld;
    const far=distance>170,sieges=new Set(Object.values(state?.armies??{}).map(a=>a.besieging).filter(Boolean));
    const occluders=[...(host.mapOcclusionRects?.()??[])],reservedBottom=Math.max(safe.y,screen.y+host.topInset/scale);
    if(reservedBottom>safe.y)occluders.push({x:safe.x,y:safe.y,width:safe.width,height:reservedBottom-safe.y});
    const candidates=[];
    for(const record of records.values()){
      if(!record.enabled)continue;
      if(record.type==='relief'&&!showRelief)continue;
      if(record.type==='place'){
        const n=NODES[record.entity];if(!n||(n.kind!=='city'&&distance>150)||(n.kind==='city'&&n.size<=2&&distance>230))continue;
      }
      const {world,target,offset,projected}=record;
      if(Array.isArray(target)||ArrayBuffer.isView(target))world.set(target);
      else{target.updateWorldMatrix();const m=target.matrixWorld;world[0]=m[12];world[1]=m[13];world[2]=m[14];}
      for(let i=0;i<3;i++)world[i]+=offset[i];
      const length=Math.hypot(world[0]-eye[12],world[1]-eye[13],world[2]-eye[14]);if(length>record.maxDistance)continue;
      projectToViewport3D(camera,world,scene.width,scene.height,projected);
      if(!projected.inFront||!projected.onScreen)continue;
      const data=model(record,state,selection,player,sieges,far);if(!data)continue;
      const origin=mapper.toDesign(projected.x,projected.y),extent=record.visual?.extent(data)??plateExtent(data),passive=record.type==='relief';
      let rect=placedRect(origin,passive?extent:markerHitArea(extent),scale);
      if(passive){
        // Old labels moving out from under the top HUD travelled at most 56
        // CSS pixels; retain that bounded accommodation in native units.
        const drop=reliefDrop(rect,reservedBottom+4/scale,scale);if(drop===null)continue;
        origin.y+=drop;rect={...rect,y:rect.y+drop};
      }
      candidates.push({id:record.id,record,data,origin,rect,priority:data.priority,distance:length,passive,retained:Boolean(record.visual)});
    }
    const chosen=selectVisibleMarkers(candidates,safe,occluders),ids=new Set(chosen.map(item=>item.id));
    for(const record of records.values())if(!ids.has(record.id))releaseVisual(record);
    active=chosen.length;visiblePortraits=0;
    for(const item of chosen){
      const {record,data,origin}=item;
      record.visual??=pool.take(record.type);
      // At most 24 visible portrait pages alongside native shared label atlas,
      // native menus and minimap. Dense/far overflow keeps the original
      // faction seal, identity and action rather than failing a whole frame.
      const portrait=data.type==='army'&&Boolean(data.portrait)&&visiblePortraits<24;
      if(portrait)visiblePortraits++;
      record.visual.bind(record,data,portrait);record.visual.place(origin,scale);
    }
  }
  const api={
    addPlace(id,target,opts){return add('place',id,target,opts);},
    addArmy(id,target,opts){return add('army',id,target,opts);},
    addRelief(id,target,label,opts){return add('relief',id,target,{...opts,label});},
    update,dispose(){if(closed)return;closed=true;for(const r of records.values())releaseVisual(r);records.clear();pool.dispose();if(!layer.isDisposed)layer.dispose();},
    // Read-only diagnostics for the native screen/interaction acceptance.
    snapshot(){return {records:records.size,visible:active,visiblePortraits,pool:pool.stats(),shown:[...records.values()].filter(r=>r.visual).map(r=>({id:r.id,entity:r.entity,type:r.type,x:r.visual.root.x,y:r.visual.root.y,bounds:r.visual.stageBounds}))};}
  };
  game.scope.use(api);return api;
}

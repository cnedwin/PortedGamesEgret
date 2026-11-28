// The mode-specific command map is a data adapter, not another input source.
// Keep these aliases together so production and mapping tests use one contract.
export function createInputMapping(moveCodes,battleCodes) {
  const moves=new Set(moveCodes);
  const arrows={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown'};
  const bind=(command,keys=[command],repeat=false)=>({command,keys,repeat});
  const asKeys=(codes,extras={},repeat=false)=>[...codes].map(code=>bind(code,[code,...(extras[code]??[])],repeat&&moves.has(code)));
  const mapMoves=asKeys(moves,{ArrowLeft:['pad:left'],ArrowRight:['pad:right'],ArrowUp:['pad:up'],ArrowDown:['pad:down']});
  const mapCommands=[...mapMoves,bind('Enter',['Enter','NumpadEnter','pad:a']),bind('Space'),bind('Escape',['Escape','pad:b','pad:start']),bind('KeyB')];
  const menuCommands=asKeys(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','BracketLeft','BracketRight','PageUp','PageDown'],{},true);
  return {
    digital:['pad:left','pad:right','pad:up','pad:down'],
    modes:{
      map:{bindings:mapCommands,analog:arrows,
        gamepadOrder:['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape']},
      script:{bindings:[bind('Enter',['Enter','NumpadEnter','pad:a','pad:start']),bind('Space'),bind('Escape',['Escape','pad:b'])]},
      journal:{bindings:[]},
      menu:{bindings:menuCommands,analog:arrows},
      team:{bindings:[...menuCommands,bind('KeyA',['KeyA','pad:x']),bind('KeyO',['KeyO','pad:start'])],analog:arrows,
        gamepadOrder:['KeyA','KeyO']},
      'native-battle-modal':{bindings:[]},
      battle:{bindings:[
        ...asKeys(battleCodes,{
          KeyW:['pad:up'],KeyS:['pad:down'],ArrowLeft:['pad:left'],ArrowRight:['pad:right'],
          KeyB:['pad:b'],KeyL:['pad:x'],KeyI:['pad:y','pad:r1'],KeyM:['pad:l1'],
          KeyQ:['extra:l2'],KeyF:['extra:r2'],KeyT:['extra:l3'],KeyV:['extra:r3'],Tab:['pad:select']
        },true),
        bind('Enter',['Enter','NumpadEnter','pad:a']),bind('Space'),bind('Escape',['Escape','pad:start'])
      ],analog:{left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',diagonal:true,allowDigital:true},
        gamepadOrder:['Enter','KeyB','KeyL','KeyI','KeyM','KeyQ','KeyF','Tab','Escape','KeyT','KeyV','KeyW','KeyS','ArrowLeft','ArrowRight']}
    },
    claim(code,mode){
      if(!mode)return false;
      if(mode.mode==='script')return code==='Escape';
      if(mode.mode==='map')return mapCommands.some(b=>b.keys.includes(code));
      return mode.mode==='battle';
    }
  };
}

// Play handles device lifecycle and standard digital inputs. Its current key
// surface lacks the original raw axis/trigger thresholds and L3/R3, so this
// small adapter only observes these values from the official pad source.
// The caller's Play update samples it; no other RAF, event or synthetic keys.
export function createRawPadSample({source,active=()=>true,onReset=()=>{}}){
  let axis={x:0,y:0},selected,waitingReconnect=false;
  function sample(now){
    axis={x:0,y:0};
    if(!active())return [];
    source.poll(now);
    const pads=source.input.pads;
    const pad=pads.find(p=>p.standard&&p.index===selected?.index&&p.id===selected?.id)
      ??pads.find(p=>p.standard);
    if(selected&&(pad?.index!==selected.index||pad?.id!==selected.id)){
      onReset('pad-change');waitingReconnect=!pad;
    } else if(!selected&&pad&&waitingReconnect){
      waitingReconnect=false;onReset('pad-reconnect');
    }
    selected=pad?{index:pad.index,id:pad.id}:undefined;
    if(!pad)return [];
    axis={x:pad.axis(0),y:pad.axis(1)};
    return ['l2','r2','l3','r3'].filter(name=>pad.pressed(name)||pad.value(name)>=.5).map(name=>'extra:'+name);
  }
  return {sample,get axis(){return axis}};
}

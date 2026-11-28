/** A static native view can prepare its last image after its first presentation. */
export function createBackdropPresentation({load,invalidate,active,schedule=setTimeout,cancel=clearTimeout}){
  let source,revision=0,timer;
  function retire(){revision++;if(timer!==undefined){cancel(timer);timer=undefined;}}
  return {
    request(url){
      if(url===source)return;
      retire();source=url;
      if(!url)return;
      const ticket=revision;
      // Acquiring the same cache key observes the engine's real texture promise.
      // The native view still owns its actual image lifecycle and load errors.
      void Promise.resolve().then(()=>load(url)).then(lease=>{
        lease.release();
        if(ticket!==revision||!active())return;
        timer=schedule(()=>{timer=undefined;if(ticket===revision&&active())invalidate();},250);
      },()=>{});
    },
    dispose(){retire();source=undefined;}
  };
}

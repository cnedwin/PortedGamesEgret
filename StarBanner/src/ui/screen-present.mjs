// The compositor may present the previous on-demand frame after a native screen transition.
// Keep a finite second submission, coalesced across that transition; leave steady screens idle.
export function createScreenPresentation(invalidate, { delay=250, schedule=setTimeout, cancel=clearTimeout }={}) {
  let timer, disposed=false;
  return {
    changed(){
      if(disposed)return;
      invalidate();
      if(timer!==undefined)cancel(timer);
      timer=schedule(()=>{timer=undefined;if(!disposed)invalidate();},delay);
    },
    dispose(){disposed=true;if(timer!==undefined)cancel(timer);timer=undefined;}
  };
}

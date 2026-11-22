// Keep the title/controls responsive while cached native art is prepared.
export async function yieldArtPreparation(){
  if(globalThis.scheduler?.yield)await globalThis.scheduler.yield();
  else await new Promise(resolve=>setTimeout(resolve,0));
}

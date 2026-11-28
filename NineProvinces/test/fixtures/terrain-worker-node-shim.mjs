// Node-only adapter for the actual browser worker module, with transferable
// arrays and no duplicate sampling implementation.
import {parentPort,workerData} from 'node:worker_threads';
globalThis.self={
 addEventListener(type,fn){if(type==='message')parentPort.on('message',data=>fn({data}));},
 postMessage(data,transfer){parentPort.postMessage(data,transfer);}
};
await import(workerData.url);

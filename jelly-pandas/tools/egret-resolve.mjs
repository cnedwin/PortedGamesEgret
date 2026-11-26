// Lets Node find the engine copy in vendor/ under the same names the page's
// import map uses, so the rules in src/ run unchanged outside a browser.
export { resolve } from '../vendor/node-resolve.mjs';

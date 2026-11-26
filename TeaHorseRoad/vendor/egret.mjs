#!/usr/bin/env node
// The engine's command for an agent working in this game, copied by tools/vendor-game.mjs:
//   node vendor/egret.mjs guide <question>   the cards of the engine guide that answer
//   node vendor/egret.mjs card <id>          one card;  list [<area> | all]  the areas or an area
//   node vendor/egret.mjs explain <CODE>     an engine error in English and Chinese, with its cards
import { main } from './egret/tools/egret.mjs';
const { code, text } = await main(process.argv.slice(2));
process.stdout.write(text);
process.exitCode = code;

// Both the readable src entry and generated bundle chunks live one directory below the game.
// 源码入口与发布 bundle 在游戏根目录下同一深度；资源地址不依赖调用者所在的子目录。
const GAME_ROOT = new URL('../', import.meta.url);
export const assetUrl = name => new URL('assets/' + name, GAME_ROOT);

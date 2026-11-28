// A scene is ready only after the 3D view accepted its first frame, not when its renderer exists.
// Keep this display outside the screen stack so it can update underneath an open handbook.
export function pictureStatus(picture, page, hasWorld, map3d, hasSheet) {
  if (!hasWorld || !['seat','world','battle'].includes(page) || page==='world'&&!map3d) return null;
  if (picture.loading || page==='world'&&picture.realmRequest || picture.stage&&!picture.stage.presented) return page==='world'?'realm':page;
  if (!picture.stage && picture.tried && hasSheet) return 'unavailable';
  return null;
}

const COPY = {
  seat: ['正在搭建山门…', 'Preparing the mountain gate…'],
  realm: ['正在绘制江湖…', 'Preparing the map…'],
  battle: ['正在排布战阵…', 'Preparing the battlefield…'],
  unavailable: ['三维画面暂不可用，经营仍可继续。', '3D picture unavailable; management remains available.'],
};
export function createPictureLoading(game) {
  const layer = game.sprite(undefined, game.world);
  layer.touchEnabled = false;
  layer.touchChildren = false;
  const background = game.sprite(undefined, layer);
  const label = game.text('', { layer, size: 22, color: 0xf3edde, align: 'center', fontWeight: 600 });
  let shown = null, language;
  layer.visible = false;
  function resize(){
    const screen = game.screen, safe = game.safe;
    background.graphics.clear().beginFill(0x23302b, 1).drawRect(screen.x, screen.y, screen.width, screen.height).endFill();
    const upright = game.orientation === 'portrait';
    label.x = safe.x + safe.width * (upright ? .5 : .35);
    label.y = safe.y + safe.height * (upright ? .30 : .49);
  }
  function show(kind, lang) {
    kind = Object.hasOwn(COPY,kind) ? kind : null;
    if (shown === kind && language === lang) return;
    shown = kind; language = lang;
    layer.visible = !!kind;
    if (!kind) return;
    label.text = COPY[kind][lang==='en'?1:0];
    resize();
  }
  return { show, resize };
}

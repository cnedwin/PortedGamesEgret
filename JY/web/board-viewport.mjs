// Keep the fixed logical board independent of the native UI's expanded stage.
// Only presentation geometry is transformed; tile and battle coordinates stay fixed.
export function containBoard(screen, width, height) {
  const scale = Math.min(screen.width / width, screen.height / height);
  const w = width * scale, h = height * scale;
  return { x: screen.x + (screen.width - w) / 2,
    y: screen.y + (screen.height - h) / 2, width: w, height: h, scale };
}

export function boardPoint(board, x, y) {
  return { x: board.x + x * board.scale, y: board.y + y * board.scale };
}

export function designPoint(board, x, y) {
  if (x < board.x || y < board.y || x > board.x + board.width || y > board.y + board.height) return undefined;
  return { x: (x - board.x) / board.scale, y: (y - board.y) / board.scale };
}

// The model list used for drawing a battle and for downloading its first real field.
export const SET_OF = { low:'low',medium:'mid',high:'high' };
export const BOARD_PROP_NAMES = ['oak','pine','crag','rocks'];
export const BUILDING_BODY = { hq:{model:'stronghold',h:4.06},barracks:{model:'barracks',h:2.96},
  tower:{model:'tower',h:4.52},port:{model:'port',h:2.5},village:{model:'village',h:2.81} };
export const modelOf = unit => unit.type==='commander'?unit.commander:unit.type;

export function figureModelNames(game) {
  const wanted=new Set([...Object.values(BUILDING_BODY).map(b=>b.model),...game.players.map(p=>p.commander)]);
  for(const u of game.units){
    wanted.add(modelOf(u));
    for(const cargo of u.cargo)wanted.add(modelOf(cargo));
  }
  return [...wanted];
}
export const initialModelNames = game => [...new Set([...BOARD_PROP_NAMES,...figureModelNames(game)])];

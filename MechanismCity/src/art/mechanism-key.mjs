const coordinate = (value) => Number(value.toFixed(3));

export function mechanismKey(kind, spec, active) {
  switch (kind) {
    case 'post':
    case 'stand':
      return kind;
    case 'pellet':
      return [kind, spec.type, coordinate(spec.radius)].join(':');
    case 'stone':
      return [kind, coordinate(spec.radius)].join(':');
    case 'seesaw':
      return [kind, coordinate(spec.width)].join(':');
    case 'ramp':
      return [kind, ...spec.points.flatMap(({ x, y }) => [coordinate(x), coordinate(y)])].join(':');
    case 'spring':
      return [kind, coordinate(spec.width), coordinate(spec.height), Math.round(Number(active) * 20)].join(':');
    case 'plate':
    case 'lock':
      return [kind, coordinate(spec.width), coordinate(spec.height), active ? 1 : 0].join(':');
    case 'block':
    case 'crate':
    case 'gate':
      return [kind, coordinate(spec.width), coordinate(spec.height)].join(':');
    default:
      return undefined;
  }
}

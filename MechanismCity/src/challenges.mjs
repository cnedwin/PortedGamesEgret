// 巧解使用模拟器的事件记录，只在这一轮通关时结算。
const happened = (events, type) => events.some((event) => event.type === type);

function inOrder(events, ...types) {
  let next = 0;
  for (const event of events) {
    if (event.type === types[next]) next++;
    if (next === types.length) return true;
  }
  return false;
}

function byShot(events) {
  const shots = [];
  let current;
  for (const event of events) {
    if (event.type === 'shot') {
      current = [];
      shots.push(current);
    }
    current?.push(event);
  }
  return shots;
}

const hitBlock = (events) => events.some(({ type, on }) => type === 'knock' && on === 'block');
const cutAndThrow = (events) => happened(events, 'cut') && happened(events, 'thrown');
const finalShot = (events) => byShot(events).at(-1) ?? [];

export const CHALLENGES = {
  l01: {
    label: '越台直落',
    description: '让开锁的铁丸越过石台，沿弧线直接入锁。',
    matches(events) {
      const shot = finalShot(events);
      return happened(shot, 'lock') && !happened(shot, 'hit');
    }
  },
  l02: {
    label: '借力推木',
    description: '击中木块，把它推入凹槽开锁。',
    matches: hitBlock
  },
  l03: {
    label: '断绳引石',
    description: '射断吊绳，让落石打开底部的锁。',
    matches: (events) => happened(events, 'cut')
  },
  l04: {
    label: '借板飞木',
    description: '用跷板抛起木块，打开高处的锁。',
    matches: (events) => happened(events, 'thrown')
  },
  l05: {
    label: '破箱放石',
    description: '击碎托住圆石的木箱，让圆石滚进锁槽。',
    matches: (events) => happened(events, 'break')
  },
  l06: {
    label: '弹板起跃',
    description: '让铁丸借弹簧板反弹，跳上高台开锁。',
    matches: (events) => happened(finalShot(events), 'spring')
  },
  l07: {
    label: '踩板升闸',
    description: '让木块压下踏板，升起闸门后再开锁。',
    matches: (events) => inOrder(events, 'plate', 'gate')
  },
  l08: {
    label: '一发两机关',
    description: '用同一发铁丸切断吊绳、抛起跷板上的木块，打开双锁。',
    matches: (events) => byShot(events).some(cutAndThrow)
  },
  l09: {
    label: '雷鸣断绳',
    description: '借雷丸爆炸震断吊绳，让落石开锁。',
    matches: (events) => byShot(events).some((shot) => inOrder(shot, 'boom', 'cut'))
  },
  l10: {
    label: '飞木压板',
    description: '把木块抛上踏板，升起闸门后再开锁。',
    matches: (events) => inOrder(events, 'thrown', 'plate', 'gate')
  },
  l11: {
    label: '送木登高',
    description: '用沉丸撞木块，让木块借弹簧跃上高台开锁。',
    matches(events) {
      const shot = finalShot(events);
      return shot[0]?.pellet === 'heavy' && hitBlock(shot) && happened(shot, 'spring');
    }
  },
  l12: {
    label: '连动机枢',
    description: '用同一发雷丸触发断绳和飞木，让木块压板开闸，再开齐双锁。',
    matches: (events) =>
      byShot(events).some((shot) => shot[0].pellet === 'thunder' && cutAndThrow(shot) && inOrder(shot, 'thrown', 'plate', 'gate'))
  }
};

/** One tracker per attempt. Observe the win event before reading earned. */
export function createChallenge(id) {
  const matches = CHALLENGES[id]?.matches;
  const events = [];
  let earned = false;
  let finished = false;
  return {
    observe(event) {
      if (finished || !matches || event.type === 'aim') return;
      if (event.type === 'win' || event.type === 'lose') {
        earned = event.type === 'win' && matches(events);
        finished = true;
        events.length = 0;
      } else {
        events.push(event);
      }
    },
    get earned() {
      return earned;
    }
  };
}

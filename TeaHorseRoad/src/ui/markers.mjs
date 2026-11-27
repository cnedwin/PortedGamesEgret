// 屏幕标记：驿站和两辆队友车在画面上的位置，是叠在画布上的网页元素，由引擎的 createScreenMarkers3D 每帧摆到
// 它们在屏幕上的点；出了画面就贴在边上（clampToEdge），箭头指向它们在的方向。
// The screen markers: where the stations and the two other trucks are on the picture, as page elements over the canvas
// that the engine's `createScreenMarkers3D` moves each frame to their points on the screen. Off the picture they keep
// to its edge (`clampToEdge`), an arrow pointing the way.
import { createScreenMarkers3D } from '@egret/engine/webgl2/world3d';

/** Markers for the route stations (`{ x, y, z, s, zh }`) and the convoy followers (`{ node, zh }`). */
export function createMarkers(container, camera, { stations, followers }) {
  const markers = createScreenMarkers3D({ container, camera });
  const element = (className, words, sub) => {
    const div = document.createElement('div');
    div.className = className;
    const arrow = document.createElement('i'),
      pin = document.createElement('b'),
      name = document.createElement('span');
    arrow.className = 'arrow';
    pin.className = 'pin';
    name.textContent = words;
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.append(pin, name);
    div.append(arrow, badge);
    if (sub !== undefined) {
      const small = document.createElement('small');
      small.textContent = sub;
      badge.append(small);
    }
    container.append(div);
    return { div, arrow, small: div.querySelector('small') };
  };
  let margin = 54;
  const stationMarker = (div, station) => markers.add(div, { target: [station.x, station.y + 8, station.z], clampToEdge: true, margin });
  const stationMarkers = stations.map((station) => {
    const made = element('marker', station.zh, '');
    return { station, marker: stationMarker(made.div, station), ...made };
  });
  const friendMarkers = followers.map((follower) => {
    const made = element('marker friend', follower.zh);
    const marker = markers.add(made.div, { target: follower.node, offset: [0, 3.6, 0], maxDistance: 115 });
    return { follower, marker, ...made };
  });
  let shown = true;
  return {
    /** Show only the next station, with its distance, and the trucks; call once a frame after the camera moves. */
    update(nextIndex, routePosition) {
      container.style.display = shown ? '' : 'none';
      if (!shown) return;
      stationMarkers.forEach(({ station, div, small }, i) => {
        const on = i === nextIndex;
        div.style.visibility = on ? '' : 'hidden';
        if (on && small) {
          const d = Math.max(0, station.s - routePosition);
          const distance = d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`;
          if (small.textContent !== distance) small.textContent = distance;
        }
      });
      markers.update();
      // The arrow of a marker held at the edge turns toward its target.
      for (const { marker, arrow } of [...stationMarkers, ...friendMarkers]) if (marker.onEdge) arrow.style.transform = `rotate(${marker.angle + Math.PI / 2}rad)`;
    },
    // Engine note #29: the engine captures margin when a marker is added; replace just the marker registration,
    // retaining its element and anchor. No re-projection or overlay rebuild is needed.
    setMargin(cssPixels) {
      if (cssPixels === margin) return;
      margin = cssPixels;
      for (const entry of stationMarkers) {
        entry.marker.dispose();
        entry.marker = stationMarker(entry.div, entry.station);
      }
    },
    set visible(on) {
      shown = on;
      container.style.display = on ? '' : 'none';
    },
    dispose() {
      markers.dispose?.();
      container.replaceChildren();
    }
  };
}

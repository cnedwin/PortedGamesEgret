const svgNS = 'http://www.w3.org/2000/svg';

export function createWorldNavigation(viewport, { cancel, signal }) {
  const guide = document.createElement('div');
  guide.className = 'world-route-guide';
  guide.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.setAttribute('preserveAspectRatio', 'none');
  const line = document.createElementNS(svgNS, 'path');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.append(line);
  const marker = document.createElement('span');
  marker.className = 'world-route-marker';
  guide.append(svg, marker);

  const panel = document.createElement('div');
  panel.id = 'world-navigation';
  panel.className = 'world-navigation';
  panel.hidden = true;
  const status = document.createElement('div');
  status.setAttribute('role', 'status');
  const title = document.createElement('strong');
  const detail = document.createElement('span');
  status.append(title, detail);
  const stop = document.createElement('button');
  stop.type = 'button';
  stop.textContent = '取消尋路';
  stop.dataset.worldCancel = '';
  panel.append(status, stop);
  viewport.append(guide, panel);

  let timer;
  let drawn = '';
  guide.hidden = true;

  function hide() {
    clearTimeout(timer);
    guide.hidden = panel.hidden = true;
    delete panel.dataset.state;
  }

  stop.addEventListener('click', cancel, { signal });
  signal.addEventListener('abort', () => {
    hide();
    guide.remove();
    panel.remove();
  }, { once: true });

  return {
    hide,
    show(state, name, message) {
      clearTimeout(timer);
      panel.dataset.state = state;
      title.textContent = name;
      detail.textContent = message;
      panel.hidden = false;
      stop.hidden = state !== 'walking';
      if (state !== 'walking') {
        guide.hidden = true;
        timer = setTimeout(hide, 3200);
      }
    },
    draw(project, position, steps, target) {
      let connected = false;
      const route = [position, ...steps.slice(0, 14)].map(({ x, y }) => {
        const point = project(x, y);
        if (!point || point.some(value => value < 0 || value > 1)) {
          connected = false;
          return '';
        }
        const command = connected ? 'L' : 'M';
        connected = true;
        return command + point.map(value => Math.round(value * 1000)).join(' ');
      }).join(' ');
      if (route !== drawn) line.setAttribute('d', drawn = route);
      const point = project(target.x, target.y);
      marker.hidden = !point || point.some(value => value < .02 || value > .98);
      if (!marker.hidden) {
        marker.style.left = `${(point[0] * 100).toFixed(2)}%`;
        marker.style.top = `${(point[1] * 100).toFixed(2)}%`;
      }
      guide.hidden = false;
    },
  };
}

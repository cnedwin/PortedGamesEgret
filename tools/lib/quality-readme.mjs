// 把 QUALITY.md 里不达标的自动项写进 README 的「已知问题」：一行，以「品质验收未达标」开头，每次运行替换这一行。
// Writes the failing automatic items of QUALITY.md into the README's Known issues as one line, replaced on each run.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARK = '- 品质验收未达标 · Quality items failing';

/** Update `<game>/README.md` from `<game>/QUALITY.md`; returns the line written, or null when nothing fails. */
export function noteQualityInReadme(gameDir) {
  const readmeFile = join(gameDir, 'README.md'),
    qualityFile = join(gameDir, 'QUALITY.md');
  if (!existsSync(readmeFile) || !existsSync(qualityFile)) return null;
  const quality = readFileSync(qualityFile, 'utf8');
  const date = /Date: (\d{4}-\d{2}-\d{2})/.exec(quality)?.[1] ?? '';
  const failing = [...quality.matchAll(/^\| (\w+) \| ([^|]+) \| 自动 · automatic \| 不达标 · fail \| ([^|]*) \|$/gm)].map((m) => `${m[1]} ${m[2].split(' · ')[0].trim()}（${m[3].trim().slice(0, 90)}）`);
  let text = readFileSync(readmeFile, 'utf8');
  const lines = text.split('\n').filter((line) => !line.startsWith(MARK));
  text = lines.join('\n');
  if (!failing.length) {
    writeFileSync(readmeFile, text);
    return null;
  }
  const line = `${MARK}（[QUALITY.md](QUALITY.md)，${date}，无头 Chromium + SwiftShader · headless, software rendering）：${failing.join('；')}。`;
  const heading = /^## 已知问题 · Known issues[ \t]*$/m.exec(text);
  if (!heading) return null;
  const start = heading.index + heading[0].length;
  const next = text.indexOf('\n## ', start);
  const end = next < 0 ? text.length : next;
  const kept = text.slice(start, end).replace('（待补 · To be written）', '').trim();
  const body = '\n\n' + (kept ? kept + '\n' : '') + line + '\n' + (next < 0 ? '' : '\n');
  writeFileSync(readmeFile, text.slice(0, start) + body + text.slice(end).replace(/^\n+/, ''));
  return line;
}

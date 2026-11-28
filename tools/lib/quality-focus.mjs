// Runs inside the checked browser. A canvas can retain DOM keyboard focus
// while its native controls publish their current target as an ARIA descendant.
export function focusedNamedControl() {
  const host = document.activeElement;
  if (!host || host === document.body) return null;

  const usable = el => {
    if (!el?.isConnected || el.matches(':disabled') || el.closest('[hidden],[inert],[aria-hidden="true"],[aria-disabled="true"]')) return false;
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    // Opacity zero is deliberate for engine-projected semantic controls.
    return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' &&
      Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0;
  };
  if (!usable(host)) return null;
  const activeId = host.getAttribute('aria-activedescendant');
  let target = host;
  if (activeId !== null) {
    const candidate = document.getElementById(activeId);
    if (!candidate || candidate === host || !usable(candidate)) return null;
    const owned = host.contains(candidate) || (host.getAttribute('aria-owns') ?? '').split(/\s+/).filter(Boolean)
      .map(id => document.getElementById(id)).some(owner => owner?.isConnected && owner.contains(candidate));
    if (!owned) return null;
    target = candidate;
  }

  const name = (target.getAttribute('aria-label') || target.textContent?.trim() || target.getAttribute('title'))?.trim();
  if (!name) return null;
  const style = getComputedStyle(target), rect = target.getBoundingClientRect();
  const outline = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
  return { name: name.slice(0, 30), size: rect.width * rect.height, outline, activeDescendant: target !== host };
}

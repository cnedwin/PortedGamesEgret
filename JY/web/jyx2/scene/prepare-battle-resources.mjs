// Prepare only already-materialized scene geometry. Optional synthetic program
// descriptors remain shader-only. No rendering, scene mutation or rules here.
export async function prepareBattleResources(renderer, sceneRequests, programOnlyRequests = [], { signal, onMeasured } = {}) {
  const geometries = [...new Set(sceneRequests.map(request => request.mesh.geometry))];
  const requests = [...sceneRequests, ...programOnlyRequests];
  const began = performance.now();
  const measure = async work => {
    const start = performance.now();
    try { await work(); return { ok: true, ms: performance.now() - start }; }
    catch (error) { return { ok: false, ms: performance.now() - start, error }; }
  };
  // Both must settle before the owner may retire a program-only material.
  const [programs, geometry] = await Promise.all([
    measure(() => renderer.preparePrograms(requests)),
    measure(() => renderer.prepareGeometries(geometries, { budgetMs: 4, maxPerSlice: 12, signal })),
  ]);
  const stats = { realGeometries: geometries.length, programRequests: requests.length,
    programOnlyStandIn: programOnlyRequests.length > 0, programMs: programs.ms, geometryMs: geometry.ms,
    totalMs: performance.now() - began, programsReady: programs.ok, geometryReady: geometry.ok };
  onMeasured?.(stats);
  if (!programs.ok) throw programs.error;
  if (!geometry.ok) throw geometry.error;
  return stats;
}

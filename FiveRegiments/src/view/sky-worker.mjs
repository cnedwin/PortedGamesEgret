// Use the same Egret projection as the main thread. Only pixel buffers cross the worker boundary.
self.addEventListener('message', async ({ data: { engine, panorama, size } }) => {
  try {
    const { createCubeTextureFromEquirect3D } = await import(engine);
    const { faces } = createCubeTextureFromEquirect3D(panorama, { size });
    self.postMessage({ faces }, faces.map((face) => face.data.buffer));
  } catch (error) {
    self.postMessage({ error: String(error?.message ?? error) });
  }
});

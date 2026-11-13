const fullscreen = document.querySelector("#fullscreen");

if (fullscreen && document.fullscreenEnabled && document.documentElement.requestFullscreen) {
  fullscreen.hidden = false;
  fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
      // Browsers that support orientation lock can switch without a second tap.
      await screen.orientation?.lock?.("landscape").catch(() => {});
    } catch {
      fullscreen.hidden = true;
    }
  });
}

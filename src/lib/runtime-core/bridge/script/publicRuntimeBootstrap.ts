export function buildPublicRuntimeBootstrapScript() {
  return `
  window.addEventListener('message', function (event) {
    if (event.origin && event.origin !== window.location.origin) {
      return;
    }
    var data = event.data;
    if (!data || typeof data !== 'object') {
      return;
    }
    if (data.type === 'vtabs-open-playback') {
      openPublicPlaybackTools();
    }
    if (data.type === 'vtabs-stop-playback') {
      stopPublicPlayback();
    }
    if (data.type === 'vtabs-close-playback-panel') {
      closePublicPlaybackPanel();
    }
  });

  var patchTimer = window.setInterval(function () {
    if (!window.Song || typeof window.Song.draw !== 'function') {
      return;
    }

    window.clearInterval(patchTimer);
    var originalDraw = window.Song.draw;
    window.Song.draw = function () {
      var result = originalDraw.apply(this, arguments);
      window.requestAnimationFrame(function () {
        renderLetterTrack();
        postSize();
      });
      return result;
    };
    installObservers();
    scheduleInitialSync();
  }, 30);
`
}

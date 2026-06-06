export function buildPublicRuntimeMessageBridgeScript() {
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
`
}

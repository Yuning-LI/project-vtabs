import {
  PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE
} from '../publicRuntimeMessageTypes.ts'

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
    if (data.type === ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE)}) {
      openPublicPlaybackTools();
    }
    if (data.type === ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE)}) {
      stopPublicPlayback();
    }
    if (data.type === ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE)}) {
      closePublicPlaybackPanel();
    }
  });
`
}

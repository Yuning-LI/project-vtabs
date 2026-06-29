import {
  PUBLIC_RUNTIME_CONTAINER_COMMAND_EVENT,
  PUBLIC_RUNTIME_DISPLAY_SETTING_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE,
  PUBLIC_RUNTIME_REDRAW_MESSAGE
} from '../publicRuntimeMessageTypes.ts'

export function buildPublicRuntimeMessageBridgeScript() {
  return `
  function handlePublicRuntimeHostCommand(data) {
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
    if (data.type === ${JSON.stringify(PUBLIC_RUNTIME_REDRAW_MESSAGE)}) {
      requestRuntimeRedraw();
    }
    if (data.type === ${JSON.stringify(PUBLIC_RUNTIME_DISPLAY_SETTING_MESSAGE)}) {
      applyPublicRuntimeDisplaySettings(data.settings || {});
    }
  }

  window.addEventListener(${JSON.stringify(PUBLIC_RUNTIME_CONTAINER_COMMAND_EVENT)}, function (event) {
    handlePublicRuntimeHostCommand(event.detail);
  });
`
}

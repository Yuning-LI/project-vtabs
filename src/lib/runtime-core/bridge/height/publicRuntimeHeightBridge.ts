import {
  PUBLIC_RUNTIME_READY_MESSAGE,
  PUBLIC_RUNTIME_SIZE_MESSAGE
} from '../publicRuntimeMessageTypes.ts'

export function buildPublicRuntimeHeightBridgeScript() {
  return `
  function postSize() {
    var body = document.body;
    var html = document.documentElement;
    var bodyTop = body ? body.getBoundingClientRect().top : 0;
    var measuredBottom = 0;
    ['#sheet', '#sheet .sheet-svg'].forEach(function (selector) {
      var node = document.querySelector(selector);
      if (!node || !node.getBoundingClientRect) {
        return;
      }
      var rect = node.getBoundingClientRect();
      measuredBottom = Math.max(measuredBottom, rect.bottom - bodyTop, rect.height);
    });
    var fallbackHeight = Math.max(
      body ? body.scrollHeight : 0,
      html ? html.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      html ? html.offsetHeight : 0
    );
    var height = measuredBottom > 0 ? measuredBottom + 1 : fallbackHeight;

    if (window.parent) {
      window.parent.postMessage(
        {
          type: ${JSON.stringify(PUBLIC_RUNTIME_SIZE_MESSAGE)},
          songId: songId,
          height: Math.ceil(height)
        },
        '*'
      );
    }
  }

  function postRuntimeReady() {
    if (!window.parent) {
      return;
    }

    window.parent.postMessage(
      {
        type: ${JSON.stringify(PUBLIC_RUNTIME_READY_MESSAGE)},
        songId: songId
      },
      '*'
    );
  }
`
}

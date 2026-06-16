import {
  PUBLIC_RUNTIME_HOST_MESSAGE_EVENT,
  PUBLIC_RUNTIME_READY_MESSAGE,
  PUBLIC_RUNTIME_SIZE_MESSAGE
} from '../publicRuntimeMessageTypes.ts'

export function buildPublicRuntimeHeightBridgeScript() {
  return `
  var postSize = createPublicRuntimeThrottledTask(postSizeImmediate, 120);

  function postSizeImmediate() {
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

    dispatchPublicRuntimeHostMessage({
      type: ${JSON.stringify(PUBLIC_RUNTIME_SIZE_MESSAGE)},
      songId: songId,
      height: Math.ceil(height)
    });
  }

  function postRuntimeReady() {
    dispatchPublicRuntimeHostMessage({
      type: ${JSON.stringify(PUBLIC_RUNTIME_READY_MESSAGE)},
      songId: songId
    });
  }

  function dispatchPublicRuntimeHostMessage(detail) {
    window.dispatchEvent(
      new CustomEvent(${JSON.stringify(PUBLIC_RUNTIME_HOST_MESSAGE_EVENT)}, {
        detail: detail
      })
    );
  }
`
}

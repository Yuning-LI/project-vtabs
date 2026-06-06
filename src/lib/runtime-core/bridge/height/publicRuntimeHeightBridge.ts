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
          type: 'kuailepu-runtime-size',
          songId: songId,
          height: Math.ceil(height)
        },
        '*'
      );
    }
  }

  function requestRedraw() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      try {
        // 快乐谱很多布局值是在 Song.draw() 里一次性计算并写入 DOM 的。
        // 外层尺寸变化后，最稳妥的办法就是重新走一次原始 draw。
        if (window.Song && typeof window.Song.draw === 'function') {
          window.Song.draw();
        }
      } catch (error) {
        console.error(error);
      }
      window.setTimeout(function () {
        renderLetterTrack();
        postSize();
      }, 60);
    }, 80);
  }

  function installObservers() {
    if (window.ResizeObserver && document.body) {
      // 这里只监听 body 尺寸变化，不再做额外复杂观察。
      // 原因是快乐谱 draw 之后，body 变化已经足够覆盖谱面重排场景。
      var observer = new ResizeObserver(function () {
        window.setTimeout(postSize, 30);
      });
      observer.observe(document.body);
    }

    window.addEventListener('resize', requestRedraw);
    mountPublicMetronomePanel();
    installPublicPlaybackBridge();
    renderLetterTrack();
    postSize();
  }

  function scheduleInitialSync() {
    var attempts = 0;
    var successfulRenders = 0;
    window.clearInterval(initialSyncTimer);
    initialSyncTimer = window.setInterval(function () {
      attempts += 1;
      var rendered = renderLetterTrack();
      if (rendered) {
        successfulRenders += 1;
        postSize();
      }
      mountPublicMetronomePanel();
      installPublicPlaybackBridge();
      if (attempts >= 60 || (successfulRenders >= 12 && attempts >= 12)) {
        window.clearInterval(initialSyncTimer);
        postSize();
        setSheetPending(false);
      }
    }, 80);
  }
`
}

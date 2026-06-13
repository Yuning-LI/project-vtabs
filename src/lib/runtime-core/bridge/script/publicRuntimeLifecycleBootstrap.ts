export function buildPublicRuntimeLifecycleBootstrapScript() {
  return `
  var resizeTimer = null;
  var initialSyncTimer = null;

  function requestRuntimeRedraw() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      try {
        // 授权 runtime 很多布局值是在 Song.draw() 里一次性计算并写入 DOM 的。
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

  function installRuntimeLifecycleObservers() {
    if (window.ResizeObserver && document.body) {
      // 这里只监听 body 尺寸变化，不再做额外复杂观察。
      // 原因是授权 runtime draw 之后，body 变化已经足够覆盖谱面重排场景。
      var observer = new ResizeObserver(function () {
        window.setTimeout(postSize, 30);
      });
      observer.observe(document.body);
    }

    window.addEventListener('resize', requestRuntimeRedraw);
    installContainerSheetMenuGuard();
    mountPublicMetronomePanel();
    installPublicPlaybackBridge();
    renderLetterTrack();
    postSize();
    postRuntimeReady();
  }

  function scheduleRuntimeInitialSync() {
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

  function installContainerSheetMenuGuard() {
    if (!document.querySelector('[data-public-runtime-dom-mount="true"]')) {
      return;
    }
    if (document.documentElement.getAttribute('data-vtabs-container-sheet-menu-guard') === '1') {
      return;
    }
    document.documentElement.setAttribute('data-vtabs-container-sheet-menu-guard', '1');

    document.addEventListener(
      'click',
      function (event) {
        var target = event.target;
        if (!target || !target.closest) {
          return;
        }
        var sheet = target.closest('#sheet');
        if (!sheet) {
          return;
        }
        var note = target.closest('.note');
        if (note) {
          return;
        }
        event.stopImmediatePropagation();
      },
      true
    );
  }

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
    installRuntimeLifecycleObservers();
    scheduleRuntimeInitialSync();
  }, 30);
`
}

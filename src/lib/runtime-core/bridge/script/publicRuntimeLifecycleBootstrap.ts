const PUBLIC_RUNTIME_LIFECYCLE_BOOTSTRAP_CONFIG = {
  attributes: {
    sheetMenuGuard: 'data-vtabs-container-sheet-menu-guard'
  },
  selectors: {
    containerMount: '[data-public-runtime-dom-mount="true"]',
    note: '.note',
    sheet: '#sheet'
  },
  timings: {
    drawPatchPollMs: 60,
    initialSyncIntervalMs: 120,
    redrawDelayMs: 120,
    resizeObserverPostSizeDelayMs: 80,
    postDrawSyncDelayMs: 60
  },
  initialSync: {
    maxAttempts: 45,
    minReadyAttempts: 4,
    readySuccessfulRenders: 4
  }
} as const

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
export function buildPublicRuntimeLifecycleBootstrapScript() {
  return `
  var publicRuntimeLifecycleConfig = ${JSON.stringify(PUBLIC_RUNTIME_LIFECYCLE_BOOTSTRAP_CONFIG)};
  var resizeTimer = null;
  var initialSyncTimer = null;
  var runtimeReadyPosted = false;

  function syncRuntimeSheetLayout() {
    renderLetterTrack();
    postSize();
  }

  function requestRuntimeRedraw() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      try {
        // 授权 runtime 很多布局值是在 Song.draw() 里一次性计算并写入 DOM 的。
        // 外层尺寸变化后，最稳妥的办法就是重新走一次原始 draw。
        var runtimeSong = getPublicRuntimeSong();
        if (runtimeSong && typeof runtimeSong.draw === 'function') {
          runtimeSong.draw();
        }
      } catch (error) {
        console.error(error);
      }
      window.setTimeout(function () {
        syncRuntimeSheetLayout();
      }, publicRuntimeLifecycleConfig.timings.postDrawSyncDelayMs);
    }, publicRuntimeLifecycleConfig.timings.redrawDelayMs);
  }

  function applyPublicRuntimeDisplaySettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return;
    }

    if (
      settings.sheetScale !== null &&
      settings.sheetScale !== undefined &&
      settings.sheetScale !== ''
    ) {
      applyPublicRuntimeSheetScale(settings.sheetScale);
    }

    if (
      settings.fingeringIndex !== null &&
      settings.fingeringIndex !== undefined &&
      settings.fingeringIndex !== ''
    ) {
      applyPublicRuntimeFingeringSelection(
        settings.fingeringIndex,
        settings.fingering,
        settings.letterTrackScale
      );
    }

    if (
      settings.measureLayout !== null &&
      settings.measureLayout !== undefined &&
      settings.measureLayout !== ''
    ) {
      applyPublicRuntimeContextValue(
        'measure_layout',
        'measure-layout',
        settings.measureLayout
      );
    }

    if (
      settings.showMeasureNum !== null &&
      settings.showMeasureNum !== undefined &&
      settings.showMeasureNum !== ''
    ) {
      applyPublicRuntimeContextToggle(
        'show_measure_num',
        'show-measure-num',
        settings.showMeasureNum
      );
    }

    if (
      settings.showGraph !== null &&
      settings.showGraph !== undefined &&
      settings.showGraph !== ''
    ) {
      applyPublicRuntimeContextValue(
        'show_graph',
        'show-graph',
        settings.showGraph
      );
    }

    if (
      settings.showLyric !== null &&
      settings.showLyric !== undefined &&
      settings.showLyric !== ''
    ) {
      applyPublicRuntimeContextToggle(
        'show_lyric',
        'show-lyric',
        settings.showLyric
      );
    }
  }

  function applyPublicRuntimeSheetScale(sheetScale) {
    var normalizedSheetScale = String(sheetScale);
    var runtimeSong = getPublicRuntimeSong();
    var runtimeKit = getPublicRuntimeKit();
    var sheetScaleControl = document.getElementById('sheet-scale');

    try {
      if (
        runtimeKit &&
        runtimeKit.context &&
        typeof runtimeKit.context.getContext === 'function'
      ) {
        runtimeKit.context.getContext().sheet_scale = normalizedSheetScale;
      }
    } catch (error) {
      // Context sync is best-effort; runtime redraw fallback below keeps the UI usable.
    }

    if (sheetScaleControl) {
      sheetScaleControl.value = normalizedSheetScale;
    }

    try {
      if (runtimeSong && typeof runtimeSong.scaleSheet === 'function') {
        runtimeSong.scaleSheet(normalizedSheetScale);
      } else {
        requestRuntimeRedraw();
      }
    } catch (error) {
      console.error(error);
      requestRuntimeRedraw();
    }

    window.setTimeout(function () {
      syncRuntimeSheetLayout();
    }, publicRuntimeLifecycleConfig.timings.postDrawSyncDelayMs + publicRuntimeLifecycleConfig.timings.redrawDelayMs);
  }

  function applyPublicRuntimeFingeringSelection(fingeringIndex, fingering, letterTrackScale) {
    var normalizedFingeringIndex = String(fingeringIndex);
    var normalizedFingering =
      fingering !== null && fingering !== undefined && fingering !== ''
        ? String(fingering)
        : null;
    var runtimeKit = getPublicRuntimeKit();

    try {
      if (
        runtimeKit &&
        runtimeKit.context &&
        typeof runtimeKit.context.getContext === 'function'
      ) {
        var context = runtimeKit.context.getContext();
        context.fingering_index = normalizedFingeringIndex;
        if (normalizedFingering) {
          context.fingering = normalizedFingering;
        }
      }
    } catch (error) {
      // Context sync is best-effort; redraw fallback below keeps the UI usable.
    }

    if (letterTrack && Array.isArray(letterTrackScale) && letterTrackScale.length >= 7) {
      letterTrack.scale = letterTrackScale;
    }

    requestRuntimeRedraw();
  }

  function applyPublicRuntimeContextToggle(contextKey, controlId, value) {
    var normalizedValue = value === 'on' ? 'on' : 'off';
    applyPublicRuntimeContextValue(contextKey, controlId, normalizedValue);
  }

  function applyPublicRuntimeContextValue(contextKey, controlId, value) {
    var normalizedValue = String(value);
    var runtimeKit = getPublicRuntimeKit();
    var control = document.getElementById(controlId);

    try {
      if (
        runtimeKit &&
        runtimeKit.context &&
        typeof runtimeKit.context.getContext === 'function'
      ) {
        runtimeKit.context.getContext()[contextKey] = normalizedValue;
      }
    } catch (error) {
      // Context sync is best-effort; redraw fallback below keeps the UI usable.
    }

    if (control) {
      control.value = normalizedValue;
    }

    requestRuntimeRedraw();
  }

  function installRuntimeLifecycleObservers() {
    if (window.ResizeObserver && document.body) {
      // 这里只监听 body 尺寸变化，不再做额外复杂观察。
      // 原因是授权 runtime draw 之后，body 变化已经足够覆盖谱面重排场景。
      var observer = new ResizeObserver(function () {
        window.setTimeout(postSize, publicRuntimeLifecycleConfig.timings.resizeObserverPostSizeDelayMs);
      });
      observer.observe(document.body);
    }

    window.addEventListener('resize', requestRuntimeRedraw);
    installContainerSheetMenuGuard();
    mountPublicMetronomePanel();
    installPublicPlaybackBridge();
    syncRuntimeSheetLayout();
  }

  function postRuntimeReadyOnce() {
    if (runtimeReadyPosted) {
      return;
    }
    runtimeReadyPosted = true;
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
      if (
        attempts >= publicRuntimeLifecycleConfig.initialSync.maxAttempts ||
        (successfulRenders >= publicRuntimeLifecycleConfig.initialSync.readySuccessfulRenders &&
          attempts >= publicRuntimeLifecycleConfig.initialSync.minReadyAttempts)
      ) {
        window.clearInterval(initialSyncTimer);
        postSize();
        setSheetPending(false);
        window.requestAnimationFrame(postRuntimeReadyOnce);
      }
    }, publicRuntimeLifecycleConfig.timings.initialSyncIntervalMs);
  }

  function installContainerSheetMenuGuard() {
    if (!document.querySelector(publicRuntimeLifecycleConfig.selectors.containerMount)) {
      return;
    }
    if (
      document.documentElement.getAttribute(publicRuntimeLifecycleConfig.attributes.sheetMenuGuard) === '1'
    ) {
      return;
    }
    document.documentElement.setAttribute(publicRuntimeLifecycleConfig.attributes.sheetMenuGuard, '1');

    document.addEventListener(
      'click',
      function (event) {
        var target = event.target;
        if (!target || !target.closest) {
          return;
        }
        var sheet = target.closest(publicRuntimeLifecycleConfig.selectors.sheet);
        if (!sheet) {
          return;
        }
        var note = target.closest(publicRuntimeLifecycleConfig.selectors.note);
        if (note) {
          return;
        }
        event.stopImmediatePropagation();
      },
      true
    );
  }

  var patchTimer = window.setInterval(function () {
    var runtimeSong = getPublicRuntimeSong();
    if (!runtimeSong || typeof runtimeSong.draw !== 'function') {
      return;
    }

    window.clearInterval(patchTimer);
    var originalDraw = runtimeSong.draw;
    runtimeSong.draw = function () {
      var result = originalDraw.apply(this, arguments);
      postSize();
      renderLetterTrack();
      return result;
    };
    installRuntimeLifecycleObservers();
    scheduleRuntimeInitialSync();
  }, publicRuntimeLifecycleConfig.timings.drawPatchPollMs);
`
}

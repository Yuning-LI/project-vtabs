export function buildPublicRuntimeBridgeHelperScript() {
  return `
  function getPublicRuntimeGlobal(name) {
    try {
      return window ? window[name] : null;
    } catch (error) {
      return null;
    }
  }

  function getPublicRuntimeKit() {
    return getPublicRuntimeGlobal('Kit');
  }

  function getPublicRuntimeSong() {
    return getPublicRuntimeGlobal('Song');
  }

  function getPublicRuntimeMetronome() {
    return getPublicRuntimeGlobal('Metronome');
  }

  function getPublicRuntimeCountDown() {
    return getPublicRuntimeGlobal('CountDown');
  }

  function getPublicRuntimeMidiPlayerConstructor() {
    return getPublicRuntimeGlobal('MidiPlayer');
  }

  function getPublicRuntimeQuery() {
    return getPublicRuntimeGlobal('jQuery') || getPublicRuntimeGlobal(String.fromCharCode(36));
  }

  function createPublicRuntimeThrottledTask(callback, minDelayMs) {
    var lastRunAt = 0;
    var scheduled = false;
    var trailingTimer = null;

    return function throttledPublicRuntimeTask() {
      var now = Date.now();
      var elapsed = now - lastRunAt;

      function run() {
        scheduled = false;
        trailingTimer = null;
        lastRunAt = Date.now();
        callback();
      }

      if (scheduled) {
        return;
      }

      if (elapsed >= minDelayMs) {
        scheduled = true;
        window.requestAnimationFrame(run);
        return;
      }

      scheduled = true;
      trailingTimer = window.setTimeout(function () {
        window.requestAnimationFrame(run);
      }, minDelayMs - elapsed);
    };
  }
`
}

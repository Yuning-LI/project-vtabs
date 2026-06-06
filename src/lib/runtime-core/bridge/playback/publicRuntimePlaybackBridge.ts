import {
  PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE
} from '../publicRuntimeMessageTypes.ts'

export function buildPublicRuntimePlaybackBridgeScript() {
  return `
  var playbackStatusObserver = null;
  var playbackPanelObserver = null;
  var observedPlaybackButton = null;
  var observedPlaybackPanel = null;
  var publicPlaybackSessionStarted = false;
  var publicPlaybackStatusLockUntil = 0;

  function setLabelText(inputId, text) {
    var label = document.querySelector('label[for="' + inputId + '"]');
    if (label) {
      label.textContent = text;
    }
  }

  function setOptionText(selectId, value, text) {
    var option = document.querySelector('#' + selectId + ' option[value="' + value + '"]');
    if (option) {
      option.textContent = text;
    }
  }

  function localizePlaybackToggle(selectId) {
    setOptionText(selectId, 'on', 'On');
    setOptionText(selectId, 'off', 'Off');
  }

  function normalizeStoredPlaybackToggle(value) {
    return value === 'on' ? 'on' : 'off';
  }

  function normalizeStoredPlaybackTranspose(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    var normalized = String(value);
    return /^-?\\d+$/.test(normalized) ? normalized : null;
  }

  function getStoredPlaybackTranspose() {
    try {
      if (!window.Kit || !window.Kit.storage || typeof window.Kit.storage.readFromStorage !== 'function') {
        return null;
      }

      return normalizeStoredPlaybackTranspose(window.Kit.storage.readFromStorage('song_play_transpose'));
    } catch (error) {
      return null;
    }
  }

  function setStoredPlaybackTranspose(value) {
    try {
      if (!window.Kit || !window.Kit.storage || typeof window.Kit.storage.writeToStorage !== 'function') {
        return;
      }

      window.Kit.storage.writeToStorage('song_play_transpose', String(value));
    } catch (error) {
      // Keep playback usable even if storage is unavailable.
    }
  }

  function getStoredPlaybackCountIn() {
    try {
      if (!window.Kit || !window.Kit.storage || typeof window.Kit.storage.readFromStorage !== 'function') {
        return 'off';
      }

      return normalizeStoredPlaybackToggle(window.Kit.storage.readFromStorage('song_play_count_in'));
    } catch (error) {
      return 'off';
    }
  }

  function setStoredPlaybackCountIn(value) {
    try {
      if (!window.Kit || !window.Kit.storage || typeof window.Kit.storage.writeToStorage !== 'function') {
        return;
      }

      window.Kit.storage.writeToStorage('song_play_count_in', normalizeStoredPlaybackToggle(value));
    } catch (error) {
      // Keep playback usable even if storage is unavailable.
    }
  }

  function getPublicPlaybackCountInValue() {
    var control = document.getElementById('play_count_in');
    if (control && control.value) {
      return normalizeStoredPlaybackToggle(control.value);
    }

    return getStoredPlaybackCountIn();
  }

  function isPublicPlaybackCountInEnabled() {
    return getPublicPlaybackCountInValue() === 'on';
  }

  function formatSemitoneLabel(value) {
    var numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue === 0) {
      return 'Off';
    }

    var magnitude = Math.abs(numberValue);
    return (numberValue > 0 ? '+' : '-') + String(magnitude) + ' semitone' + (magnitude === 1 ? '' : 's');
  }

  function syncPublicPlaybackTransposeControl() {
    var playTranspose = document.getElementById('play_transpose');
    if (!playTranspose) {
      return;
    }

    var storedValue = getStoredPlaybackTranspose();
    if (
      storedValue !== null &&
      storedValue !== undefined &&
      playTranspose.querySelector('option[value="' + storedValue + '"]')
    ) {
      playTranspose.value = storedValue;
    }

    if (playTranspose.getAttribute('data-vtabs-play-transpose-hooked') !== '1') {
      playTranspose.setAttribute('data-vtabs-play-transpose-hooked', '1');
      playTranspose.addEventListener('change', function () {
        setStoredPlaybackTranspose(playTranspose.value);
      });
    }
  }

  function syncPublicPlaybackCountInControl(playModal) {
    if (!playModal) {
      return;
    }

    var row = playModal.querySelector('.modal-content .row');
    if (!row) {
      return;
    }

    var wrapper = document.getElementById('play-count-in-row');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'play-count-in-row';
      wrapper.className = 'input-field col select-div s4 m3';
      wrapper.innerHTML =
        '<label class="active" for="play_count_in">Count-in</label>' +
        '<select id="play_count_in" class="browser-select browser-default">' +
        '<option value="off">Off</option>' +
        '<option value="on">3 beats</option>' +
        '</select>';
      row.appendChild(wrapper);
    }

    var control = document.getElementById('play_count_in');
    if (!control) {
      return;
    }

    control.value = getStoredPlaybackCountIn();

    if (control.getAttribute('data-vtabs-play-count-in-hooked') !== '1') {
      control.setAttribute('data-vtabs-play-count-in-hooked', '1');
      control.addEventListener('change', function () {
        setStoredPlaybackCountIn(control.value);
      });
    }
  }

  function reorderPublicPlaybackControls(playModal) {
    if (!playModal) {
      return;
    }

    var row = playModal.querySelector('.modal-content .row');
    if (!row) {
      return;
    }

    [
      'play_speed',
      'play_transpose',
      'play_note',
      'play_chord',
      'play_metronome',
      'play_count_in',
      'play_loop',
      'play_drum',
      'locate_note',
      'highlight_note',
      'play_microphone'
    ].forEach(function (controlId) {
      var control = document.getElementById(controlId);
      var field = control && control.closest ? control.closest('.input-field') : null;
      if (field) {
        row.appendChild(field);
      }
    });
  }

  function installPublicPlaybackCountInOverride() {
    if (!hasPublicPlayback || typeof window.MidiPlayer !== 'function') {
      return;
    }

    var prototype = window.MidiPlayer && window.MidiPlayer.prototype;
    if (!prototype || prototype.__vtabsCountInHooked === true || typeof prototype.count !== 'function') {
      return;
    }

    var originalCount = prototype.count;
    prototype.count = function () {
      if (!isPublicPlaybackCountInEnabled()) {
        if (this && this.context && typeof this.context.onReady === 'function') {
          this.context.onReady();
        }
        return;
      }

      return originalCount.apply(this, arguments);
    };
    prototype.__vtabsCountInHooked = true;
  }

  function forceEnglishPublicPlaybackLocale() {
    if (!hasPublicPlayback || typeof window.I18n !== 'object') {
      return;
    }

    try {
      if (typeof window.I18n.register === 'function') {
        window.I18n.register('en', {
          midi_player_ui: {
            load_soundfont: 'Loading soundfonts...',
            play: 'Listen',
            restart: 'Restart',
            resume: 'Continue',
            start: 'Start',
            stop: 'Stop'
          }
        });
      }
      if (typeof window.I18n.setLocale === 'function') {
        window.I18n.setLocale('en');
      }
    } catch (error) {
      // Keep playback usable even if the archived i18n helper changes.
    }
  }

  function setElementText(selector, text) {
    var element = document.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  function localizeNoSoundHelp() {
    var noSoundButton = document.getElementById('nosound-btn');
    if (noSoundButton) {
      noSoundButton.textContent = 'No sound or delayed audio?';
    }

    var noSoundModal = document.getElementById('nosound-modal');
    if (!noSoundModal) {
      return;
    }

    noSoundModal.setAttribute('aria-label', 'Audio troubleshooting');
    var titles = noSoundModal.querySelectorAll('.modal-content .card-title');
    var paragraphs = noSoundModal.querySelectorAll('.modal-content p');
    if (titles[0]) {
      titles[0].textContent = 'No Sound';
    }
    if (paragraphs[0]) {
      paragraphs[0].textContent = 'Check silent mode, raise the device volume, or try headphones.';
    }
    if (titles[1]) {
      titles[1].textContent = 'Audio Delay';
    }
    if (paragraphs[1]) {
      paragraphs[1].textContent = 'Bluetooth headphones can add delay. Try wired headphones or speaker playback.';
    }
    if (titles[2]) {
      titles[2].textContent = 'Still Not Working?';
    }
    if (paragraphs[2]) {
      paragraphs[2].textContent = 'Close this panel and try playback again after changing device audio settings.';
    }
    setElementText('#nosound-modal .modal-footer .modal-close', 'OK');
  }

  function getPublicPlaybackStatus() {
    var playButton = document.getElementById('play-btn');
    if (!playButton || !playButton.classList) {
      return 'idle';
    }
    if (playButton.classList.contains('icon-stop2')) {
      return 'playing';
    }
    if (playButton.classList.contains('icon-spinner')) {
      return 'loading';
    }
    return 'idle';
  }

  function postPublicPlaybackStatus() {
    if (!window.parent) {
      return;
    }

    var status = getPublicPlaybackStatus();
    if (publicPlaybackSessionStarted && status === 'idle' && Date.now() < publicPlaybackStatusLockUntil) {
      status = 'loading';
    }
    if (status === 'idle') {
      publicPlaybackSessionStarted = false;
      publicPlaybackStatusLockUntil = 0;
    }
    if (status === 'playing') {
      publicPlaybackSessionStarted = true;
    }

    window.parent.postMessage(
      {
        type: ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE)},
        songId: songId,
        status: status
      },
      '*'
    );
  }

  function postPublicPlaybackStatusValue(status) {
    if (!window.parent) {
      return;
    }

    window.parent.postMessage(
      {
        type: ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE)},
        songId: songId,
        status: status
      },
      '*'
    );
  }

  function isPublicPlaybackPanelOpen() {
    var playModal = document.getElementById('play-modal');
    if (!playModal) {
      return false;
    }

    var computed = window.getComputedStyle(playModal);
    return (
      computed.display !== 'none' &&
      computed.visibility !== 'hidden' &&
      playModal.getBoundingClientRect().height > 0
    );
  }

  function postPublicPlaybackPanelStatus() {
    if (!window.parent) {
      return;
    }

    window.parent.postMessage(
      {
        type: ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE)},
        songId: songId,
        isOpen: isPublicPlaybackPanelOpen()
      },
      '*'
    );
  }

  function installPublicPlaybackStartHooks() {
    if (!hasPublicPlayback) {
      return;
    }

    Array.prototype.slice
      .call(document.querySelectorAll('.op-play, .op-replay, .op-resume'))
      .forEach(function (button) {
        if (!button || button.getAttribute('data-vtabs-playback-hooked') === '1') {
          return;
        }
        button.setAttribute('data-vtabs-playback-hooked', '1');
        button.addEventListener('click', function () {
          publicPlaybackSessionStarted = true;
          publicPlaybackStatusLockUntil = Date.now() + 4500;
          window.setTimeout(function () {
            postPublicPlaybackStatusValue('loading');
          }, 20);
          window.setTimeout(function () {
            if (!publicPlaybackSessionStarted) {
              postPublicPlaybackStatus();
            }
          }, 2600);
        });
      });
  }

  function installPublicPlaybackStatusObserver() {
    if (!hasPublicPlayback) {
      return;
    }

    var playButton = document.getElementById('play-btn');
    if (!playButton) {
      postPublicPlaybackStatus();
      return;
    }

    if (playbackStatusObserver && observedPlaybackButton === playButton) {
      postPublicPlaybackStatus();
      return;
    }

    if (playbackStatusObserver) {
      playbackStatusObserver.disconnect();
    }

    observedPlaybackButton = playButton;
    playbackStatusObserver = new MutationObserver(function () {
      postPublicPlaybackStatus();
    });
    playbackStatusObserver.observe(playButton, {
      attributes: true,
      attributeFilter: ['class', 'title']
    });
    postPublicPlaybackStatus();
  }

  function installPublicPlaybackPanelObserver() {
    if (!hasPublicPlayback) {
      return;
    }

    var playModal = document.getElementById('play-modal');
    if (!playModal) {
      postPublicPlaybackPanelStatus();
      return;
    }

    if (playbackPanelObserver && observedPlaybackPanel === playModal) {
      postPublicPlaybackPanelStatus();
      return;
    }

    if (playbackPanelObserver) {
      playbackPanelObserver.disconnect();
    }

    observedPlaybackPanel = playModal;
    playbackPanelObserver = new MutationObserver(function () {
      postPublicPlaybackPanelStatus();
    });
    playbackPanelObserver.observe(playModal, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    postPublicPlaybackPanelStatus();
  }

  function cancelPublicPlaybackCountdown() {
    if (typeof window.CountDown !== 'object' || !window.CountDown || !window.CountDown.context) {
      return false;
    }

    var context = window.CountDown.context;
    if (!context.countDownInterval) {
      return false;
    }

    window.clearInterval(context.countDownInterval);
    context.countDownInterval = null;
    var countDownArea = document.querySelector('.count-down-area');
    if (countDownArea && countDownArea.style) {
      countDownArea.style.display = 'none';
    }
    return true;
  }

  function localizePublicPlayback() {
    if (!hasPublicPlayback || textMode !== 'english') {
      return;
    }

    forceEnglishPublicPlaybackLocale();

    var playModal = document.getElementById('play-modal');
    if (!playModal) {
      return;
    }

    document.documentElement.setAttribute('data-vtabs-public-playback', '1');
    playModal.setAttribute('role', 'dialog');
    playModal.setAttribute('aria-label', 'Playback controls');

    var playLabel = document.getElementById('play-btn-label');
    if (playLabel && String(playLabel.textContent || '').trim() === '播放') {
      playLabel.textContent = 'Listen';
    }
    if (playLabel && String(playLabel.textContent || '').trim() === '加载音色库') {
      playLabel.textContent = 'Loading soundfonts...';
    }

    setLabelText('play_speed', 'Tempo');
    setLabelText('play_loop', 'Loop');
    setLabelText('play_note', 'Melody');
    setLabelText('play_metronome', 'Metronome');
    setLabelText('play_drum', 'Drums');
    setLabelText('play_chord', 'Chords');
    setLabelText('play_microphone', 'Microphone');
    setLabelText('play_count_in', 'Count-in');
    setLabelText('play_transpose', 'Transpose');
    setLabelText('locate_note', 'Follow note');
    setLabelText('highlight_note', 'Highlight note');

    localizePlaybackToggle('play_loop');
    localizePlaybackToggle('play_metronome');
    localizePlaybackToggle('play_drum');
    localizePlaybackToggle('locate_note');
    localizePlaybackToggle('highlight_note');
    setOptionText('play_note', 'acoustic_grand_piano', 'On');
    setOptionText('play_note', 'off', 'Off');
    setOptionText('play_chord', 'default', 'Auto');
    setOptionText('play_chord', 'on', 'On');
    setOptionText('play_chord', 'off', 'Off');
    setOptionText('play_microphone', '0', 'Off');
    setOptionText('play_count_in', 'off', 'Off');
    setOptionText('play_count_in', 'on', '3 beats');

    syncPublicPlaybackCountInControl(playModal);
    reorderPublicPlaybackControls(playModal);

    Array.prototype.slice.call(document.querySelectorAll('#play_transpose option')).forEach(function (option) {
      var value = option.getAttribute('value') || '';
      option.textContent = formatSemitoneLabel(value);
    });

    syncPublicPlaybackTransposeControl();

    var start = playModal.querySelector('.op-replay.start-play-1');
    if (start) {
      start.textContent = 'Start';
    }
    var restart = playModal.querySelector('.op-replay.start-play-2');
    if (restart) {
      restart.textContent = 'Restart';
    }
    var resume = playModal.querySelector('.op-resume.start-play-2');
    if (resume) {
      resume.textContent = 'Continue';
    }
    var fromNote = playModal.querySelector('.op-play.start-play-3');
    if (fromNote) {
      fromNote.textContent = 'Play from note';
    }
    localizeNoSoundHelp();

    var footer = playModal.querySelector('.modal-footer');
    if (footer && !footer.querySelector('.vtabs-public-playback-close')) {
      var closeButton = document.createElement('a');
      closeButton.href = 'javascript:void(0)';
      closeButton.className = 'modal-action modal-close waves-effect waves-green btn-flat vtabs-public-playback-close';
      closeButton.textContent = 'Close';
      closeButton.addEventListener('click', function () {
        var $ = window.jQuery || window.$;
        if ($ && $.fn && $.fn.closeModal) {
          $(playModal).closeModal({ out_duration: 80 });
          window.setTimeout(postPublicPlaybackPanelStatus, 90);
          return;
        }
        playModal.style.display = 'none';
        postPublicPlaybackPanelStatus();
      });
      footer.insertBefore(closeButton, footer.firstChild);
    }

    installPublicPlaybackStatusObserver();
    installPublicPlaybackPanelObserver();
    installPublicPlaybackStartHooks();
    installPublicPlaybackCountInOverride();
  }

  function closePublicPlaybackPanel() {
    if (!hasPublicPlayback) {
      return;
    }

    var playModal = document.getElementById('play-modal');
    if (!playModal) {
      postPublicPlaybackPanelStatus();
      return;
    }

    var $ = window.jQuery || window.$;
    if ($ && $.fn && $.fn.closeModal && isPublicPlaybackPanelOpen()) {
      $(playModal).closeModal({ out_duration: 80 });
      [40, 120].forEach(function (delay) {
        window.setTimeout(postPublicPlaybackPanelStatus, delay);
      });
      return;
    }

    playModal.style.display = 'none';
    postPublicPlaybackPanelStatus();
  }

  function openPublicPlaybackTools() {
    if (!hasPublicPlayback) {
      return;
    }

    localizePublicPlayback();

    var playButton = document.getElementById('play-btn');
    var playModal = document.getElementById('play-modal');
    if (!playButton || !playModal) {
      return;
    }

    if (playButton.classList && playButton.classList.contains('icon-stop2')) {
      var $ = window.jQuery || window.$;
      if ($ && $.fn && $.fn.openModal) {
        $(playModal).openModal({ opacity: 0, in_duration: 120, out_duration: 80 });
      } else {
        playModal.style.display = 'block';
      }
      window.setTimeout(localizePublicPlayback, 80);
      [40, 120].forEach(function (delay) {
        window.setTimeout(postPublicPlaybackPanelStatus, delay);
      });
      return;
    }

    if (playButton.classList && playButton.classList.contains('icon-spinner')) {
      window.setTimeout(localizePublicPlayback, 300);
      return;
    }

    var playTrigger = document.getElementById('play-li') || playButton;
    playTrigger.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));

    [120, 500, 1200, 2200].forEach(function (delay) {
      window.setTimeout(function () {
        localizePublicPlayback();
        if (!publicPlaybackSessionStarted) {
          postPublicPlaybackStatus();
        }
        postPublicPlaybackPanelStatus();
      }, delay);
    });
  }

  function stopPublicPlayback() {
    if (!hasPublicPlayback) {
      return;
    }

    var playButton = document.getElementById('play-btn');
    if (!playButton || !playButton.classList) {
      postPublicPlaybackStatus();
      return;
    }

    publicPlaybackSessionStarted = false;
    publicPlaybackStatusLockUntil = 0;

    if (!playButton.classList.contains('icon-stop2')) {
      if (cancelPublicPlaybackCountdown()) {
        postPublicPlaybackStatusValue('idle');
      } else {
        postPublicPlaybackStatus();
      }
      var pendingModal = document.getElementById('play-modal');
      if (pendingModal) {
        pendingModal.style.display = 'none';
        postPublicPlaybackPanelStatus();
      }
      return;
    }

    playButton.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));

    var playModal = document.getElementById('play-modal');
    var $ = window.jQuery || window.$;
    if (playModal && $ && $.fn && $.fn.closeModal) {
      $(playModal).closeModal({ out_duration: 80 });
    } else if (playModal) {
      playModal.style.display = 'none';
    }

    [40, 160, 500].forEach(function (delay) {
      window.setTimeout(function () {
        postPublicPlaybackStatus();
        postPublicPlaybackPanelStatus();
      }, delay);
    });
  }

  function installPublicPlaybackBridge() {
    if (!hasPublicPlayback) {
      return;
    }

    document.documentElement.setAttribute('data-vtabs-public-playback', '1');
    localizePublicPlayback();
    installPublicPlaybackStartHooks();
    installPublicPlaybackCountInOverride();
    installPublicPlaybackStatusObserver();
    installPublicPlaybackPanelObserver();
    postPublicPlaybackStatus();
    postPublicPlaybackPanelStatus();
  }
`
}

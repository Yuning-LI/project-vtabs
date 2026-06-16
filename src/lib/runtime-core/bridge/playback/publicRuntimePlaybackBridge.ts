import {
  PUBLIC_RUNTIME_HOST_MESSAGE_EVENT,
  PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE
} from '../publicRuntimeMessageTypes.ts'

const PUBLIC_RUNTIME_PLAYBACK_BRIDGE_CONFIG = {
  storageKeys: {
    countIn: 'song_play_count_in',
    transpose: 'song_play_transpose'
  },
  ids: {
    countInControl: 'play_count_in',
    countInRow: 'play-count-in-row',
    microphoneControl: 'play_microphone',
    noSoundButton: 'nosound-btn',
    noSoundModal: 'nosound-modal',
    playButton: 'play-btn',
    playButtonLabel: 'play-btn-label',
    playModal: 'play-modal',
    playTrigger: 'play-li',
    transposeControl: 'play_transpose'
  },
  selectors: {
    containerMount: '[data-public-runtime-dom-mount="true"]',
    countDownArea: '.count-down-area',
    inputField: '.input-field',
    modalContent: '.modal-content',
    modalContentRow: '.modal-content .row',
    modalFooter: '.modal-footer',
    noSoundCloseButton: '#nosound-modal .modal-footer .modal-close',
    noSoundParagraphs: '.modal-content p',
    noSoundTitles: '.modal-content .card-title',
    overlay: '.lean-overlay',
    playbackActions: '.op-play, .op-replay, .op-resume',
    playbackCloseButton: '.vtabs-public-playback-close',
    playFromNoteAction: '.op-play.start-play-3',
    resumeAction: '.op-resume.start-play-2',
    restartAction: '.op-replay.start-play-2',
    startAction: '.op-replay.start-play-1',
    transposeOptions: '#play_transpose option'
  },
  attributes: {
    containerPanel: 'data-public-runtime-container-panel',
    countInHooked: 'data-vtabs-play-count-in-hooked',
    playbackHooked: 'data-vtabs-playback-hooked',
    publicPlayback: 'data-vtabs-public-playback',
    transposeHooked: 'data-vtabs-play-transpose-hooked'
  },
  classes: {
    playbackCloseButton:
      'modal-action modal-close waves-effect waves-green btn-flat vtabs-public-playback-close',
    spinner: 'icon-spinner',
    startPlayInitial: 'start-play-1',
    stop: 'icon-stop2'
  }
} as const

const PUBLIC_RUNTIME_PLAYBACK_CONTROL_ORDER = [
  'play_speed',
  'play_transpose',
  'play_note',
  'play_chord',
  'play_metronome',
  'play_count_in',
  'play_loop',
  'play_drum',
  'locate_note',
  'highlight_note'
] as const

const PUBLIC_RUNTIME_PLAYBACK_CONTROL_LABELS = {
  play_speed: 'Tempo',
  play_loop: 'Loop',
  play_note: 'Melody',
  play_metronome: 'Metronome',
  play_drum: 'Drums',
  play_chord: 'Chords',
  play_count_in: 'Count-in',
  play_transpose: 'Transpose',
  locate_note: 'Follow note',
  highlight_note: 'Highlight note'
} as const

const PUBLIC_RUNTIME_PLAYBACK_TOGGLE_CONTROLS = [
  'play_loop',
  'play_metronome',
  'play_drum',
  'locate_note',
  'highlight_note'
] as const

const PUBLIC_RUNTIME_PLAYBACK_OPTION_LABELS = [
  ['play_note', 'acoustic_grand_piano', 'On'],
  ['play_note', 'off', 'Off'],
  ['play_chord', 'default', 'Auto'],
  ['play_chord', 'on', 'On'],
  ['play_chord', 'off', 'Off'],
  ['play_count_in', 'off', 'Off'],
  ['play_count_in', 'on', '3 beats']
] as const

const PUBLIC_RUNTIME_PLAYBACK_ACTION_LABELS = [
  ['startAction', 'Start'],
  ['restartAction', 'Restart'],
  ['resumeAction', 'Continue'],
  ['playFromNoteAction', 'Play from note']
] as const

const PUBLIC_RUNTIME_PLAYBACK_PANEL_RESET_PROPERTIES = [
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'max-height',
  'height',
  'transform'
] as const

const PUBLIC_RUNTIME_PLAYBACK_MODAL_CONTENT_RESET_PROPERTIES = [
  'position',
  'top',
  'bottom',
  'height',
  'max-height',
  'overflow'
] as const

const PUBLIC_RUNTIME_PLAYBACK_MODAL_FOOTER_RESET_PROPERTIES = [
  'position',
  'top',
  'bottom',
  'height'
] as const

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
export function buildPublicRuntimePlaybackBridgeScript() {
  return `
  var publicPlaybackBridgeConfig = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_BRIDGE_CONFIG)};
  var publicPlaybackControlOrder = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_CONTROL_ORDER)};
  var publicPlaybackControlLabels = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_CONTROL_LABELS)};
  var publicPlaybackToggleControls = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_TOGGLE_CONTROLS)};
  var publicPlaybackOptionLabels = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_OPTION_LABELS)};
  var publicPlaybackActionLabels = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_ACTION_LABELS)};
  var publicPlaybackPanelResetProperties = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_PANEL_RESET_PROPERTIES)};
  var publicPlaybackModalContentResetProperties = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_MODAL_CONTENT_RESET_PROPERTIES)};
  var publicPlaybackModalFooterResetProperties = ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_MODAL_FOOTER_RESET_PROPERTIES)};
  var playbackStatusObserver = null;
  var playbackPanelObserver = null;
  var observedPlaybackButton = null;
  var observedPlaybackPanel = null;
  var publicPlaybackSessionStarted = false;
  var publicPlaybackResumeAvailable = false;
  var publicPlaybackStatusLockUntil = 0;
  var publicPlaybackPanelRequestId = 0;
  var postPublicPlaybackStatusThrottled = createPublicRuntimeThrottledTask(function () {
    normalizePublicPlaybackPanelButtonState(document.getElementById(publicPlaybackBridgeConfig.ids.playModal));
    postPublicPlaybackStatus();
  }, 120);
  var postPublicPlaybackPanelStatusThrottled = createPublicRuntimeThrottledTask(postPublicPlaybackPanelStatus, 120);

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
      var runtimeKit = getPublicRuntimeKit();
      if (!runtimeKit || !runtimeKit.storage || typeof runtimeKit.storage.readFromStorage !== 'function') {
        return null;
      }

      return normalizeStoredPlaybackTranspose(
        runtimeKit.storage.readFromStorage(publicPlaybackBridgeConfig.storageKeys.transpose)
      );
    } catch (error) {
      return null;
    }
  }

  function setStoredPlaybackTranspose(value) {
    try {
      var runtimeKit = getPublicRuntimeKit();
      if (!runtimeKit || !runtimeKit.storage || typeof runtimeKit.storage.writeToStorage !== 'function') {
        return;
      }

      runtimeKit.storage.writeToStorage(publicPlaybackBridgeConfig.storageKeys.transpose, String(value));
    } catch (error) {
      // Keep playback usable even if storage is unavailable.
    }
  }

  function getStoredPlaybackCountIn() {
    try {
      var runtimeKit = getPublicRuntimeKit();
      if (!runtimeKit || !runtimeKit.storage || typeof runtimeKit.storage.readFromStorage !== 'function') {
        return 'off';
      }

      return normalizeStoredPlaybackToggle(
        runtimeKit.storage.readFromStorage(publicPlaybackBridgeConfig.storageKeys.countIn)
      );
    } catch (error) {
      return 'off';
    }
  }

  function setStoredPlaybackCountIn(value) {
    try {
      var runtimeKit = getPublicRuntimeKit();
      if (!runtimeKit || !runtimeKit.storage || typeof runtimeKit.storage.writeToStorage !== 'function') {
        return;
      }

      runtimeKit.storage.writeToStorage(
        publicPlaybackBridgeConfig.storageKeys.countIn,
        normalizeStoredPlaybackToggle(value)
      );
    } catch (error) {
      // Keep playback usable even if storage is unavailable.
    }
  }

  function getPublicPlaybackCountInValue() {
    var control = document.getElementById(publicPlaybackBridgeConfig.ids.countInControl);
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
    var playTranspose = document.getElementById(publicPlaybackBridgeConfig.ids.transposeControl);
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

    if (playTranspose.getAttribute(publicPlaybackBridgeConfig.attributes.transposeHooked) !== '1') {
      playTranspose.setAttribute(publicPlaybackBridgeConfig.attributes.transposeHooked, '1');
      playTranspose.addEventListener('change', function () {
        setStoredPlaybackTranspose(playTranspose.value);
      });
    }
  }

  function normalizePublicPlaybackTempoOptions() {
    var tempoControl = document.getElementById('play_speed');
    if (!tempoControl) {
      return;
    }

    Array.prototype.slice.call(tempoControl.querySelectorAll('option')).forEach(function (option) {
      var value = option.getAttribute('value') || '';
      var text = String(option.textContent || '').trim();
      if (!text || /undefined/i.test(text)) {
        option.textContent = value;
      }
    });
  }

  function syncPublicPlaybackCountInControl(playModal) {
    if (!playModal) {
      return;
    }

    var row = playModal.querySelector(publicPlaybackBridgeConfig.selectors.modalContentRow);
    if (!row) {
      return;
    }

    var wrapper = document.getElementById(publicPlaybackBridgeConfig.ids.countInRow);
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = publicPlaybackBridgeConfig.ids.countInRow;
      wrapper.className = 'input-field col select-div s4 m3';
      wrapper.innerHTML =
        '<label class="active" for="' + publicPlaybackBridgeConfig.ids.countInControl + '">Count-in</label>' +
        '<select id="' +
        publicPlaybackBridgeConfig.ids.countInControl +
        '" class="browser-select browser-default">' +
        '<option value="off">Off</option>' +
        '<option value="on">3 beats</option>' +
        '</select>';
      row.appendChild(wrapper);
    }

    var control = document.getElementById(publicPlaybackBridgeConfig.ids.countInControl);
    if (!control) {
      return;
    }

    control.value = getStoredPlaybackCountIn();

    if (control.getAttribute(publicPlaybackBridgeConfig.attributes.countInHooked) !== '1') {
      control.setAttribute(publicPlaybackBridgeConfig.attributes.countInHooked, '1');
      control.addEventListener('change', function () {
        setStoredPlaybackCountIn(control.value);
      });
    }
  }

  function reorderPublicPlaybackControls(playModal) {
    if (!playModal) {
      return;
    }

    var row = playModal.querySelector(publicPlaybackBridgeConfig.selectors.modalContentRow);
    if (!row) {
      return;
    }

    publicPlaybackControlOrder.forEach(function (controlId) {
      var control = document.getElementById(controlId);
      var field = control && control.closest
        ? control.closest(publicPlaybackBridgeConfig.selectors.inputField)
        : null;
      if (field) {
        row.appendChild(field);
      }
    });
  }

  function installPublicPlaybackCountInOverride() {
    var RuntimeMidiPlayer = getPublicRuntimeMidiPlayerConstructor();
    if (!hasPublicPlayback || typeof RuntimeMidiPlayer !== 'function') {
      return;
    }

    var prototype = RuntimeMidiPlayer && RuntimeMidiPlayer.prototype;
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
      // Keep playback usable even if the integrated i18n helper changes.
    }
  }

  function setElementText(selector, text) {
    var element = document.querySelector(selector);
    if (element) {
      element.textContent = text;
    }
  }

  function localizeNoSoundHelp() {
    var noSoundButton = document.getElementById(publicPlaybackBridgeConfig.ids.noSoundButton);
    if (noSoundButton) {
      noSoundButton.setAttribute('aria-hidden', 'true');
      noSoundButton.style.display = 'none';
    }

    var noSoundModal = document.getElementById(publicPlaybackBridgeConfig.ids.noSoundModal);
    if (!noSoundModal) {
      return;
    }

    noSoundModal.setAttribute('aria-label', 'Audio troubleshooting');
    var titles = noSoundModal.querySelectorAll(publicPlaybackBridgeConfig.selectors.noSoundTitles);
    var paragraphs = noSoundModal.querySelectorAll(publicPlaybackBridgeConfig.selectors.noSoundParagraphs);
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
    setElementText(publicPlaybackBridgeConfig.selectors.noSoundCloseButton, 'OK');
  }

  function getPublicPlaybackStatus() {
    var playButton = document.getElementById(publicPlaybackBridgeConfig.ids.playButton);
    if (!playButton || !playButton.classList) {
      return 'idle';
    }
    if (playButton.classList.contains(publicPlaybackBridgeConfig.classes.stop)) {
      return 'playing';
    }
    if (playButton.classList.contains(publicPlaybackBridgeConfig.classes.spinner)) {
      return 'loading';
    }
    return 'idle';
  }

  function isPublicPlaybackLoading() {
    var playButton = document.getElementById(publicPlaybackBridgeConfig.ids.playButton);
    return Boolean(
      playButton &&
        playButton.classList &&
        playButton.classList.contains(publicPlaybackBridgeConfig.classes.spinner)
    );
  }

  function postPublicPlaybackStatus() {
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

    dispatchPublicRuntimePlaybackHostMessage({
      type: ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE)},
      songId: songId,
      status: status
    });
  }

  function postPublicPlaybackStatusValue(status) {
    dispatchPublicRuntimePlaybackHostMessage({
      type: ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE)},
      songId: songId,
      status: status
    });
  }

  function isPublicPlaybackPanelOpen() {
    var playModal = document.getElementById(publicPlaybackBridgeConfig.ids.playModal);
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

  function isPublicRuntimeContainerHost() {
    return Boolean(document.querySelector(publicPlaybackBridgeConfig.selectors.containerMount));
  }

  function removePublicPlaybackStyleProperties(element, properties) {
    if (!element || !element.style) {
      return;
    }

    properties.forEach(function (propertyName) {
      element.style.removeProperty(propertyName);
    });
  }

  function openPublicPlaybackPanelFallback(playModal) {
    if (!playModal) {
      return;
    }

    playModal.setAttribute(publicPlaybackBridgeConfig.attributes.containerPanel, 'open');
    playModal.style.display = 'block';
    playModal.style.opacity = '1';
    removePublicPlaybackStyleProperties(playModal, publicPlaybackPanelResetProperties);
    removePublicPlaybackStyleProperties(
      playModal.querySelector(publicPlaybackBridgeConfig.selectors.modalContent),
      publicPlaybackModalContentResetProperties
    );
    removePublicPlaybackStyleProperties(
      playModal.querySelector(publicPlaybackBridgeConfig.selectors.modalFooter),
      publicPlaybackModalFooterResetProperties
    );
    restorePublicContainerPageScroll();
  }

  function constrainPublicPlaybackPanelIfContainer(playModal) {
    if (!isPublicRuntimeContainerHost()) {
      return;
    }

    openPublicPlaybackPanelFallback(playModal);
    restorePublicContainerPageScroll();
  }

  function closePublicPlaybackPanelFallback(playModal) {
    if (!playModal) {
      return;
    }

    playModal.removeAttribute(publicPlaybackBridgeConfig.attributes.containerPanel);
    restorePublicContainerPageScroll();
  }

  function restorePublicContainerPageScroll() {
    if (!isPublicRuntimeContainerHost()) {
      return;
    }

    if (document.body && document.body.style && document.body.style.overflow === 'hidden') {
      document.body.style.removeProperty('overflow');
    }
    if (
      document.documentElement &&
      document.documentElement.style &&
      document.documentElement.style.overflow === 'hidden'
    ) {
      document.documentElement.style.removeProperty('overflow');
    }

    Array.prototype.slice.call(document.querySelectorAll(publicPlaybackBridgeConfig.selectors.overlay)).forEach(function (overlay) {
      if (overlay && overlay.style) {
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
      }
    });
  }

  function schedulePublicContainerPageScrollRestore() {
    if (!isPublicRuntimeContainerHost()) {
      return;
    }

    [0, 40, 140, 320].forEach(function (delay) {
      window.setTimeout(restorePublicContainerPageScroll, delay);
    });
  }

  function closePublicContainerPlaybackPanel(playModal) {
    publicPlaybackPanelRequestId += 1;

    if (!playModal) {
      postPublicPlaybackPanelStatus();
      restorePublicContainerPageScroll();
      return;
    }

    playModal.style.display = 'none';
    playModal.style.opacity = '0';
    closePublicPlaybackPanelFallback(playModal);
    restorePublicContainerPageScroll();
    postPublicPlaybackPanelStatus();
  }

  function setPublicPlaybackActionVisible(element, isVisible) {
    if (!element || !element.style) {
      return;
    }

    element.style.display = isVisible ? '' : 'none';
  }

  function normalizePublicPlaybackPanelButtonState(playModal) {
    if (!playModal) {
      return;
    }

    var playButton = document.getElementById(publicPlaybackBridgeConfig.ids.playButton);
    var isPlaying = Boolean(
      playButton && playButton.classList && playButton.classList.contains(publicPlaybackBridgeConfig.classes.stop)
    );
    var isLoading = Boolean(
      playButton && playButton.classList && playButton.classList.contains(publicPlaybackBridgeConfig.classes.spinner)
    );
    var runtimeSong = getPublicRuntimeSong();
    var midiPlayer = runtimeSong && runtimeSong.midiPlayer;
    var engine = midiPlayer && midiPlayer.engine;
    var context = midiPlayer && midiPlayer.context;
    var hasPlayProgress = Boolean(engine && engine.playTime) || publicPlaybackResumeAvailable;
    var hasPlayLine = Boolean(context && context.playLine);

    setPublicPlaybackActionVisible(
      playModal.querySelector(publicPlaybackBridgeConfig.selectors.startAction),
      !isPlaying && !isLoading && !hasPlayProgress
    );
    setPublicPlaybackActionVisible(
      playModal.querySelector(publicPlaybackBridgeConfig.selectors.restartAction),
      isPlaying || hasPlayProgress
    );
    setPublicPlaybackActionVisible(
      playModal.querySelector(publicPlaybackBridgeConfig.selectors.resumeAction),
      isPlaying || hasPlayProgress
    );
    setPublicPlaybackActionVisible(
      playModal.querySelector(publicPlaybackBridgeConfig.selectors.playFromNoteAction),
      !isPlaying && !isLoading && hasPlayLine
    );
  }

  function postPublicPlaybackPanelStatus() {
    dispatchPublicRuntimePlaybackHostMessage({
      type: ${JSON.stringify(PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE)},
      songId: songId,
      isOpen: isPublicPlaybackPanelOpen()
    });
  }

  function dispatchPublicRuntimePlaybackHostMessage(detail) {
    window.dispatchEvent(
      new CustomEvent(${JSON.stringify(PUBLIC_RUNTIME_HOST_MESSAGE_EVENT)}, {
        detail: detail
      })
    );
  }

  function installPublicPlaybackStartHooks() {
    if (!hasPublicPlayback) {
      return;
    }

    Array.prototype.slice
      .call(document.querySelectorAll(publicPlaybackBridgeConfig.selectors.playbackActions))
      .forEach(function (button) {
        if (!button || button.getAttribute(publicPlaybackBridgeConfig.attributes.playbackHooked) === '1') {
          return;
        }
        button.setAttribute(publicPlaybackBridgeConfig.attributes.playbackHooked, '1');
        button.addEventListener('click', function () {
          disablePublicPlaybackAutoScroll();
          pausePublicPlaybackScheduler();
        }, true);
        button.addEventListener('click', function () {
          if (button.classList && button.classList.contains(publicPlaybackBridgeConfig.classes.startPlayInitial)) {
            publicPlaybackResumeAvailable = false;
          }
          publicPlaybackSessionStarted = true;
          publicPlaybackStatusLockUntil = Date.now() + 4500;
          if (isPublicRuntimeContainerHost()) {
            [0, 40, 140].forEach(function (delay) {
              window.setTimeout(function () {
                closePublicContainerPlaybackPanel(
                  document.getElementById(publicPlaybackBridgeConfig.ids.playModal)
                );
              }, delay);
            });
          }
          window.setTimeout(function () {
            postPublicPlaybackStatusValue('loading');
          }, 20);
          window.setTimeout(function () {
            normalizePublicPlaybackPanelButtonState(
              document.getElementById(publicPlaybackBridgeConfig.ids.playModal)
            );
            postPublicPlaybackStatus();
          }, 120);
          window.setTimeout(function () {
            if (!publicPlaybackSessionStarted) {
              postPublicPlaybackStatus();
            }
          }, 2600);
        });
      });
  }

  function disablePublicPlaybackAutoScroll() {
    var runtimeSong = getPublicRuntimeSong();
    var midiPlayer = runtimeSong && runtimeSong.midiPlayer;
    if (!midiPlayer) {
      return;
    }

    if (midiPlayer.context) {
      midiPlayer.context.playScroll = function () {
        return false;
      };
    }
    if (midiPlayer.engine) {
      midiPlayer.engine.enableScroll = false;
    }
  }

  function pausePublicPlaybackScheduler() {
    var runtimeSong = getPublicRuntimeSong();
    var midiPlayer = runtimeSong && runtimeSong.midiPlayer;
    var engine = midiPlayer && midiPlayer.engine;
    if (!engine) {
      return;
    }

    if (typeof engine.pause === 'function') {
      engine.pause();
      return;
    }
    if (engine.timeScheduler && typeof engine.timeScheduler.stop === 'function') {
      engine.timeScheduler.stop(true);
    }
  }

  function installPublicPlaybackContainerModalOverride() {
    if (!isPublicRuntimeContainerHost()) {
      return;
    }

    var $ = getPublicRuntimeQuery();
    if (!$ || !$.fn || $.fn.__vtabsPublicPlaybackModalOverride === true) {
      return;
    }

    var originalOpenModal = $.fn.openModal;
    var originalCloseModal = $.fn.closeModal;

    if (typeof originalOpenModal === 'function') {
      $.fn.openModal = function () {
        var playModal = this && this[0];
        if (playModal && playModal.id === publicPlaybackBridgeConfig.ids.playModal && isPublicRuntimeContainerHost()) {
          openPublicPlaybackPanelFallback(playModal);
          postPublicPlaybackPanelStatus();
          return this;
        }

        return originalOpenModal.apply(this, arguments);
      };
    }

    if (typeof originalCloseModal === 'function') {
      $.fn.closeModal = function () {
        var playModal = this && this[0];
        if (playModal && playModal.id === publicPlaybackBridgeConfig.ids.playModal && isPublicRuntimeContainerHost()) {
          closePublicContainerPlaybackPanel(playModal);
          return this;
        }

        return originalCloseModal.apply(this, arguments);
      };
    }

    $.fn.__vtabsPublicPlaybackModalOverride = true;
  }

  function installPublicPlaybackStatusObserver() {
    if (!hasPublicPlayback) {
      return;
    }

    var playButton = document.getElementById(publicPlaybackBridgeConfig.ids.playButton);
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
      postPublicPlaybackStatusThrottled();
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

    var playModal = document.getElementById(publicPlaybackBridgeConfig.ids.playModal);
    if (!playModal) {
      postPublicPlaybackPanelStatusThrottled();
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
    var runtimeCountDown = getPublicRuntimeCountDown();
    if (typeof runtimeCountDown !== 'object' || !runtimeCountDown || !runtimeCountDown.context) {
      return false;
    }

    var context = runtimeCountDown.context;
    if (!context.countDownInterval) {
      return false;
    }

    window.clearInterval(context.countDownInterval);
    context.countDownInterval = null;
    var countDownArea = document.querySelector(publicPlaybackBridgeConfig.selectors.countDownArea);
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
    installPublicPlaybackContainerModalOverride();
    disablePublicPlaybackAutoScroll();

    var playModal = document.getElementById(publicPlaybackBridgeConfig.ids.playModal);
    if (!playModal) {
      return;
    }

    document.documentElement.setAttribute(publicPlaybackBridgeConfig.attributes.publicPlayback, '1');
    playModal.setAttribute('role', 'dialog');
    playModal.setAttribute('aria-label', 'Playback controls');

    var playLabel = document.getElementById(publicPlaybackBridgeConfig.ids.playButtonLabel);
    if (playLabel && String(playLabel.textContent || '').trim() === '播放') {
      playLabel.textContent = 'Listen';
    }
    if (playLabel && String(playLabel.textContent || '').trim() === '加载音色库') {
      playLabel.textContent = 'Loading soundfonts...';
    }

    Object.keys(publicPlaybackControlLabels).forEach(function (controlId) {
      setLabelText(controlId, publicPlaybackControlLabels[controlId]);
    });

    publicPlaybackToggleControls.forEach(localizePlaybackToggle);
    publicPlaybackOptionLabels.forEach(function (optionLabel) {
      setOptionText(optionLabel[0], optionLabel[1], optionLabel[2]);
    });
    normalizePublicPlaybackTempoOptions();

    var microphone = document.getElementById(publicPlaybackBridgeConfig.ids.microphoneControl);
    var microphoneField = microphone && microphone.closest
      ? microphone.closest(publicPlaybackBridgeConfig.selectors.inputField)
      : null;
    if (microphoneField) {
      microphoneField.setAttribute('aria-hidden', 'true');
      microphoneField.style.display = 'none';
    }

    syncPublicPlaybackCountInControl(playModal);
    reorderPublicPlaybackControls(playModal);

    Array.prototype.slice.call(document.querySelectorAll(publicPlaybackBridgeConfig.selectors.transposeOptions)).forEach(function (option) {
      var value = option.getAttribute('value') || '';
      option.textContent = formatSemitoneLabel(value);
    });

    syncPublicPlaybackTransposeControl();

    publicPlaybackActionLabels.forEach(function (actionLabel) {
      var action = playModal.querySelector(publicPlaybackBridgeConfig.selectors[actionLabel[0]]);
      if (action) {
        action.textContent = actionLabel[1];
      }
    });
    normalizePublicPlaybackPanelButtonState(playModal);
    localizeNoSoundHelp();

    var footer = playModal.querySelector(publicPlaybackBridgeConfig.selectors.modalFooter);
    if (footer && !footer.querySelector(publicPlaybackBridgeConfig.selectors.playbackCloseButton)) {
      var closeButton = document.createElement('a');
      closeButton.href = 'javascript:void(0)';
      closeButton.className = publicPlaybackBridgeConfig.classes.playbackCloseButton;
      closeButton.textContent = 'Close';
      closeButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (isPublicRuntimeContainerHost()) {
          closePublicContainerPlaybackPanel(playModal);
          return;
        }
        var $ = getPublicRuntimeQuery();
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

    publicPlaybackPanelRequestId += 1;
    var playModal = document.getElementById(publicPlaybackBridgeConfig.ids.playModal);
    if (!playModal) {
      postPublicPlaybackPanelStatus();
      return;
    }

    if (isPublicRuntimeContainerHost()) {
      closePublicContainerPlaybackPanel(playModal);
      return;
    }

    var $ = getPublicRuntimeQuery();
    if ($ && $.fn && $.fn.closeModal && isPublicPlaybackPanelOpen()) {
      $(playModal).closeModal({ out_duration: 80 });
      [40, 120].forEach(function (delay) {
        window.setTimeout(function () {
          restorePublicContainerPageScroll();
          postPublicPlaybackPanelStatus();
        }, delay);
      });
      return;
    }

    playModal.style.display = 'none';
    closePublicPlaybackPanelFallback(playModal);
    restorePublicContainerPageScroll();
    postPublicPlaybackPanelStatus();
  }

  function openPublicPlaybackTools() {
    if (!hasPublicPlayback) {
      return;
    }

    var playbackPanelOpenRequestId = publicPlaybackPanelRequestId + 1;
    publicPlaybackPanelRequestId = playbackPanelOpenRequestId;
    localizePublicPlayback();

    var playButton = document.getElementById(publicPlaybackBridgeConfig.ids.playButton);
    var playModal = document.getElementById(publicPlaybackBridgeConfig.ids.playModal);
    if (!playButton || !playModal) {
      return;
    }

    if (playButton.classList && playButton.classList.contains(publicPlaybackBridgeConfig.classes.stop)) {
      var $ = getPublicRuntimeQuery();
      if ($ && $.fn && $.fn.openModal) {
        $(playModal).openModal({ opacity: 0, in_duration: 120, out_duration: 80 });
      } else {
        playModal.style.display = 'block';
      }
      schedulePublicContainerPageScrollRestore();
      window.setTimeout(function () {
        if (playbackPanelOpenRequestId !== publicPlaybackPanelRequestId) {
          return;
        }
        if (!isPublicPlaybackPanelOpen()) {
          openPublicPlaybackPanelFallback(playModal);
        }
        constrainPublicPlaybackPanelIfContainer(playModal);
        schedulePublicContainerPageScrollRestore();
        normalizePublicPlaybackPanelButtonState(playModal);
      }, 30);
      window.setTimeout(localizePublicPlayback, 80);
      [40, 120].forEach(function (delay) {
        window.setTimeout(postPublicPlaybackPanelStatus, delay);
      });
      return;
    }

    if (playButton.classList && playButton.classList.contains(publicPlaybackBridgeConfig.classes.spinner)) {
      window.setTimeout(localizePublicPlayback, 300);
      return;
    }

    disablePublicPlaybackAutoScroll();
    var playTrigger = document.getElementById(publicPlaybackBridgeConfig.ids.playTrigger) || playButton;
    playTrigger.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));

    [120, 500, 1200, 2200, 4500, 8000].forEach(function (delay) {
      window.setTimeout(function () {
        if (playbackPanelOpenRequestId !== publicPlaybackPanelRequestId) {
          return;
        }
        localizePublicPlayback();
        if (isPublicPlaybackLoading()) {
          postPublicPlaybackStatus();
          postPublicPlaybackPanelStatus();
          return;
        }
        if (!isPublicPlaybackPanelOpen()) {
          openPublicPlaybackPanelFallback(playModal);
        }
        constrainPublicPlaybackPanelIfContainer(playModal);
        schedulePublicContainerPageScrollRestore();
        normalizePublicPlaybackPanelButtonState(playModal);
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

    var playButton = document.getElementById(publicPlaybackBridgeConfig.ids.playButton);
    if (!playButton || !playButton.classList) {
      postPublicPlaybackStatus();
      return;
    }

    publicPlaybackResumeAvailable =
      publicPlaybackSessionStarted || playButton.classList.contains(publicPlaybackBridgeConfig.classes.stop);
    publicPlaybackSessionStarted = false;
    publicPlaybackStatusLockUntil = 0;
    publicPlaybackPanelRequestId += 1;

    if (!playButton.classList.contains(publicPlaybackBridgeConfig.classes.stop)) {
      if (cancelPublicPlaybackCountdown()) {
        postPublicPlaybackStatusValue('idle');
      } else {
        postPublicPlaybackStatus();
      }
      var pendingModal = document.getElementById(publicPlaybackBridgeConfig.ids.playModal);
      if (pendingModal) {
        pendingModal.style.display = 'none';
        closePublicPlaybackPanelFallback(pendingModal);
        restorePublicContainerPageScroll();
        postPublicPlaybackPanelStatus();
      }
      return;
    }

    playButton.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    }));

    var playModal = document.getElementById(publicPlaybackBridgeConfig.ids.playModal);
    var $ = getPublicRuntimeQuery();
    if (playModal && $ && $.fn && $.fn.closeModal) {
      $(playModal).closeModal({ out_duration: 80 });
    } else if (playModal) {
      playModal.style.display = 'none';
    }
    closePublicPlaybackPanelFallback(playModal);
    restorePublicContainerPageScroll();

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

    document.documentElement.setAttribute(publicPlaybackBridgeConfig.attributes.publicPlayback, '1');
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

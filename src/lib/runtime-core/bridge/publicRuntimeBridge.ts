import type {
  KuailepuLetterTrackData,
  KuailepuRuntimePublicFeature,
  KuailepuRuntimeTextMode
} from '../runtimeTypes.ts'
import { buildPublicRuntimeHeightBridgeScript } from './height/publicRuntimeHeightBridge.ts'
import { buildPublicRuntimeBootstrapScript } from './script/publicRuntimeBootstrap.ts'

function serializeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * 这层样式的目标不是“美化快乐谱页面”，而是把不需要的原站外壳彻底关掉，只留下谱面本体。
 *
 * 重点隐藏：
 * - 顶部 header
 * - footer/comment/tag/media
 * - 各类 modal
 * - Materialize 的 `.lean-overlay`
 *
 * 用户之前看到的半透明灰色遮罩，来源就是这里的 overlay。
 *
 * 另外这里会强制关闭 iframe 内文档自己的纵向滚动。
 * 原因是公开详情页的滚动应该只由外层页面承担，哪怕测高已经基本正确，
 * 某些桌面环境仍可能因为浏览器默认的 `overflow-y: auto` 画出一条内层滚动条。
 *
 * 真正的完整谱面高度仍然依赖 bridge script 回传给父页面，
 * 所以这里关掉内层纵向滚动不会裁掉内容，只会避免 iframe 自己再出现一层滚动。
 */
/**
 * 这个桥接脚本解决两个问题：
 *
 * 1. 快乐谱原始页面本身并不知道自己是被放进我们站点 iframe 里的，
 *    所以它不会主动把谱面高度告诉父页面。
 *
 * 2. 快乐谱页面里有很多被我们隐藏掉的节点，直接拿 `document.body.scrollHeight`
 *    往往会偏大，导致 iframe 底下出现大块空白。
 *
 * 因此这里的策略是：
 * - 优先只测量真正可见的谱面相关节点：`#sheet`、`.sheet-svg`
 * - 用这些节点的可见底部作为 iframe 实际高度
 * - 只有在还没出谱时，才退回 body/html 的 scrollHeight 兜底
 */
export function buildPublicRuntimeBridgeScript(
  songId: string,
  letterTrack: KuailepuLetterTrackData | null,
  textMode: KuailepuRuntimeTextMode,
  publicFeatures: Set<KuailepuRuntimePublicFeature>
) {
  const heightBridgeScript = buildPublicRuntimeHeightBridgeScript()
  const bootstrapScript = buildPublicRuntimeBootstrapScript()
  const safeLetterTrack = serializeForInlineScript(
    letterTrack ?? {
      mode: 'number',
      anchorLabels: null,
      glyphLabels: null,
      glyphTokens: null,
      scale: null
    }
  )

  return `
<script data-kuailepu-runtime-bridge>
(function () {
  var songId = ${JSON.stringify(songId)};
  var letterTrack = ${safeLetterTrack};
  var textMode = ${JSON.stringify(textMode)};
  var hasPublicMetronome = ${publicFeatures.has('metronome') ? 'true' : 'false'};
  var hasPublicPlayback = ${publicFeatures.has('playback') ? 'true' : 'false'};
  var resizeTimer = null;
  var letterTrackWarned = false;
  var initialSyncTimer = null;
  var playbackStatusObserver = null;
  var playbackPanelObserver = null;
  var playbackLetterHighlightObservers = [];
  var observedPlaybackButton = null;
  var observedPlaybackPanel = null;
  var publicPlaybackSessionStarted = false;
  var publicPlaybackStatusLockUntil = 0;

  function setSheetPending(isPending) {
    if (!letterTrack || letterTrack.mode === 'number') {
      document.documentElement.removeAttribute('data-vtabs-letter-track-pending');
      return;
    }

    if (isPending) {
      document.documentElement.setAttribute('data-vtabs-letter-track-pending', '1');
      return;
    }

    document.documentElement.removeAttribute('data-vtabs-letter-track-pending');
  }

  function getSheetSvg() {
    return document.querySelector('#sheet svg, #sheet .sheet-svg');
  }

  function getRuntimeAccessibleSongTitle() {
    var contextTitle =
      typeof context !== 'undefined' && context
        ? context.title || context.song_name || context.alias_name || ''
        : '';
    if (contextTitle && String(contextTitle).trim()) {
      return String(contextTitle).trim();
    }

    var documentTitle = String(document.title || '')
      .replace(/\s*-\s*Kuailepu Runtime Preview\s*$/i, '')
      .trim();
    return documentTitle || songId;
  }

  function annotateSheetSvgAccessibility(svg) {
    if (!svg) {
      return;
    }

    var songTitle = getRuntimeAccessibleSongTitle();
    var titleId = 'vtabs-sheet-title';
    var descId = 'vtabs-sheet-desc';
    var titleText = songTitle
      ? songTitle + ' fingering chart and sheet music'
      : 'Fingering chart and sheet music';
    var descText = songTitle
      ? 'Interactive SVG fingering chart and melody notation for ' + songTitle + '.'
      : 'Interactive SVG fingering chart and melody notation.';

    svg.setAttribute('role', 'img');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-labelledby', titleId + ' ' + descId);
    svg.removeAttribute('aria-hidden');

    Array.prototype.slice
      .call(svg.querySelectorAll('[data-vtabs-a11y]'))
      .forEach(function (node) {
        node.remove();
      });

    var titleNode = createSvgNode('title');
    titleNode.setAttribute('id', titleId);
    titleNode.setAttribute('data-vtabs-a11y', 'title');
    titleNode.textContent = titleText;

    var descNode = createSvgNode('desc');
    descNode.setAttribute('id', descId);
    descNode.setAttribute('data-vtabs-a11y', 'desc');
    descNode.textContent = descText;

    svg.insertBefore(descNode, svg.firstChild || null);
    svg.insertBefore(titleNode, descNode);
  }

  function syncPublicMetronomeButtonLabel() {
    var playButton = document.getElementById('metronome-play');
    if (!playButton) {
      return;
    }

    if (window.Metronome && window.Metronome.tick >= 0) {
      playButton.textContent = 'Stop';
      return;
    }

    playButton.textContent = 'Start';
  }

  function setPublicMetronomeBeat(value) {
    var beat = document.getElementById('metronome-beat');
    if (!beat) {
      return;
    }

    beat.textContent = value ? String(value) : '';
  }

  function localizePublicMetronome() {
    if (!hasPublicMetronome || textMode !== 'english') {
      return;
    }

    var timeSignatureLabel = document.querySelector('label[for="metronome-time-signature"]');
    if (timeSignatureLabel) {
      timeSignatureLabel.textContent = 'Time Signature';
    }

    var bpmOptions = {
      '40': '40 Grave',
      '46': '46 Largo',
      '56': '56 Adagio',
      '60': '60 Larghetto',
      '66': '66 Andante',
      '69': '69 Andantino',
      '88': '88 Moderato',
      '108': '108 Allegretto',
      '132': '132 Allegro',
      '160': '160 Vivace',
      '184': '184 Presto',
      '208': '208 Prestissimo'
    };
    Array.prototype.slice
      .call(document.querySelectorAll('#metronome-bpm option'))
      .forEach(function (option) {
        var value = option.getAttribute('value') || '';
        if (bpmOptions[value]) {
          option.textContent = bpmOptions[value];
        }
      });

    syncPublicMetronomeButtonLabel();
  }

  function findMetronomeField(content, inputId) {
    return (
      Array.prototype.slice
        .call(content.querySelectorAll('.input-field'))
        .find(function (node) {
          return Boolean(node.querySelector('#' + inputId));
        }) || null
    );
  }

  function mountPublicMetronomePanel() {
    if (!hasPublicMetronome) {
      return;
    }

    var modal = document.getElementById('metronome-modal');
    var sheet = document.getElementById('sheet');
    if (!modal || !sheet || !sheet.parentNode) {
      return;
    }

    if (!modal.getAttribute('data-vtabs-public-docked')) {
      modal.setAttribute('data-vtabs-public-docked', '1');
      sheet.parentNode.insertBefore(modal, sheet);

      var content = modal.querySelector('.modal-content');
      if (content) {
        var timeSignatureField = findMetronomeField(content, 'metronome-time-signature');
        var bpmField = findMetronomeField(content, 'metronome-bpm');
        var playButton = content.querySelector('#metronome-play');
        if (timeSignatureField) {
          timeSignatureField.classList.add('vtabs-public-metronome-field');
        }
        if (bpmField) {
          bpmField.classList.add('vtabs-public-metronome-field');
        }

        var toolbar = document.createElement('div');
        toolbar.className = 'vtabs-public-metronome-toolbar';

        var title = document.createElement('div');
        title.className = 'vtabs-public-metronome-title';

        var titleText = document.createElement('h2');
        titleText.textContent = 'Metronome';
        title.appendChild(titleText);

        var beat = document.createElement('p');
        beat.id = 'metronome-beat';
        beat.className = 'vtabs-public-metronome-chip';
        beat.setAttribute('aria-live', 'polite');
        title.appendChild(beat);

        toolbar.appendChild(title);

        if (timeSignatureField) {
          toolbar.appendChild(timeSignatureField);
        }

        if (bpmField) {
          toolbar.appendChild(bpmField);
        }

        if (playButton) {
          var playAction = document.createElement('div');
          playAction.className = 'vtabs-public-metronome-action';
          playAction.appendChild(playButton);
          toolbar.appendChild(playAction);
        }

        var legacyBeat = content.querySelector('#metronome-beat');
        if (legacyBeat && legacyBeat !== beat) {
          legacyBeat.remove();
        }

        var row = content.querySelector('.row');
        if (row) {
          row.remove();
        }

        var legacyPlayWrapper = content.querySelector('.center-align');
        if (legacyPlayWrapper) {
          legacyPlayWrapper.remove();
        }

        content.insertBefore(toolbar, content.firstChild);
      }
    }

    document.documentElement.setAttribute('data-vtabs-public-metronome', '1');
    localizePublicMetronome();

    if (window.Metronome) {
      window.Metronome.onstart = function () {
        syncPublicMetronomeButtonLabel();
      };
      window.Metronome.onstop = function () {
        setPublicMetronomeBeat('');
        syncPublicMetronomeButtonLabel();
      };
      window.Metronome.onbeat = function (value) {
        setPublicMetronomeBeat(value);
      };
      syncPublicMetronomeButtonLabel();
    }
  }

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
    return /^-?\d+$/.test(normalized) ? normalized : null;
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
        type: 'vtabs-playback-status',
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
        type: 'vtabs-playback-status',
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
        type: 'vtabs-playback-panel-status',
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

  function getLetterTrackAnchors(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .filter(function (node) {
        var href = node.getAttribute('xlink:href') || node.getAttribute('href') || '';
        return (
          href.indexOf('tdo12Outline') !== -1 ||
          href.indexOf('do12Outline') !== -1 ||
          href.indexOf('o12Outline') !== -1 ||
          href.indexOf('tdo6Outline') !== -1 ||
          href.indexOf('do6Outline') !== -1
        );
      })
      .map(function (node) {
        return {
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0),
          width: Number(node.getAttribute('width') || 60) || 60,
          height: Number(node.getAttribute('height') || 50) || 50
        };
      })
      .sort(function (left, right) {
        if (left.y !== right.y) {
          return left.y - right.y;
        }
        return left.x - right.x;
      });
  }

  function getUseHref(node) {
    return node.getAttribute('xlink:href') || node.getAttribute('href') || '';
  }

  function getLetterTrackNoteGlyphs(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .filter(function (node) {
        return /^#note_serif_[0-7](?:_s)?$/.test(getUseHref(node));
      })
      .map(function (node) {
        var href = getUseHref(node);
        var bbox = typeof node.getBBox === 'function' ? node.getBBox() : null;
        var x = Number(node.getAttribute('x') || 0);
        var y = Number(node.getAttribute('y') || 0);

        return {
          href: href,
          id: node.getAttribute('id'),
          degree: Number((href.match(/#note_serif_(\\d)/) || [])[1] || -1),
          sourceX: x,
          sourceY: y,
          x: bbox && Number.isFinite(bbox.x) ? bbox.x : x - 6,
          y: bbox && Number.isFinite(bbox.y) ? bbox.y : y - 10,
          width: bbox && Number.isFinite(bbox.width) && bbox.width > 0 ? bbox.width : 12,
          height: bbox && Number.isFinite(bbox.height) && bbox.height > 0 ? bbox.height : 18
        };
      })
      .sort(function (left, right) {
        if (left.y !== right.y) {
          return left.y - right.y;
        }
        return left.x - right.x;
      });
  }

  function getLetterTrackGraceNoteGlyphs(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .filter(function (node) {
        return /^#yiyin_yinfu_[0-7]$/.test(getUseHref(node));
      })
      .map(function (node) {
        var href = getUseHref(node);
        var bbox = typeof node.getBBox === 'function' ? node.getBBox() : null;
        var x = Number(node.getAttribute('x') || 0);
        var y = Number(node.getAttribute('y') || 0);

        return {
          href: href,
          degree: Number((href.match(/#yiyin_yinfu_(\\d)/) || [])[1] || -1),
          sourceX: x,
          sourceY: y,
          x: bbox && Number.isFinite(bbox.x) ? bbox.x : x - 4,
          y: bbox && Number.isFinite(bbox.y) ? bbox.y : y - 7,
          width: bbox && Number.isFinite(bbox.width) && bbox.width > 0 ? bbox.width : 8,
          height: bbox && Number.isFinite(bbox.height) && bbox.height > 0 ? bbox.height : 11
        };
      })
      .sort(function (left, right) {
        if (left.y !== right.y) {
          return left.y - right.y;
        }
        return left.x - right.x;
      });
  }

  function getLetterTrackGlyphMarkers(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .map(function (node) {
        return {
          href: getUseHref(node),
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0)
        };
      })
      .filter(function (node) {
        return (
          node.href === '#yingao_gao' ||
          node.href === '#yingao_di' ||
          node.href === '#yiyin_yingao_gao' ||
          node.href === '#yiyin_yingao_di' ||
          node.href === '#yiyin_bianyinfu_sheng' ||
          node.href === '#yiyin_bianyinfu_jiang'
        );
      });
  }

  function formatGlyphLetterName(letter, accidental, octave) {
    if (accidental > 1 || accidental < -1) {
      var midiNumber = getMidiNumberForRuntimeLetter(letter, accidental, octave);
      if (midiNumber !== null) {
        return getRuntimeSharpMidiLabel(midiNumber);
      }
    }

    var accidentalText =
      accidental === 0
        ? ''
        : accidental > 0
          ? '#'.repeat(accidental)
          : 'b'.repeat(Math.abs(accidental));

    return '' + letter + accidentalText + octave;
  }

  function getPitchClassForRuntimeLetter(letter) {
    switch (letter) {
      case 'C':
        return 0;
      case 'D':
        return 2;
      case 'E':
        return 4;
      case 'F':
        return 5;
      case 'G':
        return 7;
      case 'A':
        return 9;
      case 'B':
        return 11;
      default:
        return null;
    }
  }

  function getMidiNumberForRuntimeLetter(letter, accidental, octave) {
    var pitchClass = getPitchClassForRuntimeLetter(letter);
    if (pitchClass === null) {
      return null;
    }
    return (octave + 1) * 12 + pitchClass + accidental;
  }

  function getRuntimeSharpMidiLabel(noteNumber) {
    var noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var pitchClass = ((noteNumber % 12) + 12) % 12;
    var octave = Math.floor(noteNumber / 12) - 1;
    return noteNames[pitchClass] + octave;
  }

  function mapMpnNodeToLetterLabel(node) {
    if (!node) {
      return null;
    }

    if (Number(node.scale) === 0 || Number(node.noteNumber) === 0) {
      return 'R';
    }

    var noteNumber = Number(node.noteNumber);
    var scaleDegree = Number(node.scale);
    if (
      Array.isArray(letterTrack.scale) &&
      letterTrack.scale.length >= 7 &&
      scaleDegree >= 1 &&
      scaleDegree <= 7
    ) {
      var base = letterTrack.scale[scaleDegree - 1];
      if (base) {
        var accidental = base.accidental + Number(node.accidental || 0);
        var octave = base.octave + Number(node.octave || 0);

        if (Number.isFinite(noteNumber) && noteNumber > 0) {
          var spelledMidi = getMidiNumberForRuntimeLetter(base.letter, accidental, octave);
          if (spelledMidi !== null) {
            while (spelledMidi - noteNumber >= 12) {
              octave -= 1;
              spelledMidi -= 12;
            }
            while (noteNumber - spelledMidi >= 12) {
              octave += 1;
              spelledMidi += 12;
            }
            if (((spelledMidi - noteNumber) % 12 + 12) % 12 !== 0) {
              return getRuntimeSharpMidiLabel(noteNumber);
            }
          }
        }

        return formatGlyphLetterName(base.letter, accidental, octave);
      }
    }

    if (Number.isFinite(noteNumber) && noteNumber > 0) {
      return getRuntimeSharpMidiLabel(noteNumber);
    }

    return null;
  }

  function getRuntimeMpnNoteLabelsById(noteGlyphs) {
    var runtimeNodesById = getRuntimeMpnVisibleNodesById(noteGlyphs);
    if (!runtimeNodesById) {
      return null;
    }

    var labelsById = {};
    Object.keys(runtimeNodesById).forEach(function (id) {
      var label = mapMpnNodeToLetterLabel(runtimeNodesById[id]);
      if (label) {
        labelsById[id] = label;
      }
    });

    return Object.keys(labelsById).length > 0 ? labelsById : null;
  }

  function getRuntimeMpnVisibleNodesById(noteGlyphs) {
    var context =
      window.Kit &&
      window.Kit.context &&
      typeof window.Kit.context.getContext === 'function'
        ? window.Kit.context.getContext()
        : null;
    var tracks = context && context.mpn && Array.isArray(context.mpn.tracks) ? context.mpn.tracks : null;
    if (!tracks || !Array.isArray(noteGlyphs) || noteGlyphs.length === 0) {
      return null;
    }

    var targetIds = {};
    noteGlyphs.forEach(function (glyph) {
      if (glyph && glyph.id) {
        targetIds[glyph.id] = true;
      }
    });

    var trackOrder = tracks.slice().sort(function (left, right) {
      var leftMain = left && left.name === 'main' ? 0 : 1;
      var rightMain = right && right.name === 'main' ? 0 : 1;
      return leftMain - rightMain;
    });
    var nodesById = {};

    trackOrder.forEach(function (track) {
      var nodes = track && Array.isArray(track.nodes) ? track.nodes : [];
      nodes.forEach(function (node) {
        if (!node || !node.id || !targetIds[node.id] || nodesById[node.id]) {
          return;
        }
        nodesById[node.id] = node;
      });
    });

    return Object.keys(nodesById).length > 0 ? nodesById : null;
  }

  function getRuntimeMpnDegreePitchMap(noteGlyphs) {
    var runtimeNodesById = getRuntimeMpnVisibleNodesById(noteGlyphs);
    if (!runtimeNodesById) {
      return null;
    }

    var exact = {};
    var byDegreeAccidental = {};
    Object.keys(runtimeNodesById).forEach(function (id) {
      var node = runtimeNodesById[id];
      var scaleDegree = Number(node && node.scale);
      var noteNumber = Number(node && node.noteNumber);
      if (!(scaleDegree >= 1 && scaleDegree <= 7) || !Number.isFinite(noteNumber) || noteNumber <= 0) {
        return;
      }

      var accidental = Number(node.accidental || 0);
      var octave = Number(node.octave || 0);
      var exactKey = scaleDegree + ':' + accidental + ':' + octave;
      var degreeKey = scaleDegree + ':' + accidental;
      if (!(exactKey in exact)) {
        exact[exactKey] = noteNumber;
      }
      if (!byDegreeAccidental[degreeKey]) {
        byDegreeAccidental[degreeKey] = [];
      }
      byDegreeAccidental[degreeKey].push({
        octave: octave,
        noteNumber: noteNumber
      });
    });

    return Object.keys(exact).length > 0
      ? {
        exact: exact,
        byDegreeAccidental: byDegreeAccidental
      }
      : null;
  }

  function getRuntimeMpnDegreePitchLabel(degree, accidental, octave, pitchMap) {
    if (!pitchMap) {
      return null;
    }

    var exactKey = degree + ':' + accidental + ':' + octave;
    if (exactKey in pitchMap.exact) {
      return getRuntimeSharpMidiLabel(pitchMap.exact[exactKey]);
    }

    var degreeKey = degree + ':' + accidental;
    var samples = pitchMap.byDegreeAccidental[degreeKey];
    var accidentalOffset = 0;
    if ((!Array.isArray(samples) || samples.length === 0) && accidental !== 0) {
      samples = pitchMap.byDegreeAccidental[degree + ':0'];
      accidentalOffset = accidental;
    }
    if (!Array.isArray(samples) || samples.length === 0) {
      return null;
    }

    var nearest = samples
      .slice()
      .sort(function (left, right) {
        return Math.abs(left.octave - octave) - Math.abs(right.octave - octave);
      })[0];
    if (!nearest) {
      return null;
    }

    return getRuntimeSharpMidiLabel(nearest.noteNumber + accidentalOffset + (octave - nearest.octave) * 12);
  }

  function getGlyphMarkerOffsets(glyph, glyphMarkers) {
    var highCount = glyphMarkers.filter(function (marker) {
      return (
        (marker.href === '#yingao_gao' || marker.href === '#yiyin_yingao_gao') &&
        Math.abs(marker.x - glyph.sourceX) <= 3 &&
        marker.y <= glyph.sourceY + 2 &&
        marker.y >= glyph.sourceY - 28
      );
    }).length;
    var lowCount = glyphMarkers.filter(function (marker) {
      return (
        (marker.href === '#yingao_di' || marker.href === '#yiyin_yingao_di') &&
        Math.abs(marker.x - glyph.sourceX) <= 3 &&
        marker.y >= glyph.sourceY - 2 &&
        marker.y <= glyph.sourceY + 20
      );
    }).length;
    var accidentalShift =
      glyphMarkers.filter(function (marker) {
        return (
          marker.href === '#yiyin_bianyinfu_sheng' &&
          marker.x >= glyph.sourceX - 26 &&
          marker.x <= glyph.sourceX - 2 &&
          Math.abs(marker.y - glyph.sourceY) <= 10
        );
      }).length -
      glyphMarkers.filter(function (marker) {
        return (
          marker.href === '#yiyin_bianyinfu_jiang' &&
          marker.x >= glyph.sourceX - 26 &&
          marker.x <= glyph.sourceX - 2 &&
          Math.abs(marker.y - glyph.sourceY) <= 10
        );
      }).length;

    return {
      highCount: highCount,
      lowCount: lowCount,
      accidentalShift: accidentalShift
    };
  }

  function mapGraceGlyphToRuntimeMpnLabel(glyph, glyphMarkers, pitchMap) {
    if (!glyph || !glyphMarkers || !pitchMap || glyph.degree === 0) {
      return null;
    }

    var offsets = getGlyphMarkerOffsets(glyph, glyphMarkers);
    return getRuntimeMpnDegreePitchLabel(
      glyph.degree,
      offsets.accidentalShift,
      offsets.highCount - offsets.lowCount,
      pitchMap
    );
  }

  function getAlignedGlyphTokens(noteGlyphs) {
    // 理想路径：优先用我们自己的 compact notation token 与最终 SVG 音符做顺序对齐。
    // 这样字母谱可以稳定保留 R、升降号、八度信息，而不是只读出 A-G。
    if (!Array.isArray(letterTrack.glyphTokens) || letterTrack.glyphTokens.length === 0) {
      return null;
    }

    var glyphDegrees = noteGlyphs.map(function (glyph) {
      return String(glyph.degree);
    });
    var tokenDegrees = letterTrack.glyphTokens.map(function (token) {
      var match = token && token.match(/[0-7]/);
      return match ? match[0] : '';
    });

    if (glyphDegrees.length === 0 || tokenDegrees.length === 0) {
      return null;
    }

    // 之前这里用的是“从左到右贪心撞 degree”。
    // 对 faded 这类重复 degree 很多、结构又长的旋律，
    // 一次误撞就会把后面的 token 全部吃偏，最后整首歌退回 runtime mpn fallback，
    // 表现成“切换 fingering_index 后字母谱不变”。
    //
    // 这里改成完整的最长公共子序列对齐：
    // - token 序列保留我们自己的休止/升降/八度语义
    // - glyph 序列保留最终 SVG 真正画出来的 note 顺序
    // - 只要 glyph degree 序列确实是 token degree 序列的一个子序列，
    //   就能稳定找回整条映射，不再被局部重复片段带偏
    var dp = new Array(tokenDegrees.length + 1);
    for (var tokenRow = 0; tokenRow <= tokenDegrees.length; tokenRow += 1) {
      dp[tokenRow] = new Uint16Array(glyphDegrees.length + 1);
    }

    for (var tokenIndex = tokenDegrees.length - 1; tokenIndex >= 0; tokenIndex -= 1) {
      for (var glyphIndex = glyphDegrees.length - 1; glyphIndex >= 0; glyphIndex -= 1) {
        if (tokenDegrees[tokenIndex] === glyphDegrees[glyphIndex]) {
          dp[tokenIndex][glyphIndex] = dp[tokenIndex + 1][glyphIndex + 1] + 1;
        } else {
          dp[tokenIndex][glyphIndex] = Math.max(
            dp[tokenIndex + 1][glyphIndex],
            dp[tokenIndex][glyphIndex + 1]
          );
        }
      }
    }

    if (dp[0][0] !== glyphDegrees.length) {
      return null;
    }

    var aligned = [];
    var tokenCursor = 0;
    var glyphCursor = 0;

    while (tokenCursor < tokenDegrees.length && glyphCursor < glyphDegrees.length) {
      if (
        tokenDegrees[tokenCursor] === glyphDegrees[glyphCursor] &&
        dp[tokenCursor][glyphCursor] === dp[tokenCursor + 1][glyphCursor + 1] + 1
      ) {
        aligned.push(letterTrack.glyphTokens[tokenCursor]);
        tokenCursor += 1;
        glyphCursor += 1;
        continue;
      }

      if (dp[tokenCursor + 1][glyphCursor] >= dp[tokenCursor][glyphCursor + 1]) {
        tokenCursor += 1;
      } else {
        glyphCursor += 1;
      }
    }

    return aligned.length === glyphDegrees.length ? aligned : null;
  }

  function mapGlyphTokenToLetterLabel(token) {
    if (!token || !Array.isArray(letterTrack.scale) || letterTrack.scale.length < 7) {
      return null;
    }

    var match = token.match(/^([#bn]?)([0-7])([',dg]*)$/i);
    if (!match) {
      return null;
    }

    if (match[2] === '0') {
      return 'R';
    }

    var base = letterTrack.scale[Number(match[2]) - 1];
    if (!base) {
      return null;
    }

    var accidentalShift = match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0;
    var octaveMarks = match[3] || '';
    var octaveShift = 0;
    for (var index = 0; index < octaveMarks.length; index += 1) {
      var octaveMark = octaveMarks[index].toLowerCase();
      octaveShift += octaveMark === "'" || octaveMark === 'g' ? 1 : -1;
    }

    return formatGlyphLetterName(
      base.letter,
      base.accidental + accidentalShift,
      base.octave + octaveShift
    );
  }

  function mapGlyphMarkersToLetterLabel(glyph, glyphMarkers) {
    if (!glyph || !glyphMarkers) {
      return null;
    }

    if (glyph.degree === 0) {
      return 'R';
    }

    if (!Array.isArray(letterTrack.scale) || letterTrack.scale.length < 7) {
      return null;
    }

    var base = letterTrack.scale[glyph.degree - 1];
    if (!base) {
      return null;
    }

    var offsets = getGlyphMarkerOffsets(glyph, glyphMarkers);

    return formatGlyphLetterName(
      base.letter,
      base.accidental + offsets.accidentalShift,
      base.octave + offsets.highCount - offsets.lowCount
    );
  }

  function createSvgNode(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
  }

  function replaceAllText(source, replacements) {
    var next = source;
    replacements.forEach(function (pair) {
      next = next.split(pair[0]).join(pair[1]);
    });
    return next;
  }

  function translateVisibleSheetText(text) {
    if (!text || textMode !== 'english') {
      return text;
    }

    var replacements = [
      ['作曲', 'Composer'],
      ['作词', 'Lyricist'],
      ['編曲', 'Arranger'],
      ['编曲', 'Arranger'],
      ['記譜', 'Notation'],
      ['记谱', 'Notation'],
      ['制谱', 'Notation'],
      ['十二孔陶笛', '12-hole ocarina'],
      ['六孔陶笛', '6-hole ocarina'],
      ['三管陶笛', 'Triple ocarina'],
      ['英式八孔竖笛', 'Recorder (Baroque fingering)'],
      ['德式八孔竖笛', 'Recorder (German fingering)'],
      ['爱尔兰哨笛', 'Tin whistle'],
      ['筒音作低音', 'Tube tone bass '],
      ['筒音作', 'Tube tone '],
      ['八孔埙', '8-hole xun'],
      ['十孔埙', '10-hole xun'],
      ['合埙', 'He-xun'],
      ['八孔箫', '8-hole xiao'],
      ['七孔葫芦丝', '7-hole hulusi'],
      ['九孔葫芦丝', '9-hole hulusi'],
      ['六孔竹笛', '6-hole bamboo flute'],
      ['F调指法', 'F fingering'],
      ['G调指法', 'G fingering'],
      ['C调指法', 'C fingering'],
      ['D调指法', 'D fingering'],
      ['bB调指法', 'Bb fingering'],
      ['♭B调指法', 'Bb fingering'],
      ['bE调指法', 'Eb fingering'],
      ['♭E调指法', 'Eb fingering'],
      ['标准指法', 'Standard fingering'],
      ['易于握持', 'Easy grip'],
      ['吹口在下（推荐）', 'Mouthpiece down (Recommended)'],
      ['吹口在上（推荐）', 'Mouthpiece up (Recommended)'],
      ['吹口在下', 'Mouthpiece down'],
      ['吹口在上', 'Mouthpiece up'],
      ['轻吹', 'Soft blow'],
      ['重吹', 'Strong blow'],
      ['演奏顺序：', 'Play order:'],
      ['演奏顺序', 'Play order'],
      ['前奏', 'Prelude'],
      ['後奏', 'Postlude'],
      ['后奏', 'Postlude'],
      ['間奏', 'Interlude'],
      ['间奏', 'Interlude'],
      ['尾奏', 'Coda'],
      ['省略', 'Omit'],
      ['休止', 'Rest'],
      ['英文版', 'English lyrics version'],
      ['瓦格纳版本', 'Wagner version'],
      ['美国民歌', 'American folk song'],
      ['英国民歌', 'English folk song'],
      ['爱尔兰民歌', 'Irish folk song'],
      ['加拿大民歌', 'Canadian folk song'],
      ['意大利民歌', 'Italian folk song'],
      ['日本民歌', 'Japanese folk song'],
      ['江苏民歌', 'Jiangsu folk song'],
      ['丹麦民歌', 'Danish folk song'],
      ['朝鲜族民歌', 'Korean folk song'],
      ['法国童谣', 'French nursery rhyme'],
      ['英语童谣', 'English nursery rhyme'],
      ['左起', 'Left-start'],
      ['右起', 'Right-start'],
      ['七星', 'Seven-star']
    ];

    var translated = replaceAllText(text, replacements);
    translated = translated
      .replace(/[（(]\\s*Prelude\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar prelude')
      .replace(/[（(]\\s*Postlude\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar postlude')
      .replace(/[（(]\\s*Interlude\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar interlude')
      .replace(/[（(]\\s*Coda\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar coda')
      .replace(/[（(]\\s*Omit\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar omit')
      .replace(/[（(]\\s*Rest\\s*(\\d+)\\s*小[节節]\\s*[）)]/g, '$1-bar rest')
      .replace(/\\((prelude|postlude|interlude|coda|omit|rest)\\s+(\\d+)\\s+measures\\)/gi, function (_, label, count) {
        return count + '-bar ' + String(label).toLowerCase();
      })
      .replace(/[（(]\\s*Prelude\\s*[）)]/g, '(prelude)')
      .replace(/[（(]\\s*Postlude\\s*[）)]/g, '(postlude)')
      .replace(/[（(]\\s*Interlude\\s*[）)]/g, '(interlude)')
      .replace(/[（(]\\s*Coda\\s*[）)]/g, '(coda)')
      .replace(/[（(]\\s*Omit\\s*[）)]/g, '(omit)')
      .replace(/[（(]\\s*Rest\\s*[）)]/g, '(rest)')
      .replace(/\\bocarina\\((12|6) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole ocarina ';
      })
      .replace(/\\bbamboo flute\\((6) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole bamboo flute ';
      })
      .replace(/\\brecorder\\(baroque 8 holes\\)\\s*/gi, 'Recorder (Baroque fingering) ')
      .replace(/\\brecorder\\(german 8 holes\\)\\s*/gi, 'Recorder (German fingering) ')
      .replace(/\\bxun\\((8|10|11) holes\\)\\s*/gi, function (_, holes) {
        return holes === '11' ? 'He-xun ' : holes + '-hole xun ';
      })
      .replace(/\\bhulusi\\((7|9) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole hulusi ';
      })
      .replace(/\\bb([A-G])\\b/g, '$1b');
    translated = translated.replace(
      /([a-z)])(?=(?:Bb|Eb|[A-G]|bE|bB)\\s*fingering\\b)/g,
      '$1 '
    );
    return translated.replace(/\\s{2,}/g, ' ').trim();
  }

  function shouldRelaxVisibleSheetTextWidth(text) {
    if (!text || textMode !== 'english') {
      return false;
    }

    return /(?:Composer|Lyricist|Arranger|Notation|fingering|ocarina|recorder|xun|hulusi|xiao|bamboo flute|prelude|postlude|interlude|coda|omit|rest|measures)/i.test(
      text
    );
  }

  function isVisibleSheetStructureMarkerText(text) {
    if (!text || textMode !== 'english') {
      return false;
    }

    return /(?:\\b\\d+-bar\\s+(?:prelude|postlude|interlude|coda|omit|rest)\\b|\\b(?:prelude|postlude|interlude|coda|omit|rest)\\b)/i.test(
      text
    );
  }

  function shouldHideVisibleSheetText(text) {
    if (!text || textMode !== 'english') {
      return false;
    }

    var normalized = String(text).replace(/\\s+/g, ' ').trim();
    if (!normalized) {
      return false;
    }

    if (/^1\\s*[=＝]\\s*[#b♭]?[A-G]$/i.test(normalized)) {
      return true;
    }

    if (/^\\d+\\s*[\\/／]\\s*\\d+$/.test(normalized)) {
      return true;
    }

    if (/=\\s*\\d+\\b/.test(normalized)) {
      return true;
    }

    return /(?:fingering|ocarina|recorder|tin whistle|xun|hulusi|xiao|bamboo flute)/i.test(
      normalized
    );
  }

  function shouldHideTopHeaderNumericMetadata(node, normalized) {
    if (!node || !normalized || !/^\\d+$/.test(normalized)) {
      return false;
    }

    var showMeasureNum =
      typeof context !== 'undefined' && context && context.show_measure_num
        ? String(context.show_measure_num).toLowerCase()
        : 'off';
    if (showMeasureNum === 'on') {
      return false;
    }

    var x = Number(node.getAttribute('x'));
    var y = Number(node.getAttribute('y'));
    var fontSize = Number(node.getAttribute('font-size') || 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }

    if (y >= 240) {
      return false;
    }

    return x < 180 || (Number.isFinite(fontSize) && fontSize >= 16);
  }

  function hideTopLeftSheetMetadata(svg) {
    if (!svg || textMode !== 'english') {
      return;
    }

    Array.prototype.slice
      .call(svg.querySelectorAll('text, use'))
      .forEach(function (node) {
        var tagName = node && node.tagName ? String(node.tagName).toLowerCase() : '';
        if (tagName !== 'text' && tagName !== 'use') {
          return;
        }

        var x = Number(node.getAttribute('x'));
        var y = Number(node.getAttribute('y'));
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        var normalized = '';
        var shouldCheckWideTopHeaderNumeric = false;
        if (tagName === 'text') {
          normalized = String(node.textContent || '').replace(/\\s+/g, ' ').trim();
          shouldCheckWideTopHeaderNumeric = shouldHideTopHeaderNumericMetadata(node, normalized);
        }

        if ((x > 280 || y > 220) && !shouldCheckWideTopHeaderNumeric) {
          return;
        }

        var shouldHide = false;
        if (tagName === 'use') {
          var href = getUseHref(node);
          shouldHide =
            /^#diaohao_/.test(href) ||
            /^#paihao_/.test(href) ||
            (/^#shuzi_/.test(href) && x < 180 && y < 170) ||
            href === '#bpm';
        } else {
          shouldHide =
            /(?:fingering|ocarina|recorder|tin whistle|xun|hulusi|xiao|bamboo flute)/i.test(
              normalized
            ) ||
            // 头部区里孤立的纯数字通常是调号前导数字、速度数字或快乐谱原头部残留；
            // 当公开页小节号开关默认关闭时，这类顶部数字应一并隐藏。
            shouldHideTopHeaderNumericMetadata(node, normalized);
        }

        if (!shouldHide) {
          return;
        }

        node.setAttribute('display', 'none');
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('data-vtabs-top-left-metadata-hidden', '1');
      });
  }

  function localizeVisibleSheetText(svg) {
    if (!svg || textMode !== 'english') {
      return;
    }

    hideTopLeftSheetMetadata(svg);

    Array.prototype.slice
      .call(svg.querySelectorAll('text'))
      .forEach(function (node) {
        if (node.getAttribute('data-vtabs-top-left-metadata-hidden') === '1') {
          return;
        }
        var original = node.textContent || '';
        var translated = translateVisibleSheetText(original);
        if (shouldHideVisibleSheetText(translated || original)) {
          node.setAttribute('display', 'none');
          node.setAttribute('aria-hidden', 'true');
          return;
        }
        var shouldRelaxWidth = shouldRelaxVisibleSheetTextWidth(translated || original);
        if (!translated || (translated === original && !shouldRelaxWidth)) {
          return;
        }
        if (shouldRelaxWidth) {
          node.removeAttribute('textLength');
          node.removeAttribute('lengthAdjust');
        }
        if (isVisibleSheetStructureMarkerText(translated || original)) {
          var currentFontSize = Number(node.getAttribute('font-size') || 0);
          if (Number.isFinite(currentFontSize) && currentFontSize > 16) {
            node.setAttribute('font-size', '16');
          }
        }
        node.textContent = translated;
      });
  }

  function clearLetterTrack(svg) {
    clearPublicPlaybackLetterHighlightObservers();
    Array.prototype.slice
      .call(svg.querySelectorAll('[data-vtabs-letter-track]'))
      .forEach(function (node) {
        node.remove();
      });

    Array.prototype.slice
      .call(svg.querySelectorAll('[data-vtabs-letter-hidden]'))
      .forEach(function (node) {
        node.removeAttribute('data-vtabs-letter-hidden');
        node.style.opacity = '';
      });
  }

  function clearPublicPlaybackLetterHighlightObservers() {
    while (playbackLetterHighlightObservers.length > 0) {
      var observer = playbackLetterHighlightObservers.pop();
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    }
  }

  function getPublicPlaybackHighlightColor() {
    var body = document.body;
    var isDark = body && body.getAttribute('data-theme') === 'dark';
    return isDark ? '#ffd95edd' : '#c6ff00dd';
  }

  function isPublicPlaybackHighlightedSource(node) {
    if (!node) {
      return false;
    }

    var style = String(node.getAttribute('style') || '');
    return /fill\s*:\s*[^;]+/i.test(style) || /stroke\s*:\s*[^;]+/i.test(style);
  }

  function syncPublicPlaybackLetterHighlight(item) {
    if (!item || !item.sourceNode || !item.coverNode || !item.labelNode) {
      return;
    }

    var active = isPublicPlaybackHighlightedSource(item.sourceNode);
    if (active) {
      item.coverNode.setAttribute('fill', getPublicPlaybackHighlightColor());
      item.coverNode.setAttribute('fill-opacity', '1');
      item.coverNode.setAttribute('stroke', 'none');
      item.labelNode.setAttribute('fill', '#201910');
      item.labelNode.setAttribute('stroke', '#fff8d9');
      item.labelNode.setAttribute('stroke-width', '3');
    } else {
      item.coverNode.setAttribute('fill', '#ffffff');
      item.coverNode.setAttribute('fill-opacity', '0.98');
      item.coverNode.setAttribute('stroke', 'none');
      item.labelNode.setAttribute('fill', '#7a5331');
      item.labelNode.setAttribute('stroke', '#ffffff');
      item.labelNode.setAttribute('stroke-width', '2.5');
    }
  }

  function installPublicPlaybackLetterHighlightSync(items) {
    clearPublicPlaybackLetterHighlightObservers();

    if (!hasPublicPlayback || !Array.isArray(items) || items.length === 0) {
      return;
    }

    items.forEach(function (item) {
      if (!item || !item.sourceNode) {
        return;
      }

      var observer = new MutationObserver(function () {
        syncPublicPlaybackLetterHighlight(item);
      });
      observer.observe(item.sourceNode, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      playbackLetterHighlightObservers.push(observer);
      syncPublicPlaybackLetterHighlight(item);
    });
  }

  function getSvgWidth(svg) {
    if (svg && svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width > 0) {
      return svg.viewBox.baseVal.width;
    }

    var widthAttr = Number(svg.getAttribute('width') || 0);
    if (widthAttr > 0) {
      return widthAttr;
    }

    var rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
    if (rect && rect.width > 0) {
      return rect.width;
    }

    return 600;
  }

  function getLetterTrackRows(anchors) {
    return anchors.reduce(function (rows, anchor) {
      var previousRow = rows[rows.length - 1];
      var rowRight = anchor.x + anchor.width;

      if (previousRow && Math.abs(previousRow.anchorY - anchor.y) < 4) {
        previousRow.minX = Math.min(previousRow.minX, anchor.x);
        previousRow.maxX = Math.max(previousRow.maxX, rowRight);
        return rows;
      }

      rows.push({
        anchorY: anchor.y,
        minX: anchor.x,
        maxX: rowRight
      });
      return rows;
    }, []);
  }

  function getNotationMarkers(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .map(function (node) {
        return {
          href: node.getAttribute('xlink:href') || node.getAttribute('href') || '',
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0)
        };
      })
      .filter(function (node) {
        return (
          node.href.indexOf('note_') !== -1 ||
          node.href.indexOf('fudian') !== -1 ||
          node.href.indexOf('huxifu') !== -1 ||
          node.href.indexOf('single_bar') !== -1 ||
          node.href.indexOf('double_bar') !== -1 ||
          node.href.indexOf('repeat_') !== -1
        );
      });
  }

  function getLetterTrackBreathMarks(svg) {
    return Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .map(function (node) {
        return {
          href: getUseHref(node),
          x: Number(node.getAttribute('x') || 0),
          y: Number(node.getAttribute('y') || 0)
        };
      })
      .filter(function (node) {
        return node.href === '#huxifu';
      });
  }

  function hideLetterModeJianpuOnlyMarks(svg) {
    // 这里隐藏的是“简谱专属且转成字母谱后价值很低、甚至会误导”的符号。
    //
    // 当前产品判断：
    // - 保留：歌词、指法图、段落/小节/重复等结构信息
    // - 隐藏：原始数字音符字形、简谱八度点、附点、简谱升降号独立字形、简谱换气 V、部分短时值线
    //
    // 不要把这个函数扩张成“删除所有非字母元素”。
    // 站点当前最重要的是保留快乐谱原排版骨架，只去掉对 western 用户阅读帮助不大的简谱专属痕迹。
    Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .forEach(function (node) {
        var href = getUseHref(node);
        if (
          /^#note_serif_[0-7](?:_s)?$/.test(href) ||
          /^#yiyin_yinfu_[0-7]$/.test(href) ||
          href === '#yingao_gao' ||
          href === '#yingao_di' ||
          href === '#yiyin_yingao_gao' ||
          href === '#yiyin_yingao_di' ||
          href === '#fudian' ||
          href === '#huxifu' ||
          href === '#accidental_flat' ||
          href === '#accidental_sharp' ||
          href === '#accidental_nature' ||
          href === '#accidental_x' ||
          href === '#yiyin_bianyinfu_jiang' ||
          href === '#yiyin_bianyinfu_sheng'
        ) {
          node.setAttribute('data-vtabs-letter-hidden', '1');
          node.style.opacity = '0';
        }
      });

    Array.prototype.slice
      .call(svg.querySelectorAll('line'))
      .forEach(function (node) {
        var x1 = Number(node.getAttribute('x1') || 0);
        var x2 = Number(node.getAttribute('x2') || 0);
        var y1 = Number(node.getAttribute('y1') || 0);
        var y2 = Number(node.getAttribute('y2') || 0);
        var strokeWidth = Number(node.getAttribute('stroke-width') || 0);

        if (strokeWidth === 2 && Math.abs(y1 - y2) < 0.2) {
          node.setAttribute('data-vtabs-letter-hidden', '1');
          node.style.opacity = '0';
        }
      });
  }

  function getLetterTrackRowMetrics(svg, anchors) {
    var notationMarkers = getNotationMarkers(svg);

    return getLetterTrackRows(anchors).map(function (row) {
      var rowMarkers = notationMarkers.filter(function (marker) {
        var delta = marker.y - row.anchorY;
        return delta >= 40 && delta <= 110;
      });
      var notationY = rowMarkers.length
        ? Math.min.apply(
            null,
            rowMarkers.map(function (marker) {
              return marker.y;
            })
          )
        : row.anchorY + 62;
      var notationBottom = rowMarkers.length
        ? Math.max.apply(
            null,
            rowMarkers.map(function (marker) {
              return marker.y;
            })
          )
        : notationY + 22;

      return {
        anchorY: row.anchorY,
        minX: row.minX,
        maxX: row.maxX,
        notationY: notationY,
        notationBottom: notationBottom
      };
    });
  }

  function renderLetterTrack() {
    var svg = getSheetSvg();
    if (!svg) {
      return false;
    }

    annotateSheetSvgAccessibility(svg);
    localizeVisibleSheetText(svg);
    clearPublicPlaybackLetterHighlightObservers();

    if (!letterTrack || letterTrack.mode === 'number') {
      setSheetPending(false);
      return true;
    }

    clearLetterTrack(svg);
    var anchors = getLetterTrackAnchors(svg);
    var noteGlyphs = getLetterTrackNoteGlyphs(svg);
    var needsLabels = letterTrack.mode === 'letter';
    var positionNodes = letterTrack.mode === 'letter' ? noteGlyphs : anchors;
    if (
      positionNodes.length === 0 ||
      (letterTrack.mode !== 'letter' &&
        needsLabels &&
        (!Array.isArray(letterTrack.anchorLabels) || positionNodes.length !== letterTrack.anchorLabels.length))
    ) {
      if (!letterTrackWarned) {
        console.warn('Skipped letter track because note anchors did not line up.', {
          expected: Array.isArray(letterTrack.anchorLabels) ? letterTrack.anchorLabels.length : 0,
          actual: positionNodes.length,
          songId: songId
        });
        letterTrackWarned = true;
      }
      setSheetPending(false);
      return true;
    }

    var rows = getLetterTrackRowMetrics(svg, anchors);
    var layer = createSvgNode('g');
    layer.setAttribute('data-vtabs-letter-track', 'layer');
    layer.setAttribute('pointer-events', 'none');

    if (letterTrack.mode === 'graph') {
      var svgWidth = getSvgWidth(svg);
      var coverX = 24;
      var coverWidth = Math.max(svgWidth - coverX * 2, 120);

      rows.forEach(function (row) {
        var cover = createSvgNode('rect');
        cover.setAttribute('data-vtabs-letter-track', 'cover');
        cover.setAttribute('x', String(coverX));
        cover.setAttribute('y', String(row.notationY - 4));
        cover.setAttribute('width', String(coverWidth));
        cover.setAttribute(
          'height',
          String(Math.max(54, row.notationBottom - row.notationY + 24))
        );
        cover.setAttribute('rx', '8');
        cover.setAttribute('fill', '#ffffff');
        cover.setAttribute('fill-opacity', '1');
        layer.appendChild(cover);
      });
    }

    if (letterTrack.mode === 'letter') {
      hideLetterModeJianpuOnlyMarks(svg);
      var breathMarks = getLetterTrackBreathMarks(svg);
      var alignedGlyphTokens = getAlignedGlyphTokens(noteGlyphs);
      var runtimeGlyphMarkers = getLetterTrackGlyphMarkers(svg);
      var glyphMarkers = alignedGlyphTokens ? null : runtimeGlyphMarkers;
      var graceNoteGlyphs = getLetterTrackGraceNoteGlyphs(svg);
      var graceGlyphMarkers = graceNoteGlyphs.length > 0 ? runtimeGlyphMarkers : null;
      var letterCovers = [];
      var letterLabels = [];
      var playbackHighlightItems = [];
      var runtimeNoteLabelsById = getRuntimeMpnNoteLabelsById(noteGlyphs);
      var runtimeDegreePitchMap = getRuntimeMpnDegreePitchMap(noteGlyphs);
      noteGlyphs.forEach(function (glyph, index) {
        // 主音符优先走我们自己的 notation token -> 当前指法 scale 的链路。
        //
        // 原因：
        // - 快乐谱 runtime 里的 mpn.noteNumber 更接近固定播放绝对音高
        // - 切 fingering_index 时，图谱/字母谱语义会变，但播放绝对音高未必变
        // - 如果主音符优先读 noteNumber，字母谱就会被锁死在同一套绝对音名上
        //
        // 所以这里的优先级必须是：
        // 1. 我们自己的 glyph token 对位结果
        // 2. runtime 的 mpn label / marker 作为兜底
        var label = alignedGlyphTokens
          ? mapGlyphTokenToLetterLabel(alignedGlyphTokens[index])
          : null;

        if (!label && glyphMarkers) {
          label = mapGlyphMarkersToLetterLabel(glyph, glyphMarkers);
        }

        // 当 token 对位失败时，优先退回“当前 SVG 上可见的 degree / 升降号 / 高低音点”。
        //
        // 原因：
        // - 这些标记天然跟着当前 fingering / transposed SVG 一起变
        // - 而 runtime mpn.noteNumber 更像绝对播放音高
        // - 某些快乐谱歌（如 faded）在不同指法下 mpn 仍会给出同一套绝对音高，
        //   如果这里过早吃 mpn fallback，就会出现“切指法但字母谱不变”
        if (!label && runtimeGlyphMarkers) {
          label = mapGraceGlyphToRuntimeMpnLabel(glyph, runtimeGlyphMarkers, runtimeDegreePitchMap);
        }

        if (!label && glyph.id && runtimeNoteLabelsById) {
          label = runtimeNoteLabelsById[glyph.id];
        }

        if (!label) {
          return;
        }

        var cover = createSvgNode('rect');
        cover.setAttribute('data-vtabs-letter-track', 'cover');
        cover.setAttribute('x', String(glyph.x - 3));
        cover.setAttribute('y', String(glyph.y - 2));
        cover.setAttribute('width', String(Math.max(18, glyph.width + 6)));
        cover.setAttribute('height', String(Math.max(20, glyph.height + 4)));
        cover.setAttribute('rx', '3');
        cover.setAttribute('fill', '#ffffff');
        cover.setAttribute('fill-opacity', '0.98');
        letterCovers.push(cover);

        var text = createSvgNode('text');
        text.setAttribute('data-vtabs-letter-track', 'label');
        text.setAttribute('x', String(glyph.x + glyph.width / 2));
        text.setAttribute('y', String(glyph.y + glyph.height - 0.5));
        text.setAttribute('fill', '#7a5331');
        text.setAttribute('font-size', label === 'R' ? '15' : label.length >= 4 ? '11' : '13');
        // 字母谱字号策略故意保守：
        // - 优先不压到歌词和指法图
        // - 在不产生重叠的前提下尽量比原数字更易读
        // 后续如果某些长标签如 Eb5 / F#5 发生挤压，优先调这里，不要改原谱行距。
        text.setAttribute('font-weight', '700');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('paint-order', 'stroke fill');
        text.setAttribute('stroke', '#ffffff');
        text.setAttribute('stroke-width', '2.5');
        text.setAttribute('stroke-linejoin', 'round');
        text.textContent = label;
        letterLabels.push(text);

        if (glyph.id) {
          playbackHighlightItems.push({
            sourceNode: document.getElementById(glyph.id),
            coverNode: cover,
            labelNode: text
          });
        }
      });

      graceNoteGlyphs.forEach(function (glyph) {
        // 装饰音先保持旧链路：
        // 仅根据 SVG marker 做字母映射，避免影响现有线上歌的既有语义。
        // MusicXML 导歌 MVP 暂不把 grace-note 语义并入新的 mpn 推断链。
        var label = mapGlyphMarkersToLetterLabel(glyph, graceGlyphMarkers);
        if (!label) {
          return;
        }

        var cover = createSvgNode('rect');
        cover.setAttribute('data-vtabs-letter-track', 'cover');
        cover.setAttribute('x', String(glyph.x - 5));
        cover.setAttribute('y', String(glyph.y - 4));
        cover.setAttribute('width', String(Math.max(label.length >= 3 ? 20 : 17, glyph.width + 10)));
        cover.setAttribute('height', String(Math.max(25, glyph.height + 16)));
        cover.setAttribute('rx', '2');
        cover.setAttribute('fill', '#ffffff');
        cover.setAttribute('fill-opacity', '0.98');
        letterCovers.push(cover);

        var text = createSvgNode('text');
        text.setAttribute('data-vtabs-letter-track', 'label');
        text.setAttribute('data-vtabs-letter-track-kind', 'grace');
        text.setAttribute('x', String(glyph.x + glyph.width / 2));
        text.setAttribute('y', String(glyph.y + glyph.height + 1.5));
        text.setAttribute('fill', '#7a5331');
        text.setAttribute('font-size', label.length >= 3 ? '8' : '9');
        text.setAttribute('font-weight', '700');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('paint-order', 'stroke fill');
        text.setAttribute('stroke', '#ffffff');
        text.setAttribute('stroke-width', '2');
        text.setAttribute('stroke-linejoin', 'round');
        text.textContent = label;
        letterLabels.push(text);
      });

      letterCovers.forEach(function (cover) {
        layer.appendChild(cover);
      });
      letterLabels.forEach(function (text) {
        layer.appendChild(text);
      });

      installPublicPlaybackLetterHighlightSync(playbackHighlightItems);

      breathMarks.forEach(function (breath) {
        var mark = createSvgNode('text');
        mark.setAttribute('data-vtabs-letter-track', 'breath');
        mark.setAttribute('x', String(breath.x + 1));
        mark.setAttribute('y', String(breath.y - 11));
        mark.setAttribute('fill', '#7a5331');
        mark.setAttribute('font-size', '18');
        mark.setAttribute('font-style', 'italic');
        mark.setAttribute('font-weight', '700');
        mark.setAttribute('text-anchor', 'middle');
        mark.setAttribute('font-family', 'Arial, sans-serif');
        mark.textContent = ',';
        layer.appendChild(mark);
      });

      svg.appendChild(layer);
      setSheetPending(false);
      return true;
    }

    svg.appendChild(layer);
    setSheetPending(false);
    return true;
  }

${heightBridgeScript}
${bootstrapScript}
})();
</script>
`
}

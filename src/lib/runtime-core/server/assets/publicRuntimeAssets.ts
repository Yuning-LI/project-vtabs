import type { PublicRuntimeAssetProfileName } from '../../runtimeTypes.ts'

type PublicRuntimeAssetProfile = {
  disabledScriptAssets: readonly string[]
  reservedScriptAssets: readonly string[]
}

const PUBLIC_RUNTIME_STATIC_BASE_PATH = '/k-static/'
const PUBLIC_RUNTIME_COMPATIBILITY_ANCHOR_SCRIPT_ASSET = 'cdn/js/song_1f2ad3c3ba.js'
const PUBLIC_RUNTIME_COMPATIBILITY_SCRIPT_ATTRIBUTE = 'data-vtabs-runtime-public-compat'

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
const PUBLIC_RUNTIME_OPTIONAL_SCRIPT_ASSETS = [
  'lib/jqueryui/1.11.4/jquery-ui.min.js',
  'lib/materialize/0.97.5/js/materialize.min.js',
  'lib/soundmanager2/2.97a.20150601/script/soundmanager2-nodebug-jsmin.js',
  'lib/soundmanager2/2.97a.20150601/script/bar-ui.min.js',
  'lib/art-template/3.0.1/template.js',
  'lib/clipboard.js/1.5.12/clipboard.min.js',
  'cdn/js/i18n/all_2916f8e4dd.js',
  'cdn/js/microphone_7bba73959e.js',
  'cdn/js/chip_tag_4b7d8a0043.js',
  'cdn/js/chip_tag.song_f7c06ec607.js',
  'cdn/js/media_24bd4df64f.js',
  'cdn/js/user_favorite.kit_2cf017fc27.js',
  'cdn/js/diaohao_aab9dd0b9e.js',
  'cdn/js/cangqiang_f2fb865e71.js',
  'cdn/js/cangqiang.song_1ce5916de5.js'
] as const

const PUBLIC_RUNTIME_ASSET_PROFILES: Record<PublicRuntimeAssetProfileName, PublicRuntimeAssetProfile> = {
  'public-song': {
    disabledScriptAssets: PUBLIC_RUNTIME_OPTIONAL_SCRIPT_ASSETS,
    reservedScriptAssets: PUBLIC_RUNTIME_OPTIONAL_SCRIPT_ASSETS
  },
  'full-template': {
    disabledScriptAssets: [],
    reservedScriptAssets: PUBLIC_RUNTIME_OPTIONAL_SCRIPT_ASSETS
  }
}

const PUBLIC_RUNTIME_CRITICAL_SCRIPT_ASSETS = [
  'lib/jquery/1.8.3/jquery.min.js',
  'cdn/js/i18n_d3be79dfbd.js',
  'cdn/js/kit_9b7263d863.js',
  'cdn/js/dist/hc.min_1cfae5fe62.js',
  'cdn/js/song_builder_a87186a4c4.js',
  'cdn/js/song_1f2ad3c3ba.js'
] as const

export function applyPublicRuntimeAssetProfile(
  html: string,
  profileName: PublicRuntimeAssetProfileName
) {
  const profile = PUBLIC_RUNTIME_ASSET_PROFILES[profileName]
  if (!profile || profile.disabledScriptAssets.length === 0) {
    return html
  }

  return profile.disabledScriptAssets.reduce((nextHtml, assetPath) => {
    const publicPath = buildPublicRuntimeStaticPath(assetPath)
    return nextHtml.replace(buildExternalScriptTagPattern(publicPath), '')
  }, injectPublicRuntimeCompatibilityScript(html, profileName))
}

export function buildRuntimeCriticalPreloads(profileName: PublicRuntimeAssetProfileName) {
  if (profileName !== 'public-song') {
    return ''
  }

  return PUBLIC_RUNTIME_CRITICAL_SCRIPT_ASSETS.map(
    assetPath => `<link rel="preload" href="${buildPublicRuntimeStaticPath(assetPath)}" as="script" />`
  ).join('')
}

function buildPublicRuntimeStaticPath(assetPath: string) {
  return `${PUBLIC_RUNTIME_STATIC_BASE_PATH}${assetPath.replace(/^\/+/, '')}`
}

function buildExternalScriptTagPattern(src: string, flags = 'g') {
  return new RegExp(`\\s*<script[^>]+src="${escapeRegExp(src)}"[^>]*><\\/script>\\s*`, flags)
}

function injectPublicRuntimeCompatibilityScript(
  html: string,
  profileName: PublicRuntimeAssetProfileName
) {
  if (profileName !== 'public-song') {
    return html
  }

  return html.replace(
    buildExternalScriptTagCapturePattern(
      buildPublicRuntimeStaticPath(PUBLIC_RUNTIME_COMPATIBILITY_ANCHOR_SCRIPT_ASSET),
      'i'
    ),
    `${buildPublicRuntimeCompatibilityScript()}$1`
  )
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
function buildPublicRuntimeCompatibilityScript() {
  return `<script ${PUBLIC_RUNTIME_COMPATIBILITY_SCRIPT_ATTRIBUTE}>
    (function () {
      var win = window;

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function getRuntimeQueryPrototype() {
        var candidates = [win.jQuery, win.$];
        for (var index = 0; index < candidates.length; index += 1) {
          var candidate = candidates[index];
          if (candidate && candidate.fn) {
            return candidate.fn;
          }
        }
        return null;
      }

      function noop() {}

      if (!win.initMetronome) {
        win.initMetronome = noop;
      }

      if (!win.Media) {
        win.Media = {
          generateHtml: function () {
            return '';
          }
        };
      }

      if (!win.ChipTag) {
        win.ChipTag = {};
      }
      if (!win.ChipTag.song) {
        win.ChipTag.song = {
          strToChipHtml: function () {
            return '';
          }
        };
      }

      if (!win.MidiContext) {
        win.MidiContext = {
          tick: noop,
          getAudioContext: function () {
            return null;
          }
        };
      }

      if (!win.MidiPlayer) {
        win.MidiPlayer = function () {};
      }
      if (!win.MidiPlayer.prototype.setContext) {
        win.MidiPlayer.prototype.setContext = noop;
      }
      if (!win.MidiPlayer.prototype.refresh) {
        win.MidiPlayer.prototype.refresh = noop;
      }

      if (!win.WebAudioScheduler) {
        win.WebAudioScheduler = function () {};
      }

      if (!win.MicroPhone) {
        win.MicroPhone = {
          gainNode: null,
          init: noop,
          setGain: noop,
          isBrowserSupport: function () {
            return false;
          }
        };
      } else if (!win.MicroPhone.isBrowserSupport) {
        win.MicroPhone.isBrowserSupport = function () {
          return false;
        };
      }

      win.Clipboard = function ClipboardStub() {
        return {
          on: noop
        };
      };

      if (!win.template) {
        win.template = function (id, data) {
          if (id === 'option-tpl') {
            var optionValue = data && data.value != null ? escapeHtml(data.value) : '';
            var optionName = data && data.name != null ? escapeHtml(data.name) : '';
            var selected = data && data.selected ? ' selected' : '';
            return '<option value="' + optionValue + '"' + selected + '>' + optionName + '</option>';
          }
          return '';
        };
      }

      if (!win.Materialize) {
        win.Materialize = {
          toast: noop
        };
      }

      if (!win.soundManager) {
        win.soundManager = {
          setup: function () {
            return this;
          },
          createSound: function () {
            return {
              play: noop,
              pause: noop,
              stop: noop
            };
          },
          onready: function (callback) {
            if (typeof callback === 'function') {
              callback();
            }
          },
          stopAll: noop,
          pauseAll: noop,
          resumeAll: noop,
          destroySound: noop,
          getSoundById: function () {
            return null;
          },
          setVolume: noop
        };
      }

      var queryPrototype = getRuntimeQueryPrototype();
      if (queryPrototype) {
        ['openModal', 'closeModal', 'materialbox', 'material_select', 'leanModal'].forEach(
          function (method) {
            if (!queryPrototype[method]) {
              queryPrototype[method] = function () {
                return this;
              };
            }
          }
        );
      }
    })();
  </script>`
}

function buildExternalScriptTagCapturePattern(src: string, flags = '') {
  return new RegExp(`(<script[^>]+src="${escapeRegExp(src)}"[^>]*><\\/script>)`, flags)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

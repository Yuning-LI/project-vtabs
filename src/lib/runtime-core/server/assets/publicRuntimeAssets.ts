type PublicRuntimeAssetProfileName = 'public-song' | 'full-template'

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
const PUBLIC_RUNTIME_RESERVED_SCRIPT_ASSETS = [
  'lib/jqueryui/1.11.4/jquery-ui.min.js',
  'lib/materialize/0.97.5/js/materialize.min.js',
  'lib/soundmanager2/2.97a.20150601/script/soundmanager2-nodebug-jsmin.js',
  'lib/soundmanager2/2.97a.20150601/script/bar-ui.min.js',
  'lib/art-template/3.0.1/template.js',
  'lib/clipboard.js/1.5.12/clipboard.min.js',
  'cdn/js/i18n/all_2916f8e4dd.js',
  'cdn/js/lib/web-audio-scheduler_1823326334.js',
  'cdn/js/metronome_7124fad0b0.js',
  'cdn/js/microphone_7bba73959e.js',
  'cdn/js/chip_tag_4b7d8a0043.js',
  'cdn/js/chip_tag.song_f7c06ec607.js',
  'cdn/js/media_24bd4df64f.js',
  'cdn/js/user_favorite.kit_2cf017fc27.js',
  'cdn/js/midi_context_dea7103763.js',
  'cdn/js/midi_number_659c66b334.js',
  'cdn/js/midi_soundfont_fb98b7a74c.js',
  'cdn/js/midi_player_62c3ad29f7.js',
  'cdn/js/countdown_852b2933cb.js',
  'cdn/js/diaohao_aab9dd0b9e.js',
  'cdn/js/cangqiang_f2fb865e71.js',
  'cdn/js/cangqiang.song_1ce5916de5.js'
] as const

const PUBLIC_RUNTIME_ASSET_PROFILES: Record<
  PublicRuntimeAssetProfileName,
  {
    disabledScriptAssets: readonly string[]
    reservedScriptAssets: readonly string[]
  }
> = {
  'public-song': {
    disabledScriptAssets: PUBLIC_RUNTIME_RESERVED_SCRIPT_ASSETS,
    reservedScriptAssets: PUBLIC_RUNTIME_RESERVED_SCRIPT_ASSETS
  },
  'full-template': {
    disabledScriptAssets: [],
    reservedScriptAssets: PUBLIC_RUNTIME_RESERVED_SCRIPT_ASSETS
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
    const publicPath = `/k-static/${assetPath}`
    return nextHtml.replace(buildExternalScriptTagPattern(publicPath), '')
  }, injectPublicRuntimeCompatibilityScript(html, profileName))
}

export function buildRuntimeCriticalPreloads(profileName: PublicRuntimeAssetProfileName) {
  if (profileName !== 'public-song') {
    return ''
  }

  return PUBLIC_RUNTIME_CRITICAL_SCRIPT_ASSETS.map(
    assetPath => `<link rel="preload" href="/k-static/${assetPath}" as="script" />`
  ).join('')
}

function buildExternalScriptTagPattern(src: string) {
  return new RegExp(`\\s*<script[^>]+src="${escapeRegExp(src)}"[^>]*><\\/script>\\s*`, 'g')
}

function injectPublicRuntimeCompatibilityScript(
  html: string,
  profileName: PublicRuntimeAssetProfileName
) {
  if (profileName !== 'public-song') {
    return html
  }

  return html.replace(
    /(<script[^>]+src="\/k-static\/cdn\/js\/song_1f2ad3c3ba\.js"[^>]*><\/script>)/i,
    `${buildPublicRuntimeCompatibilityScript()}$1`
  )
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
function buildPublicRuntimeCompatibilityScript() {
  return `<script data-vtabs-runtime-public-compat>
    (function () {
      var win = window;
      var $ = win.jQuery || win.$;

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      if (!win.initMetronome) {
        win.initMetronome = function () {};
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
          tick: function () {},
          getAudioContext: function () {
            return null;
          }
        };
      }

      if (!win.MidiPlayer) {
        win.MidiPlayer = function () {};
      }
      if (!win.MidiPlayer.prototype.setContext) {
        win.MidiPlayer.prototype.setContext = function () {};
      }
      if (!win.MidiPlayer.prototype.refresh) {
        win.MidiPlayer.prototype.refresh = function () {};
      }

      if (!win.WebAudioScheduler) {
        win.WebAudioScheduler = function () {};
      }

      if (!win.MicroPhone) {
        win.MicroPhone = {
          gainNode: null,
          init: function () {},
          setGain: function () {},
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
          on: function () {}
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
          toast: function () {}
        };
      }

      if (!win.soundManager) {
        win.soundManager = {
          setup: function () {
            return this;
          },
          createSound: function () {
            return {
              play: function () {},
              pause: function () {},
              stop: function () {}
            };
          },
          onready: function (callback) {
            if (typeof callback === 'function') {
              callback();
            }
          },
          stopAll: function () {},
          pauseAll: function () {},
          resumeAll: function () {},
          destroySound: function () {},
          getSoundById: function () {
            return null;
          },
          setVolume: function () {}
        };
      }

      if ($ && $.fn) {
        ['openModal', 'closeModal', 'materialbox', 'material_select', 'leanModal'].forEach(
          function (method) {
            if (!$.fn[method]) {
              $.fn[method] = function () {
                return this;
              };
            }
          }
        );
      }
    })();
  </script>`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

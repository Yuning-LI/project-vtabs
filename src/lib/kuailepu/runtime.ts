import fs from 'node:fs'
import path from 'node:path'
import {
  extractKuailepuEnglishText,
  getKuailepuEnglishTitle,
  translateKuailepuCommonText,
  translateKuailepuFingeringName,
  translateKuailepuGraphName,
  translateKuailepuInstrumentName,
  translateKuailepuPersonName
} from '../songbook/kuailepuEnglish'
import { resolveKuailepuRuntimeArchivePath } from './archiveFiles'
import { resolveKuailepuRuntimeSongPath } from './sourceFiles'

/**
 * 这里定义的是“站点外壳传给快乐谱兼容 runtime 的状态”。
 *
 * 注意它不是我们站点原本的 SongDoc UI 状态，而是快乐谱原始前端能理解的上下文字段。
 * 例如：
 * - `instrument`
 * - `fingering`
 * - `fingering_index`
 * - `show_graph`
 *
 * 这些字段最终会直接进入 `Kit.context.setContext(...)`，然后由快乐谱原始
 * `Song.draw -> Song.compile -> hc.parse -> renderSheet` 链条继续消费。
 *
 * 这也是当前维护时最重要的边界之一：
 * - 不要把 HC 理解成“只负责最后吐 SVG 的 renderer”
 * - 历史公开版里，`hc` 主文件本身就承担 parser / lexer / layout / render 主链
 * - 历史 `hc.kit` 还承担过 MIDI / harmonizer / chord / instrument / fingering 支撑职责
 *
 * 所以后面如果继续收缩公开页脚本集，是否能默认停用某个旧模块，
 * 应该先沿着这条主链判断，而不是只看文件名猜它是不是“非核心 UI 脚本”。
 */
export type KuailepuRuntimeState = {
  instrument?: string | null
  fingering?: string | null
  fingering_index?: string | number | null
  show_graph?: string | null
  show_lyric?: string | null
  show_measure_num?: string | null
  measure_layout?: string | null
  sheet_scale?: string | number | null
  note_label_mode?: string | null
}

export type KuailepuLetterTrackMode = 'number' | 'letter' | 'graph'

type KuailepuLetterTrackData = {
  mode: KuailepuLetterTrackMode
  anchorLabels: string[] | null
  glyphLabels: string[] | null
  glyphTokens: string[] | null
  scale:
    | Array<{
        accidental: number
        letter: string
        octave: number
      }>
    | null
}

type KuailepuRuntimePayload = Record<string, unknown> & {
  song_name?: string
  alias_name?: string
  song_pinyin?: string
  lyric?: unknown
  lyric_text?: unknown
  music_composer?: string
  lyric_composer?: string
  composer?: string
  lyricist?: string
  arranger?: string
  player?: string
  author?: string
  nickname?: string
  title?: string
  subtitle?: string
  instrument?: string
  fingering?: string
  fingering_index?: string | number | null
  show_graph?: string
  show_lyric?: string
  show_measure_num?: string
  measure_layout?: string
  sheet_scale?: string | number | null
  sheetScaleList?: number[]
  instrumentFingerings?: Array<{
    instrument: string
    instrumentName?: string
    fingeringsList?: Array<
      Array<{
        fingering: string
        fingeringName?: string
        tonalityName?: string
        match?: number
      }>
    >
    fingeringSetList?: Array<
      Array<{
        fingering: string
        fingeringName?: string
        tonalityName?: string
        match?: number
      }>
    >
    graphList?: Array<{
      name?: string
      value?: string
    }>
  }>
}

type KuailepuRuntimeTextMode = 'source' | 'english'
type KuailepuRuntimeAssetProfileName = 'public-song' | 'full-template'

let cachedTemplateHtml: string | null = null

/**
 * 公开 song page 现在不再默认把快乐谱模板里的所有历史脚本一股脑注入。
 *
 * 但这里的策略不是“把旧文件从仓库里删掉”，而是：
 * - 公开详情页默认只加载当前验证过的最小必需集
 * - 登录 / 播放 / 收藏 / 节拍器等未来可能恢复的脚本继续保留在本地快照里
 * - 如果以后要恢复这些功能，优先调整 asset profile，而不是重新回源抓线上资源
 *
 * 这样做的目标是同时满足两件事：
 * 1. 当前公开页少加载一批不会触发的旧模块
 * 2. 未来恢复功能时，仓库内仍有明确的资产和恢复路径
 *
 * 截至 2026-04-02 当前建议先停在这版：
 * - `public-song` 默认 6 个脚本
 * - `full-template` 作为恢复入口
 *
 * 不建议继续无限扩张这层 profile / stub，把越来越多模板行为都手工接管。
 * 如果未来再继续减载，优先先看收益是否真的明显，再决定是否值得增加维护复杂度。
 */
const PUBLIC_RUNTIME_RESERVED_SCRIPT_ASSETS = [
  'lib/jqueryui/1.11.4/jquery-ui.min.js',
  'lib/materialize/0.97.5/js/materialize.min.js',
  'lib/soundmanager2/2.97a.20150601/script/soundmanager2-nodebug-jsmin.js',
  'lib/soundmanager2/2.97a.20150601/script/bar-ui.min.js',
  'lib/art-template/3.0.1/template.js',
  'lib/clipboard.js/1.5.12/clipboard.min.js',
  'cdn/js/i18n/all_09a443f1a6.js',
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

const KUAILEPU_RUNTIME_ASSET_PROFILES: Record<
  KuailepuRuntimeAssetProfileName,
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

/**
 * 读取公开 runtime 所需的完整快乐谱 raw JSON。
 *
 * 读取顺序：
 * 1. `data/kuailepu-runtime/<slug>.json`（生产可部署）
 * 2. `reference/songs/<slug>.json`（本地导歌 / 调试 fallback）
 *
 * 它不是站点公开用的轻量 SongDoc，而是当前快乐谱兼容 runtime 的真相源。
 */
export function loadKuailepuSongPayload(songId: string) {
  const filePath = resolveKuailepuRuntimeSongPath(songId)
  if (!filePath || !fs.existsSync(filePath)) {
    return null
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as KuailepuRuntimePayload
}

export function buildKuailepuRuntimeHtml(input: {
  songId: string
  payload: KuailepuRuntimePayload
  state?: KuailepuRuntimeState | null
  letterTrack?: KuailepuLetterTrackData | null
  textMode?: KuailepuRuntimeTextMode | null
  assetProfile?: KuailepuRuntimeAssetProfileName | null
  preferredEnglishTitle?: string | null
  preferredEnglishSubtitle?: string | null
}) {
  const { songId } = input
  const payload = applyRuntimeDefaults(
    localizeRuntimePayload(input.payload, {
      mode: input.textMode ?? 'source',
      preferredTitle: input.preferredEnglishTitle ?? null,
      preferredSubtitle: input.preferredEnglishSubtitle ?? null
    }),
    input.state ?? null
  )
  const letterTrack = input.letterTrack ?? null
  const assetProfile = input.assetProfile ?? 'public-song'
  const pageTitle = [payload.song_name, payload.alias_name].filter(Boolean).join(' - ') || songId
  const safePayload = serializeForInlineScript(payload)
  const template = getKuailepuHtmlTemplate()

  /**
   * 这一步不是“重写快乐谱页面”，而是在一份保存下来的快乐谱原始 HTML 模板上做最小替换：
   * 1. 替换 `<title>`
   * 2. 把原页面里的 `Kit.context.setContext("压缩串")` 改成我们自己的 raw JSON 对象
   * 3. 把所有 `/static/...` 资源改到本地代理 `/k-static/...`
   * 4. 注入一层覆盖样式，隐藏快乐谱原页面里对我们站点没意义的外壳
   * 5. 注入桥接脚本，把 iframe 内部真实谱面高度发回宿主页面
   * 6. 按公开页 asset profile 停用当前不会触发、但未来可能恢复的旧模块脚本
   */
  return applyKuailepuRuntimeAssetProfile(
    template
      .replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(pageTitle)} - Kuailepu Runtime Preview</title>`
      )
      .replace(
        /(<script type="text\/javascript">\s*)var context = Kit\.context\.setContext\([\s\S]*?\);\s*(<\/script>)/i,
        `$1var context = Kit.context.setContext(${safePayload});$2`
      )
      .replace(/(href|src)="\/static\/(?!\/)/g, '$1="/k-static/')
      .replace(
        /<\/head>/i,
        `${buildRuntimeOverrideStyle()}${buildRuntimePendingScript(letterTrack)}</head>`
      )
      .replace(
        /<\/body>/i,
        `${buildRuntimeBridgeScript(songId, letterTrack, input.textMode ?? 'source')}</body>`
      ),
    assetProfile
  )
}

export function buildKuailepuLetterTrackData(input: {
  notation?: string[] | null
  key?: string | null
  mode?: string | null
}): KuailepuLetterTrackData {
  const mode = normalizeNoteLabelMode(input.mode)
  if (mode === 'number' || mode === 'graph') {
    return {
      mode,
      anchorLabels: null,
      glyphLabels: null,
      glyphTokens: null,
      scale: null
    }
  }

  const scale = buildMajorScaleNoteNames(parseScaleTonic(input.key))
  const anchorTokens = extractCompactNotationNoteTokens(input.notation, {
    includeRest: false
  })
  const glyphTokens = extractCompactNotationNoteTokens(input.notation, {
    includeRest: true
  })
  if (!scale || glyphTokens.length === 0) {
    return {
      mode,
      anchorLabels: null,
      glyphLabels: null,
      glyphTokens: null,
      scale: null
    }
  }

  const anchorLabels = anchorTokens
    .map(token => mapCompactNotationTokenToLetterLabel(token, scale))
    .filter((label): label is string => Boolean(label))
  const glyphLabels = glyphTokens
    .map(token => mapCompactNotationTokenToLetterLabel(token, scale))
    .filter((label): label is string => Boolean(label))

  return {
    mode,
    anchorLabels: anchorLabels.length > 0 ? anchorLabels : null,
    glyphLabels: glyphLabels.length > 0 ? glyphLabels : null,
    glyphTokens: glyphTokens.length > 0 ? glyphTokens : null,
    scale
  }
}

/**
 * 注意：runtime HTML 模板来自一份已归档的快乐谱详情页源码。
 *
 * 当前生产优先读取：
 * - `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
 *
 * 本地仍允许 fallback 到：
 * - `reference/快乐谱代码.txt`
 *
 * 这份归档承载着：
 * - 快乐谱详情页 HTML 模板
 * - 原始脚本入口
 * - 原始资源引用路径
 *
 * 如果它被替换、删减、或者与线上结构严重漂移，runtime 兼容层就会一起失效。
 */
function getKuailepuHtmlTemplate() {
  if (cachedTemplateHtml) {
    return cachedTemplateHtml
  }

  const sourcePath = resolveKuailepuRuntimeArchivePath()
  if (!sourcePath) {
    throw new Error(
      'Missing deployable Kuailepu runtime archive. Expected vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt or local reference fallback.'
    )
  }
  const sourceText = fs.readFileSync(sourcePath, 'utf8')
  const fileMap = parseMarkedFiles(sourceText)
  const html = fileMap.get('qyiBa1mPa.html')

  if (!html) {
    throw new Error(`Missing qyiBa1mPa.html in ${path.relative(process.cwd(), sourcePath)}`)
  }

  cachedTemplateHtml = html
  return html
}

/**
 * `reference/快乐谱代码.txt` 是一个“多文件拼接存档”。
 *
 * 格式类似：
 * 文件：qyiBa1mPa.html
 * ...html 内容...
 * 文件：kit_9b7263d863.js
 * ...js 内容...
 *
 * 这里把它拆回 `Map<filename, content>`，方便后续抽取 HTML 模板或定位原始源码。
 */
function parseMarkedFiles(sourceText: string) {
  const marker = /^文件：(.+)$/gm
  const files = new Map<string, string>()
  const matches = Array.from(sourceText.matchAll(marker))

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index]
    const next = matches[index + 1]
    const filename = current[1]?.trim()
    const start = current.index! + current[0].length + 1
    const end = next?.index ?? sourceText.length

    if (!filename) continue
    files.set(filename, sourceText.slice(start, end).trim())
  }

  return files
}

function applyKuailepuRuntimeAssetProfile(
  html: string,
  profileName: KuailepuRuntimeAssetProfileName
) {
  const profile = KUAILEPU_RUNTIME_ASSET_PROFILES[profileName]
  if (!profile || profile.disabledScriptAssets.length === 0) {
    return html
  }

  return profile.disabledScriptAssets.reduce((nextHtml, assetPath) => {
    const publicPath = `/k-static/${assetPath}`
    return nextHtml.replace(buildExternalScriptTagPattern(publicPath), '')
  }, injectKuailepuRuntimeCompatibilityScript(html, profileName))
}

function buildExternalScriptTagPattern(src: string) {
  return new RegExp(`\\s*<script[^>]+src="${escapeRegExp(src)}"[^>]*><\\/script>\\s*`, 'g')
}

function injectKuailepuRuntimeCompatibilityScript(
  html: string,
  profileName: KuailepuRuntimeAssetProfileName
) {
  if (profileName !== 'public-song') {
    return html
  }

  return html.replace(
    /(<script[^>]+src="\/k-static\/cdn\/js\/song_1f2ad3c3ba\.js"[^>]*><\/script>)/i,
    `${buildPublicRuntimeCompatibilityScript()}$1`
  )
}

function buildPublicRuntimeCompatibilityScript() {
  /**
   * 这层 stub 不是为了“重写快乐谱所有旧模块”，而只是为了让公开 song page
   * 在默认停用一批历史脚本后，仍能稳定走完：
   *
   * `Kit.context -> Song.draw/compile -> hc.parse -> final SVG`
   *
   * 当前这层已经足够支撑 `public-song` 默认 6 个脚本的公开模式。
   * 后续如果某个新优化要继续往这里堆很多兼容逻辑，先重新评估收益，
   * 不要把它继续演变成一个越来越难维护的“半套快乐谱 runtime 模拟器”。
   */
  return `<script data-kuailepu-runtime-public-compat>
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

function applyRuntimeDefaults(
  payload: KuailepuRuntimePayload,
  state: KuailepuRuntimeState | null
) {
  /**
   * 这一步非常关键。
   *
   * 快乐谱 raw JSON 里经常会出现：
   * - `instrument: "none"`
   * - `fingering: ""`
   * 也就是说，原始快照里并不一定已经保存了“用户最后选择的乐器与指法”。
   *
   * 如果我们把这种空值直接丢给 runtime，虽然页面能跑，但默认乐器/指法不稳定，
   * 最终 SVG 也可能偏离线上用户实际看到的状态。
   *
   * 所以这里的策略是：
   * - 优先使用外层显式传入的 state
   * - 其次使用 raw JSON 自带的值
   * - 再次从 `instrumentFingerings` 中挑一个可用默认值
   * - 当前产品场景优先落到 `o12`，因为这是当前站点对标的主乐器
   */
  const next: KuailepuRuntimePayload & KuailepuRuntimeState = {
    ...payload
  }

  const instrumentOptions = (payload.instrumentFingerings ?? []).filter(
    option => option.instrument && option.instrument !== 'none'
  )
  const hasExplicitInstrumentOverride =
    Boolean(state?.instrument) &&
    state?.instrument !== 'none' &&
    state?.instrument !== payload.instrument
  const selectedInstrument =
    instrumentOptions.find(option => option.instrument === state?.instrument) ??
    instrumentOptions.find(option => option.instrument === payload.instrument) ??
    instrumentOptions.find(option => option.instrument === 'o12') ??
    instrumentOptions.find(option => option.instrument === 'o6') ??
    instrumentOptions[0]
  const selectedFingeringIndex =
    hasExplicitInstrumentOverride
      ? state?.fingering_index ?? 0
      : state?.fingering_index ??
        payload.fingering_index ??
        0
  const selectedFingeringSet =
    selectedInstrument?.fingeringSetList?.[Number(selectedFingeringIndex)]

  const selectedFingeringCandidates = hasExplicitInstrumentOverride
    ? [
        state?.fingering,
        selectedFingeringSet?.map(option => option.fingering).join('+'),
        selectedInstrument?.fingeringSetList?.[0]?.[0]?.fingering,
        selectedInstrument?.fingeringSetList?.flat()[0]?.fingering,
        payload.fingering
      ]
    : [
        state?.fingering,
        payload.fingering,
        selectedFingeringSet?.map(option => option.fingering).join('+'),
        selectedInstrument?.fingeringSetList?.[0]?.[0]?.fingering,
        selectedInstrument?.fingeringSetList?.flat()[0]?.fingering
      ]
  const selectedFingering =
    selectedFingeringCandidates.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0
    ) ?? ''

  next.instrument = state?.instrument ?? payload.instrument
  if (!next.instrument || next.instrument === 'none') {
    next.instrument = selectedInstrument?.instrument ?? 'none'
  }

  next.fingering = selectedFingering
  next.fingering_index = selectedFingeringIndex
  const selectedGraphValue =
    selectedInstrument?.graphList?.find(item => item.value?.trim())?.value ?? null
  next.show_graph = hasExplicitInstrumentOverride
    ? state?.show_graph ?? selectedGraphValue ?? normalizeToggle(undefined, payload.show_graph, '1')
    : normalizeToggle(state?.show_graph, payload.show_graph, '1')
  /**
   * 这里新增了一条和产品语言策略直接相关的规则：
   *
   * - 如果快乐谱只收录了纯中文歌词，而没有英文歌词
   * - 当前英文站默认不要把中文歌词轨直接展示给用户
   *
   * 原因不是 runtime 渲染不了，而是产品层面的语言选择：
   * 当前站点面向 western 用户，宁可先展示“纯谱面 + 指法图”，也不要默认挂一条
   * 对目标用户几乎不可读的中文歌词轨。
   *
   * 这条规则只影响“默认值”：
   * - 外层如果显式传了 `state.show_lyric`，仍然以显式值为准
   * - 如果未来导入到了真正英文歌词版 raw JSON，这个检测会自然放行歌词轨
   */
  next.show_lyric =
    state?.show_lyric !== undefined && state?.show_lyric !== null && state?.show_lyric !== ''
      ? state.show_lyric
      : shouldHideLyricTrackByDefault(payload)
        ? 'off'
        : normalizeToggle(undefined, payload.show_lyric, 'on')
  next.show_measure_num = normalizeToggle(
    state?.show_measure_num,
    payload.show_measure_num,
    'off'
  )
  next.measure_layout = state?.measure_layout ?? payload.measure_layout ?? 'compact'
  next.no_check_href = true
  next.no_preference_instrument = true
  next.preference_instrument = next.instrument
  next.sheet_scale =
    state?.sheet_scale ??
    payload.sheet_scale ??
    (Array.isArray(payload.sheetScaleList) && payload.sheetScaleList.includes(10)
      ? 10
      : payload.sheetScaleList?.[payload.sheetScaleList.length - 1] ?? 10)

  return next
}

function localizeRuntimePayload(
  payload: KuailepuRuntimePayload,
  options: {
    mode: KuailepuRuntimeTextMode
    preferredTitle?: string | null
    preferredSubtitle?: string | null
  }
) {
  if (options.mode !== 'english') {
    return payload
  }

  const englishTitle = getKuailepuEnglishTitle(payload)
  const localized: KuailepuRuntimePayload = {
    ...payload,
    song_name:
      options.preferredTitle?.trim() ||
      englishTitle.title?.trim() ||
      payload.song_name,
    alias_name:
      normalizeLocalizedText(
        options.preferredSubtitle ??
          englishTitle.subtitle ??
          translateNonLatinText(payload.alias_name)
      ) ?? '',
    title:
      normalizeLocalizedText(
        options.preferredTitle ??
          englishTitle.title ??
          translateNonLatinText(payload.title)
      ) ?? payload.title,
    subtitle:
      normalizeLocalizedText(
        options.preferredSubtitle ??
          englishTitle.subtitle ??
          translateNonLatinText(payload.subtitle)
      ) ?? '',
    music_composer:
      normalizeLocalizedText(translateKuailepuPersonName(payload.music_composer)) ?? undefined,
    lyric_composer:
      normalizeLocalizedText(translateKuailepuPersonName(payload.lyric_composer)) ?? undefined,
    composer: normalizeLocalizedText(translateKuailepuPersonName(payload.composer)) ?? undefined,
    lyricist: normalizeLocalizedText(translateKuailepuPersonName(payload.lyricist)) ?? undefined,
    arranger: normalizeLocalizedText(translateKuailepuPersonName(payload.arranger)) ?? undefined,
    player: normalizeLocalizedText(translateKuailepuPersonName(payload.player)) ?? undefined,
    author: normalizeLocalizedText(translateKuailepuPersonName(payload.author)) ?? undefined,
    nickname: normalizeLocalizedText(translateKuailepuPersonName(payload.nickname)) ?? undefined
  }

  localized.instrumentFingerings = payload.instrumentFingerings?.map(option => ({
    ...option,
    instrumentName:
      normalizeLocalizedText(
        translateKuailepuInstrumentName(sanitizeInstrumentLabel(option.instrumentName))
      ) ?? option.instrumentName,
    fingeringsList: option.fingeringsList?.map(group =>
      group.map(item => ({
        ...item,
        fingeringName:
          normalizeLocalizedText(translateKuailepuFingeringName(item.fingeringName)) ??
          item.fingeringName
      }))
    ),
    fingeringSetList: option.fingeringSetList?.map(group =>
      group.map(item => ({
        ...item,
        fingeringName:
          normalizeLocalizedText(translateKuailepuFingeringName(item.fingeringName)) ??
          item.fingeringName
      }))
    ),
    graphList: option.graphList?.map(item => ({
      ...item,
      name:
        normalizeLocalizedText(
          translateKuailepuGraphName(item.name?.replace(/\s+/g, '') ?? item.name)
        ) ?? item.name
    }))
  }))

  return localized
}

function sanitizeInstrumentLabel(value: string | null | undefined) {
  if (!value) {
    return value
  }

  return value.replace(/[（）()]/g, '').replace(/\s+/g, '')
}

function translateNonLatinText(value: string | null | undefined) {
  if (!value) {
    return value ?? null
  }

  const extractedEnglish = extractKuailepuEnglishText(value)
  if (extractedEnglish && /[A-Za-z]/.test(extractedEnglish)) {
    return extractedEnglish
  }

  const translatedCommonText = translateKuailepuCommonText(value)
  if (translatedCommonText) {
    return translatedCommonText
  }

  const translatedPersonName = translateKuailepuPersonName(value)
  if (translatedPersonName && /[A-Za-z]/.test(translatedPersonName)) {
    return translatedPersonName
  }

  return null
}

function normalizeLocalizedText(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const text = normalizeLocalizedPunctuation(value)
  if (!text) {
    return null
  }

  return /[\u3400-\u9fff]/.test(text) && !/[A-Za-z]/.test(text) ? null : text
}

/**
 * 这层只服务“英文公开 runtime 输出”，不改 raw JSON 真相源本身。
 *
 * 当前已知必要性：
 * - 快乐谱不少人名 / 副标题 / 说明字段即使被翻成英文，仍会残留全角中文标点
 * - 这些字符在公开页上会直接可见，例如 `Herbert Hughes ，Benjamin Britten`
 *
 * 所以这里统一做一层轻量规范化：
 * - 全角标点转成 ASCII 标点
 * - 顺手收敛标点前后的多余空格
 *
 * 不要把它扩张成“任意改写文本内容”的大翻译器。
 * 它的边界仍然只是英文公开页的排版净化。
 */
function normalizeLocalizedPunctuation(value: string) {
  return value
    .replace(/\u3000/g, ' ')
    .replace(/[，、]/g, ', ')
    .replace(/；/g, '; ')
    .replace(/：/g, ': ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/！/g, '!')
    .replace(/？/g, '?')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s+([)\]}])/g, '$1')
    .replace(/([,.;:!?])(?=[A-Za-z0-9(])/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * 快乐谱原前端把很多“开关”都保存成字符串：
 * - `on`
 * - `off`
 * - `1`
 * - 空字符串
 *
 * 这里统一做一次“优先值 -> 回退值 -> 最终默认值”的整理，避免空字符串把真正默认值吞掉。
 */
function normalizeToggle(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
  defaultValue: string
) {
  if (preferred !== undefined && preferred !== null && preferred !== '') {
    return preferred
  }
  if (fallback !== undefined && fallback !== null && fallback !== '') {
    return fallback
  }
  return defaultValue
}

/**
 * 当前英文站的歌词策略：
 *
 * 1. 导入快乐谱时优先寻找英文歌词版本
 * 2. 如果快乐谱只有中文歌词版本，就默认关闭歌词轨
 *
 * 这里只做一个很保守的检测：
 * - 只要歌词里出现中文且完全没有拉丁字母，就视为“纯中文歌词”
 * - 一旦存在英文字符，就先不在这里武断关闭，留给页面继续展示
 *
 * 这样至少能稳定覆盖当前已发现的几首：
 * - twinkle-twinkle-little-star
 * - mary-had-a-little-lamb
 * - happy-birthday-to-you
 * 以及后续导入到的同类曲目。
 */
function shouldHideLyricTrackByDefault(payload: KuailepuRuntimePayload) {
  const lyricText = extractPayloadLyricText(payload)
  if (!lyricText) {
    return false
  }

  const hasCjk = /[\u3400-\u9fff]/.test(lyricText)
  const hasLatin = /[A-Za-z]/.test(lyricText)
  return hasCjk && !hasLatin
}

function extractPayloadLyricText(payload: KuailepuRuntimePayload) {
  const candidates = [payload.lyric_text, payload.lyric]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
    if (Array.isArray(candidate)) {
      const text = candidate.filter(Boolean).join('\n').trim()
      if (text) {
        return text
      }
    }
  }

  return ''
}

/**
 * raw JSON 最终会被直接塞进内联 `<script>`。
 *
 * 这里显式替换 `< > &` 和两个特殊换行分隔字符，是为了避免：
 * - 意外提前结束 script 标签
 * - 浏览器对 U+2028 / U+2029 的脚本解析问题
 */
function serializeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
function buildRuntimeOverrideStyle() {
  return `
<style data-kuailepu-runtime-override>
html,
body {
  margin: 0 !important;
  padding: 0 !important;
  background: #f6f6f2 !important;
  overflow-x: hidden !important;
  overflow-y: hidden !important;
}

body {
  min-height: 100vh;
}

#header,
#foot,
#menu-modal,
#diaohao-modal,
#play-modal,
#metronome-modal,
#preload,
.lean-overlay,
.modal,
.count-down-area,
.fab-wrapper,
#comment-wrapper,
#tags-wrapper,
#media-wrapper {
  display: none !important;
}

.flex-body {
  display: block !important;
  min-height: 0 !important;
}

#sheet {
  display: block !important;
  width: 100% !important;
  margin: 0 !important;
  transform-origin: top left !important;
}

html[data-vtabs-letter-track-pending="1"] #sheet {
  opacity: 0 !important;
}
</style>
`
}

function buildRuntimePendingScript(letterTrack: KuailepuLetterTrackData | null) {
  const needsPendingMask =
    Boolean(letterTrack) &&
    letterTrack?.mode !== 'number'

  return `
<script data-vtabs-letter-track-pending>
(function () {
  if (${needsPendingMask ? 'true' : 'false'}) {
    document.documentElement.setAttribute('data-vtabs-letter-track-pending', '1');
  }
})();
</script>
`
}

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
function buildRuntimeBridgeScript(
  songId: string,
  letterTrack: KuailepuLetterTrackData | null,
  textMode: KuailepuRuntimeTextMode
) {
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
  var resizeTimer = null;
  var letterTrackWarned = false;
  var initialSyncTimer = null;

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
        return /^#note_serif_[0-7]$/.test(getUseHref(node));
      })
      .map(function (node) {
        var href = getUseHref(node);
        var bbox = typeof node.getBBox === 'function' ? node.getBBox() : null;
        var x = Number(node.getAttribute('x') || 0);
        var y = Number(node.getAttribute('y') || 0);

        return {
          href: href,
          degree: Number((href.match(/(\\d)$/) || [])[1] || -1),
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
    var accidentalText =
      accidental === 0
        ? ''
        : accidental > 0
          ? '#'.repeat(accidental)
          : 'b'.repeat(Math.abs(accidental));

    return '' + letter + accidentalText + octave;
  }

  function getAlignedGlyphTokens(noteGlyphs) {
    // 理想路径：优先用我们自己的 compact notation token 与最终 SVG 音符做顺序对齐。
    // 这样字母谱可以稳定保留 R、升降号、八度信息，而不是只读出 A-G。
    if (!Array.isArray(letterTrack.glyphTokens) || letterTrack.glyphTokens.length === 0) {
      return null;
    }

    var tokenIndex = 0;
    var aligned = [];

    for (var glyphIndex = 0; glyphIndex < noteGlyphs.length; glyphIndex += 1) {
      var targetDegree = String(noteGlyphs[glyphIndex].degree);

      while (tokenIndex < letterTrack.glyphTokens.length) {
        var token = letterTrack.glyphTokens[tokenIndex];
        var match = token && token.match(/[0-7]/);
        tokenIndex += 1;

        if (!match || match[0] !== targetDegree) {
          continue;
        }

        aligned.push(token);
        break;
      }
    }

    return aligned.length === noteGlyphs.length ? aligned : null;
  }

  function mapGlyphTokenToLetterLabel(token) {
    if (!token || !Array.isArray(letterTrack.scale) || letterTrack.scale.length < 7) {
      return null;
    }

    var match = token.match(/^([#b]?)([0-7])([',]*)$/);
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
      octaveShift += octaveMarks[index] === "'" ? 1 : -1;
    }

    return formatGlyphLetterName(
      base.letter,
      base.accidental + accidentalShift,
      base.octave + octaveShift
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
      ['英式八孔竖笛', 'English 8-hole recorder'],
      ['德式八孔竖笛', 'German 8-hole recorder'],
      ['爱尔兰哨笛', 'Irish tin whistle'],
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
      .replace(/\\bocarina\\((12|6) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole ocarina ';
      })
      .replace(/\\bbamboo flute\\((6) holes\\)\\s*/gi, function (_, holes) {
        return holes + '-hole bamboo flute ';
      })
      .replace(/\\brecorder\\(baroque 8 holes\\)\\s*/gi, 'English 8-hole recorder ')
      .replace(/\\brecorder\\(german 8 holes\\)\\s*/gi, 'German 8-hole recorder ')
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

    return /(?:Composer|Lyricist|Arranger|Notation|fingering|ocarina|recorder|xun|hulusi|xiao|bamboo flute)/i.test(
      text
    );
  }

  function localizeVisibleSheetText(svg) {
    if (!svg || textMode !== 'english') {
      return;
    }

    Array.prototype.slice
      .call(svg.querySelectorAll('text'))
      .forEach(function (node) {
        var original = node.textContent || '';
        var translated = translateVisibleSheetText(original);
        var shouldRelaxWidth = shouldRelaxVisibleSheetTextWidth(translated || original);
        if (!translated || (translated === original && !shouldRelaxWidth)) {
          return;
        }
        if (shouldRelaxWidth) {
          node.removeAttribute('textLength');
          node.removeAttribute('lengthAdjust');
        }
        node.textContent = translated;
      });
  }

  function clearLetterTrack(svg) {
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
    // - 隐藏：简谱八度点、附点、简谱升降号独立字形、简谱换气 V、部分短时值线
    //
    // 不要把这个函数扩张成“删除所有非字母元素”。
    // 站点当前最重要的是保留快乐谱原排版骨架，只去掉对 western 用户阅读帮助不大的简谱专属痕迹。
    Array.prototype.slice
      .call(svg.querySelectorAll('use'))
      .forEach(function (node) {
        var href = getUseHref(node);
        if (
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

        if (strokeWidth === 2 && Math.abs(y1 - y2) < 0.2 && Math.abs(x2 - x1) < 220) {
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

    localizeVisibleSheetText(svg);

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
      var glyphMarkers = alignedGlyphTokens ? null : getLetterTrackGlyphMarkers(svg);
      noteGlyphs.forEach(function (glyph, index) {
        var label = alignedGlyphTokens
          ? mapGlyphTokenToLetterLabel(alignedGlyphTokens[index])
          : null;

        if (!label && glyphMarkers) {
          if (glyph.degree === 0) {
            label = 'R';
          } else if (Array.isArray(letterTrack.scale) && letterTrack.scale.length >= 7) {
            var base = letterTrack.scale[glyph.degree - 1];
            if (base) {
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

              label = formatGlyphLetterName(
                base.letter,
                base.accidental + accidentalShift,
                base.octave + highCount - lowCount
              );
            }
          }
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
        layer.appendChild(cover);

        var text = createSvgNode('text');
        text.setAttribute('data-vtabs-letter-track', 'label');
        text.setAttribute('x', String(glyph.x + glyph.width / 2));
        text.setAttribute('y', String(glyph.y + glyph.height - 0.5));
        text.setAttribute('fill', '#7a5331');
        text.setAttribute(
          'font-size',
          label === 'R' ? '15' : label.length >= 4 ? '11' : '13'
        );
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
        layer.appendChild(text);
      });

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
        mark.setAttribute('font-family', 'Georgia, Times New Roman, serif');
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
    var height = measuredBottom > 0 ? measuredBottom + 4 : fallbackHeight;

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
      if (attempts >= 60 || (successfulRenders >= 12 && attempts >= 12)) {
        window.clearInterval(initialSyncTimer);
        postSize();
        setSheetPending(false);
      }
    }, 80);
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
    installObservers();
    scheduleInitialSync();
  }, 30);
})();
</script>
`
}

function normalizeNoteLabelMode(mode: string | null | undefined): KuailepuLetterTrackMode {
  if (mode === 'number' || mode === 'letter' || mode === 'graph') {
    return mode
  }
  return 'letter'
}

/**
 * compact notation 不是当前公开详情页直接渲染的真相源，
 * 但它是我们做字母谱映射时最稳定的“辅助坐标系”。
 *
 * 这里提取的 token 只承担两件事：
 * - 给字母谱提供 `0 / # / b / 八度` 信息
 * - 让 runtime 生成的 note glyph 能按顺序找到对应音符标签
 */
function extractCompactNotationNoteTokens(
  notation: string[] | null | undefined,
  options?: {
    includeRest?: boolean
  }
) {
  if (!Array.isArray(notation) || notation.length === 0) {
    return []
  }

  const text = notation.join(' ')
  const pattern = options?.includeRest
    ? /[#b]?[0-7](?:[',]+)?/g
    : /[#b]?[1-7](?:[',]+)?/g
  return text.match(pattern) ?? []
}

function parseScaleTonic(key: string | null | undefined) {
  if (!key) {
    return null
  }

  const normalized = key.replace(/\s+/g, '')
  const match = normalized.match(/1=([#b]?)([A-G])/i)
  if (!match) {
    return null
  }

  return {
    accidental: match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0,
    letter: match[2]!.toUpperCase(),
    octave: 5
  }
}

/**
 * 当前字母谱使用“按调号推导级数对应音名”的策略，而不是从快乐谱 SVG 上硬猜字母。
 *
 * 这样做的好处：
 * - 能稳定得到 `Eb5`、`F#5` 这类完整标签
 * - 不需要改 raw JSON
 * - number / letter 可逆切换，不会污染原始谱面数据
 */
function buildMajorScaleNoteNames(
  tonic:
    | {
      accidental: number
      letter: string
      octave: number
    }
  | null
) {
  if (!tonic) {
    return null
  }

  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  const naturalPitchClass: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  }
  const intervals = [0, 2, 4, 5, 7, 9, 11]
  const tonicLetterIndex = letters.indexOf(tonic.letter)
  if (tonicLetterIndex === -1) {
    return null
  }

  const tonicPitchClass =
    (naturalPitchClass[tonic.letter] + tonic.accidental + 12 * 10) % 12

  return intervals.map((interval, degreeIndex) => {
    const letter = letters[(tonicLetterIndex + degreeIndex) % letters.length]!
    const targetPitchClass = (tonicPitchClass + interval) % 12
    const letterPitchClass = naturalPitchClass[letter]
    let accidental = targetPitchClass - letterPitchClass

    if (accidental > 6) {
      accidental -= 12
    }
    if (accidental < -6) {
      accidental += 12
    }

    return {
      accidental,
      letter,
      octave: tonic.octave + Math.floor((tonicLetterIndex + degreeIndex) / letters.length)
    }
  })
}

function mapCompactNotationTokenToLetterLabel(
  token: string,
  scale:
    | Array<{
      accidental: number
      letter: string
      octave: number
    }>
    | null
) {
  if (!scale) {
    return null
  }

  const match = token.match(/^([#b]?)([0-7])([',]*)$/)
  if (!match) {
    return null
  }

  if (match[2] === '0') {
    return 'R'
  }

  const accidentalShift = match[1] === '#' ? 1 : match[1] === 'b' ? -1 : 0
  const octaveMarks = match[3] ?? ''
  const octaveShift =
    Array.from(octaveMarks).reduce((count, char) => count + (char === '\'' ? 1 : -1), 0)
  const degree = Number(match[2]) - 1
  const base = scale[degree]
  if (!base) {
    return null
  }

  // 休止符策略已由用户确认：
  // - 简谱 `0` -> 字母谱 `R`
  // - 持续时值仍沿用短横线 `-`
  // 也就是说字母谱里的 `R` 表示“此处休止”，不是“延长上一个音”。
  return formatLetterName(base.letter, base.accidental + accidentalShift, base.octave + octaveShift)
}

function formatLetterName(letter: string, accidental: number, octave: number) {
  const accidentalText =
    accidental === 0
      ? ''
      : accidental > 0
        ? '#'.repeat(accidental)
        : 'b'.repeat(Math.abs(accidental))

  return `${letter}${accidentalText}${octave}`
}

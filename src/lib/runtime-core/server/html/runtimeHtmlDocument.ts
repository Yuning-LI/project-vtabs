import { applyPublicRuntimeAssetProfile, buildRuntimeCriticalPreloads } from '../assets/publicRuntimeAssets.ts'
import { buildRuntimeOverrideStyle, buildRuntimePendingScript, escapeHtml } from './runtimeHtmlScaffold.ts'

type PublicRuntimePublicFeature = 'metronome' | 'playback'
type PublicRuntimeAssetProfileName = 'public-song' | 'full-template'

export function buildPublicRuntimeHtmlDocument(input: {
  template: string
  songId: string
  payloadJson: string
  pageTitle: string
  assetProfile: PublicRuntimeAssetProfileName
  publicFeatures: Set<PublicRuntimePublicFeature>
  compareMode: boolean
  hasPendingLetterMask: boolean
  bridgeScriptHtml: string
}) {
  const {
    template,
    songId,
    payloadJson,
    pageTitle,
    assetProfile,
    publicFeatures,
    compareMode,
    hasPendingLetterMask,
    bridgeScriptHtml
  } = input

  return applyPublicRuntimeAssetProfile(
    template
      .replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(pageTitle)} - Public Runtime Preview</title>`
      )
      .replace(
        /<link\s+rel="Shortcut Icon"\s+href="\/static\/img\/favicon\.ico"\s+type="image\/x-icon"\s*\/?>/i,
        '<link rel="icon" href="/favicon.ico" type="image/x-icon" />'
      )
      .replace(
        /(<script type="text\/javascript">\s*)var context = Kit\.context\.setContext\([\s\S]*?\);\s*(<\/script>)/i,
        (_match, openTag, closeTag) =>
          `${openTag}var context = Kit.context.setContext(${payloadJson});${closeTag}`
      )
      .replace(/(href|src)="\/static\/(?!\/)/g, '$1="/k-static/')
      .replace(
        /<\/head>/i,
        `${
          compareMode ? '' : buildRuntimeCriticalPreloads(assetProfile)
        }${
          compareMode ? '' : buildRuntimeOverrideStyle(publicFeatures)
        }${buildRuntimePendingScript(hasPendingLetterMask)}</head>`
      )
      .replace(/<\/body>/i, `${compareMode ? '' : bridgeScriptHtml}</body>`),
    assetProfile
  )
}

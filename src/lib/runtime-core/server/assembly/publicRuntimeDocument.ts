import { applyPublicRuntimeAssetProfile, buildRuntimeCriticalPreloads } from '../assets/publicRuntimeAssets.ts'
import { buildRuntimeOverrideStyle, buildRuntimePendingScript, escapeHtml } from '../html/runtimeHtmlScaffold.ts'
import type {
  PublicRuntimeAssetProfileName,
  PublicRuntimePublicFeature
} from '../../runtimeTypes.ts'

const PUBLIC_RUNTIME_DOCUMENT_TITLE_SUFFIX = 'Public Runtime Preview'
const PUBLIC_RUNTIME_FAVICON_TAG = '<link rel="icon" href="/favicon.ico" type="image/x-icon" />'
const RUNTIME_DOCUMENT_TITLE_PATTERN = /<title>[\s\S]*?<\/title>/i
const RUNTIME_DOCUMENT_FAVICON_PATTERN =
  /<link\s+rel="Shortcut Icon"\s+href="\/static\/img\/favicon\.ico"\s+type="image\/x-icon"\s*\/?>/i
const RUNTIME_CONTEXT_SCRIPT_PATTERN =
  /(<script type="text\/javascript">\s*)var context = Kit\.context\.setContext\([\s\S]*?\);\s*(<\/script>)/i
const RUNTIME_CHECK_COPYRIGHT_INPUT_PATTERN =
  /(<input\s+type="hidden"\s+id="check_copyright"\s+value=")true("[^>]*>)/i
const RUNTIME_STATIC_ASSET_PATH_PATTERN = /(href|src)="\/static\/(?!\/)/g
const RUNTIME_HEAD_CLOSE_PATTERN = /<\/head>/i
const RUNTIME_BODY_CLOSE_PATTERN = /<\/body>/i

export type PublicRuntimeDocumentInput = {
  template: string
  songId: string
  payloadJson: string
  pageTitle: string
  assetProfile: PublicRuntimeAssetProfileName
  publicFeatures: Set<PublicRuntimePublicFeature>
  compareMode: boolean
  hasPendingLetterMask: boolean
  bridgeScriptHtml: string
}

type RuntimeDocumentAssemblyInput = Omit<PublicRuntimeDocumentInput, 'songId'>

export function buildPublicRuntimeHtmlDocument(input: PublicRuntimeDocumentInput) {
  const {
    template,
    payloadJson,
    pageTitle,
    assetProfile,
    publicFeatures,
    compareMode,
    hasPendingLetterMask,
    bridgeScriptHtml
  } = input

  return applyPublicRuntimeAssetProfile(
    buildRuntimeDocumentHtml({
      template,
      pageTitle,
      payloadJson,
      assetProfile,
      publicFeatures,
      compareMode,
      hasPendingLetterMask,
      bridgeScriptHtml
    }),
    assetProfile
  )
}

function buildRuntimeDocumentHtml(input: RuntimeDocumentAssemblyInput) {
  return input.template
    .replace(RUNTIME_DOCUMENT_TITLE_PATTERN, buildRuntimeDocumentTitle(input.pageTitle))
    .replace(RUNTIME_DOCUMENT_FAVICON_PATTERN, PUBLIC_RUNTIME_FAVICON_TAG)
    .replace(
      RUNTIME_CONTEXT_SCRIPT_PATTERN,
      (_match, openTag: string, closeTag: string) =>
        `${openTag}var context = Kit.context.setContext(${input.payloadJson});${closeTag}`
    )
    .replace(
      RUNTIME_CHECK_COPYRIGHT_INPUT_PATTERN,
      (_match, openTag: string, closeTag: string) => `${openTag}${closeTag}`
    )
    .replace(RUNTIME_STATIC_ASSET_PATH_PATTERN, '$1="/k-static/')
    .replace(RUNTIME_HEAD_CLOSE_PATTERN, `${buildRuntimeHeadInjection(input)}</head>`)
    .replace(RUNTIME_BODY_CLOSE_PATTERN, `${input.compareMode ? '' : input.bridgeScriptHtml}</body>`)
}

function buildRuntimeDocumentTitle(pageTitle: string) {
  return `<title>${escapeHtml(pageTitle)} - ${PUBLIC_RUNTIME_DOCUMENT_TITLE_SUFFIX}</title>`
}

function buildRuntimeHeadInjection(input: RuntimeDocumentAssemblyInput) {
  return [
    input.compareMode ? '' : buildRuntimeCriticalPreloads(input.assetProfile),
    input.compareMode ? '' : buildRuntimeOverrideStyle(input.publicFeatures),
    buildRuntimePendingScript(input.hasPendingLetterMask)
  ].join('')
}

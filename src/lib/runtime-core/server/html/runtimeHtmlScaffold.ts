type PublicRuntimePublicFeature = 'metronome' | 'playback'

const RUNTIME_HTML_BACKGROUND_COLOR = '#fff8ee'
const RUNTIME_PENDING_ATTRIBUTE = 'data-vtabs-letter-track-pending'
const RUNTIME_OVERRIDE_STYLE_ATTRIBUTE = 'data-vtabs-runtime-override'
const RUNTIME_METRONOME_STATE_SELECTOR = 'html[data-vtabs-public-metronome="1"]'
const RUNTIME_PLAYBACK_STATE_SELECTOR = 'html[data-vtabs-public-playback="1"]'
const RUNTIME_PENDING_STATE_SELECTOR = `html[${RUNTIME_PENDING_ATTRIBUTE}="1"]`

const RUNTIME_BASE_HIDDEN_SELECTORS = [
  '#header',
  '#foot',
  '#menu-modal',
  '#diaohao-modal',
  '#instruments-modal',
  '#nosound-modal',
  '#score-modal',
  '#preload',
  '.header',
  '.navbar-fixed',
  '.footer',
  '.footer-copyright',
  '.right-fixed-wrapper',
  '.fixed-action-btn',
  '.modal-trigger',
  '.icon-quick-link',
  '.favorite-btn',
  '.share-btn',
  '.comment-box',
  '.login-box',
  '.breadcrumb-nav',
  '.banner',
  '.banner-box',
  '.ad-box',
  '.slogan-box',
  '.sheet-toolbar',
  '.song-toolbar',
  '.toolbar',
  '.qr-box',
  '.wx-qrcode',
  '.user-panel',
  '.floating-tools',
  '.recommend-box',
  '.song-recommend',
  '.sheet-copy-tip'
] as const

const RUNTIME_BASE_HIDDEN_TRIGGER_SELECTORS = [
  '[href="#menu-modal"]',
  '[data-target="menu-modal"]',
  '[href="#score-modal"]',
  '[data-target="score-modal"]',
  '[href="#select-instrument"]',
  '[data-target="select-instrument"]',
  '[href="#diaohao-modal"]',
  '[data-target="diaohao-modal"]',
  '[href="#instruments-modal"]',
  '[data-target="instruments-modal"]'
] as const

const RUNTIME_PLAYBACK_DISABLED_SELECTORS = [
  '.count-down-area',
  '.lean-overlay',
  '#play-modal'
] as const

const RUNTIME_METRONOME_DISABLED_SELECTORS = ['#metronome-modal'] as const

const RUNTIME_METRONOME_CONTROL_SELECTORS = [
  '#metronome-play',
  '[href="#metronome-modal"]',
  '[data-target="metronome-modal"]'
] as const

const RUNTIME_PLAYBACK_CONTROL_SELECTORS = [
  '#play-btn',
  '[href="#play-modal"]',
  '[data-target="play-modal"]'
] as const

function buildRuntimeHiddenCss(
  selectors: readonly string[],
  collapseBox: boolean
) {
  if (selectors.length === 0) {
    return ''
  }

  const declarations = [
    '  display: none !important;',
    '  visibility: hidden !important;',
    '  opacity: 0 !important;',
    '  pointer-events: none !important;'
  ]

  if (collapseBox) {
    declarations.push(
      '  max-width: 0 !important;',
      '  max-height: 0 !important;',
      '  overflow: hidden !important;'
    )
  }

  return `${selectors.join(',\n')} {
${declarations.join('\n')}
}`
}

function buildRuntimeDisplayNoneCss(selectors: readonly string[]) {
  if (selectors.length === 0) {
    return ''
  }

  return `${selectors.join(',\n')} {
  display: none !important;
}`
}

export function serializeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildRuntimePendingScript(
  hasPendingMask: boolean
) {
  return `
<script ${RUNTIME_PENDING_ATTRIBUTE}>
(function () {
  if (${hasPendingMask ? 'true' : 'false'}) {
    document.documentElement.setAttribute('${RUNTIME_PENDING_ATTRIBUTE}', '1');
  }
})();
</script>
`
}

export function buildRuntimeOverrideStyle(publicFeatures: Set<PublicRuntimePublicFeature>) {
  /* REDUNDANT: 快乐谱原生冗余，本项目已迁移功能，后续隔离删除 */
  const hiddenSelectors: string[] = [...RUNTIME_BASE_HIDDEN_SELECTORS]

  /* REDUNDANT: 快乐谱原生冗余，本项目已迁移功能，后续隔离删除 */
  const hiddenSelectorTriggers: string[] = [...RUNTIME_BASE_HIDDEN_TRIGGER_SELECTORS]

  if (!publicFeatures.has('playback')) {
    hiddenSelectors.push(...RUNTIME_PLAYBACK_DISABLED_SELECTORS)
  }

  /* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
  if (!publicFeatures.has('metronome')) {
    hiddenSelectors.push(...RUNTIME_METRONOME_DISABLED_SELECTORS)
  }

  return `
<style ${RUNTIME_OVERRIDE_STYLE_ATTRIBUTE}>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: ${RUNTIME_HTML_BACKGROUND_COLOR} !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
}

${buildRuntimeHiddenCss(hiddenSelectors, true)}

${buildRuntimeHiddenCss(hiddenSelectorTriggers, false)}

#sheet {
  margin: 0 auto !important;
  padding: 0 !important;
  display: block !important;
  width: 100% !important;
  transform-origin: top left !important;
}

.flex-body {
  position: relative !important;
  top: 0 !important;
  height: auto !important;
  min-height: 0 !important;
}

#sheet svg,
#sheet .sheet-svg {
  display: block !important;
  margin: 0 !important;
  max-width: none !important;
  height: auto !important;
  transform-origin: top left !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal {
  position: relative !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  bottom: auto !important;
  width: auto !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 12px 14px !important;
  padding: 0 !important;
  border: 1px solid rgba(78, 52, 28, 0.14) !important;
  border-radius: 18px !important;
  background: linear-gradient(135deg, #fffdf8 0%, #fff1db 100%) !important;
  box-shadow: 0 12px 28px rgba(80, 53, 25, 0.11) !important;
  color: #22170f !important;
  overflow: hidden !important;
  z-index: 1 !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .modal-content {
  display: block !important;
  width: auto !important;
  height: auto !important;
  padding: 12px 14px !important;
  overflow: visible !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .modal-footer {
  display: none !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .vtabs-public-metronome-toolbar {
  display: grid !important;
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 150px) minmax(120px, 170px) auto !important;
  align-items: end !important;
  gap: 10px !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .vtabs-public-metronome-title h2 {
  margin: 0 !important;
  color: #24170d !important;
  font: 800 16px/1.15 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .vtabs-public-metronome-chip {
  min-height: 16px !important;
  margin: 4px 0 0 !important;
  color: #7b624c !important;
  font: 700 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .input-field {
  margin: 0 !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .input-field label {
  position: static !important;
  display: block !important;
  transform: none !important;
  margin: 0 0 5px !important;
  color: #6f5b47 !important;
  font: 700 11px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal select {
  display: block !important;
  width: 100% !important;
  height: 36px !important;
  margin: 0 !important;
}

${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal #metronome-play {
  height: 36px !important;
  margin: 0 !important;
  padding: 0 16px !important;
  border-radius: 999px !important;
  background: linear-gradient(135deg, #f4b54f 0%, #e37d3f 100%) !important;
  color: #fffdf7 !important;
  font: 750 12px/36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  text-transform: none !important;
  box-shadow: 0 8px 18px rgba(171, 85, 31, 0.22) !important;
}

@media (max-width: 640px) {
  ${RUNTIME_METRONOME_STATE_SELECTOR} #metronome-modal .vtabs-public-metronome-toolbar {
    grid-template-columns: 1fr !important;
  }
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} .lean-overlay {
  display: none !important;
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
${RUNTIME_PLAYBACK_STATE_SELECTOR} #nosound-btn,
${RUNTIME_PLAYBACK_STATE_SELECTOR} #nosound-modal,
${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-microphone-row {
  display: none !important;
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal {
  left: auto !important;
  right: 14px !important;
  top: 14px !important;
  bottom: auto !important;
  width: min(560px, calc(100vw - 28px)) !important;
  height: auto !important;
  max-height: min(78vh, 520px) !important;
  margin: 0 !important;
  border: 1px solid rgba(78, 52, 28, 0.16) !important;
  border-radius: 20px !important;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 242, 202, 0.72), transparent 34%),
    linear-gradient(150deg, #fffdf8 0%, #fff2df 100%) !important;
  box-shadow: 0 22px 55px rgba(80, 53, 25, 0.18), 0 2px 10px rgba(80, 53, 25, 0.08) !important;
  color: #22170f !important;
  overflow: hidden !important;
  z-index: 1002 !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-content {
  position: relative !important;
  height: auto !important;
  max-height: calc(min(78vh, 520px) - 64px) !important;
  width: auto !important;
  padding: 16px 16px 8px !important;
  overflow-y: auto !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-content::before {
  content: 'Playback';
  display: block;
  margin: 0 0 12px;
  color: #24170d;
  font: 800 16px/1.15 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.02em;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .row {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 9px !important;
  margin: 0 !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .input-field {
  width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .input-field label {
  position: static !important;
  display: block !important;
  transform: none !important;
  margin: 0 0 5px !important;
  color: #6f5b47 !important;
  font: 700 11px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal select.browser-default,
${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal select.browser-select {
  display: block !important;
  width: 100% !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 30px 0 11px !important;
  border: 1px solid rgba(78, 52, 28, 0.2) !important;
  border-radius: 11px !important;
  background-color: rgba(255, 255, 255, 0.78) !important;
  color: #281a10 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  font: 650 12.5px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  outline: none !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal select.browser-default:focus,
${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal select.browser-select:focus {
  border-color: rgba(178, 106, 36, 0.68) !important;
  box-shadow: 0 0 0 3px rgba(226, 158, 62, 0.18) !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-footer {
  position: relative !important;
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  width: auto !important;
  height: auto !important;
  min-height: 0 !important;
  padding: 12px 16px 15px !important;
  border-top: 1px solid rgba(78, 52, 28, 0.1) !important;
  background: rgba(255, 248, 238, 0.72) !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-footer .btn-flat,
${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-footer a {
  float: none !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 14px !important;
  border-radius: 999px !important;
  color: #2a1a0e !important;
  font: 750 12px/36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
  letter-spacing: 0.02em !important;
  text-transform: none !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .op-replay,
${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .op-resume,
${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .op-play {
  background: linear-gradient(135deg, #f4b54f 0%, #e37d3f 100%) !important;
  color: #fffdf7 !important;
  box-shadow: 0 8px 18px rgba(171, 85, 31, 0.22) !important;
}

${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .vtabs-public-playback-close {
  background: rgba(255, 255, 255, 0.72) !important;
  border: 1px solid rgba(78, 52, 28, 0.13) !important;
  box-shadow: none !important;
}

@media (max-width: 520px) {
  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal {
    left: 10px !important;
    right: 10px !important;
    top: 10px !important;
    width: auto !important;
    max-height: calc(100vh - 20px) !important;
    border-radius: 18px !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-content {
    max-height: calc(100vh - 92px) !important;
    padding: 10px 10px 6px !important;
    overflow: visible !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-content::before {
    content: none !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .row {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 6px !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .input-field {
    min-height: 0 !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .input-field label {
    margin-bottom: 3px !important;
    font-size: 9px !important;
    line-height: 1.05 !important;
    letter-spacing: 0.04em !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal select.browser-default,
  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal select.browser-select {
    height: 30px !important;
    padding: 0 18px 0 7px !important;
    border-radius: 8px !important;
    font-size: 10px !important;
    line-height: 1.1 !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-footer {
    gap: 5px !important;
    padding: 7px 10px 9px !important;
  }

  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-footer .btn-flat,
  ${RUNTIME_PLAYBACK_STATE_SELECTOR} #play-modal .modal-footer a {
    height: 30px !important;
    padding: 0 9px !important;
    font-size: 10.5px !important;
    line-height: 30px !important;
  }
}

${RUNTIME_PENDING_STATE_SELECTOR} body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  pointer-events: none;
  z-index: 9998;
}

${RUNTIME_PENDING_STATE_SELECTOR} body::after {
  content: none;
}

${publicFeatures.has('metronome') ? '' : buildRuntimeDisplayNoneCss(RUNTIME_METRONOME_CONTROL_SELECTORS)}

${publicFeatures.has('playback') ? '' : buildRuntimeDisplayNoneCss(RUNTIME_PLAYBACK_CONTROL_SELECTORS)}
</style>
`
}

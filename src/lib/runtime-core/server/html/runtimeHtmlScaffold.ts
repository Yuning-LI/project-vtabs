type PublicRuntimePublicFeature = 'metronome' | 'playback'

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
<script data-vtabs-letter-track-pending>
(function () {
  if (${hasPendingMask ? 'true' : 'false'}) {
    document.documentElement.setAttribute('data-vtabs-letter-track-pending', '1');
  }
})();
</script>
`
}

export function buildRuntimeOverrideStyle(publicFeatures: Set<PublicRuntimePublicFeature>) {
  const hiddenSelectors = [
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
  ]

  if (!publicFeatures.has('playback')) {
    hiddenSelectors.push('.count-down-area')
    hiddenSelectors.push('.lean-overlay')
    hiddenSelectors.push('#play-modal')
  }

  if (!publicFeatures.has('metronome')) {
    hiddenSelectors.push('#metronome-modal')
  }

  return `
<style data-vtabs-runtime-override>
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #fff !important;
  overflow-x: hidden !important;
  overflow-y: hidden !important;
}

${hiddenSelectors.join(',\n')} {
  display: none !important;
}

#sheet {
  margin: 0 auto !important;
  padding: 0 !important;
  display: block !important;
  width: 100% !important;
  transform-origin: top left !important;
}

#sheet svg,
#sheet .sheet-svg {
  display: block !important;
  margin: 0 auto !important;
  max-width: 100% !important;
  height: auto !important;
}

html[data-vtabs-letter-track-pending="1"] body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  pointer-events: none;
  z-index: 9998;
}

html[data-vtabs-letter-track-pending="1"] body::after {
  content: 'Loading letter notes...';
  position: fixed;
  left: 50%;
  top: 1rem;
  transform: translateX(-50%);
  background: rgba(18, 18, 18, 0.82);
  color: #fff;
  padding: 0.5rem 0.85rem;
  border-radius: 999px;
  font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.01em;
  z-index: 9999;
  pointer-events: none;
}

${publicFeatures.has('metronome') ? '' : `
#metronome-play,
[href="#metronome-modal"],
[data-target="metronome-modal"] {
  display: none !important;
}
`}

${publicFeatures.has('playback') ? '' : `
#play-btn,
[href="#play-modal"],
[data-target="play-modal"] {
  display: none !important;
}
`}
</style>
`
}

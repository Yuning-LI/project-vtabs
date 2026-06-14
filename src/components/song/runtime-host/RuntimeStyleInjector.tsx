'use client'

import { useScopedRuntimeCss } from './style/useScopedRuntimeCss'

export type RuntimeStyleAsset = {
  src: string
}

type RuntimeStyleInjectorProps = {
  assets: RuntimeStyleAsset[]
  rootSelector?: string
}

export default function RuntimeStyleInjector({
  assets,
  rootSelector = '[data-public-runtime-root]'
}: RuntimeStyleInjectorProps) {
  const scopedCss = useScopedRuntimeCss({ assets, rootSelector })

  return (
    <>
      <style data-public-runtime-container-constraints suppressHydrationWarning>
        {buildRuntimeContainerConstraintCss(rootSelector)}
      </style>
      {scopedCss ? (
        <style data-public-runtime-scoped-css suppressHydrationWarning>
          {scopedCss}
        </style>
      ) : null}
      <style data-public-runtime-final-constraints suppressHydrationWarning>
        {buildRuntimeContainerFinalConstraintCss(rootSelector)}
      </style>
    </>
  )
}

function buildRuntimeContainerConstraintCss(rootSelector: string) {
  return `
${rootSelector} {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  width: 100%;
  background: #fff8ee;
}

${rootSelector} [data-public-runtime-dom-root] {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  background: #fff8ee;
}

${rootSelector} [data-public-runtime-dom-mount] {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  background: #fff8ee;
}

/* REDUNDANT: 快乐谱原生冗余，本项目已迁移功能，后续隔离删除 */
${rootSelector} [data-public-runtime-dom-mount] #header,
${rootSelector} [data-public-runtime-dom-mount] #foot,
${rootSelector} [data-public-runtime-dom-mount] #comment-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .head-bar,
${rootSelector} [data-public-runtime-dom-mount] .header,
${rootSelector} [data-public-runtime-dom-mount] .footer,
${rootSelector} [data-public-runtime-dom-mount] .footer-copyright,
${rootSelector} [data-public-runtime-dom-mount] .nav-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .button-collapse,
${rootSelector} [data-public-runtime-dom-mount] .comment-box,
${rootSelector} [data-public-runtime-dom-mount] .comment-list,
${rootSelector} [data-public-runtime-dom-mount] .comment-item,
${rootSelector} [data-public-runtime-dom-mount] .recommend-box,
${rootSelector} [data-public-runtime-dom-mount] .song-recommend,
${rootSelector} [data-public-runtime-dom-mount] .media-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .tags-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .tag-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .right-fixed-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .fixed-action-btn,
${rootSelector} [data-public-runtime-dom-mount] .floating-tools,
${rootSelector} [data-public-runtime-dom-mount] .sheet-copy-tip {
  display: none !important;
}

${rootSelector} [data-public-runtime-dom-mount] [data-public-runtime-body-append-mount] {
  display: none !important;
}

/* REDUNDANT: 快乐谱原生冗余，本项目已迁移功能，后续隔离删除 */
${rootSelector} [data-public-runtime-dom-mount] #preload {
  display: none !important;
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
${rootSelector} [data-public-runtime-dom-mount] .flex-body {
  display: block;
  position: relative !important;
  top: 0 !important;
  width: 100%;
  height: auto !important;
  min-height: 0 !important;
}

${rootSelector} [data-public-runtime-dom-mount] #sheet {
  display: block;
  width: 100%;
  margin: 0 auto !important;
  padding: 0 !important;
  transform-origin: top left;
}

${rootSelector} [data-public-runtime-dom-mount] #sheet svg,
${rootSelector} [data-public-runtime-dom-mount] #sheet .sheet-svg {
  display: block !important;
  height: auto !important;
  margin: 0 !important;
  max-width: none !important;
  transform-origin: top left !important;
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal {
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

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .modal-content {
  display: block !important;
  width: auto !important;
  height: auto !important;
  padding: 12px 14px !important;
  overflow: visible !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .modal-footer {
  display: none !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .vtabs-public-metronome-toolbar {
  display: grid !important;
  grid-template-columns: minmax(120px, 1fr) minmax(120px, 150px) minmax(120px, 170px) auto !important;
  align-items: end !important;
  gap: 10px !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .vtabs-public-metronome-title h2 {
  margin: 0 !important;
  color: #24170d !important;
  font: 800 16px/1.15 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .vtabs-public-metronome-chip {
  min-height: 16px !important;
  margin: 4px 0 0 !important;
  color: #7b624c !important;
  font: 700 12px/1.2 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .input-field {
  margin: 0 !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .input-field label {
  position: static !important;
  display: block !important;
  transform: none !important;
  margin: 0 0 5px !important;
  color: #6f5b47 !important;
  font: 700 11px/1.2 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal select {
  display: block !important;
  width: 100% !important;
  height: 36px !important;
  margin: 0 !important;
}

${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal #metronome-play {
  height: 36px !important;
  margin: 0 !important;
  padding: 0 16px !important;
  border-radius: 999px !important;
  background: linear-gradient(135deg, #f4b54f 0%, #e37d3f 100%) !important;
  color: #fffdf7 !important;
  font: 750 12px/36px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif !important;
  text-transform: none !important;
  box-shadow: 0 8px 18px rgba(171, 85, 31, 0.22) !important;
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] .lean-overlay {
  display: none !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #nosound-btn,
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #nosound-modal,
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-microphone-row {
  display: none !important;
}

/* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal {
  position: absolute !important;
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
  transform: none !important;
  z-index: 1002 !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .modal-content {
  position: relative !important;
  height: auto !important;
  max-height: calc(min(78vh, 520px) - 64px) !important;
  width: auto !important;
  padding: 16px 16px 8px !important;
  overflow-y: auto !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .modal-content::before {
  content: 'Playback';
  display: block;
  margin: 0 0 12px;
  color: #24170d;
  font: 800 16px/1.15 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
  letter-spacing: 0.02em;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .row {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 9px !important;
  margin: 0 !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .input-field {
  width: auto !important;
  margin: 0 !important;
  padding: 0 !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .input-field label {
  position: static !important;
  display: block !important;
  transform: none !important;
  margin: 0 0 5px !important;
  color: #6f5b47 !important;
  font: 700 11px/1.2 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal select.browser-default,
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal select.browser-select {
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
  font: 650 12.5px/1.2 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif !important;
  outline: none !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal select.browser-default:focus,
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal select.browser-select:focus {
  border-color: rgba(178, 106, 36, 0.68) !important;
  box-shadow: 0 0 0 3px rgba(226, 158, 62, 0.18) !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .modal-footer {
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

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .modal-footer .btn-flat,
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .modal-footer a {
  float: none !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 14px !important;
  border-radius: 999px !important;
  color: #2a1a0e !important;
  font: 750 12px/36px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif !important;
  letter-spacing: 0.02em !important;
  text-transform: none !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .op-replay,
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .op-resume,
${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .op-play {
  background: linear-gradient(135deg, #f4b54f 0%, #e37d3f 100%) !important;
  color: #fffdf7 !important;
  box-shadow: 0 8px 18px rgba(171, 85, 31, 0.22) !important;
}

${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .vtabs-public-playback-close {
  background: rgba(255, 255, 255, 0.72) !important;
  border: 1px solid rgba(78, 52, 28, 0.13) !important;
  box-shadow: none !important;
}

/* TODO: 快乐谱代码，用途待核验，暂保留 */
${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] {
  position: absolute !important;
  top: 16px !important;
  left: 50% !important;
  right: auto !important;
  bottom: auto !important;
  display: block !important;
  width: min(92%, 680px) !important;
  max-width: 680px !important;
  max-height: min(72vh, 450px) !important;
  height: auto !important;
  margin: 0 !important;
  opacity: 1 !important;
  overflow: hidden !important;
  transform: translateX(-50%) !important;
  z-index: 40 !important;
  border-radius: 18px !important;
  background: #fff8ed !important;
  box-shadow: 0 18px 42px rgba(70, 45, 24, 0.18) !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content {
  position: relative !important;
  inset: auto !important;
  height: auto !important;
  max-height: calc(min(72vh, 450px) - 64px) !important;
  padding: 22px 24px 18px !important;
  overflow: auto !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .row {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 12px 14px !important;
  width: 100% !important;
  height: auto !important;
  margin: 0 !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .input-field {
  float: none !important;
  width: 100% !important;
  min-height: 68px !important;
  margin: 0 !important;
  padding: 0 !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content label {
  display: block !important;
  position: static !important;
  max-height: none !important;
  margin-bottom: 6px !important;
  color: #6f5a42 !important;
  font-size: 0.72rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  transform: none !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content select.browser-default {
  display: block !important;
  height: 42px !important;
  margin: 0 !important;
  border: 1px solid rgba(120, 86, 48, 0.2) !important;
  border-radius: 9px !important;
  background: rgba(255, 255, 255, 0.92) !important;
  color: #2d2118 !important;
  font-size: 0.96rem !important;
  font-weight: 750 !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-footer {
  position: relative !important;
  inset: auto !important;
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 10px !important;
  min-height: 58px !important;
  height: auto !important;
  padding: 10px 22px !important;
  border-top: 1px solid rgba(120, 86, 48, 0.12) !important;
  background: rgba(255, 248, 237, 0.96) !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-footer .btn-flat,
${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-footer a {
  height: 38px !important;
  line-height: 38px !important;
  margin: 0 !important;
  border-radius: 999px !important;
  font-weight: 900 !important;
  text-transform: none !important;
}

@media (max-width: 900px) {
  ${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .row {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 640px) {
  ${rootSelector}[data-vtabs-public-metronome] [data-public-runtime-dom-mount] #metronome-modal .vtabs-public-metronome-toolbar {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 560px) {
  ${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] {
    width: calc(100% - 20px) !important;
  }

  ${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .row {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 520px) {
  ${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal {
    left: 10px !important;
    right: 10px !important;
    top: 10px !important;
    width: auto !important;
    max-height: calc(100vh - 20px) !important;
    border-radius: 18px !important;
  }

  ${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .modal-content {
    max-height: calc(100vh - 92px) !important;
    padding: 16px 14px 8px !important;
  }

  ${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .row {
    grid-template-columns: 1fr !important;
  }

  ${rootSelector}[data-vtabs-public-playback] [data-public-runtime-dom-mount] #play-modal .modal-footer {
    padding: 10px 14px 14px !important;
  }
}
`
}

function buildRuntimeContainerFinalConstraintCss(rootSelector: string) {
  return `
/* REDUNDANT: 快乐谱原生冗余，本项目已迁移功能，后续隔离删除 */
${rootSelector} [data-public-runtime-dom-mount] #foot,
${rootSelector} [data-public-runtime-dom-mount] #comment-wrapper,
${rootSelector} [data-public-runtime-dom-mount] #media-wrapper,
${rootSelector} [data-public-runtime-dom-mount] #tags-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .footer,
${rootSelector} [data-public-runtime-dom-mount] .footer-copyright,
${rootSelector} [data-public-runtime-dom-mount] .comment-box,
${rootSelector} [data-public-runtime-dom-mount] .comment-list,
${rootSelector} [data-public-runtime-dom-mount] .comment-item,
${rootSelector} [data-public-runtime-dom-mount] .recommend-box,
${rootSelector} [data-public-runtime-dom-mount] .song-recommend,
${rootSelector} [data-public-runtime-dom-mount] .media-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .tags-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .tag-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .right-fixed-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .fixed-action-btn,
${rootSelector} [data-public-runtime-dom-mount] .floating-tools,
${rootSelector} [data-public-runtime-dom-mount] .sheet-copy-tip {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
`
}

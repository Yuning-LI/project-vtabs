import type { RuntimeScriptLoaderDiagnostics } from '../RuntimeScriptLoader'
import type { RuntimeContainerMeasurementSnapshot } from '../useRuntimeContainerMeasurement'

export type RuntimeConsoleDiagnostic = {
  level: 'error' | 'warn' | 'unhandledrejection'
  message: string
  timestamp: number
}

type RuntimeHostKey = 'container'

export type RuntimeReviewDiagnosticsProps<PlaybackUiStatus extends string> = {
  queryDiagnostics: Array<[string, string | number]>
  containerMeasurement: RuntimeContainerMeasurementSnapshot | null
  containerScriptDiagnostics: RuntimeScriptLoaderDiagnostics | null
  consoleDiagnostics: RuntimeConsoleDiagnostic[]
  hostReadyState: Record<RuntimeHostKey, boolean>
  hostPlaybackStatus: Record<RuntimeHostKey, PlaybackUiStatus>
  hostPlaybackPanelOpen: Record<RuntimeHostKey, boolean>
}

export function RuntimeReviewDiagnostics<PlaybackUiStatus extends string>({
  queryDiagnostics,
  containerMeasurement,
  containerScriptDiagnostics,
  consoleDiagnostics,
  hostReadyState,
  hostPlaybackStatus,
  hostPlaybackPanelOpen
}: RuntimeReviewDiagnosticsProps<PlaybackUiStatus>) {
  const globalSummary =
    containerScriptDiagnostics?.capturedGlobalNames.length
      ? containerScriptDiagnostics.capturedGlobalNames.join(', ')
      : 'none captured yet'

  return (
    <div className="mt-4 grid gap-3 text-xs font-semibold text-[#4f3b2a] lg:grid-cols-4">
      <DiagnosticPanel title="Host Modes">
        <DiagnosticLine label="retired path" value="legacy host query resolves to container" />
        <DiagnosticLine label="container" value="native DOM / normalized commands" />
        <DiagnosticLine label="container ready" value={hostReadyState.container ? 'yes' : 'loading'} />
      </DiagnosticPanel>
      <DiagnosticPanel title="Query State">
        {queryDiagnostics.map(([label, value]) => (
          <DiagnosticLine key={label} label={label} value={String(value)} />
        ))}
      </DiagnosticPanel>
      <DiagnosticPanel title="Runtime State">
        <DiagnosticLine label="container playback" value={String(hostPlaybackStatus.container)} />
        <DiagnosticLine label="container panel" value={hostPlaybackPanelOpen.container ? 'open' : 'closed'} />
        <DiagnosticLine
          label="container height"
          value={containerMeasurement ? `${containerMeasurement.height}px` : 'measuring'}
        />
        <DiagnosticLine
          label="container sheet"
          value={containerMeasurement?.hasRenderedSheet ? 'rendered' : 'pending'}
        />
      </DiagnosticPanel>
      <DiagnosticPanel title="Errors / Globals">
        <DiagnosticLine
          label="console"
          value={consoleDiagnostics.length > 0 ? `${consoleDiagnostics.length} captured` : 'clean'}
        />
        <DiagnosticLine
          label="runtime js"
          value={
            containerScriptDiagnostics
              ? `${containerScriptDiagnostics.status} ${containerScriptDiagnostics.loadedCount}/${containerScriptDiagnostics.totalCount}`
              : 'pending'
          }
        />
        <div>
          <dt className="font-black uppercase tracking-[0.12em] text-[#806246]">
            global changes
          </dt>
          <dd className="mt-1 max-h-20 overflow-auto rounded-lg bg-white/70 px-2 py-1 font-mono text-[0.68rem] leading-5 text-[#2d2118]">
            {globalSummary}
          </dd>
        </div>
        {consoleDiagnostics.length > 0 ? (
          <div className="max-h-28 overflow-auto rounded-lg bg-[#fff8ed] px-2 py-1">
            {consoleDiagnostics.map(item => (
              <div key={`${item.timestamp}-${item.level}`} className="font-mono text-[0.68rem] leading-5">
                [{item.level}] {item.message}
              </div>
            ))}
          </div>
        ) : null}
      </DiagnosticPanel>
    </div>
  )
}

function DiagnosticPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <dl className="rounded-[18px] border border-[rgba(120,86,48,0.14)] bg-white/60 p-3 shadow-[0_10px_24px_rgba(70,45,24,0.06)]">
      <div className="mb-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#806246]">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </dl>
  )
}

function DiagnosticLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="font-black uppercase tracking-[0.1em] text-[#806246]">{label}</dt>
      <dd className="text-right font-mono text-[0.68rem] leading-5 text-[#2d2118]">{value}</dd>
    </div>
  )
}

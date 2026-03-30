import Link from 'next/link'
import type { KuailepuRuntimeState } from '@/lib/kuailepu/runtime'
import type { SongPresentation } from '@/lib/songbook/presentation'

type KuailepuLegacyRuntimePageProps = {
  songId: string
  title: string
  subtitle?: string | null
  seo: SongPresentation
  state?: KuailepuRuntimeState | null
}

/**
 * 这个组件是“站点自己的页面壳”。
 *
 * 关键职责只有两个：
 * 1. 生成 iframe URL，把当前曲目的运行时状态传给 `/api/kuailepu-runtime/[id]`。
 * 2. 接收 iframe 内部通过 `postMessage` 发回来的实际谱面高度，然后同步更新 iframe 高度。
 *
 * 为什么这里不用 React client component：
 * - Next 14 在当前开发态里对新加 client component 有过一次 RSC manifest 丢模块的问题。
 * - 这个页面壳本身并不需要 React 交互状态，服务端组件 + 一小段内联脚本更稳定。
 * - 这样也方便后续交接：页面壳职责非常单一，不会和快乐谱 runtime 混在一起。
 */
export default function KuailepuLegacyRuntimePage({
  songId,
  title,
  subtitle = null,
  seo,
  state = null
}: KuailepuLegacyRuntimePageProps) {
  /**
   * 这里显式把状态拼进 iframe query，而不是做父子窗口共享状态管理，
   * 是为了让每个 song page URL 都能独立复现当前阅读模式。
   *
   * 这对两个场景都重要：
   * - SEO / 外链抓取：URL 本身就是页面真相
   * - 交接 / 排障：复制一个详情页地址就能复现当前模式，不依赖 React 内存状态
   */
  const params = new URLSearchParams()
  if (state?.instrument) params.set('instrument', state.instrument)
  if (state?.fingering) params.set('fingering', state.fingering)
  if (state?.fingering_index !== null && state?.fingering_index !== undefined) {
    params.set('fingering_index', String(state.fingering_index))
  }
  if (state?.show_graph) params.set('show_graph', state.show_graph)
  if (state?.show_lyric) params.set('show_lyric', state.show_lyric)
  if (state?.show_measure_num) params.set('show_measure_num', state.show_measure_num)
  if (state?.measure_layout) params.set('measure_layout', state.measure_layout)
  if (state?.sheet_scale !== null && state?.sheet_scale !== undefined) {
    params.set('sheet_scale', String(state.sheet_scale))
  }
  if (state?.note_label_mode && state.note_label_mode !== 'letter') {
    params.set('note_label_mode', state.note_label_mode)
  }

  const query = params.toString()
  const frameSrc = query
    ? `/api/kuailepu-runtime/${songId}?${query}`
    : `/api/kuailepu-runtime/${songId}`
  const frameId = `kuailepu-runtime-${songId}`
  const noteLabelMode =
    state?.note_label_mode === 'letter' ||
    state?.note_label_mode === 'number' ||
    state?.note_label_mode === 'graph'
      ? state.note_label_mode
      : 'letter'
  const modeLinks = [
    { href: `/song/${songId}`, label: 'Letter', mode: 'letter' },
    { href: `/song/${songId}?note_label_mode=number`, label: 'Number', mode: 'number' }
  ] as const

  return (
    <main className="min-h-screen bg-[#f6f6f2] text-[#222222]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <section className="mb-5 rounded-[24px] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            {seo.familyLabel} · {seo.difficultyLabel}
          </div>
          <h1 className="mt-2 text-[1.9rem] leading-tight text-[#2e2e2e]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
            <span className="rounded-full bg-stone-100 px-3 py-1">Key {seo.keyLabel}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1">{seo.meterLabel}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1">{seo.tempoLabel}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1">12-Hole AC Ocarina</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {modeLinks.map(link => {
              const isActive = link.mode === noteLabelMode

              return (
                <Link
                  key={link.mode}
                  href={link.href}
                  className={
                    isActive
                      ? 'rounded-full border border-stone-900 bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white'
                      : 'rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-500 hover:bg-stone-100'
                  }
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <iframe
            id={frameId}
            title={`${title} Kuailepu runtime`}
            src={frameSrc}
            scrolling="no"
            className="block w-full border-0"
            style={{ height: '900px' }}
          />
        </section>

        <article className="mt-6 grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
          <section className="rounded-[24px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <h2 className="text-2xl font-bold text-stone-900">About {title}</h2>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.overview}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.background}</p>
            <p className="mt-4 text-sm leading-7 text-stone-700">{seo.practiceNotes}</p>
          </section>

          <div className="grid gap-6">
            <section className="rounded-[24px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
              <h2 className="text-xl font-bold text-stone-900">What This Page Includes</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-stone-700">
                {seo.includes.map(item => (
                  <li key={item} className="rounded-2xl bg-stone-50 px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[24px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
              <h2 className="text-xl font-bold text-stone-900">FAQ</h2>
              <div className="mt-4 grid gap-4">
                {seo.faqs.map(item => (
                  <div key={item.question} className="rounded-2xl bg-stone-50 px-4 py-4">
                    <h3 className="text-sm font-semibold text-stone-900">{item.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-700">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
              <h2 className="text-xl font-bold text-stone-900">How To Use This Page</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                Use the default letter-note view for fast reading, switch to numbered notation only when you want a backup reference, and keep the fingering chart visible as you work through each phrase. The layout is built so you can land on the melody and start playing quickly.
              </p>
            </section>
          </div>
        </article>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var frame = document.getElementById(${JSON.stringify(frameId)});
              var resizeObserver = null;

              function applyFrameHeight(height) {
                var nextHeight = Number(height);
                if (!frame || !Number.isFinite(nextHeight) || nextHeight <= 200) {
                  return;
                }
                frame.style.height = Math.ceil(nextHeight) + 'px';
              }

              function measureFrameContentHeight() {
                try {
                  if (!frame || !frame.contentDocument) {
                    return null;
                  }

                  var doc = frame.contentDocument;
                  var body = doc.body;
                  var html = doc.documentElement;
                  if (!body || !html) {
                    return null;
                  }

                  var bodyTop = body.getBoundingClientRect().top;
                  var measuredBottom = 0;
                  ['#sheet', '#sheet .sheet-svg'].forEach(function (selector) {
                    var nodes = doc.querySelectorAll(selector);
                    nodes.forEach(function (node) {
                      if (!node || !node.getBoundingClientRect) {
                        return;
                      }
                      var rect = node.getBoundingClientRect();
                      if (rect.height <= 0) {
                        return;
                      }
                      measuredBottom = Math.max(
                        measuredBottom,
                        rect.bottom - bodyTop,
                        rect.height
                      );
                    });
                  });

                  var fallbackHeight = Math.max(
                    body.scrollHeight || 0,
                    html.scrollHeight || 0,
                    body.offsetHeight || 0,
                    html.offsetHeight || 0
                  );
                  // 优先信任真正可见的谱面节点，只有“谱面还没渲染出来”时
                  // 才退回 body/html 高度。否则很容易重新引入隐藏节点撑高 iframe 的问题。
                  var height = measuredBottom > 0 ? measuredBottom + 24 : fallbackHeight + 24;
                  return height;
                } catch (error) {
                  return null;
                }
              }

              function syncFrameHeight() {
                applyFrameHeight(measureFrameContentHeight());
              }

              function scheduleSyncBursts() {
                syncFrameHeight();
                [120, 360, 900, 1800].forEach(function (delay) {
                  window.setTimeout(syncFrameHeight, delay);
                });
              }

              function installFrameObservers() {
                try {
                  if (!frame || !frame.contentDocument || !window.ResizeObserver) {
                    return;
                  }

                  if (resizeObserver) {
                    resizeObserver.disconnect();
                  }

                  var doc = frame.contentDocument;
                  var body = doc.body;
                  var html = doc.documentElement;
                  resizeObserver = new ResizeObserver(function () {
                    window.setTimeout(syncFrameHeight, 30);
                  });
                  if (body) resizeObserver.observe(body);
                  if (html) resizeObserver.observe(html);
                } catch (error) {
                  return;
                }
              }

              // iframe 内部只会发一种我们关心的消息：
              // { type: 'kuailepu-runtime-size', songId, height }
              // 这里故意做了多重校验，避免别的页面消息误伤当前页。
              // 当前站点 song pages 都跑在同源下，保守过滤可以减少后续新增 iframe 时的串扰风险。
              function onMessage(event) {
                var data = event.data;
                if (!frame || !data || typeof data !== 'object') return;
                if (data.type !== 'kuailepu-runtime-size') return;
                if (data.songId !== ${JSON.stringify(songId)}) return;
                applyFrameHeight(data.height);
              }

              if (frame) {
                frame.addEventListener('load', function () {
                  installFrameObservers();
                  scheduleSyncBursts();
                });
              }

              window.addEventListener('message', onMessage);
              window.addEventListener('resize', scheduleSyncBursts);
              scheduleSyncBursts();
            })();
          `
        }}
      />
    </main>
  )
}

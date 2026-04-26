# Agent Handoff

这份文档给新开对话时的 AI 或新接手时的程序员使用。目标是最快建立正确心智模型，不重复灌入过长历史。

如果任务涉及内部打印 PDF、私有版权曲存档、或 `MusicXML` 输入链，额外继续看：

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

如果任务涉及公开增长、SEO 入口页、learn / hub / guide 页面，额外继续看：

- `docs/seo-growth-roadmap.md`

## 1. 一句话真相

当前公开 `/song/<slug>` 页面已经统一走“快乐谱 raw JSON + 快乐谱原始 runtime 渲染逻辑”的路线，默认显示字母谱，简谱作为可选模式保留，`captured SVG` 只剩调试价值。

## 2. 速记版当前状态

- 生产 raw JSON 优先读取 `data/kuailepu-runtime/<slug>.json`。
- `reference/songs/<slug>.json` 只保留给本地导歌 / 调试 fallback。
- deployable runtime archive 在 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`。
- 默认模式是 `letter`。
- 公开可选模式只有 `letter` 与 `number`。
- 不恢复 `both`。
- 公开最小乐器集是 `o12`、`o6`、`r8b`、`r8g`、`w6`。
- 前台可见文案必须保持英文。
- 前台不要暴露第三方来源文案。
- `/api/kuailepu-runtime/<slug>` 不是公开 SEO 落地页，必须继续返回 `X-Robots-Tag: noindex, nofollow, noarchive`。

以 2026-04-26 当前工作区为准：

- `public-song-manifest = 145`
- `song-seo-profiles = 145`
- `data/kuailepu-runtime = 145`
- `data/kuailepu = 139`

## 3. 高优先约束

- 不要把公开 song route 回退到旧 `SongClient`。
- compare / preflight / publish gate 继续坚持 `note_label_mode=number`。
- 未来如果继续减快乐谱旧资产，优先调 runtime asset profile，不要随手删保留快照资产。
- 纯中文歌词必须继续默认隐藏，不能被 query 参数重新暴露。
- metronome 继续作为停靠在谱面上方的英文工具条，不要恢复成遮挡式弹窗。

## 4. 网络规则

- 快乐谱导歌、compare、preflight、登录态检查、线上上下文排障需要中国可达网络。
- Google / western 调研通常需要国外 VPN。
- 不要默认两边都通。
- 如果登录态无效，停止后续快乐谱动作，让用户执行：

```bash
npm run login:kuailepu
```

## 5. 2026-04-23 GSC 固定执行计划

这轮是一次定向修正，不是长期固定 SEO roadmap。

这轮结论：

- `song` 页首要问题是一批页面已进前 10 左右，但 CTR 偏低。
- `learn` 页首要问题是 topic fit 与排名，大多还在 `30-50` 位。

这轮 scope：

- 不新增 URL。
- 不新增一批新 SEO 页。
- 不改 runtime / route / 曲谱主链。
- 只改：
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts`

这轮已完成的页面：

- `song`
  - `frere-jacques`
  - `lightly-row`
  - `always-with-me`
  - `wedding-march-alt`
  - `scotland-the-brave`
  - `flight-of-the-bumblebee`
  - `jasmine-flower`
  - `turkish-march`
  - `ode-to-joy`
- `learn`
  - `12-hole-ocarina-letter-notes`
  - `easy-recorder-songs-for-beginners`
  - `easy-12-hole-ocarina-songs`
  - `how-to-start-recorder-with-letter-notes`

后续是否继续扩批次，要重新看新的 GSC、排名和收录状态，不要直接沿用旧结论。

## 6. 每次新对话默认动作

1. 先读 `AGENTS.md`。
2. 再读 `README.md`、`docs/handoff.md`、`docs/agent-handoff.md`、`docs/kuailepu-compatibility-roadmap.md`、`docs/manual-runtime-qa-checklist.md`、`src/lib/kuailepu/runtime.ts`、`docs/instrument-rollout-plan.md`。
3. 先确认当前任务是否需要中国网络或国外 VPN。
4. 如果任务涉及 release 判断，先跑：
   - `git status --short --branch`
   - `git log --oneline origin/main..HEAD`
5. 如果用户说“导歌”或“公开导入歌曲”，默认同时完成 manifest、SEO profile / aliases、learn / hub 内链、灰度记录和验证；只有用户明确说“只做候选 / candidate only”时，才保持未公开候选状态。

## 7. 文档使用规则

- `agent-handoff` 只保留速接信息，不再堆长时间线。
- 历史细节去 `handoff` 或专项文档里看，不要再把同一段 prompt 或状态重复粘贴回来。

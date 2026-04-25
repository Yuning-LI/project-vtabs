# Project V-Tabs

面向 Google / western 用户、以 ocarina 为主并已公开支持 recorder / tin whistle 的 melody song page 站点。当前公开详情页统一走快乐谱兼容 runtime 路线，默认显示字母谱，简谱作为可选阅读模式保留。

## 交接优先读

新对话、新程序员、或者重新接手这个项目时，先按下面顺序读：

1. `README.md`
2. `docs/handoff.md`
3. `docs/agent-handoff.md`
4. `docs/kuailepu-compatibility-roadmap.md`
5. `docs/manual-runtime-qa-checklist.md`
6. `src/lib/kuailepu/runtime.ts`
7. `docs/instrument-rollout-plan.md`

如果任务涉及快乐谱兼容、导歌、上线、字母谱、SEO 文案，这套顺序是必读。

如果任务涉及内部打印 PDF、未授权版权曲本地工作流、或 `MusicXML` 输入链，额外继续看：

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

如果任务涉及公开增长、learn / hub / guide 页面，额外继续看：

- `docs/seo-growth-roadmap.md`

## 当前真相

- 公开 `/song/<slug>` 统一走 deployable raw JSON + 快乐谱原始 runtime 主链。
- 生产 raw JSON 优先读取 `data/kuailepu-runtime/<slug>.json`。
- `reference/songs/<slug>.json` 只保留给本地导歌 / 调试 fallback。
- deployable runtime archive 在 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`。
- `captured SVG` 只保留本地视觉基线 / 回归排查用途，不再是公开详情页数据源。
- 默认阅读模式是 `letter`。
- 公开可选阅读模式只有 `letter` 与 `number`。
- 不恢复 `both`。
- 公开最小乐器集是 `o12`、`o6`、`r8b`、`r8g`、`w6`。
- 公开可见文案必须保持英文。
- 前台不要出现 `Kuailepu source`、`reference source` 这类来源披露文案。

## 当前数量口径

以 2026-04-24 当前工作区为准：

- `data/songbook/public-song-manifest.json = 142`
- `data/songbook/song-seo-profiles.json = 142`
- `data/kuailepu-runtime/*.json = 142`
- `data/kuailepu/*.json = 136`
- `reference/songs/*.json = 143`

说明：

- `142` 代表当前公开 song page / deployable runtime 层口径。
- `136` 的 `data/kuailepu/*.json` 是可提交的轻量导入结果数量，不等于公开页数量。
- 如果要确认哪些已经 push / live，先看 `git status --short --branch` 和 `git log --oneline origin/main..HEAD`。

## 网络协作规则

- 快乐谱相关动作：
  - 导歌
  - compare
  - preflight
  - 登录态检查
  - 线上上下文排障
  都依赖中国可达网络。
- Google / 国外站点调研、关键词查证、western 用户侧资料核实，通常需要国外 VPN。
- 不要默认两种网络可同时使用。
- 如果当前任务需要切换到另一侧网络，先明确告诉用户切 VPN，再继续。
- 如果 `npm run check:kuailepu-login` 或 preflight 提示登录失效，应停止后续快乐谱动作，先让用户手动执行：

```bash
npm run login:kuailepu
```

## 发布与导歌规则

导歌或准备公开歌曲前，先跑：

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

如果登录失效，不要继续猜，直接让用户手动刷新登录态。

公开 song page 的核心规则：

- 不回退到旧 `SongClient` 详情页。
- compare / preflight / publish gate 继续坚持 `note_label_mode=number`。
- 修改 runtime 相关逻辑后，先确认 `number` 模式 parity 没被破坏。
- 未来如果继续减快乐谱旧资产，优先调 runtime asset profile，不要随手删 `vendor/kuailepu-static` 或 `public/k-static` 里的保留资产。

## SEO 当前规则

- 公开 title 按“SEO 长尾优先、品牌词让位”处理。
- 首页、`/learn`、`/learn/[slug]`、`/song/[slug]` 这类公开落地页，不要机械追加 `| Play By Fingering`。
- 如果 title 空间有限，优先保留乐器词、tabs / notes / letter notes / fingering chart、曲名别名等真实搜索词。
- `/api/kuailepu-runtime/<slug>` 返回的是 runtime HTML，不是公开 SEO 落地页。
- 这类 URL 必须继续返回 `X-Robots-Tag: noindex, nofollow, noarchive`，避免 query 变体被 GSC / Google 收录并稀释 `/song/<slug>`。

## Git 提交规范

- 提交信息必须写中文。
- 不能只写一句短标题。
- 至少写清楚：
  - `变更`
  - `原因`
  - `验证`

仓库里已有：

- `.gitmessage.txt`
- `.husky/commit-msg`

## 文档职责

- `README.md`
  - 只保留稳定真相、必读顺序、长期规则。
- `docs/handoff.md`
  - 保留当前有效状态与执行规则。
- `docs/agent-handoff.md`
  - 保留速接版与高优先约束。
- `docs/seo-growth-roadmap.md`
  - 保留公开增长策略与当前批准的 SEO 执行范围。

不要再把同一批“当前状态”同时堆到三四份主文档里。

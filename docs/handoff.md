# Handoff Notes

这份文档写给第一次接手这个项目的新程序员。目标是保留当前有效状态、操作规则和真正会影响执行判断的上下文；历史细节不再继续堆成长时间线。

如果任务涉及内部打印 PDF、未授权版权曲本地存档、或 `MusicXML` 私有输入链，额外继续阅读：

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

如果任务涉及公开增长、SEO 入口页、learn / hub / guide 页面，额外继续阅读：

- `docs/seo-growth-roadmap.md`

## 1. 产品现状

这是一个面向 Google 搜索流量和 western 用户、以 ocarina 为主并已公开支持 recorder / tin whistle 的 melody song page 站点。

当前公开产品形态：

- 首页是英文 song library landing page。
- 详情页是英文 SEO landing page + 可直接演奏的曲谱页。
- 公开详情页默认显示字母谱。
- 简谱仍可切换查看。
- 指法图始终是核心内容。
- 字母谱与简谱都只是阅读模式，真相源是快乐谱 raw JSON + 快乐谱原始 runtime 渲染链。

## 2. 当前有效状态

以 2026-04-24 当前工作区为准：

- 站点面向 western 用户，前台可见文案必须是英文。
- 公开 `/song/<slug>` 统一走 `data/kuailepu-runtime/<slug>.json -> Kit.context.setContext(...) -> Song.draw()/compile() -> final SVG`。
- 默认阅读模式是 `letter`，公开可选模式只有 `letter` 和 `number`。
- `captured SVG` 只保留调试价值，不再是公开详情页来源。
- 公开最小乐器集是 `o12`、`o6`、`r8b`、`r8g`、`w6`。
- `/api/kuailepu-runtime/<slug>` 不是公开 SEO 落地页，必须继续返回 `X-Robots-Tag: noindex, nofollow, noarchive`。
- 当前正式图标是白底 `C5` 陶笛指法图版本；后续如果微调，优先只改 `src/app/icon.svg`。

当前数量口径：

- `data/songbook/public-song-manifest.json = 139`
- `data/songbook/song-seo-profiles.json = 139`
- `data/kuailepu-runtime/*.json = 139`
- `data/kuailepu/*.json = 133`
- `reference/songs/*.json = 140`

不要再把旧的 `130 首公开曲库` 当作当前真相。

## 3. 公开链路与运行规则

必须记住的链路边界：

- 生产 raw JSON 优先读取 `data/kuailepu-runtime/<slug>.json`。
- `reference/songs/<slug>.json` 只保留给本地导歌 / 调试 fallback。
- deployable runtime archive 在 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`。
- 不恢复旧 `SongClient` 作为公开详情页。
- compare / preflight / publish gate 继续坚持 `note_label_mode=number`。
- 字母谱不是新开一轨，而是直接复用简谱那一轨的位置、间距、节拍、歌词、指法图，只把数字替换成字母音名。

运行时当前有效规则：

- 公开 runtime 默认注入 `runtime_text_mode=english`。
- 调号 `1=...`、纯拍号、速度类 `=120`、以及指法图谱上方的乐器 / 指法标题行在 english runtime 下默认隐藏。
- `/k-static/...` 当前优先由 `public/k-static` 提供。
- 未来如果继续减快乐谱旧资产，优先调 runtime asset profile，不要物理删除保留资产。

## 4. 网络协作规则

- 快乐谱导歌、compare、preflight、登录态检查、线上上下文排障，依赖中国可达网络。
- Google / western 用户调研与关键词查证，通常需要国外 VPN。
- 不要默认两种网络可同时使用。
- 如果需要切换另一侧网络，先明确告诉用户切 VPN。
- 如果 `npm run check:kuailepu-login` 或 preflight 提示登录失效，应停止后续快乐谱动作，让用户手动执行：

```bash
npm run login:kuailepu
```

## 5. 发布前规则

新增或准备公开歌曲前，先跑：

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

如果是 song import / publishing 任务，同时继续遵守：

- 不要在指定歌曲失败时静默换歌。
- 先告诉用户哪首失败、为什么失败，再等用户明确确认替代目标。
- publish / parity 检查继续以 `number` 模式为准。

## 6. 当前 SEO 有效规则

- 公开 title 按“SEO 长尾优先、品牌词让位”处理。
- 首页、`/learn`、`/learn/[slug]`、`/song/[slug]` 这类公开落地页，不要机械追加 `| Play By Fingering`。
- 如果 title 空间有限，优先保留乐器词、tabs / notes / letter notes / fingering chart、曲名别名等真实搜索词。
- 前台不要出现 `Kuailepu source`、`reference source`、`we referenced Kuailepu` 这类来源披露文案。
- song page SEO 文案与 learn / hub 页面属于允许增强的外壳层；runtime、曲谱正确性、指法图本体不在默认可随意改动范围内。

### 2026-04-23 GSC 固定执行计划

这轮不是长期 SEO roadmap，而是基于 `exports/gsc/` 下近 3 个月 GSC 导出做的一次定向修正。固定范围如下：

- 不新增 URL。
- 不改 slug。
- 不新增一批新 SEO 页面。
- 不改 runtime / route / 曲谱主链。
- 只改：
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts`

这轮结论：

- `song` 页的问题主要是一批页面已进前 10 左右，但 CTR 偏低。
- `learn` 页的问题主要是 topic fit 和排名，大多还在 `30-50` 位。

这轮固定范围内已完成的页面：

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

后续不要沿用旧想象继续批量扩 scope；到时候重新看新的 GSC / 收录 / CTR 再现找现分析。

## 7. 当前不该再做的事

- 不要把旧 `130` 首口径继续写进主文档。
- 不要把“当前未 push 的灰度歌”当成长期真相写死在主文档里。
- 不要继续在主文档里堆逐日历史补丁。
- 不要在 `README`、`handoff`、`agent-handoff` 三处重复维护同一段当前状态。

## 8. 文档职责

- `README.md`
  - 只保留稳定真相、必读顺序、长期规则。
- `docs/handoff.md`
  - 保留当前有效状态、操作规则、当前批准范围。
- `docs/agent-handoff.md`
  - 保留速接版高优先约束。
- `docs/seo-growth-roadmap.md`
  - 保留增长策略、阶段划分、当前 SEO 批次计划。

## 9. Git 提交规范

- 提交信息必须写中文。
- 不能只写一句短标题。
- 至少写清楚：
  - `变更`
  - `原因`
  - `验证`

仓库里已有 `.gitmessage.txt` 与 `.husky/commit-msg` 做最低限度约束。

# Agent Handoff

这份文档是给“新开对话时的 AI / 新接手时的程序员”的速接版说明。它比 `docs/handoff.md` 更短，但信息密度更高，重点是快速建立正确心智模型，避免按旧上下文乱改。

## 1. 一句话真相

当前公开 `/song/<slug>` 页面已经统一走“快乐谱 raw JSON + 快乐谱原始 runtime 渲染逻辑”的路线，默认显示字母谱，简谱作为可选模式保留，`captured SVG` 只剩调试价值。

补充：

- 生产 raw JSON 现在优先读取 `data/kuailepu-runtime/<slug>.json`
- `reference/songs/<slug>.json` 只保留给本地导歌 / 调试 fallback
- deployable runtime archive 在 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`

## 最新补充（2026-04-02）

- 公开 runtime 现已默认走英文文本模式，SVG 里的 `Composer`、`Play order`、`12-hole ocarina Bb fingering` 等可见标签都应是英文。
- 公开页当前默认本地优先加载快乐谱静态依赖，不再默认回源 `www.kuaiyuepu.com/static/...`；中国以外网络下公开页也应能正常显示。
- `/k-static` 现在优先由 `public/k-static` 提供，不再主要依赖动态 route。
- `scripts/sync-kuailepu-static.mjs` 会在 `dev` / `build` / `start` 前自动同步必需的旧 JS/CSS/字体资源。
- `vendor/kuailepu-static` 当前带着一份快乐谱线上实际部署版的压缩静态快照。
- 公开生产链路已经脱离 `reference/` 硬依赖：
  - 生产 raw JSON 走 `data/kuailepu-runtime/<slug>.json`
  - runtime 模板归档走 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
- 重复公开入口 `silent-night-english`、`jingle-bells-english` 已清理。
- 本轮又新增了 5 首快乐谱导入并已通过 preflight compare：`jasmine-flower`、`arirang`、`toy-march`、`cavalry-march`、`sakura-sakura`。
- `scripts/preflight-kuailepu-publish.ts` 已修复一处误判：之前 `npm` 输出和 Node warning 会污染 JSON，导致“登录其实有效，但 preflight 误报无效登录”。
- runtime 英文化链已补上 `轻吹 -> Soft blow`、`重吹 -> Strong blow`。
- runtime 英文化链已补上全角中文标点规范化，避免公开页出现 `Herbert Hughes ，Benjamin Britten` 这类中式标点残留。
- 详情页 runtime loading 已拆到 `src/components/song/KuailepuRuntimeFrame.tsx`，首页点进详情页时 overlay 不会再卡住。
- favicon 已补齐：
  - `src/app/icon.svg`
  - `public/favicon.ico`
  - `src/app/layout.tsx` 的 `metadata.icons`
- sitemap / robots 现已改为 App Router metadata routes：
  - `src/app/sitemap.ts` 基于公开 `songCatalog` 输出 sitemap
  - `src/app/robots.ts` 输出 robots.txt 并指向 sitemap
  - 不再使用 `next-sitemap`
  - `icon.svg` 不应进入 sitemap
- 首页 metadata 现已统一补齐：
  - `metadataBase`
  - canonical
  - `robots`
  - `google-site-verification`
- Vercel 线上已实测通过：
  - `/song/ode-to-joy`
  - `/song/jasmine-flower`
  - `/song/arirang`
  - `number` 模式切换
  - `/api/kuailepu-runtime/...`
  - 实际被页面引用的 `/k-static/...` 资源
- Playwright 仓库内测试当前也已恢复可直接运行：
  - `playwright.config.ts` 固定走 `127.0.0.1:3000`
  - `webServer` 使用 `port: 3000`
  - `e2e/core.spec.ts` 已改到当前 runtime-backed 流程

## 最新补充（2026-04-03）

- 公开 song page 现在已经支持最小多乐器切换：
  - `o12`（默认）
  - `o6`
  - `r8b`
  - `r8g`
  - `w6`
- 公开 song page 也已支持一批最小显示开关：
  - `Fingering Chart`（同一下拉也负责多图谱方向切换）
  - `Lyrics`（仅公开可见歌词）
  - `Measure Numbers`
  - `Layout`
  - `Zoom`
  - `Metronome`
- 这组乐器切换仍走同一个 runtime-backed `/song/<slug>` 页面，不存在第二条公开详情页路线。
- `scripts/audit-kuailepu-instruments.ts` 已可直接审计当前公开曲目的快乐谱乐器支持覆盖率。
- `docs/instrument-rollout-plan.md` 已记录当前公开顺序与剩余待缓开放的乐器集合。
- 中国网络下已经做过 5 首样本歌 x 5 个公开乐器的 live-vs-local `number` 模式 SVG hash 对照：
  - `25 / 25` 组合一致
- 本轮还修掉了一处默认值继承问题：
  - 显式切换乐器后，不应继续沿用 payload 根层属于默认乐器的 `fingering` / `show_graph`
  - 修复点在 `src/lib/kuailepu/runtime.ts`
- `w6` 爱尔兰哨笛现已接入前台最小公开乐器集，继续沿用 `?instrument=w6` query state。
- compare / preflight 现已补到可直接覆盖当前公开乐器集，包括 `w6` 这类不在 live 页下拉显式暴露的乐器。
- 这条补强依赖“直接回放 live runtime context”，而不是继续把本地下拉索引硬套到 live 页可见 select。
- 节拍器现已公开：
  - 前台只有 `Metronome` On / Off
  - 仍复用快乐谱原始 metronome 脚本
  - 公开页会把它改造成停靠在谱面上方的英文工具条，不再以遮挡谱面的弹窗出现

## 2. 接手后必须先知道的事

- 站点前台目标用户是 Google 来的 western 用户。
- 前台可见文案必须是英文。
- 前台不能写“参考了快乐谱”“来源是快乐谱”“Kuailepu source”等来源披露。
- 公开详情页找不到 raw JSON 时应该 `notFound()`，不要静默 fallback 到旧页面。
- 默认阅读模式是 `letter`。
- 可公开切换模式只有 `letter` 和 `number`。
- 发布前 parity gate 必须用 `number` 模式。
- 公开 song page 现在支持的最小公开乐器集是：
  - `o12` -> `12-Hole AC Ocarina`（默认）
  - `o6` -> `6-Hole Ocarina`
  - `r8b` -> `English 8-Hole Recorder`
  - `r8g` -> `German 8-Hole Recorder`
  - `w6` -> `Irish Tin Whistle`
- 公开 song page 还支持一批 query-state 显示开关：
  - `show_graph`
  - `show_lyric`
  - `show_measure_num`
  - `measure_layout`
  - `sheet_scale`
- 公开 song page 还支持 `practice_tool=metronome`。
- 只有存在公开可见歌词轨时，前台才显示 `Lyrics` 开关；纯中文歌词轨默认隐藏且不应被公开 query 重新暴露。
- 乐器切换继续走同一个 runtime-backed `/song/<slug>` 页面，不单开旧详情页或其他公开路线。
- 如果某首歌缺少某个公开乐器，只显示该曲实际支持的选项。
- 首页 song card 仍然只显示歌名，但首页现已支持：
  - title 搜索
    - 搜索已兼容英文重音、标点、slug / 短名式输入
    - `fur elise`、`twinkle`、`scarborough` 应能命中对应曲目
  - family filter
  - `Featured` / `A–Z` 浏览切换
  - `A–Z` 模式下的字母跳转

## 3. 必读顺序

仓库根目录还有一份 `AGENTS.md`，它把这套阅读顺序和发布前预检写成了仓库级规则。

1. `README.md`
2. `docs/handoff.md`
3. `docs/agent-handoff.md`
4. `docs/kuailepu-compatibility-roadmap.md`
5. `docs/manual-runtime-qa-checklist.md`
6. `src/lib/kuailepu/runtime.ts`
7. 目标曲目的 `data/kuailepu-runtime/<slug>.json`

如果任务是“公开详情页最小脚本集 / 快乐谱旧资产减载”，再补读：

8. `docs/public-runtime-asset-profiles.md`

## 4. 关键文件别搞混

- `data/kuailepu-runtime/*.json`
  - 生产可部署 raw 真相层
  - runtime 详情页优先吃这个
- `reference/songs/*.json`
  - 本地导歌 / 调试 fallback
- `data/kuailepu/*.json`
  - 可提交轻量 SongDoc
  - catalog / metadata / SEO 主要读这个
- `src/lib/kuailepu/runtime.ts`
  - 当前 runtime 兼容和字母谱覆盖层核心
- `src/components/song/KuailepuLegacyRuntimePage.tsx`
  - 详情页外壳，不是 runtime 本体
- `src/components/song/KuailepuRuntimeFrame.tsx`
  - iframe 装载、loading 移除、高度同步
- `scripts/sync-kuailepu-static.mjs`
  - 启动前把必需静态资源同步到 `public/k-static`
- `docs/public-runtime-asset-profiles.md`
  - 公开页最小资产 profile、保留资产和恢复路径说明
- `src/lib/songbook/presentation.ts`
  - 详情页英文 SEO 文案生成器，不是谱面真相
- `src/app/sitemap.ts`
  - sitemap 真相层，直接列出公开 song pages
- `src/app/robots.ts`
  - robots 真相层，负责声明 sitemap 入口
- `src/lib/site.ts`
  - 站点 URL 与 verification 常量

## 4.5 当前对 HC 引擎的最小正确认知

- 已证实：
  - 历史公开版曾使用 split：
    - `hc_*.js`
    - `hc.kit_*.js`
  - 当前 live 公开页已切到：
    - `hc.min_02d898293e.js`
  - 历史 `hc` 主文件更偏 parser / lexer / layout / SVG render 主链。
  - 历史 `hc.kit` 更偏 MIDI / harmonizer / chord / instrument / fingering 等支撑层。
  - runtime archive 与生产 raw JSON 里都已经能看到和弦字段与节点，不要把这些能力误判成“历史废代码”。
- 高概率推测：
  - 当前 monolithic `hc.min` 更像旧 `hc + hc.kit` 的合包演化版，而不是单纯改名。
- 暂无证据：
  - 没找到公开 sourcemap 或真正可用的未压缩源码版。

本地研究材料在：

- `reference/hc-history-investigation/2026-04-02/hc-engine-structure-map.md`
- `reference/hc-history-investigation/2026-04-02/hc-module-evidence-matrix.md`

注意：

- `reference/` 默认是本地研究层，已被 gitignore 忽略。
- 这些研究文件帮助理解 runtime 和后续拆解，不是生产依赖。

## 5. 当前已上线的字母谱语义

- 默认 `letter`
- 备选 `number`
- `both` 已移除
- `Fingering + Lyrics` 已移除
- 简谱 `0` -> 字母谱 `R`
- 延时线仍是 `-`
- 支持 `Eb5`、`F#5` 等完整标签
- 换气符号是西式逗号
- 保留歌词、指法图、结构信息
- 隐藏简谱专属时值/附点/八度点等低价值符号

## 6. 登录态规则

开始涉及快乐谱导歌、compare、capture 之前，先执行：

```bash
npm run check:kuailepu-login
```

如果失效，立刻提醒人工重新：

```bash
npm run login:kuailepu
```

不要在登录失效状态下继续假设 compare 结果可靠。

补充：

- “公开页已本地化可显示” 不等于 “导歌和 compare 可以脱离快乐谱运行”。
- 公开页的静态资源依赖已经本地化，但导歌 / compare / preflight 仍然要读取快乐谱详情页上下文。

## 6.5 网络 / VPN 规则

- 快乐谱导歌、compare、preflight、登录态检查、线上上下文调试，默认需要中国可达网络。
- Google / western 网站调研、国外搜索结果核实，可能需要国外 VPN。
- 不要默认两边网络同时可用。
- 如果任务需要切到另一侧网络，先明确告诉用户切换 VPN，再继续。
- 如果快乐谱登录失效，也不要继续硬跑脚本；先停下来，让用户手动执行 `npm run login:kuailepu`。

## 7. 发布前必须走的门槛

```bash
npm run preflight:kuailepu-publish -- <slug...>
```

注意：

- preflight 会先检查快乐谱登录态
- preflight 会自动找可用端口并启动本地 dev server
- 如果 `3000` 被占用，会自动切换到别的可用端口
- compare 仍然读取 `allSongCatalog`
- compare 仍然强制本地 runtime 为 `note_label_mode=number`
- compare 仍然比对最终 `svg.sheet-svg` 哈希

如果 compare 不过：

- 不要先改 catalog 公开状态
- 先查是不是登录态失效、url 错、模式错、raw JSON 错

## 8. 如果用户让你“加歌”

标准动作：

1. 检查登录态
2. 搜快乐谱
3. 优先找英文歌词版
4. 导入 raw JSON 与 `data/kuailepu/*.json`
5. 本地开 dev server
6. 跑 compare
7. 通过后再公开

不要省略 compare。

当前额外背景：

- 这轮已经整理过一份“国外 ocarina 流量较高的公版曲目候选名单”。
- 但快乐谱站内搜索对不少候选曲命中很差，继续加歌时要准备英文名、中文名、别名、标题变体一起试，必要时人工导航。

## 9. 如果用户让你“改字母谱效果”

优先改：

- `src/lib/kuailepu/runtime.ts`

不要优先改：

- raw JSON
- `Song.draw()` 原始逻辑
- 旧 `SongClient` 详情页

处理顺序：

1. 先确认 `number` 模式下原谱正常
2. 再改字母谱覆盖层
3. 改完至少手看 1 首短歌和 1 首长歌

## 10. 如果用户让你“改 SEO 文案 / 首页文案”

优先看：

- `src/lib/songbook/presentation.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`

要遵守：

- 纯英文
- 自然覆盖搜索词
- 不暴露第三方来源
- 首页列表只显示歌名
- 当前常用搜索词不只限于 `ocarina tabs`，还会用第二搜索词补 `ocarina notes`、`recorder notes`、`tin whistle notes`

## 11. 常见错误心智模型

下面这些理解都是错的：

- “song page 现在主要是我们自己的 renderer”
- “captured SVG 还是主数据源”
- “字母谱是新开一轨”
- “compare 应该对 letter 模式做比对”
- “前台写来源说明有助于 SEO”

## 12. 当前数量口径

- 公开 song pages：60
- 全部候选：60
- raw JSON：60
- 可提交轻量导入：54

不要拿这些数字互相强行对应。

## 12.5 当前未提交但重要的工作区状态

- 到 2026-04-02 这次交接整理时，待提交的是一整组相关改动：
  - Playwright 修复
  - `KuailepuRuntimeFrame` loading 修复
  - `/k-static` 静态同步链与压缩静态快照
  - favicon 补齐
  - `runtime.ts` 的英文标点规范化
- `tsconfig.tsbuildinfo`、调试截图、`.tmp` 文件、临时日志都不应重新带进提交。

## 12.6 当前新对话必须知道的最近收尾结果

- 详情页模式切换按钮当前已经改成：
  - `Letter Notes`
  - `Numbered Notes`
- 首页 song list 卡片当前只显示歌名，`Ocarina Song` 已移除。
- 详情页左上角当前已有 `Back to Song Library` 返回入口。
- `Down By the Salley Gardens` 的混合中英副标题残留，已经并入统一英文化链处理：
  - 入口在 `src/lib/songbook/kuailepuEnglish.ts`
  - runtime 侧仍由 `src/lib/kuailepu/runtime.ts` 消费这层结果
- `Down By the Salley Gardens` 之前残留的人名全角中文逗号，也已并入 runtime 统一规范化，不再只靠单歌修补。
- 当前短中文副标题 / 民歌标签 / 版本标签的常见英文化，已经有一层固定映射：
  - 如 `日本民歌 -> Japanese folk song`
  - `英文版 -> English lyrics version`
- 难度标签规则已经收紧：
  - 长曲篇幅不再单独把歌曲推到 `Intermediate to advanced`
  - 更依赖速度、升降号密度，或“篇幅 + 技术负担”的组合
- 公开详情页现在对快乐谱旧资产采用新的规范：
  - 默认可以停用当前不用的旧脚本注入
  - 但不要删除本地静态快照文件
  - 未来恢复登录 / 播放等功能时，应优先调整 runtime asset profile
  - 当前 `public-song` 默认已从 28 个模板脚本收缩到 6 个
- 处理 HC 相关旧资产时，先沿着
  `Kit.context.setContext -> Song.draw()/Song.compile() -> hc.parse -> renderSheet`
  判断主链依赖，不要把 HC 误当成“单纯 SVG renderer”来删东西
  - 当前建议先停在这版，不要继续无上限扩张 compatibility stub

## 13. 新对话可直接复制的起始提示词

`Continue on the runtime-backed Kuailepu song-page architecture. Read README.md, docs/handoff.md, docs/agent-handoff.md, docs/kuailepu-compatibility-roadmap.md, docs/manual-runtime-qa-checklist.md, and src/lib/kuailepu/runtime.ts in that order before making changes. Keep public /song/<slug> pages on deployable raw JSON plus the original Kuailepu runtime path, with letter mode as default and number mode as optional. Do not restore SongClient as the public detail page. Keep all visible copy in English and do not expose Kuailepu/reference wording on the public site. Treat `public/k-static` as the synced public artifact generated by `scripts/sync-kuailepu-static.mjs`, not as a dynamic route concern. If the task needs Kuailepu import, compare, preflight, or login checks, require a China-reachable network; if it needs Google/western research, ask for a foreign VPN first. If Kuailepu login is invalid, stop and ask the user to run npm run login:kuailepu.`

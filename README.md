# Project V-Tabs

面向 Google / western 用户、以 ocarina 为主并已公开支持 recorder / tin whistle 的 melody song page 站点。当前公开站点的默认详情页已经收敛到快乐谱兼容 runtime 路线，默认显示字母谱，简谱作为可选阅读模式保留。

## 交接优先读

新对话、新程序员、或者重新接手这个项目时，先按下面顺序读：

1. `README.md`
2. `docs/handoff.md`
3. `docs/agent-handoff.md`
4. `docs/kuailepu-compatibility-roadmap.md`
5. `docs/manual-runtime-qa-checklist.md`
6. `src/lib/kuailepu/runtime.ts`

如果任务涉及快乐谱兼容、导歌、上线、字母谱、SEO 文案，仅读 `README.md` 不够，至少还要继续读上面的 4 份文档。

仓库根目录现在额外有一份 `AGENTS.md`，用于让新对话优先遵守这套阅读顺序和发布前预检流程。

如果任务涉及“公开详情页最小脚本集”或快乐谱旧资产减载，额外继续看：

- `docs/public-runtime-asset-profiles.md`

如果任务涉及“内部打印 PDF”“未授权版权曲本地工作流”或 `MusicXML` 私有输入，额外继续看：

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

## 网络协作规则

- 快乐谱相关动作：
  - 导歌
  - compare
  - preflight
  - 登录态检查
  - 线上上下文排障
  都依赖能访问快乐谱详情页的网络环境，通常需要中国可达网络。
- Google / 国外站点调研、关键词查证、western 用户侧资料核实，通常需要国外 VPN。
- 不要默认两种网络可同时使用。
- 如果当前任务需要切换到另一侧网络，先明确告诉用户切换 VPN，再继续。
- 如果 `npm run check:kuailepu-login` 或 preflight 提示登录失效，应停止后续快乐谱动作，先让用户手动执行：
  ```bash
  npm run login:kuailepu
  ```

## Git 提交规范

以后每次提交都按下面规则执行：

- 提交信息必须写中文
- 不能只写一句短标题
- 至少写清楚：
  - `变更`
  - `原因`
  - `验证`

仓库里已经补了两层约束：

- `.gitmessage.txt`
  - 提供推荐模板
- `.husky/commit-msg`
  - 对中文和详细度做最低限度校验

## 当前真实状态

以 2026-04-20 当前工作区为准：

- 站点面向 western 用户，前台可见文案必须是英文。
- 公开详情页 `/song/<slug>` 的真相链路是：
  `data/kuailepu-runtime/<slug>.json -> Kit.context.setContext(...) -> Song.draw()/compile() -> final SVG`
- 当前公开的 `130` 个 song pages 默认都走 runtime 详情页，不再回退到旧的 `SongClient` 原生详情页。
- `captured SVG` 不再是公开详情页的数据源，只保留“本地视觉基线 / 回归排查 / 调试对照”用途。
- 默认阅读模式是 `letter`。
- 公开可选阅读模式只有两个：
  - `letter`
  - `number`
- `both` 已移除。
- `Fingering + Lyrics` 已移除。
- 字母谱不是新开一轨，而是直接复用简谱那一轨的位置、间距、节拍、歌词、指法图，只把数字替换成字母音名。

## 2026-04-02 补充状态

- 公开 runtime 现已默认注入 `runtime_text_mode=english`。
- 对仍保留显示的 SVG 文本，标题、副标题、作曲/作词/编曲等可见文案会统一走英文转换。
- 调号 `1=...`、纯拍号、速度类 `=120` 信息以及指法图谱上方的乐器 / 指法标题行，当前在 english runtime 下默认隐藏。
- 这条隐藏规则同样作用于公开 song page、`/dev/print/song/<slug>` 和 `/dev/pinterest/song/[id]` 这几条 english runtime 入口。
- `/k-static/...` 现在优先是 `public/k-static` 下的静态同步产物，不再主要依赖动态 route。
- `scripts/sync-kuailepu-static.mjs` 会在 `dev` / `build` / `start` 前自动执行，把 `vendor/kuailepu-static` 与 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt` 里当前模板实际需要的资源同步到 `public/k-static`。
- `vendor/kuailepu-static` 现在带着一份快乐谱线上实际部署版的压缩静态快照；模板仍引用旧 i18n hash 时，会通过同步脚本兼容映射到线上仍存在的压缩包内容。
- 公开生产链路已不再要求部署环境存在 `reference/`；`reference/` 现在只保留给本地导歌、compare、登录态与调试用途。
- 这意味着公开 song page 在中国以外网络也能正常显示曲谱与指法图；但“导歌 / compare / 登录态检查”仍然依赖能访问快乐谱详情页上下文。
- 重复公开入口 `silent-night-english`、`jingle-bells-english` 已清理，只保留单一公开歌曲入口。
- 本轮新增并通过 preflight compare 的 5 首歌：
  - `jasmine-flower`
  - `arirang`
  - `toy-march`
  - `cavalry-march`
  - `sakura-sakura`
- `scripts/preflight-kuailepu-publish.ts` 已修复一处登录误判问题：`npm` 输出和 Node warning 不应再把有效登录态误判成失效。
- 公开 runtime 英文化链已新增全角标点规范化，避免可见区域残留 `，` 这类中式标点。
- 详情页 iframe loading 与高度同步逻辑已从 server component 内联脚本拆到 `src/components/song/KuailepuRuntimeFrame.tsx`，首页点进详情页时 loading overlay 不会再卡住不消失。
- favicon 现在已补齐：
  - `src/app/icon.svg`
  - `public/favicon.ico`
  - `src/app/layout.tsx` 已声明 `metadata.icons`
- SEO / GSC 基础链现已切到 Next App Router metadata routes：
  - `src/app/sitemap.ts` 直接基于公开 `songCatalog` 生成 sitemap
  - `src/app/robots.ts` 统一输出 `robots.txt`
  - 不再依赖 `next-sitemap` 或仓库内静态 `public/sitemap*.xml`
  - `icon.svg` 不应再进入 sitemap
- 首页 metadata 已补齐基础项：
  - `metadataBase`
  - 显式 canonical
  - `robots`
  - `google-site-verification`
- 首页 song library 现已补上轻量找歌交互：
  - title 搜索
  - 搜索已兼容常见英文别名式输入：
    - 忽略重音符号（如 `Für` -> `fur`）
    - 忽略连字符 / 标点
    - 支持用短名或 slug / id 片段搜索（如 `twinkle`、`scarborough`）
  - family filter
  - `Featured` / `A–Z` 切换
  - `A–Z` 模式下的字母跳转条
  - song card 仍然只显示歌名
- Vercel 线上已人工检查通过：
  - `/song/ode-to-joy`
  - `/song/jasmine-flower`
  - `/song/arirang`
  - `number` 模式切换
  - `/api/kuailepu-runtime/...`
  - 实际被页面引用的 `/k-static/...` CSS/JS 资源
- Playwright 当前已经恢复可直接运行：
  - `playwright.config.ts` 固定使用 `http://127.0.0.1:3000`
  - `webServer` 改为 `port: 3000`
  - `e2e/core.spec.ts` 已对齐当前 runtime-backed 产品流
- 公开详情页开始收敛到“最小公开资产 profile”：
  - 默认只停用当前公开页不需要的旧脚本注入
  - 不删除 `vendor/kuailepu-static` / `public/k-static` 里的保留资产
  - 未来如果要恢复登录、播放、收藏、节拍器等能力，优先改 runtime asset profile，而不是重新找线上资源
  - 当前 `public-song` 默认已把模板脚本从 28 个收缩到 6 个，保留 `full-template` 作为恢复入口
  - 当前建议先停在这版，不再继续做更激进的脚本删减，除非后续有明确收益证据

## 2026-04-20 最新补充

- 当前工作区公开曲库数量已更新为 `130`。
- 当前工作区最新已导入但尚未 push 的 3 首灰度曲：
  - `casablanca`
  - `its-a-small-world`
  - `kiss-the-rain`
- 这 3 首当前已经补到本地内容层：
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts`
- 本轮又补跑了一轮中国网络下的快乐谱 western / public-domain discovery：
  - 一批英文 holiday / folk / classroom 标题直搜大多是 `noResult` 后回退热门曲，不能当真候选
  - 中文常用别名能命中的大多已经在当前公开曲库里
  - 当前没有新的强公版曲进入 queued import list
- 如果后续还要继续按“适合 Google 用户”的标准筛歌，优先顺序应为：
  - 先在中国网络下继续做快乐谱发现
  - 再切国外 VPN 做更严格的 western-demand / keyword screen
- `data/songbook/kuailepu-western-candidate-pool.json` 当前应视作“已基本挖空，等待新的发现线索”，不要默认里面还藏着一批现成可导目标。

## 2026-04-19 历史补充

- 当前公开曲库数量已更新为 `124`。
- 本轮新增并通过 preflight compare 的 3 首灰度歌：
  - `let-it-be`
  - `take-me-home-country-roads`
  - `over-the-rainbow`
- 快乐谱线上核心运行时当前已切到：
  - `cdn/js/dist/hc.min_1cfae5fe62.js`
- 当前模板引用的 i18n 包已切到：
  - `cdn/js/i18n/all_2916f8e4dd.js`
- 本地 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt` 已同步到线上当前模板和资源 hash。
- compare / preflight 当前已补强到更接近快乐谱 live 真相的模式：
  - compare 本地 runtime 默认走 `runtime_asset_profile=full-template`
  - compare 本地 runtime 显式传 `runtime_compare_mode=1`
  - compare 本地 clean browser context 固定 `locale = zh-CN`
- 这轮确认的根因不是只有旧 `hc` hash：
  - 线上 `hc` 升级确实带来了潜在漂移
  - 但之前更关键的假性 compare 失败来自本地 compare 用 `en-US` clean context，而快乐谱 live 实际跑在 `zh-CN` 环境下
- 这条修正完成后：
  - 新增 3 首灰度歌 `15 / 15` 组合已全部通过
  - 额外回归的 9 首既有公开样本歌 `45 / 45` 组合也已全部通过

## 当前数量口径

当前工作区里几组数字不要混淆：

- `songCatalog.length = 130`
  - 当前真正对外公开的 song pages 数量。
- `allSongCatalog.length = 130`
  - 当前仓库里保留的全部 catalog 曲目数量，已与公开 song pages 对齐。
- `data/songbook/public-song-manifest.json = 130`
  - 当前公开内容层 manifest 数量。
- `data/kuailepu-runtime/*.json = 130`
  - 当前生产可部署的快乐谱 raw JSON 数量。
- `reference/songs/*.json = 131`
  - 本机原始研究层数量，主要给导歌与本地调试用；已移除旧重复/残留条目。
- `data/kuailepu/*.json = 124`
  - 可提交的轻量导入结果数量。

- 上面这组 `130` 指的是当前本地工作区口径。
  - 如果要确认哪些已经 push / live，先看 `git status --short --branch` 和 `git log --oneline origin/main..HEAD`。

为什么这些数字对不上：

- `data/kuailepu-runtime` 是生产部署要带上的 raw 数据层。
- `reference/songs` 是本机 raw 研究层，不等于公开曲库。
- `data/kuailepu` 只存“导入后的轻量 SongDoc”，不含全部手工 catalog。
- `songCatalog` 是 dedupe 后的总曲库再叠加 `data/songbook/public-song-manifest.json` 得到的最终公开视图。
- `allSongCatalog` 现在已经收口到与公开曲库一致，不再保留无快乐谱 raw JSON 基础的未上线手工候选。

## 当前文件优先内容层

从 2026-04-03 这轮开始，项目的“公开内容层”开始明确收口到文件化数据，而不是继续把 publish/order/family/SEO profile 状态散落在页面代码里。

- `data/songbook/public-song-manifest.json`
  - 当前公开内容层真相文件。
  - 负责：
    - 哪些歌公开
    - 首页策展顺序
    - 歌曲 family 分类
- `src/lib/songbook/publicManifest.ts`
  - 读取并归一化这份 manifest。
  - 给 `catalog.ts`、`presentation.ts`、首页和脚本层提供统一入口。
- `data/songbook/song-seo-profiles.json`
  - 当前 song-specific SEO profile 真相文件。
  - 负责：
    - `searchTerms`
    - `aliases`
    - `background`
    - `practice`
- `src/lib/songbook/seoProfiles.ts`
  - 读取并归一化 song SEO profile。
  - 给 `presentation.ts`、`validate-content.ts`、`doctor-song.ts` 复用。

`presentation.ts` 现在只保留 fallback 生成逻辑；如果新歌暂时没配显式 SEO profile，页面不会空掉，但 `validate:content` 会对公开歌曲给出 warning。

## 当前内部打印工作流

- 已新增内部打印预览页：
  - `/dev/print/song/<slug>`
- 已新增本地 PDF 导出脚本：
  - `npm run export:print-pdf -- --slug <slug> ...`
- 这条链当前是“内部工具”，不是公开产品入口：
  - 继续复用 deployable raw JSON + 原始 Kuailepu runtime 主链出谱
  - 我们自己控制打印页壳、纸张方向和 PDF 导出
  - 当前不向前台公开打印按钮
- 当前打印 PDF 已支持加入站点导流文案：
  - `playbyfingering.com`
- 当前仓库管理规则：
  - `exports/` 必须本地保留，不提交
  - `private/` 必须本地保留，不提交
  - `reference/` 继续只用于本地研究和调试
- 更完整的内部执行规范见：
  - `docs/internal-print-workflow.md`

## 当前前台文案口径

- 详情页模式切换按钮当前文案：
  - `Letter Notes`
  - `Numbered Notes`
- 这是面向英语用户的更直白文案。
- `numbered notation` 仍可作为内部描述或 SEO 背景词，但当前前台主操作文案优先用 `numbered notes`。
- 公开 song page 现已支持最小显示开关：
  - `Fingering Chart`：同一下拉框内负责 `Chart On` / `Chart Off`，多图谱乐器也在这里切方向
  - `Lyrics`：仅在存在公开可见歌词轨时显示 `On` / `Off`
  - `Measure Numbers`：`On` / `Off`
  - `Layout`：`Compact` / `Equal Width`
  - `Zoom`：复用快乐谱原有 `sheet_scale`
  - `Metronome`：`On` / `Off`
- 公开 song page 现已支持最小公开乐器切换：
  - 默认 `o12`：`12-Hole AC Ocarina`
  - 可选 `o6`：`6-Hole Ocarina`
  - 可选 `r8b`：`English 8-Hole Recorder`
  - 可选 `r8g`：`German 8-Hole Recorder`
  - 可选 `w6`：`Irish Tin Whistle`
- 乐器切换仍走同一条 runtime-backed `/song/<slug>` 主链，不单开旧详情页或新渲染路线。
- 这批显示开关同样继续走 `/song/<slug>` query state，不单开新页面或客户端自管状态。
- 如果某首歌未来只支持其中部分公开乐器，前台只显示该曲实际支持的乐器选项。

## 2026-04-03 多乐器补充状态

- 已新增内部审计脚本：
  - `npm run audit:kuailepu-instruments`
- 当前公开曲库里的 130 首 song pages 全部带有 deployable raw JSON：
  - `o12`
  - `o6`
  - `r8b`
  - `r8g`
  - `w6`
  以及更多快乐谱乐器入口。
- 其中当前已公开给前台的最小乐器集现已包括：
  - `o12`
  - `o6`
  - `r8b`
  - `r8g`
  - `w6`
- 中国网络下已对 5 首样本歌做 live-vs-local `number` 模式 SVG hash 对照：
  - `ode-to-joy`
  - `twinkle-twinkle-little-star`
  - `scarborough-fair`
  - `jingle-bells`
  - `fur-elise`
- 检查维度为 5 个公开乐器：
  - `o12`
  - `o6`
  - `r8b`
  - `r8g`
  - `w6`
- 最终结果为 `25 / 25` 组合一致，说明当前公开多乐器页在这批样本下的指法图谱与快乐谱 live 页一致。
- 本轮还修掉了一处多乐器默认值问题：
  - 显式切换乐器后，不应继续沿用 payload 根层原本属于默认乐器的 `fingering` / `show_graph`
  - 修复点在 `src/lib/kuailepu/runtime.ts`
- `w6` 现已按最小公开乐器接入 song page，继续沿用 query state：
  - 非默认乐器使用 `?instrument=<id>`
  - 默认 `o12` 仍不写 query
  - canonical 仍收口到 `/song/<slug>`
- `w6` 的中国网络下 live-vs-local parity 已补跑通过；当前这批 5 首样本歌在 5 个公开乐器上的组合结果为 `25 / 25` 一致。
- 公开 song page 的功能区现已收口为“同一页内的 runtime 状态控制”：
  - 下拉选择：`Instrument`、`Fingering Chart`、`Layout`、`Zoom`
  - `Fingering Chart` 下拉同时负责开 / 关，以及多图谱乐器的方向选择
  - 切换按钮：`Note View`、`Lyrics`（仅公开可见歌词）、`Measure Numbers`、`Metronome`
- 节拍器现已公开为内嵌式工具条：
  - 仍由快乐谱原始 metronome 脚本驱动
  - 但会停靠在指法图谱上方，不再以遮挡谱面的弹窗出现
  - `Time Signature`、`BPM`、`Start` / `Stop` 等可见文案已统一为英文
- 纯中文歌词轨当前遵守产品层隐藏规则：
  - 默认不显示中文歌词
  - 前台也不显示 `Lyrics` 开关
  - 即使手动拼 `show_lyric=on`，公开页也不应重新暴露纯中文歌词

## 当前交接前的剩余注意事项

到 2026-04-05 当前交接时，核心 runtime 主链、多乐器公开、功能区、节拍器、SEO 文案、最新一轮导歌和内部打印工作流都已经收口完成；当前更重要的是把“仓库状态”交接清楚，而不是继续临时重构主链。

- 当前公开曲库数量是 `111` 首。
- 最近一轮新增公开曲包括：
  - `aura-lee`
  - `simple-gifts`
  - `the-south-wind`
  - `lough-leane`
  - `romance-damour`
  - `wellerman`
  - `bella-ciao`
  - `jolly-old-saint-nicholas`
  - `joy-to-the-world`
  - `home-on-the-range`
  - `la-cucaracha`
  - `drinking-song`
  - `el-condor-pasa`
  - `happy-new-year`
  - `spanish-bullfighting-tune`
  - `woodpecker-polka`
  - `blacksmith-polka`
  - `loch-lomond`
  - `grenadiers-march`
  - `the-internationale`
  - `russian-national-anthem`
  - `parade-of-the-wooden-soldiers`
  - `katyusha`
  - `moscow-nights`
  - `troika`
  - `the-pathway`
  - `red-berries-blossom`
  - `the-hawthorn-tree`
- 新对话或准备上线前，先执行：
  - `git status --short --branch`
  - `git log --oneline origin/main..HEAD`
- 如果本地分支比远端超前，不要直接假设“只差一次 push”；先逐个确认这些本地提交是否都已经过当前任务需要的复核。
- `tsconfig.tsbuildinfo`、调试截图、`.tmp` 文件、临时日志都属于噪音，不应重新带入提交。

## 架构真相

当前项目同时保留两条链，但公开主链只有一条：

- 公开详情页主链：
  - `data/kuailepu-runtime/<slug>.json -> runtime iframe -> 快乐谱原始渲染逻辑 -> final SVG`
- 保留中的站点原生链：
  - `SongDoc -> notation -> MIDI -> 指法字典 -> 自有 React 页面`

必须明确：

- 公开详情页不是直接展示快乐谱线上已经渲染好的 SVG。
- 也不是我们自己写的近似 renderer 在模仿快乐谱。
- 而是本地 iframe 内真正跑快乐谱原始前端渲染链。

## 当前 HC 引擎认知

到 2026-04-02 这轮本地研究为止，当前对 HC 本体的最小正确认知是：

- 已证实：
  - 历史公开版曾长期使用 split 结构：
    - `hc_*.js`
    - `hc.kit_*.js`
  - 当前 live 公开页已切到单文件：
  - `hc.min_1cfae5fe62.js`
  - 历史 `hc` 主文件更明确承担 parser / lexer / layout / SVG render 主链职责。
  - 历史 `hc.kit` 更偏支撑层：
    - `MidGen`
    - `MidiHarmonizer`
    - `MidiFont`
    - `MidiChord`
    - `MidiKey`
    - 乐器 / 指法辅助
  - runtime archive 与生产 raw JSON 已可见和弦相关痕迹：
    - `CHORD_NAME`
    - `ChordNode`
    - `show_chord_name`
    - `chordName`
    - `chordNotes`
- 高概率推测：
  - 当前 monolithic `hc.min` 更像历史 split `hc + hc.kit` 的合包演化版，而不只是把旧 `hc` 改了文件名。
- 暂无证据：
  - 没找到公开 sourcemap
  - 没找到真正可用的未压缩源码版

本地研究材料已放在：

- `reference/hc-history-investigation/2026-04-02/`

注意：

- `reference/` 默认是本地研究层，已被 gitignore 忽略。
- 这些材料用于帮助后续拆解和理解 runtime，不是生产部署依赖。

## HC 维护边界

- 不要把 HC 理解成“只是最终把谱转成 SVG 的 renderer”。
- 当前更安全的理解链路是：
  `Kit.context.setContext(...) -> Song.draw()/Song.compile() -> hc.parse -> renderSheet -> final SVG`
- 所以以后做快乐谱旧资产减载、脚本 profile 收缩、兼容性排障时，不要只凭文件名猜“这个脚本看起来像播放器 / 登录 / UI，所以肯定和主链无关”。
- 默认先顺着主链确认依赖，再决定是否让公开页默认不加载某些旧模块。

## 公开 Runtime 资产规范

- 对快乐谱旧 JS/CSS 做减载时，默认策略是：
  - 公开详情页默认不加载
  - 本地快照资产继续保留
  - 恢复路径要继续明确存在
- 不要把“当前公开页不用”误解成“可以把文件从仓库里删掉”。
- 优先在 `src/lib/kuailepu/runtime.ts` 里通过 asset profile 控制注入。
- 只有确认未来不再需要、且恢复路径已经另有保障时，才讨论物理删除资产文件。
- 当前详细分组和恢复策略见：
  - `docs/public-runtime-asset-profiles.md`

## 关键文件地图

- runtime 真相层：
  - `src/lib/kuailepu/runtime.ts`
  - `src/lib/kuailepu/assetProxy.ts`
  - `src/app/api/kuailepu-runtime/[id]/route.ts`
  - `src/components/song/KuailepuLegacyRuntimePage.tsx`
  - `src/components/song/KuailepuRuntimeFrame.tsx`
  - `src/app/song/[id]/page.tsx`
- 曲库与导入层：
  - `src/lib/songbook/catalog.ts`
  - `src/lib/songbook/importedCatalog.ts`
  - `src/lib/songbook/publicManifest.ts`
  - `src/lib/songbook/seoProfiles.ts`
  - `src/lib/songbook/kuailepuImport.ts`
  - `data/kuailepu/*.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
- runtime 校验脚本：
  - `scripts/sync-kuailepu-static.mjs`
  - `scripts/validate-content.ts`
  - `scripts/doctor-song.ts`
- SEO / indexing 基础层：
  - `src/app/sitemap.ts`
  - `src/app/robots.ts`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/song/[id]/page.tsx`
  - `src/lib/site.ts`
  - `scripts/check-kuailepu-login.ts`
  - `scripts/compare-kuailepu-runtime-live.ts`
  - `scripts/import-kuailepu-song.ts`
  - `scripts/search-kuailepu-song.ts`
- SEO / 页面文案层：
  - `src/lib/songbook/presentation.ts`
  - `src/app/page.tsx`
  - `src/app/layout.tsx`
  - `src/app/icon.svg`
  - `public/favicon.ico`

## 本地开发

```bash
npm install
npm run dev
```

默认本地地址：

```text
http://127.0.0.1:3000
```

常用页面：

- 首页：
  - `http://127.0.0.1:3000`
- 详情页：
  - `http://127.0.0.1:3000/song/we-wish-you-a-merry-christmas`
- 直接看 runtime：
  - `http://127.0.0.1:3000/api/kuailepu-runtime/we-wish-you-a-merry-christmas`

常用内容脚本：

- `npm run validate:content`
  - 校验公开 manifest、SongDoc 与 deployable raw JSON 是否一致。
- `npm run doctor:song -- <slug-or-id>`
  - 快速查看单曲的公开状态、manifest、歌词可见性、公开乐器和 SEO 基本信息。

## 快乐谱登录态与本地数据

本机忽略目录：

- `reference/songs/*.json`
- `reference/auth/kuailepu-profile/`

另外，当前生产必需但可提交的运行时资产还有：

- `data/kuailepu-runtime/*.json`
- `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`

这些文件用于：

- 保存快乐谱详情页完整 raw JSON
- 保存 Playwright 复用的快乐谱登录态

它们的特点：

- 对 runtime 详情页是关键真相源
- 对导歌和 compare 脚本是基础依赖
- 不应该当成公开站点的可提交 catalog

可提交数据：

- `data/kuailepu/*.json`
- `data/songbook/public-song-manifest.json`
- `data/songbook/song-seo-profiles.json`

它们用于：

- 站点 song catalog
- 公开状态 / 首页排序 / family 分类
- SEO 文案输入
- 首页与详情页路由元数据

## 当前字母谱规则

用户已经确认并上线的规则如下：

- 默认显示字母谱。
- 简谱通过 `?note_label_mode=number` 切换查看。
- 不再支持同时显示“字母谱 + 简谱”。
- 字母谱复用简谱那一轨的位置和节拍，不改单曲源数据。
- 支持显示 `Eb5`、`F#5`、`C5` 这类完整字母音名。
- 字母谱休止符使用 `R`。
- 字母谱延时线保留 `-`。
- 字母谱换气符号使用西式逗号样式。
- 保留：
  - 指法图
  - 歌词
  - 小节/反复/乐句结构信息
- 隐藏：
  - 简谱专属八度点
  - 附点
  - 简谱独立升降号字形
  - 简谱 `V` 换气符号
  - 价值较低的简谱专属短时值线

最重要的技术边界：

- 不改 raw JSON。
- 不改快乐谱核心 `Song.draw()` / `Song.compile()` 逻辑。
- 字母谱只在 runtime 输出 SVG 之后做一层可逆显示替换。

## 导歌与上线流程

推荐操作顺序：

1. 先确认快乐谱登录态：
   ```bash
   npm run check:kuailepu-login
   ```
2. 如果失效，提醒人工重新登录：
   ```bash
   npm run login:kuailepu
   ```
3. 搜索目标曲：
   ```bash
   npm run search:kuailepu -- "Twinkle Twinkle Little Star" "一闪一闪小星星"
   ```
4. 导入 raw JSON 与轻量 SongDoc：
   ```bash
   npm run import:kuailepu -- https://www.kuaiyuepu.com/jianpu/IgFEa125F.html --slug=twinkle-twinkle-little-star
   ```
5. 发布前做 parity compare：
   ```bash
   npm run compare:kuailepu-runtime -- http://127.0.0.1:3000 twinkle-twinkle-little-star
   ```
6. compare 通过后，再确认 `data/kuailepu/<slug>.json` 的公开状态。

也可以直接用统一预检脚本：

```bash
npm run preflight:kuailepu-publish -- twinkle-twinkle-little-star
```

它会自动：

- 跑 `npm run check:kuailepu-login`
- 在本地启动 dev server
- 如果 `3000` 被占用，自动切换到可用端口
- 再运行 compare

补充说明：

- 即使公开页静态资源已经本地化，`preflight` 仍然需要快乐谱登录态有效，因为它要读取快乐谱线上详情页上下文做 compare。
- 如果用户当前网络无法访问快乐谱，公开页可以继续本地查看，但导歌、compare、preflight 仍应等到可访问快乐谱的网络环境再执行。

当前选源规则必须执行：

- 如果快乐谱同时存在英文歌词版和中文歌词版，优先英文歌词版。
- 搜索不能只搜一轮。
- 英文名、中文名、别名、标题变体都要试。
- 如果多轮搜索后仍不确定是否存在英文版，要明确标注“未找到英文版，需要人工再找一轮”。
- 如果只有中文歌词版，当前英文站默认关闭歌词轨，不直接把中文歌词展示给 western 用户。

## 发布前硬门槛

当前最低发布门槛不是“看起来差不多”，而是下面这套：

1. `npm run check:kuailepu-login`
2. 如失效，人工执行 `npm run login:kuailepu`
3. `npm run compare:kuailepu-runtime -- http://127.0.0.1:3000 <slug...>`
4. 只有 compare 通过，才允许公开

注意：

- compare 脚本现在会遍历 `allSongCatalog`，不只看已公开歌曲。
- compare 时强制使用 `note_label_mode=number`。
- 因为发布 gate 校验的是“快乐谱原版真相”，不是我们的字母谱覆盖层。

## 已确认的验证结果

当前已经确认：

- `npm run check:kuailepu-login` 在本轮会话成功。
- 27 首原本 `published: false` 的快乐谱候选已与线上快乐谱最终 `#sheet` SVG 比对，全部哈希一致。
- `data/kuailepu/*.json` 当前都已是 `published: true`。
- `npm run typecheck` 在本轮会话已多次通过。
- 详情页模式切换按钮当前已是：
  - `Letter Notes`
  - `Numbered Notes`
- 首页列表卡片当前只显示歌名。
- 详情页当前已有 `Back to Song Library` 返回按钮。
- 难度标签规则已收紧，长曲篇幅不再单独触发 `Intermediate to advanced`。

## 2026-04-17 当前已推送状态

- 当前公开 song pages 数量已更新为 `124`。
- 本轮已补齐并准备上线 / 已上线的 3 首新曲为：
  - `yesterday`
  - `the-sound-of-silence`
  - `right-here-waiting`
- 这 3 首当前都已完成：
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts` 现有 learn / hub 内链接入
  - 中国网络下的 compare / preflight 校验
- 内部 Pinterest 导图链当前也已补完一轮稳定性收尾：
  - 无 artwork 的预览页按内容高度收口
  - 导图导出脚本改为等待布局稳定后按导图终点裁切
  - `Frere Jacques` 的 `English 8-Hole Recorder` 导图版式已补齐
- 首页、learn 入口页和 song page SEO 壳层当前已额外自然覆盖：
  - `tabs`
  - `finger chart`
  - `fingering chart`
  这批词来自 2026-04-17 本地导出的 GSC 近 28 天 query 小样本观察，不代表流量已大，但足够说明词面覆盖应更贴近真实搜索。
- song page SEO 模板当前也已补过一轮语法收口：
  - 避免出现 `melody melody`
  - 避免出现 `a intermediate` 这类错误冠词

## 2026-04-18 当前已推送状态补丁

- `origin/main` 当前又包含两条已推送的 runtime 壳层修复：
  - `b66621b`：收敛公开详情页 iframe 高度同步的 `1px` 回摆，修复详情页下边缘持续轻微抖动
  - `3d12359`：对齐快乐谱窄屏标题字号策略，放大公开详情页移动端与窄桌面标题
- 当前对 iframe 抖动问题的结论已经明确：
  - 根因是宿主测高与 iframe 内 bridge 同时参与同步，且两边补偿值曾存在 `+2 / +1` 差异
  - 当前已收敛到稳定高度，不应再重新引入 `N / N+1` 的来回写高度
- 当前对窄屏标题策略的边界也已经明确：
  - 只调顶部居中主标题的 `font-size`
  - 不改 `y`
  - 不加 `transform`
  - 不移动指法图、歌词、音符或字母谱覆盖层
- 这轮排查也顺手确认了一条不要再轻易重试的实验方向：
  - 不要用“渲染后整体下压 / 上移头部文本块”去收紧标题与图谱之间的空白
  - 原因是这会波及 `Play order` 这类复合头部元素，也可能诱发歌词 / 字母谱 / 指法图相对关系问题
  - 如果以后要继续处理头部空白，优先回到快乐谱 `head height` / 上游布局层分析，不要继续在最终 SVG 成品上做位置平移实验

## 2026-04-15 历史本地待审核状态记录

- 当前 `origin/main` / 线上公开数量是 `111` 首。
- 本地工作区又导入了一批**已 commit、尚未 push** 的灰度曲：
  - `moon-river`
  - `can-you-feel-the-love-tonight`
  - `yesterday-once-more`
- 本地工作区还额外有一首**已导入、已补本地公开内容层、但尚未 commit / 尚未 push** 的灰度曲：
  - `zeldas-lullaby`
- 这 3 首当前在本地已经完成：
  - `reference/songs/<slug>.json`
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts` 现有 learn / hub 内链接入
  - 中国网络下 `npm run validate:content`
  - `npm run doctor:song -- <slug>`
  - `npm run preflight:kuailepu-publish -- moon-river can-you-feel-the-love-tonight yesterday-once-more`
- `zeldas-lullaby` 当前在本地也已经完成：
  - `reference/songs/zeldas-lullaby.json`
  - `data/kuailepu-runtime/zeldas-lullaby.json`
  - `data/kuailepu/zeldas-lullaby.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts` 现有 learn / hub 内链接入
  - 中国网络下 `npm run validate:content`
  - `npm run doctor:song -- zeldas-lullaby`
  - `npm run preflight:kuailepu-publish -- zeldas-lullaby`
- 所以：
  - 本地待审核工作区如果把这 4 首算进去，会暂时是 `115`
  - 但在真正 push 之前，不要把它说成“线上已经 115”
- 当前仓库还新增了一份内部灰度曲追踪文件：
  - `data/songbook/grey-song-rollout.json`
- `/dev/song-import-dashboard` 现在也会单独展示：
  - `Grey Song Tracker`
  - 用来区分 `live`、`committed-local`、`imported-only` 三种灰度曲状态
- 当前新增协作规则：
  - 完整任务已完成、且本地必要验证已经通过时，可以自行 `commit` 留档
  - **任何 push 前都必须先得到用户明确同意**
  - 不要因为本地验证通过就默认可以上线

## 2026-04-16 历史 Pinterest 本地补丁记录

- 当前工作区除了上面 4 首灰度曲待审核状态，还额外有一组**未 commit 的 Pinterest 导图本地调整**：
  - `scripts/export-pinterest-pin.ts`
  - `src/app/dev/pinterest/song/[id]/page.tsx`
  - `src/components/song/KuailepuRuntimeFrame.tsx`
  - `src/lib/songbook/pinterestPins.ts`
- 这轮 Pinterest 本地调整的目标是：
  - 让内部 `/dev/pinterest/song/[id]` 预览页在无 artwork 的版本下按内容高度收口，不再强制 1500 高度
  - 让导图导出脚本优先按导图终点与稳定后的内容高度裁切，而不是盲目截固定画布
  - 补一张 `Frere Jacques` 的 `English 8-Hole Recorder` Pinterest pin，并反复调到“不右侧截断、底部完整、footer 保留”的版本
- 当前本地 `exports/pinterest-first-wave/` 已清理到只剩：
  - `amazing-grace.png`
  - `frere-jacques.png`
  - `manifest.json`

## 2026-04-18 Pinterest 导图当前默认流程

- 当前内部 Pinterest 导图链已经从“手动调窗口后截图”收口到“命令行稳定导出”：
  - 入口页仍保留：
    - `src/app/dev/pinterest/page.tsx`
    - `src/app/dev/pinterest/song/[id]/page.tsx`
  - 当前默认导图命令：
    ```bash
    npm run export:pinterest-portrait -- --slug <slug> --instrument <o12|o6|r8b|r8g|w6>
    ```
- 当前默认导图参数是：
  - 视口宽高 `500 x 1280`
  - `dpr=2`
  - `capture=canvas`
  - 默认起始 `sheet_scale=11`
  - 自动把最终宽度收口到约 `1000px`
  - 自动把最终高度收口到不超过 `1700px`
- 当前导图脚本会做的后处理：
  - 等待 `/dev/pinterest/song/[id]` 布局稳定
  - 截取完整导图画布，不中间截断谱面
  - 保留原始 runtime 标题，不再改成外部重绘标题
  - 对最终 PNG 裁掉“标题和首行指法图谱之间”的空白横带
  - 如果图仍然过高，自动下调 `sheet_scale` 再重导，直到满足高度上限或触底
- 当前建议：
  - 先直接用默认命令批量导图
  - 只有个别长歌或短歌观感不理想时，再单独覆写 `--sheet-scale`
- 当前仓库管理规则不变：
  - `exports/` 只保留本地，不进入 git
  - 不要把 `exports/` 下的测试图或成品图当成应提交资产
- 当前对部署的判断：
  - `/dev/pinterest` 路由继续保留在仓库即可
  - 就算一起部署到线上，对公开 `/song/<slug>` 用户页性能影响也很小
  - 原因是它属于独立 dev route，不参与公开 song page 的运行时主链
  - 但产品定位仍然是 internal-only，不需要对外暴露入口
- 注意：
  - `exports/` 继续只保留本地，不进入 git
  - 新对话不要再假设“本地唯一脏文件通常只剩 tsconfig.tsbuildinfo”
  - 真正接手前仍然先看：
    - `git status --short --branch`
    - `git log --oneline origin/main..HEAD`

## 2026-04-20 Pinterest 合集 PDF 方向确认

- 当前已确认一个新的 internal-only 方向：
  - 基于现有 Pinterest 导图链，新增“多首歌合集 PDF”自动化导出
- 当前产品定位：
  - 面向 Google / western 用户
  - 默认输出 `A4`
  - 纯电子分发优先，不额外为站内公开打印做产品承诺
- 当前已确认的输入/输出规则：
  - 输入：当前公开曲库内的歌名列表
  - 只匹配当前库里的歌；不在库里的歌不进入这条合集链
  - 输出：单个合集 PDF
  - 包含封面、目录、歌曲标题、正文分页
  - 目录显示：歌名 + 该歌起始页码
- 当前已确认的分页规则：
  - 每首歌从新页开始
  - 如果单页放不下，就继续自动分页，直到这首歌完整结束
  - 当前更像“按歌为 section 的文档导出”，不是简单图片拼接
- 当前更推荐的工程路线：
  - 复用现有 Pinterest 导图 / 预览链
  - 新增内部 HTML 集合页，再由 Playwright 导出 A4 PDF
  - 这样更容易支持封面、目录、页码和按歌曲 section 分页
- 这条链当前只是方向确认，尚未实现为可执行脚本。

## SEO 与前台文案规则

当前站点的 SEO 方向已经明确：

- 首页列表卡片只显示歌名。
- 首页右上角黑框指标区已移除。
- 详情页可以有较完整的英文介绍、FAQ、使用说明。
- 文案目标是 SEO landing page，而不是写乐理文章。
- 关键词应自然覆盖：
  - `ocarina tabs`
  - `ocarina notes`
  - `recorder notes`
  - `tin whistle notes`
  - `letter notes`
  - `finger chart`
  - `fingering chart`
- 详情页文案现在不应再把站点写成只支持 `12-hole AC ocarina` 的单乐器产品。
- `presentation.ts` 里的 `searchTerms` 现已按“主词 + 次词”收口：
  - `searchTerms[0]` 通常是主查询，例如 `song name ocarina tabs`
  - `searchTerms[1]` 用来覆盖第二搜索意图，例如 `song name recorder notes` 或 `song name ocarina notes`
- 如果某首歌存在稳定英文别名、译名或常用副标题，新增或上线时应同步补进 `data/songbook/song-seo-profiles.json` 的 `aliases`：
  - 让首页列表页搜索能命中别名
  - 让详情页 title / description / 正文自然覆盖别名搜索
- 禁止在前台写：
  - “参考了快乐谱”
  - “来源是快乐谱”
  - “Kuailepu source”
  - 任何类似来源披露文案

## 常见坑

- 如果页面底部出现大片空白，先查 iframe 高度桥接脚本，不要先怀疑 raw JSON。
- 如果出现半透明灰色遮罩，先查 `.lean-overlay` 是否还被隐藏。
- 如果长页出现 iframe 自己的细滚动条，先查 runtime 文档的 `overflow-y: hidden` 是否还在。
- 如果字母谱和简谱比对不上，先用 `number` 模式验证快乐谱原版是否正常，再查字母谱覆盖层。
- 如果 compare 失败，先确认是不是误用了 `letter` 模式。
- 如果有人提议“直接把头部文字块往下压 / 往上提”来消灭标题和图谱之间的空白，先停下来。
  - 这条路已经做过本地实验，容易波及 `Play order`、歌词和字母谱相对位置，不应再当成低风险热修。

## 交接前最后一轮建议

当前这轮交接前，最值得做的不是再改核心逻辑，而是持续执行下面几件事：

1. 每次新增或准备上线曲子，都先跑 Playwright compare，再决定是否公开。
2. 每次改 `runtime.ts` 里的字母谱逻辑，都先用 `number` 模式确认没有污染原谱。
3. 每次新增 song page 文案，都检查前台是否仍然全英文且没有来源披露。
4. 新对话继续前，先读本文档和 `docs/handoff.md`，不要凭旧上下文记忆接着改。

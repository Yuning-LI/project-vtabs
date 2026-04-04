# Handoff Notes

这份文档写给“第一次接手这个项目的新程序员”。目标不是概述，而是尽量把当前业务、架构、上线流程、注意事项写成可直接执行的说明。

## 1. 项目当前是什么

这是一个面向 Google 搜索流量和 western 用户、以 ocarina 为主并已公开支持 recorder / tin whistle 的 melody song page 站点。

当前产品已经不是“通用乐谱实验场”，而是一个非常明确的业务形态：

- 首页是英文 song library landing page。
- 详情页是英文 SEO landing page + 可直接演奏的曲谱页。
- 公开详情页默认显示字母谱。
- 简谱仍可切换查看。
- 指法图始终是核心内容。
- 字母谱与简谱都只是阅读模式，真相源是快乐谱 raw JSON + 快乐谱原始渲染链。

### 1.1 2026-04-02 最新补充

本轮最新状态要额外记住下面这些点：

- 公开 runtime 已补齐英文文本模式，`Composer`、`Play order`、`12-hole ocarina Bb fingering` 这类 SVG 内可见标签也已在我们自己的 runtime 后处理中英文化。
- 公开页当前默认不再依赖 `www.kuaiyuepu.com/static/...` 的实时静态资源；脚本、字体、i18n 包、播放器依赖等已补到本地 `vendor/kuailepu-static`。
- `/k-static` 现在优先是 `public/k-static` 下的静态同步产物，不再主要依赖动态 route。
- `scripts/sync-kuailepu-static.mjs` 会在 `dev` / `build` / `start` 前自动执行，把 `vendor/kuailepu-static` 与 runtime archive 里的必需资源同步到 `public/k-static`。
- `vendor/kuailepu-static` 当前包含一份快乐谱线上实际部署版的压缩静态快照，供公开页离线复用。
- 公开生产链路已脱离 `reference/` 硬依赖：
  - 生产 raw JSON 优先读 `data/kuailepu-runtime/<slug>.json`
  - runtime 模板归档优先读 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
  - `reference/` 现在只保留给本地导歌 / 调试 fallback
- `silent-night-english` 与 `jingle-bells-english` 这两个重复公开入口已经删除，只保留单一歌曲入口。
- 本轮新导入并通过 preflight compare 的公开曲目有 5 首：
  - `jasmine-flower`
  - `arirang`
  - `toy-march`
  - `cavalry-march`
  - `sakura-sakura`
- `scripts/preflight-kuailepu-publish.ts` 已修掉一个脚本层误判：之前 `npm` 横幅和 Node warning 可能导致登录检查 JSON 解析失败，看起来像“登录掉了”，但实际是脚本读错输出。
- runtime 文本英文化链已经补上：
  - `轻吹 -> Soft blow`
  - `重吹 -> Strong blow`
- runtime 英文化规范化链已补上全角中文标点清理：
  - 例如 `Herbert Hughes ，Benjamin Britten` 现在会规范成 `Herbert Hughes, Benjamin Britten`
- 详情页 runtime loading / 高度同步逻辑已拆到 `src/components/song/KuailepuRuntimeFrame.tsx`：
  - 不再依赖 `KuailepuLegacyRuntimePage.tsx` 里的 server component 内联脚本
  - 首页点进详情页时 loading overlay 已确认会正常消失
- favicon 已补齐：
  - `src/app/icon.svg`
  - `public/favicon.ico`
  - `src/app/layout.tsx` 已声明 `metadata.icons`
- sitemap / robots / canonical 基础链已收口到 Next App Router metadata routes：
  - `src/app/sitemap.ts` 直接从公开 `songCatalog` 枚举 sitemap URL
  - `src/app/robots.ts` 统一输出 `robots.txt`
  - `src/app/layout.tsx` 现在统一维护 `metadataBase` 与 `google-site-verification`
  - 首页 canonical 已显式补齐
  - `icon.svg` 不应再进入 sitemap
  - 不再依赖 `next-sitemap` 或提交到仓库里的静态 `public/sitemap*.xml`
- 线上 `https://www.playbyfingering.com/` 已实际检查通过：
  - `/song/ode-to-joy`
  - `/song/jasmine-flower`
  - `/song/arirang`
  - `number` 模式切换
  - `/api/kuailepu-runtime/...`
  - 实际被页面引用的 `/k-static/...` CSS/JS 资源
- Playwright 当前已经恢复到“仓库内测试可直接运行”的状态：
  - `playwright.config.ts` 固定走 `127.0.0.1:3000`
  - `webServer` 已改为 `port: 3000`
  - `e2e/core.spec.ts` 已对齐当前 runtime-backed 产品流
- 公开详情页对快乐谱旧资产的处理规则已经收敛：
  - 当前公开页不需要的旧脚本可以默认停用注入
  - 但本地快照资产不能随手物理删除
  - 恢复登录 / 播放 / 收藏 / 节拍器等能力时，优先改 runtime asset profile
  - 当前 `public-song` 默认已从 28 个模板脚本收缩到 6 个，`full-template` 仍保留完整恢复入口
  - 当前建议先停在这版，不再继续激进扩大 stub 范围

### 1.1.1 2026-04-04 最新导歌补充

- 本轮新增并通过 preflight compare 的 3 首公版曲：
  - `aura-lee`
  - `simple-gifts`
  - `the-south-wind`
- 中国网络下已对这 3 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `15 / 15` 组合一致
- 其中：
  - `Aura Lee` 的快乐谱页明确带有英文别名 `Aura Lee`
  - `Simple Gifts` 当前为器乐版，无公开歌词
  - `The South Wind` 当前为英文标题器乐版，无公开歌词
- 本轮后续又新增并通过 preflight compare 的 2 首公版曲：
  - `lough-leane`
  - `romance-damour`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `Lough Leane` 当前为英文标题器乐版，无公开歌词
  - `Romance d'Amour` 当前导入自 `爱的罗曼史 / 《禁忌的游戏》插曲` 器乐页，无公开歌词

### 1.2 2026-04-03 多乐器最新补充

- 公开 song page 已经支持最小多乐器切换：
  - `o12` -> `12-Hole AC Ocarina`（默认）
  - `o6` -> `6-Hole Ocarina`
  - `r8b` -> `English 8-Hole Recorder`
  - `r8g` -> `German 8-Hole Recorder`
  - `w6` -> `Irish Tin Whistle`
- 公开 song page 也已接入一批最小显示开关，继续直接复用快乐谱 runtime 状态：
  - `Fingering Chart`：同一下拉内负责开 / 关，多方向图谱乐器也在这里切方向
  - `Lyrics`：仅在存在公开可见歌词轨时显示开 / 关
  - `Measure Numbers`：开 / 关
  - `Layout`：`Compact` / `Equal Width`
  - `Zoom`
  - `Metronome`：开 / 关
- 这组乐器切换仍然完全走原有公开主链：
  - `/song/<slug>` 页面壳
  - iframe
  - deployable raw JSON
  - 原始 Kuailepu runtime
- 当前前台不会为缺失乐器的歌曲显示占位按钮；未来如果某首歌只支持其中部分公开乐器，只显示实际支持项。
- `scripts/audit-kuailepu-instruments.ts` 已加入仓库，可直接盘点当前公开曲目 raw JSON 里的快乐谱乐器支持情况。
- `docs/instrument-rollout-plan.md` 记录了当前建议公开顺序和为什么不建议一次性把全部快乐谱乐器都放到前台。
- 中国网络下已对 5 首样本歌做 live-vs-local `number` 模式 SVG hash 对照：
  - `ode-to-joy`
  - `twinkle-twinkle-little-star`
  - `scarborough-fair`
  - `jingle-bells`
  - `fur-elise`
- 每首歌检查：
  - `o12`
  - `o6`
  - `r8b`
  - `r8g`
  - `w6`
- 最终结果：
  - `25 / 25` 组合一致
  - 说明这批样本下本地公开 runtime 的指法图谱已经与快乐谱 live 页对齐
- 本轮同时修掉了一处关键默认值问题：
  - 切到 recorder 时，不应继续继承 payload 根层属于默认乐器的 `fingering` / `show_graph`
  - 修复位置在 `src/lib/kuailepu/runtime.ts`
- `w6` 爱尔兰哨笛现已按最小改法接入公开 song page：
  - 前台标签使用 `Irish Tin Whistle` / `Tin Whistle`
  - 非默认乐器继续使用 `?instrument=<id>` query state
  - 默认 canonical 仍收口到 `/song/<slug>`
- compare / preflight 现已补强到可直接覆盖当前公开乐器集，包括 `w6` 这类不在快乐谱 live 页下拉显式暴露的乐器。
- 关键做法是对 live 页直接回放 local runtime context，不再继续把 `fingering_index` 等下拉索引硬套到 live 页可见 select。
- 节拍器现已按最小改法公开到前台：
  - 继续复用快乐谱原始 metronome 脚本
  - 公开页只额外做英文文案与停靠式工具条改造
  - 工具条会固定插在指法图谱上方，不再以遮挡谱面的弹窗出现
  - 当前公开可见项只有 `Metronome` On / Off，不再保留泛化的 `Practice Tool` 入口

## 2. 当前用户已经确认过的业务规则

这些不是建议，是当前产品已确认规则：

- 站点前台文案必须是英文。
- 不要在前台展示“参考了快乐谱”“来源是快乐谱”之类措辞。
- 首页列表每首歌只显示歌名，不显示摘要。
- 首页列表现在已补上轻量找歌交互：
  - 搜索框
    - 搜索对英文重音、连字符、常见短名更宽容
    - 例如 `fur elise`、`twinkle`、`scarborough` 都应能直接命中
  - family filter
  - `Featured` / `A–Z` 切换
  - `A–Z` 模式下的字母跳转条
  但 song card 仍然只显示歌名，不额外展开摘要。
- 首页不再区分 `Verified For Playtest` / `Still Pending Review`。
- 首页不再显示 `pending` / `rechecked` 标签。
- 首页右上角黑框统计信息已移除。
- 详情页允许出现较完整的英文介绍、FAQ、使用说明，因为这些文案承担 SEO 作用。
- 字母谱默认开启。
- “字母谱 + 简谱同时显示”已移除。
- 简谱保留为可选模式。
- 公开 song page 现在除了 note mode 外，还支持最小公开乐器切换：
  - `12-Hole AC Ocarina`（默认）
  - `6-Hole Ocarina`
  - `English 8-Hole Recorder`
  - `German 8-Hole Recorder`
  - `Irish Tin Whistle`
- 乐器切换仍然只是同一个 `/song/<slug>` 页面上的 runtime 状态切换，不是新开第二条公开详情页架构。
- 如果某首歌 raw JSON 未来只支持其中部分公开乐器，前台只显示实际可用项。
- 纯中文歌词轨默认不对 western 用户显示。
- 只有存在公开可见歌词轨时，前台才显示 `Lyrics` 开 / 关。
- 公开页即使手动拼 `show_lyric=on`，也不应重新暴露纯中文歌词。
- 字母谱休止符使用 `R`。
- 字母谱延时线保留 `-`。
- 字母谱换气符号使用西式逗号样式。
- 字母谱保留结构与乐句信息，隐藏简谱专属时值符号。

## 3. 当前架构真相

必须先把“什么是当前真相源”看清楚。

### 3.1 公开详情页主链

当前 `/song/<slug>` 的真实渲染链是：

`data/kuailepu-runtime/<slug>.json -> Kit.context.setContext(rawObject) -> Song.draw()/Song.compile() -> final SVG`

中间包装层是：

- 外层 Next.js 页面壳
- 中间一个 iframe
- iframe 里跑快乐谱兼容 runtime HTML

### 3.2 这条链不是什么

它不是：

- 把快乐谱线上已经渲染好的 SVG 抓下来直接显示
- 我们自己写的简化版 JSON renderer
- 站点原生 `SongClient` 页面

### 3.3 为什么这点重要

因为这决定了后续所有修改应该遵守的边界：

- 详情页谱面问题，先查 runtime 兼容层。
- 不是先去修旧的原生 `SongClient`。
- 也不要把 `captured SVG` 重新扶正成默认详情页数据源。

### 3.4 当前对 HC 引擎本体的认知

到 2026-04-02 当前本地研究为止，下面这些点已经足够作为后续维护时的最小正确心智模型：

- 已证实：
  - 历史公开版长期存在 split 结构：
    - `hc_*.js`
    - `hc.kit_*.js`
  - 当前 live 公开页已经切到单文件：
    - `hc.min_02d898293e.js`
  - 历史 `hc` 主文件更明显承担 parser / lexer / layout / SVG render 主链职责。
  - 历史 `hc.kit` 更偏支撑层：
    - `MidGen`
    - `MidiHarmonizer`
    - `MidiFont`
    - `MidiChord`
    - `MidiKey`
    - 乐器 / 指法辅助
  - runtime archive 和生产 raw JSON 里都已经能看到和弦相关字段或节点：
    - `CHORD_NAME`
    - `ChordNode`
    - `show_chord_name`
    - `chordName`
    - `chordNotes`
- 高概率推测：
  - 当前 monolithic `hc.min` 更像历史 split `hc + hc.kit` 的合包演化版，而不只是旧 `hc` 主文件简单改名。
- 暂无证据：
  - 没找到公开 sourcemap
  - 没找到真正可用的未压缩源码版

本地研究材料保存在：

- `reference/hc-history-investigation/2026-04-02/hc-engine-structure-map.md`
- `reference/hc-history-investigation/2026-04-02/hc-module-evidence-matrix.md`

注意：

- `reference/` 默认是本地研究层，不是生产部署依赖。
- 这些文件默认不会进入 git 提交，因为 `reference/` 已被忽略。

### 3.5 这组 HC 认知为什么重要

它至少会影响三类后续决策：

- 第一，不要把 HC 当成“只负责最终 SVG 输出”的单薄 renderer。
  当前更安全的主链理解是：
  `Kit.context.setContext(...) -> Song.draw()/Song.compile() -> hc.parse -> renderSheet -> final SVG`
- 第二，做快乐谱旧资产减载时，不要只凭文件名判断依赖关系。
  公开页默认不加载某些旧脚本是可以的，但是否能停用，应该先沿着主链和实际触发路径确认。
- 第三，如果以后要继续拆 HC 或逐步去 iframe 化，最值钱的不是继续赌 sourcemap，而是沿着：
  - `Kit.context.setContext`
  - `Song.draw()/Song.compile()`
  - `hc.parse`
  - `renderSheet`
  这几处入口积累结构认知。

## 4. 当前保留的第二条链是什么

仓库里仍然保留站点原生链：

`SongDoc -> notation -> MIDI -> 指法字典 -> 自有 React 页面`

它还在的原因：

- dev 预览仍会用到
- 未来如果要逐步去 iframe 化，这条链是迁移基础
- catalog / SEO / 轻量数据转换仍需要它

但要明确：

- 它不是当前公开详情页的默认产品路线
- 不能因为它还能打开，就把 runtime 缺失问题静默回退过去

## 5. 当前数量口径与它们的含义

以本轮收尾时的工作区为准：

- `songCatalog.length = 68`
  - 当前公开 song pages 数。
- `allSongCatalog.length = 68`
  - 当前仓库保留的总曲库数，已与公开 song pages 对齐。
- `data/songbook/public-song-manifest.json = 68`
  - 当前公开内容 manifest 数量。
- `data/kuailepu-runtime/*.json = 68`
  - 当前生产可部署 raw JSON 数量。
- `reference/songs/*.json = 68`
  - 本机原始研究层数量，已清理旧重复 / 残留参考文件。
- `data/kuailepu/*.json = 62`
  - 可提交的轻量导入数量。

为什么数量会不一致：

- `songCatalog` 是 dedupe 后的总曲库再叠加 `data/songbook/public-song-manifest.json` 得到的最终公开视图。
- `allSongCatalog` 现在已与公开视图对齐，不再保留无快乐谱 raw JSON 基础的未上线手工候选。
- `data/kuailepu-runtime` 是生产 raw 真相层，数量不要求等于公开数。
- `reference/songs` 是本地导歌 / 调试层，不要求等于公开数。
- `data/kuailepu` 是轻量导入层，不覆盖所有手工 catalog。

这一点在排障时尤其重要。不要因为看到某首歌有 raw JSON，就默认它一定已经公开。

## 6. 文件责任地图

### 6.1 runtime 真相层

- `src/lib/kuailepu/runtime.ts`
  - 最关键文件。
  - 负责：
    - 读取 raw JSON
    - 从保存的快乐谱 HTML 模板拼 runtime 页面
    - 注入隐藏样式
    - 注入 iframe 高度桥接脚本
    - 做字母谱覆盖层
- `src/app/api/kuailepu-runtime/[id]/route.ts`
  - 返回 runtime HTML，不是返回 JSON。
- `src/components/song/KuailepuLegacyRuntimePage.tsx`
  - 站点详情页外壳。
  - 负责页面壳、模式切换、SEO 文案区域。
- `src/components/song/KuailepuRuntimeFrame.tsx`
  - 负责 iframe 装载、loading overlay、消息桥接、高度同步。
- `src/app/song/[id]/page.tsx`
  - song route 入口。
  - 当前原则是：找不到 raw JSON 就 `notFound()`，不再回退到旧详情页。
- `src/lib/kuailepu/assetProxy.ts`
  - 同源静态资源代理。

### 6.2 曲库与导入层

- `src/lib/songbook/catalog.ts`
  - 手工 catalog + 导入 catalog 去重后的总入口。
  - 公开 songCatalog 还会继续叠加 public manifest。
- `src/lib/songbook/importedCatalog.ts`
  - 读取 `data/kuailepu/*.json`。
- `src/lib/songbook/publicManifest.ts`
  - 读取 `data/songbook/public-song-manifest.json`。
  - 负责统一公开状态、首页排序、family 分类。
- `src/lib/songbook/seoProfiles.ts`
  - 读取 `data/songbook/song-seo-profiles.json`。
  - 负责统一 song-specific SEO profile。
- `src/lib/songbook/kuailepuImport.ts`
  - 把快乐谱 payload 转成轻量 SongDoc。
- `data/kuailepu-runtime/*.json`
  - 生产可部署的完整 raw JSON。
- `data/kuailepu/*.json`
  - 可提交的轻量数据。
- `data/songbook/public-song-manifest.json`
  - 当前文件优先的公开内容层真相文件。
- `data/songbook/song-seo-profiles.json`
  - 当前文件优先的 song SEO profile 真相文件。
- `reference/songs/*.json`
  - 本地导歌 / 调试 fallback。

### 6.3 SEO 与前台英文文案层

- `src/lib/songbook/presentation.ts`
  - 生成 song page 英文标题、meta、介绍、FAQ。
  - 当前只保留 fallback 文案生成，不再内嵌整份 song-specific profile 数据。
- `src/app/page.tsx`
  - 首页 SEO landing page。
- `src/app/layout.tsx`
  - 全站 metadata 和 `html lang="en"`。
- `src/app/sitemap.ts`
  - 公开 sitemap 真相层，直接基于 `songCatalog` 输出。
- `src/app/robots.ts`
  - 公开 robots 真相层，负责指向 sitemap。
- `src/lib/site.ts`
  - 站点 URL 与 GSC verification 常量。

### 6.4 脚本层

- `scripts/check-kuailepu-login.ts`
  - 检查快乐谱 Playwright 登录态是否还有效。
- `scripts/sync-kuailepu-static.mjs`
  - 在 `dev` / `build` / `start` 前同步 `public/k-static`。
- `scripts/validate-content.ts`
  - 校验 public manifest、SongDoc、deployable raw JSON 之间是否一致。
- `scripts/doctor-song.ts`
  - 快速输出单曲公开状态、歌词可见性、公开乐器、SEO 基本信息。
- `scripts/login-kuailepu.ts`
  - 建立或刷新登录态。
- `scripts/search-kuailepu-song.ts`
  - 搜索目标曲。
- `scripts/import-kuailepu-song.ts`
  - 导入 raw JSON 和轻量 SongDoc。
- `scripts/compare-kuailepu-runtime-live.ts`
  - 发布前 parity gate。
- `docs/public-runtime-asset-profiles.md`
  - 公开 runtime 最小资产集、保留资产和恢复路径规范。

## 7. 为什么必须保留同源静态资源代理

快乐谱 runtime 依赖原站大量 JS/CSS。

如果让浏览器直接在 `localhost` 页面里加载第三方静态资源，常见问题包括：

- 脚本被浏览器策略拦截
- iframe 内部资源失效
- 原始 `Song.draw()` 链条跑不起来

所以当前策略是：

- 浏览器请求我们自己的 `/k-static/...`
- `scripts/sync-kuailepu-static.mjs` 在启动前把当前模板要用到的资源同步到 `public/k-static`
- 同步来源优先是本地 `vendor/kuailepu-static`
- 本地快照缺失时，再从 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt` 里抽取
- 默认不再静默回源快乐谱线上静态文件

这层代理不是“功能性 feature”，而是 runtime 这条主链能工作的基础设施。

### 7.3 旧资产减载的操作规范

- 以后对快乐谱旧 JS/CSS 做公开页减载时，优先做“默认不加载”，不要直接删快照文件。
- 默认控制点在 `src/lib/kuailepu/runtime.ts` 的 runtime asset profile，而不是 `vendor/` 或 `public/k-static/` 的物理删除。
- 这样做是为了同时保住：
  - 当前公开页的更小脚本集
  - 未来恢复登录、播放、收藏、节拍器等功能时的可追溯恢复路径
- 当前资产分组和恢复说明单独写在：
  - `docs/public-runtime-asset-profiles.md`

### 7.2 线上验证口径

到本轮交接时，已经实测确认：

- Vercel 部署版本可直接打开公开详情页
- runtime API 不再因缺少 `reference/快乐谱代码.txt` 而失败
- `number` 模式切换能正确落到 `?note_label_mode=number`
- 页面实际引用的 `/k-static/...` 资源可返回 `200`

### 7.1 这层代理现在解决了什么问题

之前公开页虽然已经吃本地 raw JSON，但 runtime 静态依赖仍可能在缺失时去拉快乐谱线上资源。结果是：

- 中国以外网络访问不到快乐谱时
- 指法图脚本链会断
- 页面会报 `/k-static/...` 500
- 用户会误以为“我们的 song page 挂了”

现在公开页默认本地优先，所以上面这类问题已经从“线上依赖”变成“本地资源是否补齐”的问题，排障面收缩很多。

但要明确：

- 导歌
- compare
- preflight
- 登录态检查

这些流程仍然需要访问快乐谱详情页上下文，所以它们和“公开页能否正常显示”不是同一件事。

## 8. 字母谱实现的真实策略

这个项目之前讨论过“单独给字母谱新开一轨”，但当前已经落地的策略不是那条。

当前实际策略是：

- 快乐谱先按原逻辑生成简谱 SVG。
- 再在 SVG 上把简谱数字覆盖成字母音名。
- 位置、间距、节拍、歌词、指法图沿用原来的。
- 源数据不改。

### 8.1 当前已确认的显示语义

- `0` 不再显示成 `0`，而是显示成 `R`
- 延时线保留 `-`
- 支持 `Eb5`、`F#5` 这类完整标签
- 换气符号使用西式逗号
- 保留小节、反复、乐句等结构信息
- 隐藏简谱专属八度点、附点、简谱独立升降号、简谱 `V` 换气符号、价值低的简谱短时值线

### 8.2 为什么 compare 必须回到 number 模式

因为字母谱是我们自己的覆盖层，而不是快乐谱原始真相。

所以：

- 发布前 parity gate 必须校验 `number`
- 不能拿 `letter` 模式做线上对比

这条规则已经写进 `scripts/compare-kuailepu-runtime-live.ts`

## 9. 登录态与会话管理

快乐谱导歌和 compare 依赖本地登录态：

- 登录态目录：`reference/auth/kuailepu-profile/`
- 检查命令：
  ```bash
  npm run check:kuailepu-login
  ```
- 失效后刷新：
  ```bash
  npm run login:kuailepu
  ```

运行 `login:kuailepu` 时：

- 会打开可见 Playwright 浏览器
- 人工完成登录
- 回到终端按 Enter

之后：

- `import:kuailepu`
- `capture:kuailepu-sheet`
- `compare:kuailepu-runtime`

都可以复用这份 profile。

如果登录掉了，应该第一时间提醒人工重新登录，不要继续假设脚本还能稳定拿到详情页上下文。

## 9.5 网络 / VPN 协作规则

- 快乐谱相关工作：
  - 导歌
  - compare
  - preflight
  - 登录态检查
  - 线上上下文排障
  默认依赖中国可达网络。
- Google / western 网站调研、国外搜索结果核实，往往需要国外 VPN。
- 不要默认两种网络能同时访问。
- 如果当前任务需要另一侧网络，应先明确告诉用户切换 VPN，再继续。
- 如果 `check:kuailepu-login` 或 preflight 判断登录失效，正确动作不是继续重试脚本，而是停下来让用户手动执行：
  ```bash
  npm run login:kuailepu
  ```

## 10. 导歌策略

### 10.1 当前选源优先级

如果快乐谱同时有英文歌词版和中文歌词版：

- 优先英文歌词版

这条规则是因为站点现在面向 western 用户，而不是因为 runtime 技术限制。

### 10.2 搜索规则

不要只搜索一轮。

至少应尝试：

- 英文名
- 中文名
- 常见别名
- 标题变体

如果多轮搜索后仍不能确定有没有英文版：

- 记录“未确认”
- 提醒人工再找一轮
- 不要武断宣布“快乐谱只有中文版”

### 10.3 只有中文歌词版怎么办

当前处理方式：

- 仍可导入 raw JSON
- 仍可上线谱面和指法图
- 但英文站默认关闭歌词轨

这条逻辑在 `src/lib/kuailepu/runtime.ts` 的 `shouldHideLyricTrackByDefault()` 中。

## 11. 上线门槛

当前发布前最低门槛已经固定下来：

1. `npm run check:kuailepu-login`
2. 如失效，人工重新 `npm run login:kuailepu`
3. `npm run compare:kuailepu-runtime -- http://127.0.0.1:3000 <slug...>`
4. compare 通过后，才允许公开

当前 compare 脚本要点：

- 遍历 `allSongCatalog`
- 自动读取生产 raw JSON（本地可 fallback 到 `reference/songs/<slug>.json`）
- 强制本地 runtime 使用 `note_label_mode=number`
- 比对线上快乐谱和本地 runtime 最终 `svg.sheet-svg` 的哈希

## 12. 目前已经完成的验证

到本轮交接为止，已经确认：

- 快乐谱登录检查可用
- 27 首原本未发布的快乐谱候选已经补跑 compare
- 这 27 首与线上快乐谱最终 `#sheet` SVG 全部哈希一致
- 当前 `data/kuailepu/*.json` 都已为 `published: true`
- 本地首页已确认只有歌名，没有评审状态和来源文案
- 详情页已确认不再显示 source/Kuailepu 引导文案
- `amazing-grace`、`canon`、`greensleeves` 等公开页已确认看不到中文标签，指法标题英文化后不再因 `textLength` 压缩而重叠
- 中国以外网络下，公开页已确认可以不访问快乐谱线上静态资源而正常显示指法图
- 线上 `ode-to-joy`、`jasmine-flower`、`arirang` 详情页已确认能在公开域名正常打开
- `Down By the Salley Gardens` 的可见残留已进一步收口到标点级别，runtime 现已把全角中文逗号规范成英文逗号

## 13. SEO 层当前策略

### 13.1 目标

详情页文案要服务搜索引擎，但不能写成堆词垃圾页。

当前策略是：

- 标题、描述、正文、FAQ 都保持英文
- 内容围绕曲目本身
- 自然覆盖高价值搜索词

### 13.2 高价值关键词方向

当前常用覆盖词：

- `song name ocarina tabs`
- `song name ocarina notes`
- `song name recorder notes`
- `song name tin whistle notes`
- `song name letter notes`
- `fingering chart`
- `numbered notation`

补充：

- `presentation.ts` 里的 `searchTerms[0]` 是主搜索词，通常承接 `ocarina tabs`
- `searchTerms[1]` 是第二搜索词，用来补 `ocarina notes` / `recorder notes` / `tin whistle notes` 这类次意图
- 当前文案不应再把所有详情页都写成只支持 `12-hole AC ocarina`

### 13.3 明确禁止

前台禁止出现：

- “Kuailepu source”
- “reference source”
- “参考了快乐谱”
- “来源是快乐谱”
- 任何把第三方来源直接暴露给 Google 用户的措辞

内部 `source` 字段仍然保留在 catalog 中，只用于内部审计和版权自查。

## 14. 常见坑与排障顺序

### 14.1 刚进页面时闪烁

当前 letter mode 已通过 pending mask 避免首屏先露出简谱再覆盖字母的明显闪烁。

如果未来又出现闪烁：

- 先查 `buildRuntimePendingScript()`
- 再查 `renderLetterTrack()` 是否在 `Song.draw()` patch 后及时运行

### 14.2 页面底部出现大块空白

先查：

- `buildRuntimeBridgeScript()`
- iframe 外壳测高逻辑

不要先怀疑曲子本身数据坏了。

### 14.3 出现半透明灰遮罩

先查：

- `.lean-overlay`
- modal
- override style 是否失效

### 14.4 长页出现 iframe 内部细滚动条

先查：

- runtime 文档 `overflow-y: hidden`
- 是否有人误把测高逻辑改回 `body.scrollHeight` 优先

### 14.5 字母谱看起来错了

先做两步：

1. 切回 `number` 模式，确认快乐谱原谱是否正确
2. 如果原谱正确，再查字母谱覆盖层

这样可以快速区分“runtime 真相错误”和“字母层错误”。

## 15. 哪些改动是安全的，哪些不是

### 15.1 相对安全

- 调整详情页英文文案
- 补充 `presentation.ts` 的 song-specific SEO profile
- 调整首页策展顺序
- 继续补 handoff 文档
- 新增 compare / QA 脚本

### 15.2 高风险

- 改 `runtime.ts` 里对快乐谱模板的替换逻辑
- 改 iframe 高度桥接逻辑
- 只凭文件名或“当前公开页暂时没触发”就武断删除 HC / kit 相关旧资产
- 把找不到 raw JSON 的详情页改回 fallback
- 让 compare 脚本不再强制 `number`
- 在前台重新暴露第三方来源文案

## 16. 新程序员最短接手路径

如果今天要新接手，建议按这个顺序：

1. 读 `README.md`
2. 看仓库根目录 `AGENTS.md`
2. 读本文件
3. 读 `docs/agent-handoff.md`
4. 读 `src/lib/kuailepu/runtime.ts`
5. 跑 `npm run typecheck`
6. 跑 `npm run dev`
7. 打开一首详情页和对应 runtime 页面
8. 跑一次 `npm run check:kuailepu-login`
9. 跑一次 `npm run compare:kuailepu-runtime -- http://127.0.0.1:3000 <某首歌>`

只要这九步跑通，就已经具备继续维护当前业务的必要上下文。

补充：

- `AGENTS.md` 已经把“新对话先读哪些文档”和“加歌或上线前先跑什么”写成仓库级指引。
- 对 Codex 类代码代理来说，这会显著提高新对话自动按顺序接手的概率。
- 但这依然是仓库内约束，不是平台级强制；如果未来换别的工具或模型，仍建议人工先确认它有没有按顺序读。
- 如果任务涉及公开状态、首页排序、family 分类，不要先去翻首页代码；先看 `data/songbook/public-song-manifest.json`。

## 17. 当前交接前还值得做什么

本轮已经完成主要收尾。交接前剩下最有价值的工作只有三类：

1. 继续保持 handoff 文档与真实实现同步
2. 每次加歌或上线前都跑统一预检：
   `npm run preflight:kuailepu-publish -- <slug...>`
3. 每次改字母谱逻辑后都先用 `number` 模式验证没有污染原谱

### 17.1 当前下一步的真实阻塞点

如果下一轮任务是“继续扩充曲库”，当前上下文要记住：

- 国外 ocarina 流量较高的公版曲目候选名单已经整理过一轮
- 但快乐谱站内搜索对这些英文/中文标题的命中率很差，经常返回同一批兜底推荐
- 2026-04-04 在美国 VPN 下实测：
  - `npm run search:kuailepu -- "Joy to the World"` 返回 `ERR_CONNECTION_CLOSED`
  - 说明当前美国侧网络更适合做 western 关键词调研，不适合直接做快乐谱导歌
- 所以继续加歌时，不能只依赖现有搜索脚本结果，可能要人工浏览或换别名再搜
- 真正开始导入前，仍然必须先跑 `npm run preflight:kuailepu-publish -- <slug...>`
- 如果 preflight 报登录失效，就先让人工执行 `npm run login:kuailepu`

### 17.1.1 回到中国 VPN 后优先尝试的 western 公版候选

这份队列用于“美国 VPN 做研究，中国 VPN 做导歌”的分工，不是说这些歌已经确认在快乐谱一定能搜到。

当前更值得优先试的候选是：

1. `joy-to-the-world`
   - 英文标题：
     - `Joy to the World`
   - 建议一并尝试的中文 / 变体：
     - `普世欢腾`
     - `普天同庆`
   - 优先原因：
     - western Christmas 流量很大
     - 同时容易覆盖 `ocarina tabs`、`ocarina notes`、`tin whistle notes`
2. `the-first-noel`
   - 英文标题：
     - `The First Noel`
     - `The First Nowell`
   - 建议一并尝试的中文 / 变体：
     - `第一支圣诞歌`
     - `第一首圣诞歌`
   - 优先原因：
     - 圣诞季搜索意图稳定
     - ocarina 用户侧已有现成 tabs 需求信号
3. `o-christmas-tree`
   - 英文标题：
     - `O Christmas Tree`
     - `O Tannenbaum`
   - 建议一并尝试的中文 / 变体：
     - `圣诞树`
     - `哦，圣诞树`
   - 优先原因：
     - 同时适合 recorder / tin whistle / ocarina
     - 英文名和德文名都值得搜
4. `brahms-lullaby`
   - 英文标题：
     - `Brahms' Lullaby`
     - `Brahms Lullaby`
     - `Lullaby`
   - 建议一并尝试的中文 / 变体：
     - `勃拉姆斯摇篮曲`
     - `摇篮曲`
     - `Wiegenlied`
   - 优先原因：
     - 非节日曲，全年可吃到 beginner / lullaby 搜索
     - 对 recorder 初学者意图也比较友好
5. `angels-we-have-heard-on-high`
   - 英文标题：
     - `Angels We Have Heard on High`
   - 建议一并尝试的中文 / 变体：
     - `天使歌唱在高天`
     - `天使歌唱在高天上`
   - 优先原因：
     - 圣诞季搜索强
     - tin whistle / recorder 也有自然匹配度
6. `away-in-a-manger`
   - 英文标题：
     - `Away in a Manger`
   - 建议一并尝试的中文 / 变体：
     - `远远在马槽里`
     - `马槽圣婴`
   - 优先原因：
     - 属于 western 用户熟悉的圣诞入门曲
     - melody 简单，适合当前站点定位
7. `we-three-kings`
   - 英文标题：
     - `We Three Kings`
     - `We Three Kings of Orient Are`
   - 建议一并尝试的中文 / 变体：
     - `三位君王`
     - `东方三博士`
   - 优先原因：
     - 圣诞相关长尾明确
     - 适合作为第二梯队候选

当前建议先按上面顺序尝试，不要一开始就追太多难度更高、页面定位也更窄的候选。

### 17.1.1.1 2026-04-04 美国 VPN 下补充结论

- 当前美国 VPN 下不适合继续直接打快乐谱导歌链。
- 这轮实测：
  - 直接请求 `https://www.kuaiyuepu.com/web/song.php?action=search`
  - `curl` 返回：
    - `LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to www.kuaiyuepu.com:443`
- 所以当前更稳妥的分工仍然是：
  - 美国 VPN：
    - 做 western 搜索词研究
    - 做下一批候选池筛选
    - 和现有公开曲库去重
  - 中国 VPN：
    - 实际搜快乐谱
    - 导歌
    - 跑 preflight compare

### 17.1.1.2 2026-04-04 美国 VPN 下整理出的下一批候选优先级

这轮美国侧研究后，下一批候选建议按两档来做。

第一档先做“高流量圣诞曲”：

1. `joy-to-the-world`
   - 原因：
     - western 圣诞搜索面很宽
     - ocarina / tin whistle / recorder 都有明确现成 tabs / notes 需求
2. `the-first-noel`
   - 原因：
     - 圣诞季 evergreen
     - 和当前 holiday family 定位高度一致
3. `away-in-a-manger`
   - 原因：
     - beginner-friendly
     - whistle / recorder 搜索意图也很自然
4. `o-come-all-ye-faithful`
   - 原因：
     - 圣诞标准曲
     - 不依赖过窄的单一乐器人群
5. `good-king-wenceslas`
   - 原因：
     - holiday 长尾稳定
     - melody 结构对当前站点友好
6. `jolly-old-saint-nicholas`
   - 原因：
     - 美国用户认知强
     - 对 beginner ocarina / recorder 搜索也友好

第二档做“全年 folk / classical evergreen”：

1. `loch-lomond`
   - 原因：
     - 传统苏格兰民歌，western folk 识别度高
     - tin whistle / recorder 搜索天然匹配
2. `annie-laurie`
   - 原因：
     - 传统苏格兰歌，tin whistle 侧已有现成需求信号
     - 适合继续扩 Scottish / Irish folk 面
3. `the-ash-grove`
   - 原因：
     - 传统威尔士民歌
     - 适合补 recorder / ocarina 的 lyrical folk 页
4. `the-last-rose-of-summer`
   - 原因：
     - 传统爱尔兰旋律
     - tin whistle 侧已有现成需求信号
5. `my-bonnie-lies-over-the-ocean`
   - 原因：
     - 英语儿童 / folk 认知强
     - 适合 beginner 搜索入口
6. `drink-to-me-only-with-thine-eyes`
   - 原因：
     - 英美传统曲目认知稳定
     - 页面定位偏 lyrical folk，和现有库互补

当前不建议优先做的别名型候选：

- `what-child-is-this`
  - 原因：
    - 本质上与当前已上线的 `greensleeves` 共用旋律
    - 现阶段先优先扩“新旋律页”，不要重新走重复入口路线

### 17.1.2 以后什么时候要做“数百首曲库”架构调整

如果后续公开曲库继续扩大，出现下面任意一类信号，就要从当前“文件为主”的轻量方案升级到下一层内容工程化：

- 公开曲库接近 `200-300` 首，而且还准备继续快速扩
- 首页列表、搜索、筛选、字母跳转开始明显变慢
- `next build`、静态生成、sitemap、校验脚本已经开始影响日常发布效率
- 部署包体积、构建时长或平台资源占用开始接近限制
- 维护 `public-song-manifest.json`、`song-seo-profiles.json` 等文件已经明显吃力

建议操作顺序：

1. 先把首页 song list 改成分页、分段加载或更轻量的索引下发
2. 再把搜索索引从完整 `songCatalog` 视图中拆出来
3. 再把 song catalog 从“模块级全量常驻”逐步改成更明确的文件级按需读取
4. 如果曲库规模继续膨胀，再评估数据库或正式内容索引层

当前不要抢先做这轮调整；在这些信号真正出现前，仍优先扩曲、做 SEO、保持 runtime 主链稳定。

### 17.2 当前最近已完成的收尾

如果下一轮接手，需要先记住下面这些已经落地，不要重复当作待办：

1. 详情页模式切换按钮文案已改成：
   - `Letter Notes`
   - `Numbered Notes`
2. 首页列表卡片已移除 `Ocarina Song`
   - 当前只保留歌名
3. 详情页已补返回列表页按钮
   - 当前文案为 `Back to Song Library`
4. runtime 的中文残留英文化已经扩大
   - `Down By the Salley Gardens` 这类混合中英副标题不再只靠单歌修补
   - 人名 / 副标题等字段里残留的全角中文标点，也已经并入 runtime 英文化规范化链
   - 常见短中文标签也已有固定英文映射
5. 难度标签规则已经收紧
   - 长曲篇幅不再单独触发 `Intermediate to advanced`
   - 最高档更依赖速度、升降号密度，或组合条件

不建议在交接前继续大改核心 runtime 路线，因为当前主链已经稳定，额外重构只会增加新对话接手成本。

## 18. 当前工作区剩余状态

到 2026-04-02 这次交接整理时，当前工作区待提交的是下面这组同一主题的改动：

- Playwright 修复：
  - `playwright.config.ts`
  - `e2e/core.spec.ts`
- 详情页 runtime loading 修复：
  - `src/components/song/KuailepuRuntimeFrame.tsx`
  - `src/components/song/KuailepuLegacyRuntimePage.tsx`
- `/k-static` 静态同步链：
  - `scripts/sync-kuailepu-static.mjs`
  - `package.json`
  - `public/k-static/**`
  - `vendor/kuailepu-static/**`
- favicon 补齐：
  - `src/app/icon.svg`
  - `public/favicon.ico`
  - `src/app/layout.tsx`
- runtime 英文标点规范化：
  - `src/lib/kuailepu/runtime.ts`

`tsconfig.tsbuildinfo`、调试截图、`.tmp` 文件、临时日志都属于噪音，不应带入提交。

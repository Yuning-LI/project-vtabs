# Project V-Tabs

面向 Google / western 用户的 12-hole AC ocarina 曲谱站。当前公开站点的默认详情页已经收敛到快乐谱兼容 runtime 路线，默认显示字母谱，简谱作为可选阅读模式保留。

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

以 2026-04-01 当前工作区为准：

- 站点面向 western 用户，前台可见文案必须是英文。
- 公开详情页 `/song/<slug>` 的真相链路是：
  `data/kuailepu-runtime/<slug>.json -> Kit.context.setContext(...) -> Song.draw()/compile() -> final SVG`
- 当前公开的 60 个 song pages 默认都走 runtime 详情页，不再回退到旧的 `SongClient` 原生详情页。
- `captured SVG` 不再是公开详情页的数据源，只保留“本地视觉基线 / 回归排查 / 调试对照”用途。
- 默认阅读模式是 `letter`。
- 公开可选阅读模式只有两个：
  - `letter`
  - `number`
- `both` 已移除。
- `Fingering + Lyrics` 已移除。
- 字母谱不是新开一轨，而是直接复用简谱那一轨的位置、间距、节拍、歌词、指法图，只把数字替换成字母音名。

## 2026-04-02 补充状态

- 公开 runtime 现已默认注入 `runtime_text_mode=english`，标题、副标题、作曲/作词/编曲标签、指法标题、演奏顺序等可见文案已统一走英文转换。
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

## 当前数量口径

当前工作区里几组数字不要混淆：

- `songCatalog.length = 60`
  - 当前真正对外公开的 song pages 数量。
- `allSongCatalog.length = 67`
  - 仓库里保留的全部候选曲目数量，包含未公开的手工占位条目。
- `data/kuailepu-runtime/*.json = 64`
  - 当前生产可部署的快乐谱 raw JSON 数量。
- `reference/songs/*.json = 65`
  - 本机原始研究层数量，主要给导歌与本地调试用。
- `data/kuailepu/*.json = 55`
  - 可提交的轻量导入结果数量。

为什么这些数字对不上：

- `data/kuailepu-runtime` 是生产部署要带上的 raw 数据层。
- `reference/songs` 是本机 raw 研究层，不等于公开曲库。
- `data/kuailepu` 只存“导入后的轻量 SongDoc”，不含全部手工 catalog。
- `songCatalog` 是 `manualSongCatalog + importedSongCatalog` 去重再筛掉 `published: false` 后得到的公开子集。
- `allSongCatalog` 里仍保留一些旧手工候选或待处理条目，所以比公开曲库多。

## 当前前台文案口径

- 详情页模式切换按钮当前文案：
  - `Letter Notes`
  - `Numbered Notes`
- 这是面向英语用户的更直白文案。
- `numbered notation` 仍可作为内部描述或 SEO 背景词，但当前前台主操作文案优先用 `numbered notes`。

## 这次收口前的待提交内容

到 2026-04-02 这次整理交接时，当前工作区待提交的是一整组同一主题的改动，不是只剩 `runtime.ts`：

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
- runtime 英文化排版净化：
  - `src/lib/kuailepu/runtime.ts`

`tsconfig.tsbuildinfo` 属于生成噪音，不应进入提交；调试截图和 `.tmp` / 临时日志也不应重新带回工作区。

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
    - `hc.min_02d898293e.js`
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
  - `src/lib/songbook/kuailepuImport.ts`
  - `data/kuailepu/*.json`
- runtime 校验脚本：
  - `scripts/sync-kuailepu-static.mjs`
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

它们用于：

- 站点 song catalog
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

## SEO 与前台文案规则

当前站点的 SEO 方向已经明确：

- 首页列表卡片只显示歌名。
- 首页右上角黑框指标区已移除。
- 详情页可以有较完整的英文介绍、FAQ、使用说明。
- 文案目标是 SEO landing page，而不是写乐理文章。
- 关键词应自然覆盖：
  - `ocarina tabs`
  - `letter notes`
  - `12-hole AC`
  - `fingering chart`
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

## 交接前最后一轮建议

当前这轮交接前，最值得做的不是再改核心逻辑，而是持续执行下面几件事：

1. 每次新增或准备上线曲子，都先跑 Playwright compare，再决定是否公开。
2. 每次改 `runtime.ts` 里的字母谱逻辑，都先用 `number` 模式确认没有污染原谱。
3. 每次新增 song page 文案，都检查前台是否仍然全英文且没有来源披露。
4. 新对话继续前，先读本文档和 `docs/handoff.md`，不要凭旧上下文记忆接着改。

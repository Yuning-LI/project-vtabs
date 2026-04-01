# Handoff Notes

这份文档写给“第一次接手这个项目的新程序员”。目标不是概述，而是尽量把当前业务、架构、上线流程、注意事项写成可直接执行的说明。

## 1. 项目当前是什么

这是一个面向 Google 搜索流量和 western 用户的 12-hole AC ocarina 曲谱站。

当前产品已经不是“通用乐谱实验场”，而是一个非常明确的业务形态：

- 首页是英文 song library landing page。
- 详情页是英文 SEO landing page + 可直接演奏的曲谱页。
- 公开详情页默认显示字母谱。
- 简谱仍可切换查看。
- 指法图始终是核心内容。
- 字母谱与简谱都只是阅读模式，真相源是快乐谱 raw JSON + 快乐谱原始渲染链。

### 1.1 2026-03-31 最新补充

本轮最新状态要额外记住四点：

- 公开 runtime 已补齐英文文本模式，`Composer`、`Play order`、`12-hole ocarina Bb fingering` 这类 SVG 内可见标签也已在我们自己的 runtime 后处理中英文化。
- 公开页当前默认不再依赖 `www.kuaiyuepu.com/static/...` 的实时静态资源；脚本、字体、i18n 包、播放器依赖等已补到本地 `vendor/kuailepu-static`。
- `silent-night-english` 与 `jingle-bells-english` 这两个重复公开入口已经删除，只保留单一歌曲入口。
- 当前工作区还有一组未提交的样式统一改动：首页与详情页正在收敛到同一套暖色 editorial shell，但这不改变 runtime 主链和数据边界。
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

## 2. 当前用户已经确认过的业务规则

这些不是建议，是当前产品已确认规则：

- 站点前台文案必须是英文。
- 不要在前台展示“参考了快乐谱”“来源是快乐谱”之类措辞。
- 首页列表每首歌只显示歌名，不显示摘要。
- 首页不再区分 `Verified For Playtest` / `Still Pending Review`。
- 首页不再显示 `pending` / `rechecked` 标签。
- 首页右上角黑框统计信息已移除。
- 详情页允许出现较完整的英文介绍、FAQ、使用说明，因为这些文案承担 SEO 作用。
- 字母谱默认开启。
- “字母谱 + 简谱同时显示”已移除。
- 简谱保留为可选模式。
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

- `songCatalog.length = 60`
  - 当前公开 song pages 数。
- `allSongCatalog.length = 67`
  - 当前仓库保留的总候选数。
- `data/kuailepu-runtime/*.json = 64`
  - 当前生产可部署 raw JSON 数量。
- `reference/songs/*.json = 65`
  - 本机原始研究层数量。
- `data/kuailepu/*.json = 55`
  - 可提交的轻量导入数量。

为什么数量会不一致：

- `songCatalog` 是最终公开视图。
- `allSongCatalog` 还包含未公开的旧手工候选。
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
  - 负责 iframe 容器、模式切换、SEO 文案区域、高度同步。
- `src/app/song/[id]/page.tsx`
  - song route 入口。
  - 当前原则是：找不到 raw JSON 就 `notFound()`，不再回退到旧详情页。
- `src/lib/kuailepu/assetProxy.ts`
  - 同源静态资源代理。

### 6.2 曲库与导入层

- `src/lib/songbook/catalog.ts`
  - 手工 catalog + 导入 catalog 去重后的总入口。
- `src/lib/songbook/importedCatalog.ts`
  - 读取 `data/kuailepu/*.json`。
- `src/lib/songbook/kuailepuImport.ts`
  - 把快乐谱 payload 转成轻量 SongDoc。
- `data/kuailepu-runtime/*.json`
  - 生产可部署的完整 raw JSON。
- `data/kuailepu/*.json`
  - 可提交的轻量数据。
- `reference/songs/*.json`
  - 本地导歌 / 调试 fallback。

### 6.3 SEO 与前台英文文案层

- `src/lib/songbook/presentation.ts`
  - 生成 song page 英文标题、meta、介绍、FAQ。
- `src/app/page.tsx`
  - 首页 SEO landing page。
- `src/app/layout.tsx`
  - 全站 metadata 和 `html lang="en"`。

### 6.4 脚本层

- `scripts/check-kuailepu-login.ts`
  - 检查快乐谱 Playwright 登录态是否还有效。
- `scripts/login-kuailepu.ts`
  - 建立或刷新登录态。
- `scripts/search-kuailepu-song.ts`
  - 搜索目标曲。
- `scripts/import-kuailepu-song.ts`
  - 导入 raw JSON 和轻量 SongDoc。
- `scripts/compare-kuailepu-runtime-live.ts`
  - 发布前 parity gate。

## 7. 为什么必须保留同源静态资源代理

快乐谱 runtime 依赖原站大量 JS/CSS。

如果让浏览器直接在 `localhost` 页面里加载第三方静态资源，常见问题包括：

- 脚本被浏览器策略拦截
- iframe 内部资源失效
- 原始 `Song.draw()` 链条跑不起来

所以当前策略是：

- 浏览器请求我们自己的 `/k-static/...` 或 `/static/...`
- 服务端优先读取本地 `vendor/kuailepu-static`
- 本地没有时，再读 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt` 归档出来的静态资源
- 默认不再静默回源快乐谱线上静态文件

这层代理不是“功能性 feature”，而是 runtime 这条主链能工作的基础设施。

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
- `song name letter notes`
- `12-hole AC ocarina`
- `fingering chart`
- `numbered notation`

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
- 所以继续加歌时，不能只依赖现有搜索脚本结果，可能要人工浏览或换别名再搜
- 真正开始导入前，仍然必须先跑 `npm run preflight:kuailepu-publish -- <slug...>`
- 如果 preflight 报登录失效，就先让人工执行 `npm run login:kuailepu`

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
   - 常见短中文标签也已有固定英文映射
5. 难度标签规则已经收紧
   - 长曲篇幅不再单独触发 `Intermediate to advanced`
   - 最高档更依赖速度、升降号密度，或组合条件

不建议在交接前继续大改核心 runtime 路线，因为当前主链已经稳定，额外重构只会增加新对话接手成本。

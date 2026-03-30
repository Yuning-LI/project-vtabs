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

以 2026-03-30 这轮收尾后的状态为准：

- 站点面向 western 用户，前台可见文案必须是英文。
- 公开详情页 `/song/<slug>` 的真相链路是：
  `reference/songs/<slug>.json -> Kit.context.setContext(...) -> Song.draw()/compile() -> final SVG`
- 当前公开的 57 个 song pages 默认都走 runtime 详情页，不再回退到旧的 `SongClient` 原生详情页。
- `captured SVG` 不再是公开详情页的数据源，只保留“本地视觉基线 / 回归排查 / 调试对照”用途。
- 默认阅读模式是 `letter`。
- 公开可选阅读模式只有两个：
  - `letter`
  - `number`
- `both` 已移除。
- `Fingering + Lyrics` 已移除。
- 字母谱不是新开一轨，而是直接复用简谱那一轨的位置、间距、节拍、歌词、指法图，只把数字替换成字母音名。

## 当前数量口径

当前工作区里几组数字不要混淆：

- `songCatalog.length = 57`
  - 当前真正对外公开的 song pages 数量。
- `allSongCatalog.length = 65`
  - 仓库里保留的全部候选曲目数量，包含未公开的手工占位条目。
- `reference/songs/*.json = 59`
  - 本机 raw JSON 数量。这里是 runtime 真相源。
- `data/kuailepu/*.json = 51`
  - 可提交的轻量导入结果数量。

为什么这些数字对不上：

- `reference/songs` 是本机 raw 数据层，不等于公开曲库。
- `data/kuailepu` 只存“导入后的轻量 SongDoc”，不含全部手工 catalog。
- `songCatalog` 是 `manualSongCatalog + importedSongCatalog` 去重再筛掉 `published: false` 后得到的公开子集。
- `allSongCatalog` 里仍保留一些旧手工候选或待处理条目，所以比公开曲库多。

## 架构真相

当前项目同时保留两条链，但公开主链只有一条：

- 公开详情页主链：
  - `reference/songs/<slug>.json -> runtime iframe -> 快乐谱原始渲染逻辑 -> final SVG`
- 保留中的站点原生链：
  - `SongDoc -> notation -> MIDI -> 指法字典 -> 自有 React 页面`

必须明确：

- 公开详情页不是直接展示快乐谱线上已经渲染好的 SVG。
- 也不是我们自己写的近似 renderer 在模仿快乐谱。
- 而是本地 iframe 内真正跑快乐谱原始前端渲染链。

## 关键文件地图

- runtime 真相层：
  - `src/lib/kuailepu/runtime.ts`
  - `src/lib/kuailepu/assetProxy.ts`
  - `src/app/api/kuailepu-runtime/[id]/route.ts`
  - `src/components/song/KuailepuLegacyRuntimePage.tsx`
  - `src/app/song/[id]/page.tsx`
- 曲库与导入层：
  - `src/lib/songbook/catalog.ts`
  - `src/lib/songbook/importedCatalog.ts`
  - `src/lib/songbook/kuailepuImport.ts`
  - `data/kuailepu/*.json`
- runtime 校验脚本：
  - `scripts/check-kuailepu-login.ts`
  - `scripts/compare-kuailepu-runtime-live.ts`
  - `scripts/import-kuailepu-song.ts`
  - `scripts/search-kuailepu-song.ts`
- SEO / 页面文案层：
  - `src/lib/songbook/presentation.ts`
  - `src/app/page.tsx`
  - `src/app/layout.tsx`

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

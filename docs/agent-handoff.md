# Agent Handoff

这份文档是给“新开对话时的 AI / 新接手时的程序员”的速接版说明。它比 `docs/handoff.md` 更短，但信息密度更高，重点是快速建立正确心智模型，避免按旧上下文乱改。

## 1. 一句话真相

当前公开 `/song/<slug>` 页面已经统一走“快乐谱 raw JSON + 快乐谱原始 runtime 渲染逻辑”的路线，默认显示字母谱，简谱作为可选模式保留，`captured SVG` 只剩调试价值。

补充：

- 生产 raw JSON 现在优先读取 `data/kuailepu-runtime/<slug>.json`
- `reference/songs/<slug>.json` 只保留给本地导歌 / 调试 fallback
- deployable runtime archive 在 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`

## 最新补充（2026-03-31）

- 公开 runtime 现已默认走英文文本模式，SVG 里的 `Composer`、`Play order`、`12-hole ocarina Bb fingering` 等可见标签都应是英文。
- 公开页当前默认本地优先加载快乐谱静态依赖，不再默认回源 `www.kuaiyuepu.com/static/...`；中国以外网络下公开页也应能正常显示。
- 重复公开入口 `silent-night-english`、`jingle-bells-english` 已清理。
- 当前工作区另有一组未提交的样式统一改动：首页和详情页正在共用同一套暖色视觉壳，但不影响 runtime 数据链。
- 本轮又新增了 5 首快乐谱导入并已通过 preflight compare：`jasmine-flower`、`arirang`、`toy-march`、`cavalry-march`、`sakura-sakura`。
- `scripts/preflight-kuailepu-publish.ts` 已修复一处误判：之前 `npm` 输出和 Node warning 会污染 JSON，导致“登录其实有效，但 preflight 误报无效登录”。
- runtime 英文化链已补上 `轻吹 -> Soft blow`、`重吹 -> Strong blow`。

## 2. 接手后必须先知道的事

- 站点前台目标用户是 Google 来的 western 用户。
- 前台可见文案必须是英文。
- 前台不能写“参考了快乐谱”“来源是快乐谱”“Kuailepu source”等来源披露。
- 公开详情页找不到 raw JSON 时应该 `notFound()`，不要静默 fallback 到旧页面。
- 默认阅读模式是 `letter`。
- 可公开切换模式只有 `letter` 和 `number`。
- 发布前 parity gate 必须用 `number` 模式。

## 3. 必读顺序

仓库根目录还有一份 `AGENTS.md`，它把这套阅读顺序和发布前预检写成了仓库级规则。

1. `README.md`
2. `docs/handoff.md`
3. `docs/kuailepu-compatibility-roadmap.md`
4. `docs/manual-runtime-qa-checklist.md`
5. `src/lib/kuailepu/runtime.ts`
6. 目标曲目的 `data/kuailepu-runtime/<slug>.json`

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
- `src/lib/songbook/presentation.ts`
  - 详情页英文 SEO 文案生成器，不是谱面真相

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

## 11. 常见错误心智模型

下面这些理解都是错的：

- “song page 现在主要是我们自己的 renderer”
- “captured SVG 还是主数据源”
- “字母谱是新开一轨”
- “compare 应该对 letter 模式做比对”
- “前台写来源说明有助于 SEO”

## 12. 当前数量口径

- 公开 song pages：60
- 全部候选：67
- raw JSON：65
- 可提交轻量导入：55

不要拿这些数字互相强行对应。

## 12.5 当前未提交但重要的工作区状态

- 未提交的前台改动集中在：
  - `src/app/globals.css`
  - `src/app/page.tsx`
  - `src/components/song/KuailepuLegacyRuntimePage.tsx`
  - `src/lib/kuailepu/runtime.ts`
  - `src/lib/songbook/kuailepuEnglish.ts`
  - `src/lib/songbook/presentation.ts`
  - `scripts/preflight-kuailepu-publish.ts`
  - `data/kuailepu/*.json` 新增 5 首
- 根目录还有多张 PNG 截图和 `tsconfig.tsbuildinfo`，都不是这轮必须提交的产品文件，不要误提交。

## 12.6 当前新对话必须知道的最近收尾结果

- 详情页模式切换按钮当前已经改成：
  - `Letter Notes`
  - `Numbered Notes`
- 首页 song list 卡片当前只显示歌名，`Ocarina Song` 已移除。
- 详情页左上角当前已有 `Back to Song Library` 返回入口。
- `Down By the Salley Gardens` 的混合中英副标题残留，已经并入统一英文化链处理：
  - 入口在 `src/lib/songbook/kuailepuEnglish.ts`
  - runtime 侧仍由 `src/lib/kuailepu/runtime.ts` 消费这层结果
- 当前短中文副标题 / 民歌标签 / 版本标签的常见英文化，已经有一层固定映射：
  - 如 `日本民歌 -> Japanese folk song`
  - `英文版 -> English lyrics version`
- 难度标签规则已经收紧：
  - 长曲篇幅不再单独把歌曲推到 `Intermediate to advanced`
  - 更依赖速度、升降号密度，或“篇幅 + 技术负担”的组合

## 13. 新对话可直接复制的起始提示词

`Continue on the runtime-backed Kuailepu song-page architecture. Keep /song/<slug> driven by reference raw JSON plus original Kuailepu rendering logic, keep letter mode as default and number mode as optional, treat captured SVG only as a local debug baseline, and preserve the current English SEO presentation rules for western users.`

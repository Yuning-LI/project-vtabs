# Agent Handoff

这份文档是给“新开对话时的 AI / 新接手时的程序员”的速接版说明。它比 `docs/handoff.md` 更短，但信息密度更高，重点是快速建立正确心智模型，避免按旧上下文乱改。

## 1. 一句话真相

当前公开 `/song/<slug>` 页面已经统一走“快乐谱 raw JSON + 快乐谱原始 runtime 渲染逻辑”的路线，默认显示字母谱，简谱作为可选模式保留，`captured SVG` 只剩调试价值。

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
6. 目标曲目的 `reference/songs/<slug>.json`

## 4. 关键文件别搞混

- `reference/songs/*.json`
  - 本机 raw 真相层
  - runtime 详情页真正吃这个
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

- 公开 song pages：57
- 全部候选：65
- raw JSON：59
- 可提交轻量导入：51

不要拿这些数字互相强行对应。

## 13. 新对话可直接复制的起始提示词

`Continue on the runtime-backed Kuailepu song-page architecture. Keep /song/<slug> driven by reference raw JSON plus original Kuailepu rendering logic, keep letter mode as default and number mode as optional, treat captured SVG only as a local debug baseline, and preserve the current English SEO presentation rules for western users.`

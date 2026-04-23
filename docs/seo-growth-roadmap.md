# SEO Growth Roadmap

这份文档用于固化当前已经确认的公开流量增长方向，避免多次上下文压缩后执行目标漂移。

适用范围：

- 公开 SEO landing page
- 公开 learn / hub / guide 页面
- song page 的 title、description、首屏引导文案、相关推荐、结构化数据
- Pinterest / Reddit 等外部分发对应的公开落地页

不适用范围：

- 快乐谱 runtime 核心渲染逻辑
- 指法图谱本体、曲谱内容、导歌真相链
- 内部 Pinterest 出图链路的视觉微调细节

## 1. 当前目标

当前站点已经有一定 GSC 收录，但自然流量仍弱。当前阶段的目标不是继续扩复杂功能，而是让已有公开入口页、song page 和 learn 体系更稳定地承接搜索流量。

当前优先级：

1. 保持公开 `/song/<slug>` 主链稳定。
2. 强化 song page 作为落地页时的点击理由和 query fit。
3. 强化 learn / hub / guide 页的 topic fit、内链闭环和 metadata 质量。
4. 只在确认真实需求后再新增新的意图页。

## 2. 已批准边界

默认允许直接推进的内容：

- 新增公开 learn / hub / guide 页面
- 增强 song page 的 SEO copy、相关推荐、结构化数据、导航关系
- 调整首页到这些页面的公开入口
- 调整 sitemap / metadata / canonical / FAQ / ItemList 这类 SEO 外壳

默认不允许直接推进的内容：

- 修改快乐谱 runtime 核心行为
- 修改公开 song page 的曲谱展示逻辑
- 修改指法图谱本体、iframe 渲染方式、核心交互语义
- 修改导歌真相链、raw JSON 主链、publish / compare 主流程

简化成一句话：

当前阶段可以继续做“新增入口页”和“增强 SEO 外壳”，但如果要动“曲谱核心功能”，必须先问用户。

## 3. 当前阶段概览

### Phase 1：公开入口层

状态：已完成。

已完成事项：

- 建立 `/learn` 入口。
- 建立 instrument hub / intent hub / beginner guide 页面体系。
- learn 页面已接入首页、sitemap、结构化数据和内部导航。
- song page 已接入 related guides / more songs to explore。
- learn song card 已支持预选 `?instrument=o6`、`?instrument=r8b`、`?instrument=w6` 这类入口层参数适配，不改变公开 runtime 主链。

当前结论：

- 公开入口层已经够用。
- 当前更适合做质量收敛，而不是继续大量扩新页。

### Phase 2：song page 文案与 metadata 质量收敛

状态：基线已完成。

已完成事项：

- 公开 song page 已普遍具备 song-specific `metaTitle`、`overview`、`metaDescription` 与 FAQ 扩展能力。
- title / description 长度审计已收口到可接受范围。
- 当前策略已明确按“SEO 长尾优先、品牌词让位”处理，不机械追加 `| Play By Fingering`。

当前结论：

- Phase 2 不再是“全站补覆盖”，而是只对高价值页面继续精修。

## 4. 2026-04-23 GSC 导出后的固定执行计划

这轮不是长期路线，而是基于 `exports/gsc/` 下近 3 个月 GSC 导出做的一次固定范围优化。

### 阶段 1：GSC 诊断

状态：已完成。

结论分两类：

- `song` 页的问题主要不是“没排名”，而是已有一批页面进入前 10 左右，但 CTR 偏低甚至为 0。
- `learn` / `hub` / `guide` 页的问题主要不是 CTR，而是大多还停在 `30-50` 位，优先修 topic fit、标题、摘要、正文首段和内部链接。

### 阶段 2：固定范围

状态：已完成。

这轮明确限制为：

1. 不新增 URL，不改 slug。
2. 不新增一批新 SEO 页面。
3. 不动 runtime、曲谱主链、指法图或路由结构。
4. 只改内容层：
   - `data/songbook/song-seo-profiles.json`
   - `src/lib/learn/content.ts`

### 阶段 3：首批执行

状态：已完成。

本轮优先 `song` 页：

- `frere-jacques`
- `lightly-row`
- `always-with-me`
- `wedding-march-alt`
- `scotland-the-brave`
- `flight-of-the-bumblebee`
- `jasmine-flower`
- `turkish-march`
- `ode-to-joy`

本轮优先 `learn` 页：

- `12-hole-ocarina-letter-notes`
- `easy-recorder-songs-for-beginners`
- `easy-12-hole-ocarina-songs`
- `how-to-start-recorder-with-letter-notes`

已完成内容：

- 上述 9 个 `song` 页的 `metaTitle`、`metaDescription`、`searchTerms`、`aliases` 与首段意图文案精修。
- 上述 4 个 `learn` 页的 title / description / intro / featured songs / sections / SEO override 精修。
- 本轮没有新增 URL、没有新增 route、没有修改 runtime 或曲谱链路。

### 阶段 4：观察验证

状态：待这轮改动上线并等待 Google 重抓后执行。

下一步只看这 13 个页面：

- `song` 页
  - 排名是否仍在前 10 左右
  - CTR 是否抬升
- `learn` 页
  - 平均排名是否从 `30-50` 往前移动

在这轮重抓结果出来前，不默认继续扩 scope。

## 5. 下一轮默认顺序

只有在第 4 阶段观察完之后，才做下一轮判断：

1. 如果 `song` 页排名稳定但 CTR 仍低，继续挑下一批“高曝光低点击” song page 精修。
2. 如果 `learn` 页排名仍落后但 impression 在涨，继续挑下一批 topic fit 不足的 learn / hub 页精修。
3. 只有当已有 learn 体系明显无法承接新的 query clusters 时，才评估少量新增意图页。

## 6. 与内部 Pinterest 链路的关系

- 内部 Pinterest 预览页和导出脚本属于 internal-only。
- 它的目标是给公开 song page 导流。
- 这条链路不应改坏公开 `/song/<slug>` 的主链效果。
- 如果内部 Pinterest 出图需要借用共享组件，应优先通过外壳参数适配，而不是修改公开曲谱逻辑。

## 7. 文档使用规则

- `seo-growth-roadmap` 只保留策略、阶段和当前批准范围。
- 一次性执行记录只保留当前仍有决策价值的批次，不再继续堆逐日历史日志。

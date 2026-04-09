# SEO Growth Roadmap

这份文档用于固化当前已经确认的公开流量增长方向，避免多次上下文压缩后执行目标漂移。

适用范围：

- 公开 SEO landing page
- 公开 learn / hub / guide 页面
- song page 的标题、摘要、首屏引导文案、相关推荐、结构化数据
- Pinterest / Reddit 等外部分发所对应的公开落地页

不适用范围：

- 快乐谱 runtime 核心渲染逻辑
- 指法图谱本体、曲谱内容、导歌真相链
- 内部 Pinterest 出图链路的视觉微调细节

## 1. 当前目标

当前网站已经有一定数量的 GSC 收录，但自然流量仍弱。当前阶段的目标不是继续扩复杂功能，而是尽快补齐公开流量入口层，让搜索流量、Pinterest 流量、Reddit 流量进入站内后有更明确的落地页和后续点击路径。

当前优先级：

1. 新增公开 hub / guide / blog-style 页面，覆盖更常见的搜索意图。
2. 强化 song page 作为落地页时的点击理由和内部链接。
3. 保持公开 `/song/<slug>` 主链稳定，不为 SEO 入口层去破坏曲谱主链。

## 2. 已批准的方向

用户当前已明确批准下面这条路线继续执行：

- 可以新增公开、独立、单独入口的 hub 页面。
- 可以新增 blog-style guide / beginner education 页面。
- 可以继续增强 song page 的 SEO copy、相关推荐、结构化数据、导航关系。
- 可以继续增强首页与 sitemap 对这些页面的公开入口。

这些改动的原则是：

- 页面必须对真实用户有用，不是只给爬虫看的空壳页。
- 页面应继续使用英文公开文案。
- 页面应直接把用户引导到现有公开 song page，而不是形成 dead end。

## 3. 明确边界

下面这些改动在当前阶段不允许擅自推进，必须先问用户：

- 改快乐谱 runtime 核心行为
- 改公开 song page 的曲谱展示逻辑
- 改指法图谱本体、iframe 渲染方式、核心交互语义
- 改导歌真相链、raw JSON 主链、publish / compare 主流程
- 任何会影响公开曲谱正确性的行为

简化成一句话：

当前阶段可以继续做“新增入口页”和“增强 SEO 外壳”，但如果要动“曲谱核心功能”，必须先问用户。

## 4. 与内部 Pinterest 链路的关系

内部 Pinterest 出图链路可以继续保留并提交到仓库，因为它属于内部生产工具链。

当前认知：

- 内部 Pinterest 预览页和导出脚本本身是 internal-only。
- 它的目标是给公开 song page 导流。
- 这条链路不应改坏公开 `/song/<slug>` 的主链效果。
- 如果内部 Pinterest 出图需要借用共享组件，应优先通过外壳参数适配，而不是修改公开曲谱逻辑。

## 5. 执行阶段

### Phase 1：公开入口层

状态：已开始实施。

目标：

- 建立 `/learn` 入口
- 建立 instrument hub / intent hub / blog-style guide 页面
- 把这些页面接进首页和 sitemap
- 给 learn 页面和 song page 补结构化数据
- 给 song page 补相关推荐与相关 guide

当前方向：

- `12-hole-ocarina-letter-notes`
- `recorder-letter-notes`
- `tin-whistle-letter-notes`
- `easy-songs-for-beginners`
- `songs-with-lyrics`
- `simple-instruments-for-music-education`

当前进度补充：

- 已新增公开 `/learn` 总入口与数据驱动 learn route。
- 已落地的公开 guide / hub 页面当前包括：
  - `12-hole-ocarina-letter-notes`
  - `recorder-letter-notes`
  - `tin-whistle-letter-notes`
  - `easy-recorder-songs-for-beginners`
  - `easy-tin-whistle-songs`
  - `nursery-rhyme-letter-notes`
  - `easy-classical-letter-note-songs`
  - `music-class-songs-for-beginners`
  - `easy-songs-for-beginners`
  - `easy-songs-for-adult-beginners`
  - `songs-with-lyrics`
  - `hymns-and-spiritual-letter-note-songs`
  - `simple-instruments-for-music-education`
  - `christmas-letter-note-songs`
  - `folk-songs-for-beginners`
  - `how-to-read-letter-notes`
  - `celtic-tin-whistle-songs`
  - `march-and-parade-letter-note-songs`
- 首页已补 Learn 入口和公开 FAQ / ItemList / WebSite JSON-LD。
- `learn` 首页与首页的 featured guides 已进一步补齐 `folk`、`celtic`、`how-to-read-letter-notes`、`march-and-parade-letter-note-songs` 等更窄意图入口，不再只突出最早一批基础页。
- sitemap 已自动覆盖 `/learn` 与所有 guide 页面。
- song page 已接入 related guides / more songs to explore，不需要改 runtime 即可形成更长浏览路径。
- song page 的 related guides 规则已按 nursery / holiday / folk / classical / march 做了更明确的意图映射，并给部分 Celtic / Irish folk 歌曲单独导向 `celtic-tin-whistle-songs` 入口。

### Phase 2：高潜力 song page 文案深化

状态：已开始实施。

目标：

- 对高潜力歌曲做更具体的 title / meta / 首屏引导文案
- 补强别名、搜索词、适用乐器、是否有歌词、是否适合初学者等信息
- 减少过度模板化的感觉，让页面更像真实搜索答案页

建议优先歌曲：

- `twinkle-twinkle-little-star`
- `ode-to-joy`
- `amazing-grace`
- `happy-birthday`
- `jingle-bells`
- `silent-night`
- `frere-jacques`
- `london-bridge`
- `fur-elise`
- `canon-in-d`

执行方式：

- 优先通过 `data/songbook/song-seo-profiles.json`
- 必要时补 `presentation.ts` 的 song-specific copy
- 不改曲谱主链，不改 runtime 真相

当前进度：

- 已增加 per-song `metaTitle` 能力，用于 song page metadata title 精细化。
- 已补强第一批高潜力曲目：
  - `twinkle-twinkle-little-star`
  - `ode-to-joy`
  - `amazing-grace`
  - `happy-birthday-to-you`
  - `jingle-bells`
  - `silent-night`
  - `fur-elise`
  - `canon`
  - `frere-jacques`
  - `london-bridge`
- 已补强第二批 seasonal / folk / lyric 候选：
  - `scarborough-fair`
  - `auld-lang-syne`
  - `deck-the-halls`
  - `god-rest-you-merry-gentlemen`
  - `greensleeves`
  - `red-river-valley`
  - `we-wish-you-a-merry-christmas`
  - `joy-to-the-world`
  - `home-on-the-range`
- 已补强第三批 beginner / nursery / folk / seasonal 候选：
  - `mary-had-a-little-lamb`
  - `yankee-doodle`
  - `old-macdonald`
  - `row-row-row-your-boat`
  - `simple-gifts`
  - `wellerman`
  - `bella-ciao`
  - `sakura-sakura`
  - `loch-lomond`
  - `jolly-old-saint-nicholas`
  - `happy-new-year`
  - `auld-lang-syne-english`
- 已补强第四批 classical / folk / ceremonial 候选：
  - `can-can`
  - `air-on-the-g-string`
  - `arirang`
  - `jasmine-flower`
  - `londonderry-air`
  - `minuet-in-g`
  - `moonlight-sonata`
  - `santa-lucia`
  - `schubert-serenade`
  - `scotland-the-brave`
  - `turkish-march`
  - `twinkle-variations`
  - `wedding-march`
  - `were-you-there`
- 已补强第五批 classical / folk evergreen 候选：
  - `flight-of-the-bumblebee`
  - `going-home`
  - `habanera`
  - `humoresque`
  - `lullaby`
  - `minuet-bach`
  - `on-wings-of-song`
  - `spring-song`
  - `aura-lee`
  - `romance-damour`
  - `la-cucaracha`
  - `grandfathers-clock`
- 已补强第六批 folk / classical / Celtic 候选：
  - `song-of-parting`
  - `swan-lake`
  - `the-trout`
  - `traumerei`
  - `wild-rose`
  - `oh-susanna`
  - `the-south-wind`
  - `lough-leane`
  - `drinking-song`
  - `el-condor-pasa`
  - `hej-sokoly`
  - `irish-morning-wind`
  - `irish-blackbird`
- 已补齐当前全部 published songs 的 `metaTitle` 覆盖，`public-song-manifest` 当前为 0 缺口。
- 当前仍然只动 SEO 文案外壳，不动公开曲谱和 runtime 核心逻辑。

### Phase 3：更多意图型公开页

状态：待 Phase 2 完成后评估。

候选方向：

- beginner / easy / lyric / holiday / folk 等可索引集合页
- 具备明确用途的乐器入门页
- 围绕课堂、家庭学习、成人初学者的 guide 页面

判断标准：

- 页面必须能服务真实用户
- 页面必须能自然链接到现有 song page
- 不能为了扩索引而批量制造薄页

## 6. 每次接手时要遵守的执行顺序

如果任务属于公开增长 / SEO / learn 页面方向，建议接手顺序：

1. 先看 `docs/handoff.md`
2. 再看 `docs/agent-handoff.md`
3. 再看本文件 `docs/seo-growth-roadmap.md`
4. 再检查当前 learn / song page / sitemap 的实际代码状态
5. 继续做不影响曲谱主链的入口层优化

## 7. 当前默认决策

默认允许直接推进的内容：

- 新增公开 learn / hub / guide 页面
- 调整首页到这些页面的公开入口
- 增强 song page 的相关推荐、guide 入口、英文 SEO copy、结构化数据
- 调整 sitemap / metadata / canonical / FAQ / ItemList 这类 SEO 外壳

默认不允许直接推进的内容：

- 修改 runtime 核心行为
- 修改曲谱展示正确性相关逻辑
- 修改指法图谱正确性相关逻辑

若任务落在后者，先问用户，再继续。

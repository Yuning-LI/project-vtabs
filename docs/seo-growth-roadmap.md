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

状态：本轮已完成，待验收。

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
  - `6-hole-ocarina-letter-notes`
  - `easy-12-hole-ocarina-songs`
  - `recorder-letter-notes`
  - `easy-christmas-recorder-songs`
  - `tin-whistle-letter-notes`
  - `easy-ocarina-songs-for-beginners`
  - `easy-6-hole-ocarina-songs`
  - `easy-christmas-ocarina-songs`
  - `easy-recorder-songs-for-beginners`
  - `easy-tin-whistle-songs`
  - `easy-christmas-tin-whistle-songs`
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
  - `patriotic-and-anthem-letter-note-songs`
  - `world-folk-letter-note-songs`
  - `wedding-and-ceremony-letter-note-songs`
  - `calm-and-lyrical-letter-note-songs`
  - `lullaby-and-bedtime-letter-note-songs`
  - `dance-and-waltz-letter-note-songs`
  - `how-to-start-ocarina-with-letter-notes`
  - `how-to-start-recorder-with-letter-notes`
  - `how-to-start-tin-whistle-with-letter-notes`
  - `how-to-practice-ocarina-with-letter-notes`
  - `how-to-practice-recorder-with-letter-notes`
  - `how-to-practice-tin-whistle-with-letter-notes`
- `easy-sing-along-letter-note-songs`
- `first-performance-letter-note-songs`
- 当前公开 `learn` 体系共 `40` 个页面：
  - `1` 个 `/learn` 总入口
  - `39` 个 `/learn/[slug]` 页面
- 首页已补 Learn 入口和公开 FAQ / ItemList / WebSite JSON-LD。
- `learn` 首页与首页的 featured guides 已进一步补齐 `folk`、`celtic`、`how-to-read-letter-notes`、`march-and-parade-letter-note-songs`、`patriotic-and-anthem-letter-note-songs`、`world-folk-letter-note-songs`、`wedding-and-ceremony-letter-note-songs`、`calm-and-lyrical-letter-note-songs`、`lullaby-and-bedtime-letter-note-songs`、`dance-and-waltz-letter-note-songs`，以及更明显的乐器初学者与练习入口 `how-to-start-ocarina-with-letter-notes`、`how-to-start-recorder-with-letter-notes`、`how-to-start-tin-whistle-with-letter-notes`、`how-to-practice-ocarina-with-letter-notes`、`how-to-practice-recorder-with-letter-notes`、`how-to-practice-tin-whistle-with-letter-notes`、`6-hole-ocarina-letter-notes`、`easy-12-hole-ocarina-songs`、`easy-ocarina-songs-for-beginners`、`easy-6-hole-ocarina-songs`、`easy-christmas-ocarina-songs`，不再只突出最早一批基础页。
- sitemap 已自动覆盖 `/learn` 与所有 guide 页面。
- song page 已接入 related guides / more songs to explore，不需要改 runtime 即可形成更长浏览路径。
- song page 的 related guides 规则已按 nursery / holiday / folk / classical / march 做了更明确的意图映射，并给部分 Celtic / Irish folk 歌曲单独导向 `celtic-tin-whistle-songs` 入口；婚礼 / ceremony 相关曲目则额外导向 `wedding-and-ceremony-letter-note-songs`；爱国 / anthem / ceremonial 相关曲目则额外导向 `patriotic-and-anthem-letter-note-songs`；国际 folk / traditional 相关曲目则额外导向 `world-folk-letter-note-songs`；慢板 / 抒情 / reflective 曲目则额外导向 `calm-and-lyrical-letter-note-songs`；摇篮曲 / bedtime / quiet-practice 曲目则额外导向 `lullaby-and-bedtime-letter-note-songs`；dance / polka / waltz-like 曲目则额外导向 `dance-and-waltz-letter-note-songs`；一批适合初学者的 ocarina 曲目则额外导向 `easy-12-hole-ocarina-songs`、`easy-ocarina-songs-for-beginners` 与 `6-hole-ocarina-letter-notes`；holiday 曲目则会额外导向 `easy-christmas-ocarina-songs`。
- `6-hole-ocarina-letter-notes` 与 `easy-6-hole-ocarina-songs` 这类页面允许 song card 直接链接到同一个公开 `/song/<slug>` 页面，但预先带上 `?instrument=o6`，属于 SEO 入口层参数适配，不改变公开 runtime 行为。
- `recorder-letter-notes`、`easy-recorder-songs-for-beginners`、`easy-christmas-recorder-songs` 现已允许 song card 直接链接到同一个公开 `/song/<slug>` 页面并预选 `?instrument=r8b`；`tin-whistle-letter-notes`、`easy-tin-whistle-songs`、`celtic-tin-whistle-songs`、`easy-christmas-tin-whistle-songs` 则会预选 `?instrument=w6`。这同样属于 SEO 入口层参数适配，不改变公开 runtime 核心行为。
- 新增的 `how-to-start-ocarina-with-letter-notes`、`how-to-start-recorder-with-letter-notes`、`how-to-start-tin-whistle-with-letter-notes` 把“如何开始学这件乐器”这类更宽的 beginner query 落到真实可用的公开 song pages，而不是只给抽象说明页。
- 新增的 `how-to-practice-ocarina-with-letter-notes`、`how-to-practice-recorder-with-letter-notes`、`how-to-practice-tin-whistle-with-letter-notes` 则继续承接“开始之后怎么练”这类 practice / routine 搜索意图，并复用同一个公开 `/song/<slug>` 主链，不额外分叉公开详情页。
- 新增的 `easy-sing-along-letter-note-songs` 与 `first-performance-letter-note-songs` 则继续补齐两类高意图入口：
  - 前者面向 classroom / family / chorus / seasonal sing-along 搜索意图
  - 后者面向 recital / ceremony / first public performance 搜索意图
- `src/lib/learn/content.ts` 的 related guides 规则现已继续补强：
  - `Twinkle Twinkle Little Star`、`Mary Had a Little Lamb`、`Row Row Row Your Boat`、`Old MacDonald`、`Happy Birthday`、`Jingle Bells`、`Deck the Halls`、`We Wish You a Merry Christmas`、`Joy to the World`、`Auld Lang Syne` 这类 sing-along 候选会优先导向 `easy-sing-along-letter-note-songs`
  - `Happy Birthday`、`Ode to Joy`、`Amazing Grace`、`Canon`、`Wedding March`、`Wedding March (Alternate)`、`American Patrol`、`Turkish March`、`Parade of the Wooden Soldiers`、`Jingle Bells` 这类 first performance 候选会额外导向 `first-performance-letter-note-songs`

#### 2026-04-10 既有页面审计与优化

本轮按“先优化既有公开 SEO 入口层，不再继续加新页面”的原则执行。

当前执行位置：

- `easy-sing-along-letter-note-songs` 与 `first-performance-letter-note-songs` 已上线并接入 related guides。
- 当前阶段已从“继续扩 learn 页面数量”切换为“压薄内容风险、补内链闭环、统一 metadata 质量”的 consolidation 阶段。

Doorway / thin-content 审计结果：

- 已审计全部 `25` 个 hub / collection 页面。
- Minimum Viable Links 结果通过：当前最少的 hub 也有 `6` 首 unique songs，没有任何 `<5` 首歌曲的 hub，因此本轮不做合并页或改路由。
- 当前 unique song count 最低的几个 hub 为：
  - `tin-whistle-letter-notes`：`6`
  - `easy-christmas-recorder-songs`：`6`
  - `easy-christmas-tin-whistle-songs`：`6`
  - `folk-songs-for-beginners`：`6`
  - `wedding-and-ceremony-letter-note-songs`：`6`
- 已为全部 hub 页补成定制化 `heroSummary`，替换 H1 下方模板味导语；文案长度控制在约 `150-200` 个英文词，并明确带入 instrument、classroom、public-domain、seasonal、ceremony、breath control、school music 等上下文。

Internal linking 审计结果：

- `src/components/learn/LearnSongCardGrid.tsx` 的主链接可见锚文本为精确歌曲名，不存在 `Click here` 类弱锚文本。
- `src/components/learn/LearnGuideCardGrid.tsx` 的主链接可见锚文本为精确 guide title。
- `/learn` 与 `/learn/[slug]` 页底部已补可见 breadcrumb 与 related-category 闭环导航，减少孤岛页和单向导流风险。

Metadata 审计结果：

- `/learn` + `39` 个 `/learn/[slug]` 页面，共 `40` 页。
- `generateMetadata` 已改为直接使用每页独立 metadata，不再统一追加 `| Play By Fingering`，避免 title 被动超长和同质化。
- `how-to-read-letter-notes` 的 title 已缩短。
- `12-hole-ocarina-letter-notes` 与 `6-hole-ocarina-letter-notes` 的 description 已缩短。
- 当前全量审计结果为：`title < 60`、`description < 160`、title 与 description 均 `100%` 唯一，`badCount = 0`。

后续执行顺序：

1. 继续加强 song page 到 `easy-sing-along-letter-note-songs` / `first-performance-letter-note-songs` 的相关推荐闭环，优先覆盖高展示量曲目。
2. 继续按 impression / click 数据补 song page 的 per-song SEO copy，而不是继续扩 learn 页数量。
3. 后续每次改 learn metadata、hero copy、related guides 时，都复跑这份 TDK checklist 与最小链接阈值审计。

#### /learn TDK Checklist（2026-04-10）

| URL | Title | Description | T Len | D Len | Core Long-tail Targets |
| --- | --- | --- | ---: | ---: | --- |
| `/learn` | `Learn Song Guides and Visual Charts` | `Browse beginner song guides, easy tabs, and visual chart pathways for ocarina, recorder, and tin whistle players.` | 35 | 113 | `learn song guides`; `visual chart`; `easy tabs` |
| `/learn/12-hole-ocarina-letter-notes` | `12-Hole Ocarina Letter Notes` | `12-hole ocarina letter notes with easy tabs, visual charts, and beginner-friendly songs for nursery, folk, hymn, and holiday practice.` | 28 | 134 | `12-hole ocarina letter notes`; `ocarina visual chart`; `beginner tabs` |
| `/learn/easy-12-hole-ocarina-songs` | `Easy 12-Hole Ocarina Songs` | `Easy 12-hole ocarina songs with letter notes, visual charts, and beginner tabs for familiar melodies, hymns, and holiday tunes.` | 26 | 127 | `easy 12-hole ocarina songs`; `ocarina easy tabs`; `beginner visual chart` |
| `/learn/6-hole-ocarina-letter-notes` | `6-Hole Ocarina Letter Notes` | `6-hole ocarina letter notes with beginner songs, easy tabs, and visual charts that open directly in the 6-hole view.` | 27 | 116 | `6-hole ocarina letter notes`; `6-hole visual chart`; `easy tabs` |
| `/learn/recorder-letter-notes` | `Recorder Letter Notes` | `A themed recorder entry page for searchable melody pages with letter notes, fingering support, and practical songs for classroom or beginner practice.` | 21 | 150 | `recorder letter notes`; `recorder visual chart`; `beginner songs` |
| `/learn/tin-whistle-letter-notes` | `Tin Whistle Letter Notes` | `A focused tin whistle landing page for players who want searchable melody pages with letter notes, familiar folk songs, and an easy path into the main library.` | 24 | 159 | `tin whistle letter notes`; `whistle visual chart`; `easy tabs` |
| `/learn/how-to-start-ocarina-with-letter-notes` | `How to Start Ocarina With Letter Notes` | `Learn how to start ocarina with letter notes, beginner songs, and visual charts that turn familiar tunes into a first practice routine.` | 38 | 135 | `start ocarina letter notes`; `ocarina beginner songs`; `visual chart` |
| `/learn/how-to-start-recorder-with-letter-notes` | `How to Start Recorder With Letter Notes` | `Start recorder with letter notes, easy classroom songs, and visual charts that connect melody reading to simple finger patterns.` | 39 | 128 | `start recorder letter notes`; `recorder beginners`; `visual chart` |
| `/learn/how-to-start-tin-whistle-with-letter-notes` | `How to Start Tin Whistle With Letter Notes` | `Start tin whistle with letter notes, easy tabs, and visual charts that help beginners build breath control through familiar tunes.` | 42 | 130 | `start tin whistle letter notes`; `easy tabs`; `beginners` |
| `/learn/how-to-practice-ocarina-with-letter-notes` | `How to Practice Ocarina With Letter Notes` | `Practice ocarina with letter notes using easy songs, visual charts, and a simple routine for tone, fingering, and phrase control.` | 41 | 129 | `practice ocarina letter notes`; `beginner routine`; `visual chart` |
| `/learn/how-to-practice-recorder-with-letter-notes` | `How to Practice Recorder With Letter Notes` | `Practice recorder with letter notes using easy songs, visual charts, and short routines for classroom players and home beginners.` | 42 | 129 | `practice recorder letter notes`; `classroom routine`; `beginners` |
| `/learn/how-to-practice-tin-whistle-with-letter-notes` | `How to Practice Tin Whistle With Letter Notes` | `Practice tin whistle with letter notes using easy tabs, visual charts, and short routines for breath, cuts, and steady phrasing.` | 45 | 128 | `practice tin whistle letter notes`; `whistle routine`; `easy tabs` |
| `/learn/easy-ocarina-songs-for-beginners` | `Easy Ocarina Songs For Beginners` | `A guide page for beginners who want easy ocarina songs with letter notes, familiar melodies, and a clearer path into the public fingering-chart song pages.` | 32 | 155 | `easy ocarina songs for beginners`; `visual chart`; `letter notes` |
| `/learn/easy-6-hole-ocarina-songs` | `Easy 6-Hole Ocarina Songs` | `Easy 6-hole ocarina songs with letter notes, visual charts, and beginner tabs that open directly in the 6-hole view.` | 25 | 116 | `easy 6-hole ocarina songs`; `6-hole tabs`; `visual chart` |
| `/learn/easy-christmas-ocarina-songs` | `Easy Christmas Ocarina Songs` | `Easy Christmas ocarina songs with letter notes, visual charts, and beginner-friendly carols for seasonal practice and performances.` | 28 | 131 | `easy christmas ocarina songs`; `holiday tabs`; `beginners` |
| `/learn/easy-recorder-songs-for-beginners` | `Easy Recorder Songs for Beginners` | `A recorder-first beginner guide for familiar songs with letter notes, fingering support, and a cleaner path into the public melody library.` | 33 | 139 | `easy recorder songs for beginners`; `classroom tabs`; `visual chart` |
| `/learn/easy-tin-whistle-songs` | `Easy Tin Whistle Songs` | `A beginner tin whistle landing page for easy songs with letter notes, folk-friendly phrase shapes, and quick links into the public melody pages.` | 22 | 144 | `easy tin whistle songs`; `whistle tabs`; `beginners` |
| `/learn/easy-christmas-recorder-songs` | `Easy Christmas Recorder Songs` | `A recorder-first Christmas landing page for familiar carols with letter notes, lyric-friendly practice pages, and direct links into the public recorder view.` | 29 | 157 | `easy christmas recorder songs`; `school carols`; `visual chart` |
| `/learn/easy-christmas-tin-whistle-songs` | `Easy Christmas Tin Whistle Songs` | `A whistle-first holiday guide for familiar Christmas melodies with letter notes, singable phrasing, and direct links into the public tin whistle view.` | 32 | 150 | `easy christmas tin whistle songs`; `holiday whistle tabs`; `visual chart` |
| `/learn/nursery-rhyme-letter-notes` | `Nursery Rhyme Letter Notes` | `A nursery-rhyme guide for familiar beginner songs with letter notes, lyrics when available, and short phrase shapes that work well for first-week practice.` | 26 | 155 | `nursery rhyme letter notes`; `school beginners`; `visual chart` |
| `/learn/easy-songs-for-beginners` | `Easy Songs for Beginners` | `A beginner-first guide that groups the shortest and most recognizable melody pages for new ocarina, recorder, and tin whistle players.` | 24 | 134 | `easy songs for beginners`; `visual chart`; `melody instruments` |
| `/learn/songs-with-lyrics` | `Songs with Lyrics` | `Songs with lyrics, letter notes, and visual charts for players who learn melody, phrasing, and breathing faster when words stay visible.` | 17 | 136 | `songs with lyrics letter notes`; `lyric practice`; `visual chart` |
| `/learn/easy-sing-along-letter-note-songs` | `Easy Sing-Along Letter Note Songs` | `Easy sing-along songs with letter notes, visual charts, and beginner tabs for classroom, family, choir, and holiday practice.` | 33 | 125 | `easy sing along songs`; `classroom sing along`; `beginners` |
| `/learn/first-performance-letter-note-songs` | `First Performance Letter Note Songs` | `A practical guide for players choosing a first recital, ceremony, school, or group-performance melody with letter notes and a readable fingering-first page.` | 35 | 156 | `first performance songs`; `recital beginners`; `ceremony melody` |
| `/learn/simple-instruments-for-music-education` | `Simple Instruments for Music Education` | `A beginner education guide about why melody-first instruments and readable song pages help teachers, students, and families start music practice faster.` | 38 | 152 | `simple instruments music education`; `beginner classroom`; `easy songs` |
| `/learn/christmas-letter-note-songs` | `Christmas Letter Note Songs` | `A holiday landing page for Christmas songs with letter notes, lyric-friendly carols, and familiar seasonal melodies for ocarina, recorder, and tin whistle.` | 27 | 155 | `christmas letter note songs`; `easy holiday songs`; `visual chart` |
| `/learn/folk-songs-for-beginners` | `Folk Songs for Beginners` | `Easy folk songs for beginners with letter notes, visual charts, and public-domain melodies suited to ocarina, recorder, and tin whistle.` | 24 | 136 | `folk songs for beginners`; `public-domain melodies`; `easy tabs` |
| `/learn/celtic-tin-whistle-songs` | `Celtic Tin Whistle Songs` | `A focused whistle guide for Celtic and Irish-style melodies with letter notes, singable phrase shapes, and direct paths into the public melody pages.` | 24 | 149 | `celtic tin whistle songs`; `Irish whistle tabs`; `folk melodies` |
| `/learn/march-and-parade-letter-note-songs` | `March and Parade Letter Note Songs` | `March and parade songs with letter notes, visual charts, and steady pulse practice for recital, band, and ceremony repertoire.` | 34 | 126 | `march songs letter notes`; `parade music beginners`; `steady pulse` |
| `/learn/patriotic-and-anthem-letter-note-songs` | `Patriotic and Anthem Letter Note Songs` | `Patriotic songs and anthems with letter notes, visual charts, and beginner-friendly melody pages for school and civic performances.` | 38 | 131 | `patriotic songs letter notes`; `anthem melody`; `civic performance` |
| `/learn/world-folk-letter-note-songs` | `World Folk and Traditional Letter Note Songs` | `World folk songs with letter notes, visual charts, and beginner-friendly melodies from Asia, Europe, and the Americas.` | 44 | 118 | `world folk songs letter notes`; `traditional melodies`; `visual chart` |
| `/learn/how-to-read-letter-notes` | `Read Letter Notes for Ocarina, Recorder, Tin Whistle` | `A practical beginner guide to using letter notes, fingering charts, lyrics, and simple song pages without jumping straight into staff notation.` | 52 | 143 | `read letter notes`; `ocarina recorder tin whistle`; `visual chart` |
| `/learn/easy-classical-letter-note-songs` | `Easy Classical Letter Note Songs` | `Easy classical songs with letter notes, visual charts, and beginner melody pages for famous themes on ocarina, recorder, and whistle.` | 32 | 133 | `easy classical songs letter notes`; `famous themes`; `beginners` |
| `/learn/music-class-songs-for-beginners` | `Easy Songs for Music Class and Home Practice` | `A classroom-friendly guide for teachers, parents, and self-learners who need familiar songs with letter notes, lyric support, and low setup friction.` | 44 | 149 | `music class songs for beginners`; `home practice`; `lyric support` |
| `/learn/hymns-and-spiritual-letter-note-songs` | `Hymns and Spiritual Letter Note Songs` | `Hymns and spirituals with letter notes, visual charts, and beginner melody pages for church, school, and reflective practice.` | 37 | 125 | `hymns and spirituals letter notes`; `church beginners`; `visual chart` |
| `/learn/easy-songs-for-adult-beginners` | `Easy Songs for Adult Beginners` | `Easy songs for adult beginners with letter notes, visual charts, and low-pressure melodies for steady practice on melody instruments.` | 30 | 133 | `easy songs for adult beginners`; `low-pressure practice`; `visual chart` |
| `/learn/wedding-and-ceremony-letter-note-songs` | `Wedding and Ceremony Letter Note Songs` | `Wedding and ceremony songs with letter notes, visual charts, and melody pages for processionals, recessional music, and formal events.` | 38 | 134 | `wedding ceremony songs letter notes`; `processionals`; `easy melody` |
| `/learn/calm-and-lyrical-letter-note-songs` | `Calm and Lyrical Letter Note Songs` | `Calm and lyrical songs with letter notes, visual charts, and expressive melody pages for breath control and reflective practice.` | 34 | 128 | `calm lyrical songs letter notes`; `breath control`; `reflective practice` |
| `/learn/lullaby-and-bedtime-letter-note-songs` | `Lullaby and Bedtime Letter Note Songs` | `A public guide for lullabies, bedtime melodies, and other quiet letter-note songs with fingering support and slower, calmer practice material.` | 37 | 142 | `lullaby letter notes`; `bedtime melodies`; `quiet practice` |
| `/learn/dance-and-waltz-letter-note-songs` | `Dance and Waltz Letter Note Songs` | `A public guide for lively dance, waltz-like, and polka-style melody pages with letter notes, fingering charts, and brighter rhythmic practice.` | 33 | 142 | `dance and waltz letter notes`; `polka melodies`; `rhythmic practice` |

### Phase 2：高潜力 song page 文案深化

状态：本轮已完成，待验收。

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
- 已增加 per-song `overview` 能力，用于 song page 首段文案精细化，优先通过 `song-seo-profiles.json` 注入更具体的 melody-first opening paragraph，而不是继续依赖统一模板句式。
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
- 当前 pushed published songs 的 `overview` 已全部补齐，`origin/main` 范围内 111 首公开歌曲现在都已有 song-specific opening paragraph；后续这条线可以从“补覆盖”转到“继续精修高价值曲目的文案质量”和“补更多高意图公开入口页”。
- 已补齐当前全部 published songs 的 `metaTitle` 覆盖，`public-song-manifest` 当前为 0 缺口。
- `src/lib/songbook/seoProfiles.ts` 与 `src/lib/songbook/presentation.ts` 当前已新增 per-song `metaDescription` 与 `extraFaqs` 能力，允许 song page metadata 与 FAQ 不再完全依赖统一模板。
- 已开始给最有机会承接长尾搜索的歌曲补第一批定制 `metaDescription` 与 `extraFaqs`，当前覆盖：
  - `twinkle-twinkle-little-star`
  - `ode-to-joy`
  - `amazing-grace`
  - `happy-birthday-to-you`
  - `jingle-bells`
  - `silent-night`
  - `canon`
  - `fur-elise`
  - `scarborough-fair`
  - `greensleeves`
  - `wellerman`
  - `sakura-sakura`
  - `frere-jacques`
  - `london-bridge`
- 这条线本轮又继续补了一批更偏 sing-along / first-performance / seasonal 长尾的页面：
  - `mary-had-a-little-lamb`
  - `american-patrol`
  - `deck-the-halls`
  - `old-macdonald`
  - `turkish-march`
  - `we-wish-you-a-merry-christmas`
  - `wedding-march`
  - `row-row-row-your-boat`
  - `joy-to-the-world`
  - `parade-of-the-wooden-soldiers`
- 这批 FAQ 的目标不是堆模板，而是补每首歌更自然的长尾问题，例如：
  - 是否适合作为 first song
  - 是否适合 church / memorial / wedding / classroom / sing-along 这类使用场景
  - 是否和常见别名或 tune family 有关
- 已开始给高潜力落地页补第一批定制 `overview` 首段，当前覆盖：
  - `twinkle-twinkle-little-star`
  - `ode-to-joy`
  - `amazing-grace`
  - `happy-birthday-to-you`
  - `jingle-bells`
  - `scarborough-fair`
  - `auld-lang-syne`
  - `silent-night`
  - `fur-elise`
  - `air-on-the-g-string`
  - `canon`
  - `frere-jacques`
  - `greensleeves`
  - `london-bridge`
- 已继续补第二、第三批定制 `overview` 首段；当前 published songs 里已有 52 首带 song-specific opening paragraph。新增覆盖包括：
  - `mary-had-a-little-lamb` / `yankee-doodle` / `can-can` / `american-patrol` / `arirang` / `auld-lang-syne-english` / `deck-the-halls` / `do-your-ears-hang-low` / `god-rest-you-merry-gentlemen` / `long-long-ago`
  - `minuet-in-g` / `moonlight-sonata` / `old-macdonald` / `red-river-valley` / `santa-lucia` / `schubert-serenade` / `scotland-the-brave` / `we-wish-you-a-merry-christmas` / `wedding-march` / `were-you-there`
  - `home-sweet-home` / `flight-of-the-bumblebee` / `going-home` / `habanera` / `londonderry-air` / `lullaby` / `on-wings-of-song` / `sakura-sakura` / `swan-lake` / `traumerei`
  - `cavalry-march` / `twinkle-variations` / `wedding-march-alt` / `oh-susanna` / `row-row-row-your-boat` / `spring-song` / `simple-gifts` / `wellerman`
- 当前仍然只动 SEO 文案外壳，不动公开曲谱和 runtime 核心逻辑。
- `yankee-doodle`、`can-can`、`home-sweet-home` 这 3 个已在线的高意图 song page 也已补齐定制 `metaDescription` 与 `extraFaqs`，用于继续承接 school / patriotic / first-march、recital / dance-theme、lyrical / reflective 等更具体的长尾搜索。
- 继续补了 6 个已在线的高意图 song page 定制 `metaDescription` 与 `extraFaqs`：`air-on-the-g-string`、`auld-lang-syne-english`、`god-rest-you-merry-gentlemen`、`going-home`、`scotland-the-brave`、`simple-gifts`，分别补强 calm classical / ceremony、New Year sing-along、minor Christmas carol、reflective memorial、Scottish parade folk、school music / Shaker tune 等更细分的搜索承接。
- 这一轮再补了 6 个 classical / lyric 高意图 song page：`flight-of-the-bumblebee`、`habanera`、`londonderry-air`、`moonlight-sonata`、`santa-lucia`、`schubert-serenade`，重点覆盖 fast showpiece、opera-theme、Danny Boy / memorial、slow Beethoven theme、warm lyrical song、romantic recital 等搜索意图。补完后，公开 songs 里仍有 55 首还没有定制 `metaDescription` / `extraFaqs`，后续继续按“高展示量优先、场景词优先”的顺序往下精修。
- 这一轮再补了 6 个 folk / beginner / lyrical 高意图 song page：`arirang`、`do-your-ears-hang-low`、`jasmine-flower`、`lullaby`、`old-folks-at-home`、`red-river-valley`，重点覆盖 Korean folk、classroom sing-along、Mo Li Hua / Chinese folk、Brahms bedtime melody、Swanee River nostalgia、easy lyrical folk 等搜索意图，并继续保持“高展示量优先、场景词优先”的精修顺序，不扩 learn / hub 新页。
- 本轮已把剩余 49 首公开 song page 全部补齐定制 `metaDescription` 与 `extraFaqs`，覆盖 `down-by-the-salley-gardens`、`harvest-song`、`humoresque`、`lightly-row`、`little-bee`、`long-long-ago`、`minuet-bach`、`minuet-in-g`、`on-wings-of-song`、`song-of-parting`、`swan-lake`、`the-trout`、`traumerei`、`toy-march`、`cavalry-march`、`twinkle-variations`、`were-you-there`、`wild-rose`、`oh-susanna`、`spring-song`、`aura-lee`、`the-south-wind`、`lough-leane`、`romance-damour`、`bella-ciao`、`jolly-old-saint-nicholas`、`home-on-the-range`、`la-cucaracha`、`drinking-song`、`el-condor-pasa`、`happy-new-year`、`spanish-bullfighting-tune`、`woodpecker-polka`、`blacksmith-polka`、`loch-lomond`、`grenadiers-march`、`the-internationale`、`russian-national-anthem`、`katyusha`、`moscow-nights`、`troika`、`the-pathway`、`red-berries-blossom`、`the-hawthorn-tree`、`hej-sokoly`、`irish-morning-wind`、`dancing-doll-and-teddy-bear`、`grandfathers-clock`、`irish-blackbird`。
- 已顺手收敛全部过长的 song `metaDescription`，当前 `origin/main` 范围内 111 首公开歌曲均已具备 song-specific `metaTitle`、`overview`、`metaDescription` 与至少 2 条 `extraFaqs`，并满足当前长度审计（`missingCount = 0`、`longCount = 0`）。Phase 2 可以按“文案精修阶段完成，进入验收”处理。
- 这一轮顺手复核了 learn / hub 文案的加载策略：这批核心 SEO 正文当前更适合保持静态输出，不建议对正文做客户端按需加载；对 Google 来说，正文首屏可抓取性比“把纯文本拆得更碎”更重要。后续如果要继续减重，优先看 song 页 client shell 的 hydration 体积，而不是懒加载核心落地页文案。

### Phase 3：更多意图型公开页

状态：待 Phase 2 验收通过后评估。

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

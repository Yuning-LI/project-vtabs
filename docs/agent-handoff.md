# Agent Handoff

这份文档是给“新开对话时的 AI / 新接手时的程序员”的速接版说明。它比 `docs/handoff.md` 更短，但信息密度更高，重点是快速建立正确心智模型，避免按旧上下文乱改。

如果任务涉及内部打印 PDF、私有版权曲存档、或 `MusicXML` 输入链，额外继续看：

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

如果任务涉及公开增长、SEO 入口页、learn / hub / guide 页面，继续看：

- `docs/seo-growth-roadmap.md`

## 1. 一句话真相

当前公开 `/song/<slug>` 页面已经统一走“快乐谱 raw JSON + 快乐谱原始 runtime 渲染逻辑”的路线，默认显示字母谱，简谱作为可选模式保留，`captured SVG` 只剩调试价值。

补充：

- 生产 raw JSON 现在优先读取 `data/kuailepu-runtime/<slug>.json`
- `reference/songs/<slug>.json` 只保留给本地导歌 / 调试 fallback
- deployable runtime archive 在 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`

## 最新补充（2026-04-22）

- 公开页面 title 现在明确按“SEO 长尾优先、品牌词让位”处理：
  - 首页、`/learn`、`/learn/[slug]`、`/song/[slug]` 这类公开入口页，不要为了统一品牌而机械追加 `| Play By Fingering`
  - 如果 title 空间有限，优先保留乐器词、tabs / notes / letter notes / fingering chart 这类搜索词
  - `openGraph.siteName`、站点级 metadata、站内正文可以保留品牌，但不要让品牌词挤占公开长尾落地页的 title 词位
- `/api/kuailepu-runtime/<slug>` 虽然挂在 `api/` 下，但返回的是一整页 runtime HTML，不是 JSON
  - 这类 URL 不是公开 SEO 落地页
  - 不应让 GSC / Google 收录，否则会制造 query 变体索引并稀释 `/song/<slug>` 的抓取与展示
  - 当前已经在响应头显式返回 `X-Robots-Tag: noindex, nofollow, noarchive`
  - 如果以后看到 GSC 里还有这类 URL，不要第一反应去掉 `noindex`；应先等 Google 重抓，必要时再用 GSC Removals 做临时隐藏
- 站点正式 `icon.svg` 当前已定稿为白底 `C5` 陶笛指法图版本。
- 当前图标约束是：
  - 白底
  - 浅绿色主体
  - 黑色粗外轮廓
  - 黑色孔位
- 如果后续继续改 icon，优先只动 `src/app/icon.svg` 的 `transform` 位移参数；不要在没有明确要求时顺手换色、换指法或改成别的乐器。
- 本地外链分发成品当前保留在：
  - `exports/ocarina-c5-logo.png`
  - `exports/ocarina-c5-logo.jpg`
- 下面这些 2026-04-20 的内容仍然有效：

## 最新补充（2026-04-20）

- 当前工作区公开曲库数量已更新为 `130`。
- 当前工作区最新已导入但尚未 push 的 3 首灰度曲：
  - `casablanca`
  - `its-a-small-world`
  - `kiss-the-rain`
- 这 3 首当前已经补到本地工作区：
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts`
- 本轮又补跑了一轮中国网络下的快乐谱 western / public-domain discovery：
  - 一批英文 holiday / folk / classroom 标题直搜大多是 `noResult` 后回退热门曲
  - 中文常用别名能命中的大多已经在公开曲库里
  - 当前没有新的强公版曲进入 queued import list
- `data/songbook/kuailepu-western-candidate-pool.json` 当前应视作“已基本挖空，等待新的发现线索”。
- 如果任务还要继续筛“适合 Google 用户”的快乐谱公版曲，先在中国网络下做发现，再切国外 VPN 做更严格的 western-demand screen。
- 下面这些是 2026-04-19 那轮仍然有效的技术状态：
- 当时公开曲库数量已更新为 `124`。
- 本轮新增并通过 preflight compare 的 3 首灰度歌：
  - `let-it-be`
  - `take-me-home-country-roads`
  - `over-the-rainbow`
- 快乐谱 live 当前核心运行时已切到 `hc.min_1cfae5fe62.js`。
- 本地 deployable runtime archive 已同步到当前线上模板和资源 hash。
- compare 本地 runtime 现在默认走：
  - `runtime_asset_profile=full-template`
  - `runtime_compare_mode=1`
- compare 的本地 clean browser context 现在固定 `locale = zh-CN`，用于对齐快乐谱 live 的真实运行环境。
- 这轮之后：
  - 新增 3 首灰度歌 `15 / 15` 组合已全部通过
  - 额外回归的 9 首既有公开样本歌 `45 / 45` 组合也已全部通过
- 当前还确认了一个新的 internal-only 方向：
  - 基于现有 Pinterest 导图链，新增“歌名单输入 -> A4 合集 PDF”自动化导出
  - 输入只匹配当前公开曲库内的歌名
  - 输出单个电子 PDF
  - 包含封面、目录、歌曲标题、按歌分页
  - 目录显示歌名与起始页码
  - 每首歌从新页开始；如果一页放不下，就继续自动分页直到该歌完整结束
  - 当前更推荐通过内部 HTML 集合页 + Playwright 导出实现，而不是简单图片合并
  - 这条链当前仍属方向确认，尚未实现

## 最新补充（2026-04-02）

- 公开 runtime 现已默认走英文文本模式。
- 对仍保留显示的 SVG 文本，`Composer`、`Play order` 等标签都应是英文。
- 调号 `1=...`、纯拍号、速度类 `=120` 信息以及指法图谱上方的乐器 / 指法标题行，当前在 english runtime 下默认隐藏。
- 这条隐藏规则同样作用于公开 song page、`/dev/print/song/<slug>` 和 `/dev/pinterest/song/[id]`。
- 公开页当前默认本地优先加载快乐谱静态依赖，不再默认回源 `www.kuaiyuepu.com/static/...`；中国以外网络下公开页也应能正常显示。
- `/k-static` 现在优先由 `public/k-static` 提供，不再主要依赖动态 route。
- `scripts/sync-kuailepu-static.mjs` 会在 `dev` / `build` / `start` 前自动同步必需的旧 JS/CSS/字体资源。
- `vendor/kuailepu-static` 当前带着一份快乐谱线上实际部署版的压缩静态快照。
- 公开生产链路已经脱离 `reference/` 硬依赖：
  - 生产 raw JSON 走 `data/kuailepu-runtime/<slug>.json`
  - runtime 模板归档走 `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
- 重复公开入口 `silent-night-english`、`jingle-bells-english` 已清理。
- 本轮又新增了 5 首快乐谱导入并已通过 preflight compare：`jasmine-flower`、`arirang`、`toy-march`、`cavalry-march`、`sakura-sakura`。
- `scripts/preflight-kuailepu-publish.ts` 已修复一处误判：之前 `npm` 输出和 Node warning 会污染 JSON，导致“登录其实有效，但 preflight 误报无效登录”。
- runtime 英文化链已补上 `轻吹 -> Soft blow`、`重吹 -> Strong blow`。
- runtime 英文化链已补上全角中文标点规范化，避免公开页出现 `Herbert Hughes ，Benjamin Britten` 这类中式标点残留。
- 详情页 runtime loading 已拆到 `src/components/song/KuailepuRuntimeFrame.tsx`，首页点进详情页时 overlay 不会再卡住。
- favicon 已补齐：
  - `src/app/icon.svg`
  - `public/favicon.ico`
  - `src/app/layout.tsx` 的 `metadata.icons`
- sitemap / robots 现已改为 App Router metadata routes：
  - `src/app/sitemap.ts` 基于公开 `songCatalog` 输出 sitemap
  - `src/app/robots.ts` 输出 robots.txt 并指向 sitemap
  - 不再使用 `next-sitemap`
  - `icon.svg` 不应进入 sitemap
- 首页 metadata 现已统一补齐：
  - `metadataBase`
  - canonical
  - `robots`
  - `google-site-verification`
- 首页与 song page metadata title 现已进一步覆盖 recorder / tin whistle 搜索意图，不再只写 `Ocarina Tabs`
- Vercel 线上已实测通过：
  - `/song/ode-to-joy`
  - `/song/jasmine-flower`
  - `/song/arirang`
  - `number` 模式切换
  - `/api/kuailepu-runtime/...`
  - 实际被页面引用的 `/k-static/...` 资源
- Playwright 仓库内测试当前也已恢复可直接运行：
  - `playwright.config.ts` 固定走 `127.0.0.1:3000`
  - `webServer` 使用 `port: 3000`
  - `e2e/core.spec.ts` 已改到当前 runtime-backed 流程

## 最新补充（2026-04-03）

- 公开 song page 现在已经支持最小多乐器切换：
  - `o12`（默认）
  - `o6`
  - `r8b`
  - `r8g`
  - `w6`
- 公开 song page 也已支持一批最小显示开关：
  - `Fingering Chart`（同一下拉也负责多图谱方向切换）
  - `Lyrics`（仅公开可见歌词）
  - `Measure Numbers`
  - `Layout`
  - `Zoom`
  - `Metronome`
- 这组乐器切换仍走同一个 runtime-backed `/song/<slug>` 页面，不存在第二条公开详情页路线。
- `scripts/audit-kuailepu-instruments.ts` 已可直接审计当前公开曲目的快乐谱乐器支持覆盖率。
- `docs/instrument-rollout-plan.md` 已记录当前公开顺序与剩余待缓开放的乐器集合。
- 中国网络下已经做过 5 首样本歌 x 5 个公开乐器的 live-vs-local `number` 模式 SVG hash 对照：
  - `25 / 25` 组合一致
- 本轮还修掉了一处默认值继承问题：
  - 显式切换乐器后，不应继续沿用 payload 根层属于默认乐器的 `fingering` / `show_graph`
  - 修复点在 `src/lib/kuailepu/runtime.ts`
- `w6` 爱尔兰哨笛现已接入前台最小公开乐器集，继续沿用 `?instrument=w6` query state。
- compare / preflight 现已补到可直接覆盖当前公开乐器集，包括 `w6` 这类不在 live 页下拉显式暴露的乐器。
- 这条补强依赖“直接回放 live runtime context”，而不是继续把本地下拉索引硬套到 live 页可见 select。
- 节拍器现已公开：
  - 前台只有 `Metronome` On / Off
  - 仍复用快乐谱原始 metronome 脚本
  - 公开页会把它改造成停靠在谱面上方的英文工具条，不再以遮挡谱面的弹窗出现

## 最新补充（2026-04-04）

- 本轮又新增并通过 preflight compare 的 3 首公版曲：
  - `aura-lee`
  - `simple-gifts`
  - `the-south-wind`
- 中国网络下已经对这 3 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `15 / 15` 一致
- 其中：
  - `Aura Lee` 为明确英文别名页
  - `Simple Gifts` 为无公开歌词的器乐页
  - `The South Wind` 为英文标题器乐页
- 本轮后续又新增并通过 preflight compare 的 2 首公版曲：
  - `lough-leane`
  - `romance-damour`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `Lough Leane` 为英文标题器乐页
  - `Romance d'Amour` 当前导入自 `爱的罗曼史 / 《禁忌的游戏》插曲` 器乐页
- 本轮后续又新增并通过 preflight compare 的 2 首高流量 folk 曲：
  - `wellerman`
  - `bella-ciao`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `Wellerman` 为英文标题页
  - `Bella Ciao` 当前导入自 `啊朋友再见` 页，纯中文歌词仍按公开规则默认隐藏
- 本轮后续又新增并通过 preflight compare 的 1 首 holiday 曲：
  - `jolly-old-saint-nicholas`
- 中国网络下已经对这首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 一致
- 当前这首歌导入自快乐谱页 `欢乐圣诞`，按旋律身份映射为 `Jolly Old Saint Nicholas`
- 本轮后续又新增并通过 preflight compare 的 1 首 holiday / hymn 曲：
  - `joy-to-the-world`
- 中国网络下已经对这首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 一致
- 当前这首歌导入自快乐谱页 `普世歡騰 / 敬拜頌讚`，按英文常用名映射为 `Joy to the World`；纯中文歌词仍按公开规则默认隐藏
- 本轮后续又新增并通过 preflight compare 的 3 首 western 候选：
  - `home-on-the-range`
  - `la-cucaracha`
  - `drinking-song`
- 中国网络下已经对这 3 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `15 / 15` 一致
- 其中：
  - `Home on the Range` 导入自 `牧场上的家`
  - `La Cucaracha` 当前为器乐页
  - `Drinking Song` 导入自 `饮酒歌 / 威尔第`，纯中文歌词仍按公开规则默认隐藏
- 本轮后续又新增并通过 preflight compare 的 2 首直接导入候选：
  - `el-condor-pasa`
  - `happy-new-year`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `El Condor Pasa` 导入自 `老鹰之歌 If I Could (El Condor Pasa)` 器乐页
  - `Happy New Year` 导入自 `新年好 Happy New Year` 页，当前为中英混合歌词
- `Edelweiss` 曾被导入，但快乐谱来源明确标注 `Richard Rodgers`，不符合当前公版规则，已在上线前从公开内容层与 deployable raw 中移除
- 本轮后续又补齐并通过 preflight compare 的 3 首既有公开曲：
  - `santa-lucia`
  - `turkish-march`
  - `can-can`
- 这 3 首原本已在公开内容层，这次补齐为快乐谱 raw JSON 主链并完成中国网络 compare：
  - `Santa Lucia`
  - `Turkish March`
  - `Can-Can`
- 本轮后续又新增并通过 preflight compare 的 2 首器乐候选：
  - `spanish-bullfighting-tune`
  - `woodpecker-polka`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `Spanish Bullfighting Tune` 导入自 `西班牙斗牛曲 玛奎纳` 器乐页
  - `Woodpecker Polka` 导入自 `啄木鸟波尔卡 Woodpecker Polka` 器乐页
- 本轮后续又新增并通过 preflight compare 的 1 首器乐候选：
  - `blacksmith-polka`
- 中国网络下已经对这首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 一致
- 当前这首歌导入自 `铁匠波尔卡 / 陶笛二重奏` 页；来源作曲者字段为 `约瑟夫·施特劳斯`，公开页按纯器乐曲处理
- 本轮后续又新增并通过 preflight compare 的 1 首 folk 候选：
  - `loch-lomond`
- 中国网络下已经对这首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 一致
- 当前这首歌导入自 `罗莽湖畔 / 苏格兰民谣` 页；来源作曲者字段为空，公开页按传统苏格兰民谣处理
- 本轮后续又新增并通过 preflight compare 的 2 首候选：
  - `grenadiers-march`
  - `the-internationale`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `Grenadiers March` 导入自 `掷弹兵进行曲` 页；来源作曲者字段为空，公开页按器乐进行曲处理
  - `The Internationale` 导入自 `国际歌 / 比尔` 页；公开页按旋律页处理
- 本轮后续又新增并通过 preflight compare 的 1 首国歌候选：
  - `russian-national-anthem`
- 中国网络下已经对这首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 一致
- 当前这首歌导入自 `俄罗斯联邦国歌(俄罗斯，我们神圣的祖国)` 页；来源作曲者字段为空，公开页保持歌词隐藏
- 本轮后续又新增并通过 preflight compare 的 1 首 march 候选：
  - `parade-of-the-wooden-soldiers`
- 中国网络下已经对这首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 一致
- 当前这首歌导入自 `木偶兵进行曲` 页；来源作曲者字段为 `L·拉塞尔`，公开页按器乐进行曲处理
- 本轮后续又新增并通过 preflight compare 的 2 首 song 候选：
  - `katyusha`
  - `moscow-nights`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `Katyusha` 导入自 `喀秋莎` 页；来源作曲者字段为空，公开页按旋律页处理
  - `Moscow Nights` 导入自 `莫斯科郊外的晚上` 页；来源作曲者字段为 `瓦西里·索洛维约夫·谢多伊`，公开页保持歌词隐藏
- 本轮后续又新增并通过 preflight compare 的 2 首 song 候选：
  - `troika`
  - `the-pathway`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `Troika` 导入自 `三套车` 页；来源作曲者字段为空，公开页保持歌词隐藏
  - `The Pathway` 导入自 `小路（苏）` 页；来源作曲者字段为空，公开页保持歌词隐藏
- 本轮后续又新增并通过 preflight compare 的 2 首 song 候选：
  - `red-berries-blossom`
  - `the-hawthorn-tree`
- 中国网络下已经对这 2 首歌 x 5 个公开乐器完成 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 一致
- 其中：
  - `Red Berries Blossom` 导入自 `红莓花儿开` 页；来源作曲者字段为 `苏 伊·杜那耶夫斯基`
  - `The Hawthorn Tree` 导入自 `山楂树` 页；来源作曲者字段为空，公开页保持歌词隐藏
- 公开增长路线仍在继续，但边界没有变：
  - 可以继续新增公开 `learn / hub / guide` 页面
  - 可以继续增强 song page metadata / overview / related guides
  - 如果要动公开 runtime、iframe、指法图谱或曲谱核心行为，必须先问用户
- 当前公开 `learn` 体系累计已有 40 个公开页面：
  - `1` 个 `/learn` 总入口
  - `39` 个 `/learn/[slug]` 页面
- 最近一轮已推送的是 instrument-accurate landing 入口层：
  - `6-hole-ocarina-letter-notes`
  - `easy-ocarina-songs-for-beginners`
  - `easy-6-hole-ocarina-songs`
  - `easy-12-hole-ocarina-songs`
  - `easy-christmas-ocarina-songs`
  - `easy-christmas-recorder-songs`
  - `easy-christmas-tin-whistle-songs`
- 这些入口页允许把 song card 直接链接到同一个公开 `/song/<slug>` 页面，但预先带上更匹配的乐器参数：
  - `?instrument=o6`
  - `?instrument=r8b`
  - `?instrument=w6`
- 这只是 landing page 与公开详情页的一致性适配，不是新增第二条公开详情页路线。
- `b190dea` 之后追加的最新公开页包括：
  - `lullaby-and-bedtime-letter-note-songs`
  - `dance-and-waltz-letter-note-songs`
- `02cc997` 已 push 上线，包含 3 个 starter guide：
  - `how-to-start-ocarina-with-letter-notes`
  - `how-to-start-recorder-with-letter-notes`
  - `how-to-start-tin-whistle-with-letter-notes`
- 当前本地下一阶段新增的是：
  - `how-to-practice-ocarina-with-letter-notes`
  - `how-to-practice-recorder-with-letter-notes`
  - `how-to-practice-tin-whistle-with-letter-notes`
  - `easy-sing-along-letter-note-songs`
  - `first-performance-letter-note-songs`
- 这 8 个 start / practice / intent 页面当前的定位是：
  - 承接更宽的 beginner / how to start 搜索意图
  - 承接“开始之后怎么练”这类 practice / routine 搜索意图
  - 承接 classroom / sing-along / seasonal chorus / first performance / ceremony 这类更明确的使用场景搜索意图
  - 继续把用户导入同一个公开 `/song/<slug>` 主链
  - 不触碰 runtime、iframe、曲谱或指法图谱核心逻辑
- 这两个入口页继续只做公开 SEO / 导流壳层，不改变公开 runtime：
  - `lullaby-and-bedtime-letter-note-songs` 面向 lullaby / bedtime / quiet practice 意图
  - `dance-and-waltz-letter-note-songs` 面向 dance / polka / waltz-like melody 意图
- `src/lib/learn/content.ts` 的 related guides 规则也继续补强：
  - `lullaby` / `moonlight-sonata` / `schubert-serenade` / `traumerei` / `air-on-the-g-string` / `moscow-nights` / `going-home` / `sakura-sakura` 会优先导向 `lullaby-and-bedtime-letter-note-songs`
  - `can-can` / `habanera` / `woodpecker-polka` / `blacksmith-polka` / `the-hawthorn-tree` / `dancing-doll-and-teddy-bear` / `swan-lake` / `turkish-march` 会优先导向 `dance-and-waltz-letter-note-songs`
  - `twinkle-twinkle-little-star` / `mary-had-a-little-lamb` / `row-row-row-your-boat` / `old-macdonald` / `happy-birthday-to-you` / `jingle-bells` / `deck-the-halls` / `we-wish-you-a-merry-christmas` / `joy-to-the-world` / `auld-lang-syne` 会优先导向 `easy-sing-along-letter-note-songs`
  - `happy-birthday-to-you` / `ode-to-joy` / `amazing-grace` / `canon` / `wedding-march` / `wedding-march-alt` / `american-patrol` / `turkish-march` / `parade-of-the-wooden-soldiers` / `jingle-bells` 会额外导向 `first-performance-letter-note-songs`
- 截至当前工作区：
  - 本地分支仍可能存在未 push 提交。
  - 准备上线或继续收尾前，先检查：
    - `git status --short --branch`
    - `git log --oneline origin/main..HEAD`

## 最新补充（2026-04-05）

- 已新增内部打印预览页：
  - `/dev/print/song/<slug>`
- 已新增本地 PDF 导出脚本：
  - `npm run export:print-pdf -- --slug <slug> ...`
- 当前打印链不是恢复快乐谱自己的打印后端，而是：
  - 继续复用 deployable raw JSON + 原始 Kuailepu runtime 出谱
  - 本站自己提供打印页壳与 PDF 导出
- 当前打印页已支持轻量站点导流文案：
  - `playbyfingering.com`
- 这条链当前仍是本地内部工具：
  - 不要在公开前台暴露打印入口
  - `exports/` 与 `private/` 必须保持本地，不进 git
- 如果后续要处理未收录版权曲：
  - 先按 `docs/song-ingest-input-spec.md` 收原始谱源
  - 再按 `docs/internal-print-workflow.md` 走私有打印链

## 最新补充（2026-04-09）

- 已新增公开 `/learn` 总入口，learn / hub / guide 页面走数据驱动：
  - `src/app/learn/page.tsx`
  - `src/app/learn/[slug]/page.tsx`
  - `src/lib/learn/content.ts`
- 当前已落地的公开入口页包括：
  - `12-hole-ocarina-letter-notes`
  - `recorder-letter-notes`
  - `tin-whistle-letter-notes`
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
  - `lullaby-and-bedtime-letter-note-songs`
  - `dance-and-waltz-letter-note-songs`
  - `wedding-and-ceremony-letter-note-songs`
  - `calm-and-lyrical-letter-note-songs`
- 首页现在已经显式挂出 learn 入口，并补了 FAQ / WebSite / ItemList JSON-LD：
  - `src/app/page.tsx`
- sitemap 已自动覆盖 `/learn` 与全部 guide 页面：
  - `src/app/sitemap.ts`
- song page 已补 `related guides` 与 `more songs to explore`，目的是让 Pinterest / Reddit / Google 流量进入单曲页后继续浏览，而不是停在单页：
  - `src/app/song/[id]/page.tsx`
  - `src/components/song/KuailepuLegacyRuntimePage.tsx`
- `src/lib/learn/content.ts` 当前还补了更细的专题导流：
  - Celtic / Irish folk 相关曲目会额外导向 `celtic-tin-whistle-songs`
  - march 曲目会额外导向 `march-and-parade-letter-note-songs`
  - `yankee-doodle` / `american-patrol` / `scotland-the-brave` / `cavalry-march` / `grenadiers-march` / `the-internationale` / `russian-national-anthem` / `katyusha` 会额外导向 `patriotic-and-anthem-letter-note-songs`
  - `arirang` / `jasmine-flower` / `sakura-sakura` / `bella-ciao` / `la-cucaracha` / `el-condor-pasa` / `hej-sokoly` / `moscow-nights` / `troika` / `red-berries-blossom` / `the-hawthorn-tree` 会额外导向 `world-folk-letter-note-songs`
  - `canon` / `wedding-march` / `wedding-march-alt` / `amazing-grace` / `air-on-the-g-string` / `going-home` 会额外导向 `wedding-and-ceremony-letter-note-songs`
  - `amazing-grace` / `air-on-the-g-string` / `going-home` / `greensleeves` / `londonderry-air` / `lullaby` / `moonlight-sonata` / `on-wings-of-song` / `sakura-sakura` / `santa-lucia` / `scarborough-fair` / `schubert-serenade` / `traumerei` 会额外导向 `calm-and-lyrical-letter-note-songs`
- song SEO profile 当前已支持 per-song `metaTitle`，并已补强两批高潜力歌曲。
- song SEO profile 当前也已支持 per-song `overview`，用于把 song page 首段改成更贴曲目的 opening paragraph，而不是统一模板。
- 当前已经补上第一批定制 `overview` 的曲目：
  - `twinkle-twinkle-little-star`
  - `ode-to-joy`
  - `amazing-grace`
  - `happy-birthday-to-you`
  - `jingle-bells`
  - `scarborough-fair`
  - `auld-lang-syne`
  - `silent-night`
- 此后又继续补了两批定制 `overview`，当前 published songs 里已有 52 首使用 song-specific opening paragraph。新增覆盖包括：
  - `mary-had-a-little-lamb` / `yankee-doodle` / `can-can` / `american-patrol` / `arirang` / `auld-lang-syne-english` / `deck-the-halls` / `do-your-ears-hang-low` / `god-rest-you-merry-gentlemen` / `long-long-ago`
  - `minuet-in-g` / `moonlight-sonata` / `old-macdonald` / `red-river-valley` / `santa-lucia` / `schubert-serenade` / `scotland-the-brave` / `we-wish-you-a-merry-christmas` / `wedding-march` / `were-you-there`
  - `home-sweet-home` / `flight-of-the-bumblebee` / `going-home` / `habanera` / `londonderry-air` / `lullaby` / `on-wings-of-song` / `sakura-sakura` / `swan-lake` / `traumerei`
  - `cavalry-march` / `twinkle-variations` / `wedding-march-alt` / `oh-susanna` / `row-row-row-your-boat` / `spring-song` / `simple-gifts` / `wellerman`
  - `fur-elise`
  - `air-on-the-g-string`
  - `canon`
  - `frere-jacques`
  - `greensleeves`
  - `london-bridge`
- song SEO profile 当前已继续扩到第四批高认知歌曲，新增覆盖：
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
- song SEO profile 当前已继续扩到第五批 classical / folk evergreen 候选，新增覆盖：
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
- song SEO profile 当前已继续扩到第六批 folk / classical / Celtic 候选，新增覆盖：
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
- 当前已补齐全部 published songs 的 `metaTitle`，对 `public-song-manifest` 统计后当前是 0 缺口。
- 当前也已补齐全部 published songs 的 `overview`，`public-song-manifest` 范围内 108 首公开歌曲现在都已有 song-specific opening paragraph。
- 第二批已明确补强的 seasonal / folk 候选包括：
  - `scarborough-fair`
  - `auld-lang-syne`
  - `deck-the-halls`
  - `god-rest-you-merry-gentlemen`
  - `greensleeves`
  - `red-river-valley`
  - `we-wish-you-a-merry-christmas`
  - `joy-to-the-world`
  - `home-on-the-range`
- 当前默认允许继续推进：
  - 新增公开入口页 / guide 页
  - 增强 metadata / FAQ / ItemList / song 相关推荐
- 当前默认不允许擅自推进：
  - runtime / iframe / 指法图谱 / 曲谱正确性相关逻辑
  - 这类改动必须先问用户

## 2. 接手后必须先知道的事

- 站点前台目标用户是 Google 来的 western 用户。
- 前台可见文案必须是英文。
- 前台不能写“参考了快乐谱”“来源是快乐谱”“Kuailepu source”等来源披露。
- 公开详情页找不到 raw JSON 时应该 `notFound()`，不要静默 fallback 到旧页面。
- 默认阅读模式是 `letter`。
- 可公开切换模式只有 `letter` 和 `number`。
- 发布前 parity gate 必须用 `number` 模式。
- 公开 song page 现在支持的最小公开乐器集是：
  - `o12` -> `12-Hole AC Ocarina`（默认）
  - `o6` -> `6-Hole Ocarina`
  - `r8b` -> `English 8-Hole Recorder`
  - `r8g` -> `German 8-Hole Recorder`
  - `w6` -> `Irish Tin Whistle`
- 公开 song page 还支持一批 query-state 显示开关：
  - `show_graph`
  - `show_lyric`
  - `show_measure_num`
  - `measure_layout`
  - `sheet_scale`
- 公开 song page 还支持 `practice_tool=metronome`。
- 只有存在公开可见歌词轨时，前台才显示 `Lyrics` 开关；纯中文歌词轨默认隐藏且不应被公开 query 重新暴露。
- 乐器切换继续走同一个 runtime-backed `/song/<slug>` 页面，不单开旧详情页或其他公开路线。
- 如果某首歌缺少某个公开乐器，只显示该曲实际支持的选项。
- 首页 song card 仍然只显示歌名，但首页现已支持：
  - title 搜索
    - 搜索已兼容英文重音、标点、slug / 短名式输入
    - `fur elise`、`twinkle`、`scarborough` 应能命中对应曲目
  - family filter
  - `Featured` / `A–Z` 浏览切换
  - `A–Z` 模式下的字母跳转

## 3. 必读顺序

仓库根目录还有一份 `AGENTS.md`，它把这套阅读顺序和发布前预检写成了仓库级规则。

1. `README.md`
2. `docs/handoff.md`
3. `docs/agent-handoff.md`
4. `docs/kuailepu-compatibility-roadmap.md`
5. `docs/manual-runtime-qa-checklist.md`
6. `src/lib/kuailepu/runtime.ts`
7. 目标曲目的 `data/kuailepu-runtime/<slug>.json`

如果任务是“公开详情页最小脚本集 / 快乐谱旧资产减载”，再补读：

8. `docs/public-runtime-asset-profiles.md`

## 4. 关键文件别搞混

- `data/kuailepu-runtime/*.json`
  - 生产可部署 raw 真相层
  - runtime 详情页优先吃这个
- `reference/songs/*.json`
  - 本地导歌 / 调试 fallback
- `data/kuailepu/*.json`
  - 可提交轻量 SongDoc
  - catalog / metadata / SEO 主要读这个
- `data/songbook/public-song-manifest.json`
  - 当前公开内容层真相文件
  - 负责 publish / featured 排序 / family
- `data/songbook/song-seo-profiles.json`
  - 当前 song-specific SEO profile 真相文件
  - 负责 `searchTerms` / `aliases` / `background` / `practice`
- `src/lib/kuailepu/runtime.ts`
  - 当前 runtime 兼容和字母谱覆盖层核心
- `src/lib/songbook/publicManifest.ts`
  - 读取 public manifest，给 catalog / 首页 / presentation / 脚本层复用
- `src/lib/songbook/seoProfiles.ts`
  - 读取 song SEO profiles，给 presentation / 校验脚本 / doctor 脚本复用
- `src/app/dev/song-import-dashboard/page.tsx`
  - 内部导歌控制台页面
  - 聚合 manifest / SEO / runtime raw / compact SongDoc / candidate pool / git 状态
- `src/lib/songbook/importDashboard.ts`
  - 内部导歌控制台的数据聚合层
- `src/components/song/KuailepuLegacyRuntimePage.tsx`
  - 详情页外壳，不是 runtime 本体
- `src/components/song/KuailepuRuntimeFrame.tsx`
  - iframe 装载、loading 移除、高度同步
- `scripts/sync-kuailepu-static.mjs`
  - 启动前把必需静态资源同步到 `public/k-static`
- `docs/public-runtime-asset-profiles.md`
  - 公开页最小资产 profile、保留资产和恢复路径说明
- `src/lib/songbook/presentation.ts`
  - 详情页英文 SEO 文案生成器，不是谱面真相
  - 当前只保留 fallback 生成逻辑
- `scripts/validate-content.ts`
  - 校验 public manifest、SongDoc 与 deployable raw JSON 是否一致
- `scripts/doctor-song.ts`
  - 快速输出单曲公开状态、公开乐器、歌词可见性和 SEO 摘要
- `src/app/sitemap.ts`
  - sitemap 真相层，直接列出公开 song pages
- `src/app/robots.ts`
  - robots 真相层，负责声明 sitemap 入口
- `src/lib/site.ts`
  - 站点 URL 与 verification 常量

## 4.5 当前对 HC 引擎的最小正确认知

- 已证实：
  - 历史公开版曾使用 split：
    - `hc_*.js`
    - `hc.kit_*.js`
  - 当前 live 公开页已切到：
    - `hc.min_1cfae5fe62.js`
  - 历史 `hc` 主文件更偏 parser / lexer / layout / SVG render 主链。
  - 历史 `hc.kit` 更偏 MIDI / harmonizer / chord / instrument / fingering 等支撑层。
  - runtime archive 与生产 raw JSON 里都已经能看到和弦字段与节点，不要把这些能力误判成“历史废代码”。
- 高概率推测：
  - 当前 monolithic `hc.min` 更像旧 `hc + hc.kit` 的合包演化版，而不是单纯改名。
- 暂无证据：
  - 没找到公开 sourcemap 或真正可用的未压缩源码版。

本地研究材料在：

- `reference/hc-history-investigation/2026-04-02/hc-engine-structure-map.md`
- `reference/hc-history-investigation/2026-04-02/hc-module-evidence-matrix.md`

注意：

- `reference/` 默认是本地研究层，已被 gitignore 忽略。
- 这些研究文件帮助理解 runtime 和后续拆解，不是生产依赖。

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

- 中国网络下已经把快乐谱 western 相关候选收口到：
  - `data/songbook/kuailepu-western-candidate-pool.json`
- 这份候选池现在是 `schemaVersion = 2`：
  - 不要只看旧 `status`
  - 优先看 `workflowStatus`、`statusReason`、`recommendedTitle`、`recommendedSlug`、`lastCheckedOn`
- 2026-04-04 在美国 VPN 下实测，`npm run search:kuailepu -- "Joy to the World"` 直接报 `ERR_CONNECTION_CLOSED`。
- 这说明当前美国侧更适合做 western 搜索词和候选池研究，不适合直接跑快乐谱导歌。
- 但快乐谱站内搜索对不少候选曲命中很差，继续加歌时要准备英文名、中文名、别名、标题变体一起试，必要时人工导航。

这份候选池当前摘要是：

- `30` 条 unique results
- `12` 条已是公开曲库
- `0` 条 `queued`
- `4` 条 `hold`
- `11` 条 `blocked`
- `2` 条 `reference-only`
- `1` 条 `duplicate`
- `18` 条 `skip-for-now`

这轮国外 VPN 筛完后，又在中国网络下补做了一轮扩池。当前结论是：

1. `Home on the Range`、`La Cucaracha`、`Drinking Song` 已经导入并通过 preflight compare，不再属于待筛候选
2. 当前这份候选池里已经没有剩余 `queued` 候选；下一轮先重做中国网络扩池
3. `The Last Waltz` 和 `Tennessee Waltz` 只保留为 western 需求参考标题
4. `Vientos Suaves` 和 `Polska` 继续留在池里，但都缺少足够清晰的单曲身份
5. `Lullaby of the Manifold` 已基本排除出当前队列
6. `Salut d'Amour` 虽然在快乐谱能找到，但该页只有 `instrument=none`，当前不能进入公开曲页队列
7. `G Major Minuet` 也能找到，但缺少当前公开乐器集对应的可用图谱，当前不能进入公开曲页队列

内部查看入口：

- `/dev/song-import-dashboard`

这页现在会把候选池状态化展示出来，包括：

- `workflowStatus`
- `statusReason`
- 推荐标题 / slug
- 当前 public 映射
- source UUID
- 最近检查日期

补充：

- 2026-04-04 在美国 VPN 下直接请求快乐谱搜索接口时，`curl` 返回 `SSL_ERROR_SYSCALL`。
- 现阶段仍把美国侧当成“western 候选池研究环境”，不要把它当作稳定的快乐谱导歌环境。
- `What Child Is This` 暂不建议优先做，因为它和当前已上线的 `Greensleeves` 共用旋律；先优先扩新的 melody 页面。
- `Jolly Old Saint Nicholas` 已经落地完成，不再属于下一轮候选。
- `Joy to the World` 也已经落地完成，不再属于下一轮候选。

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

- `data/songbook/song-seo-profiles.json`
- `src/lib/songbook/seoProfiles.ts`
- `src/lib/songbook/presentation.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`

要遵守：

- 纯英文
- 自然覆盖搜索词
- 不暴露第三方来源
- 首页列表只显示歌名
- 当前常用搜索词不只限于 `ocarina tabs`，还会用第二搜索词补 `ocarina notes`、`recorder notes`、`tin whistle notes`
- 如果歌曲存在稳定英文别名、译名或常见副标题，新增 / 上线时应同步写进 `data/songbook/song-seo-profiles.json` 的 `aliases`，让站内搜索和 song page SEO 一起覆盖

## 11. 常见错误心智模型

下面这些理解都是错的：

- “song page 现在主要是我们自己的 renderer”
- “captured SVG 还是主数据源”
- “字母谱是新开一轨”
- “compare 应该对 letter 模式做比对”
- “前台写来源说明有助于 SEO”

## 12. 当前数量口径

- 公开 song pages：114
- 全部候选：114
- public manifest：114
- raw JSON：114
- 可提交轻量导入：108

不要拿这些数字互相强行对应。

## 12.5 当前未提交但重要的工作区状态

- 到 2026-04-04 当前交接时，更重要的不是“还有哪组旧代码待提交”，而是先确认本地分支状态：
  - 先跑 `git status --short --branch`
  - 再跑 `git log --oneline origin/main..HEAD`
  - 如果本地仍有未 push 提交，先确认这些提交都属于本轮准备交接或上线的内容，再决定是否 push
- `tsconfig.tsbuildinfo`、调试截图、`.tmp` 文件、临时日志都不应重新带进提交。

## 12.6 当前新对话必须知道的最近收尾结果

- 详情页模式切换按钮当前已经改成：
  - `Letter Notes`
  - `Numbered Notes`
- 首页 song list 卡片当前只显示歌名，`Ocarina Song` 已移除。
- 详情页左上角当前已有 `Back to Song Library` 返回入口。
- `Down By the Salley Gardens` 的混合中英副标题残留，已经并入统一英文化链处理：
  - 入口在 `src/lib/songbook/kuailepuEnglish.ts`
  - runtime 侧仍由 `src/lib/kuailepu/runtime.ts` 消费这层结果
- `Down By the Salley Gardens` 之前残留的人名全角中文逗号，也已并入 runtime 统一规范化，不再只靠单歌修补。
- 当前短中文副标题 / 民歌标签 / 版本标签的常见英文化，已经有一层固定映射：
  - 如 `日本民歌 -> Japanese folk song`
  - `英文版 -> English lyrics version`
- 2026-04-05 新增 5 首已过 preflight compare 的公开曲：
  - `Hej Sokoly`
  - `Irish Morning Wind`
  - `Dancing Doll and Teddy Bear`
  - `Grandfather's Clock`
  - `Irish Blackbird`
- 难度标签规则已经收紧：
  - 长曲篇幅不再单独把歌曲推到 `Intermediate to advanced`
  - 更依赖速度、升降号密度，或“篇幅 + 技术负担”的组合
- 公开详情页现在对快乐谱旧资产采用新的规范：
  - 默认可以停用当前不用的旧脚本注入
  - 但不要删除本地静态快照文件
  - 未来恢复登录 / 播放等功能时，应优先调整 runtime asset profile
  - 当前 `public-song` 默认已从 28 个模板脚本收缩到 6 个
- 处理 HC 相关旧资产时，先沿着
  `Kit.context.setContext -> Song.draw()/Song.compile() -> hc.parse -> renderSheet`
  判断主链依赖，不要把 HC 误当成“单纯 SVG renderer”来删东西
  - 当前建议先停在这版，不要继续无上限扩张 compatibility stub
- 2026-04-05 还新增了一条内部打印工作流：
  - `/dev/print/song/<slug>`
  - `npm run export:print-pdf -- --slug <slug> ...`
  - 这条链继续复用 deployable raw JSON + 原始 runtime 出谱，不是恢复快乐谱旧打印后端
  - 当前 sample PDF 已在本地导出过：
    - `exports/print-pdf/twinkle-twinkle-little-star-o12-letter.pdf`
  - `exports/` 与 `private/` 必须保持本地，不进入 git

## 13. 新对话可直接复制的起始提示词

`Follow AGENTS.md first. Then read README.md, docs/handoff.md, docs/agent-handoff.md, docs/kuailepu-compatibility-roadmap.md, docs/manual-runtime-qa-checklist.md, src/lib/kuailepu/runtime.ts, and docs/instrument-rollout-plan.md in that order before changing anything. If the task touches internal print/PDF export, copyrighted-song local workflow, or MusicXML ingest, also read docs/internal-print-workflow.md and docs/song-ingest-input-spec.md. Keep public /song/<slug> on deployable raw JSON plus the original Kuailepu runtime path. Do not change the public runtime main chain, do not restore SongClient as the public detail page, keep letter mode as default, keep number mode as the compare/preflight/publish gate, and keep all visible site copy in English without exposing Kuailepu/reference/source wording. Pure Chinese lyrics must stay hidden publicly and must not be re-exposed by query params. The current public instrument set is o12, o6, r8b, r8g, and w6. Metronome is public as a docked toolbar above the fingering chart, not a blocking modal. The current public library count in the local worktree is 130 songs. Public song pages now expose opengraph and twitter image routes, and the repo also contains an internal Pinterest preview/export workflow for ongoing social-image experiments. Internal print preview now exists at /dev/print/song/<slug>, PDF export uses npm run export:print-pdf, and exports/ plus private/ must remain local-only. Before any release decision, run git status --short --branch and git log --oneline origin/main..HEAD. The current worktree also contains unpublished grey-song additions casablanca, its-a-small-world, and kiss-the-rain, so do not describe them as pushed or live until git status confirms that. Recent SEO wording updates now intentionally cover tabs, finger chart, and fingering chart phrasing from small GSC query samples. The western public-domain candidate pool is currently exhausted on the latest China-side discovery pass; use a foreign VPN only after China-side Kuailepu discovery if a stricter western-demand screen is needed. If the task needs Kuailepu import, compare, preflight, parity, or login checks, require a China-reachable network first. If it needs Google or western keyword research, ask for a foreign VPN first. If Kuailepu login is invalid, stop and ask the user to run npm run login:kuailepu.`
`Follow AGENTS.md first. Then read README.md, docs/handoff.md, docs/agent-handoff.md, docs/kuailepu-compatibility-roadmap.md, docs/manual-runtime-qa-checklist.md, src/lib/kuailepu/runtime.ts, and docs/instrument-rollout-plan.md in that order before changing anything. If the task touches internal print/PDF export, copyrighted-song local workflow, or MusicXML ingest, also read docs/internal-print-workflow.md and docs/song-ingest-input-spec.md. Keep public /song/<slug> on deployable raw JSON plus the original Kuailepu runtime path. Do not change the public runtime main chain, do not restore SongClient as the public detail page, keep letter mode as default, keep number mode as the compare/preflight/publish gate, and keep all visible site copy in English without exposing Kuailepu/reference/source wording. Pure Chinese lyrics must stay hidden publicly and must not be re-exposed by query params. The current public instrument set is o12, o6, r8b, r8g, and w6. Metronome is public as a docked toolbar above the fingering chart, not a blocking modal. The current public library count in the local worktree is 130 songs. Public song pages now expose opengraph and twitter image routes, and the repo also contains an internal Pinterest preview/export workflow for ongoing social-image experiments. Internal print preview now exists at /dev/print/song/<slug>, PDF export uses npm run export:print-pdf, and exports/ plus private/ must remain local-only. Before any release decision, run git status --short --branch and git log --oneline origin/main..HEAD. Internal Pinterest export tuning is already committed: /dev/pinterest/song/[id] now shrinks to content height on non-artwork presets, and export-pinterest-pin crops after layout stabilizes. The current worktree also contains unpublished grey-song additions casablanca, its-a-small-world, and kiss-the-rain, so do not describe them as pushed or live until git status confirms that. The western public-domain candidate pool is currently exhausted on the latest China-side discovery pass; use a foreign VPN only after China-side Kuailepu discovery if a stricter western-demand screen is needed. If the task needs Kuailepu import, compare, preflight, parity, or login checks, require a China-reachable network first. If it needs Google or western keyword research, ask for a foreign VPN first. If Kuailepu login is invalid, stop and ask the user to run npm run login:kuailepu.`

## 最新补充（2026-04-18）

- `origin/main` 现已包含两条已推送的 runtime 壳层修复：
  - `b66621b`：收敛 iframe 高度同步的 `1px` 回摆，公开详情页下边缘不再来回轻微抖动
  - `3d12359`：对齐快乐谱窄屏标题字号策略，移动端与窄桌面标题会更接近快乐谱原页观感
- 当前标题字号调整的边界需要记住：
  - 只调顶部居中主标题的 `font-size`
  - 不改 `y`
  - 不加 `transform`
  - 不移动指法图、歌词、音符或字母谱覆盖层
- 本地曾短暂试过“下压头部文本块来消灭标题与图谱之间空白”的 SVG 后处理实验，但这条线已经明确放弃：
  - 容易波及 `Play order` 这类复合头部元素
  - 也容易带来歌词 / 字母谱 / 指法图相对关系风险
  - 新对话不要再把这条路当成低风险修补方案
- 如果以后继续排查头部空白，优先从快乐谱 head-height / 上游布局逻辑入手，而不是继续在最终 SVG 成品上做平移实验

## 14. 自制曲输入规范草案

- 已新增内部文档：
  - `docs/song-ingest-input-spec.md`
- 当前还新增了一个最小可执行工具：
  - `scripts/prepare-song-ingest.ts`
  - `npm run prepare:song-ingest -- <input.musicxml> ...`
- 这份文档用于后续把 `MusicXML` / `MIDI` / 人工简谱资料整理成适合 happi123 / 快乐谱制谱的基础输入，不属于公开前台的一部分。
- 当前执行建议：
  - 优先收 `MusicXML`
  - 其次收 `MIDI`
  - 图片或 PDF 简谱仅作人工兜底
- 这版工具当前会先产出内部 draft JSON：
  - 推荐标题 / slug
  - 推荐 keynote / tonicMidi
  - 结构化简谱行
  - 对齐歌词行
  - happi123 基础输入文本
- 当前仍不支持：
  - `.mxl` 压缩 MusicXML
  - `MIDI` 自动选主旋律轨
  - 复杂多声部 / 和弦 / grace note / tuplet 的完整保真

## 15. 2026-04-09 公开 SEO 入口层继续推进

- 当前 SEO 路线已经另外固化在：
  - `docs/seo-growth-roadmap.md`
- 默认允许继续推进的仍然只有公开入口层与 SEO 外壳：
  - learn / hub / guide / blog-style 页面
  - song page metadata / 首屏文案 / FAQ / related guides / structured data
- 如果后续任务想改：
  - runtime 核心行为
  - iframe / 曲谱展示
  - 指法图谱正确性相关逻辑
  必须先问用户，不能直接做。

- 最新新增的公开 learn 页面包括：
  - `easy-recorder-songs-for-beginners`
  - `easy-tin-whistle-songs`
  - `nursery-rhyme-letter-notes`
  - `easy-songs-for-adult-beginners`
  - `hymns-and-spiritual-letter-note-songs`
  - `celtic-tin-whistle-songs`
  - `march-and-parade-letter-note-songs`
  - `patriotic-and-anthem-letter-note-songs`
  - `world-folk-letter-note-songs`
  - `lullaby-and-bedtime-letter-note-songs`
  - `dance-and-waltz-letter-note-songs`
- learn / 首页的 featured guides 也已补上更窄的主题入口：
  - `folk-songs-for-beginners`
  - `celtic-tin-whistle-songs`
  - `how-to-read-letter-notes`
  - `march-and-parade-letter-note-songs`
  - `patriotic-and-anthem-letter-note-songs`
  - `world-folk-letter-note-songs`
- `src/lib/learn/content.ts` 当前 related guides 推荐规则已经按 song family 做更明确映射：
  - nursery / song
  - holiday
  - folk / hymn，并给部分 Celtic / Irish folk 歌曲额外导向 whistle 专题页
  - classical
  - march
  - world folk / traditional，并给 `arirang` / `jasmine-flower` / `sakura-sakura` / `bella-ciao` / `la-cucaracha` / `el-condor-pasa` / `hej-sokoly` / `moscow-nights` / `troika` / `red-berries-blossom` / `the-hawthorn-tree` 额外导向 `world-folk-letter-note-songs`
  - lullaby / bedtime，并给 `lullaby` / `moonlight-sonata` / `schubert-serenade` / `traumerei` / `air-on-the-g-string` / `moscow-nights` / `going-home` / `sakura-sakura` 额外导向 `lullaby-and-bedtime-letter-note-songs`
  - dance / polka / waltz-like，并给 `can-can` / `habanera` / `woodpecker-polka` / `blacksmith-polka` / `the-hawthorn-tree` / `dancing-doll-and-teddy-bear` / `swan-lake` / `turkish-march` 额外导向 `dance-and-waltz-letter-note-songs`
  目标是让 Pinterest / Reddit / 搜索流量落到单曲页后，有更贴题的下一跳入口，而不是只回首页。

- 最新补强的第三批 song SEO profiles 包括：
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
- 最新补强的第五批 song SEO profiles 包括：
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
- 最新补强的第六批 song SEO profiles 包括：
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
- 当前 published songs 的 `metaTitle` 已经补齐，后续可继续把重心转到首屏文案深化和更多高意图 guide 页面。

- 接下来若继续同一路线，优先级建议仍是：
  1. 继续补高意图公开 guide 页面
  2. 继续补高潜力 song 的 `metaTitle` / `searchTerms`
  3. 只在 SEO 外壳范围内增强首页 / learn / song page 的导流关系

## 最新补充（2026-04-10）

- `b5e85dc` 已 push：公开 SEO `Phase 2` 已完成收尾。
- 当前公开 `learn` 体系继续锁定在 `40` 个页面：
  - `1` 个 `/learn`
  - `39` 个 `/learn/[slug]`
- hub / collection 薄内容审计已做完：
  - 已审计 `25` 个 hub / collection 页面
  - 当前没有任何 `<5` 首歌曲的 hub
  - 最低 unique song count 为 `6`
  - 因此本轮没有做 hub 合并，也没有再新增 hub
- 现有 hub 页已经做过一次集中去模板化：
  - H1 下方导语已改成定制英文 `heroSummary`
  - `/learn` 与 `/learn/[slug]` 底部已补 breadcrumb 与 related-category 闭环
  - `learn` / `hub` 正文当前保持静态输出，不做客户端按需加载
- `public-song-manifest` 里的 `96` 首公开歌曲现在都已有：
  - song-specific `metaTitle`
  - song-specific `overview`
  - song-specific `metaDescription`
  - 至少 `2` 条 `extraFaqs`
- 全局 Footer 免责声明已上线：
  - `src/components/layout/SiteFooter.tsx`
  - `src/app/layout.tsx`
  - `/dev` 路由默认隐藏 Footer
  - 当前 removal 联系方式还是英文占位句 `please contact us by email`
- 当前公开增长主线已经从“继续堆 hub”切到“灰度热门曲半自动引入”：
  - 固定工作流是 `AI 扫库推荐 -> 用户人工审核 -> AI 深抓与英文清洗 -> 用户验收 -> 用户确认后 push`
  - 当前节奏固定为每天最多 `3` 首
  - 第二批还没开始，不要直接继续抓，先等用户确认
- 第一批灰度热门曲已经上线并 push（`dd01ba7`）：
  - `song-of-time`
  - `carrying-you`
  - `hes-a-pirate`
- 这三首当前遵守的是“公开层全英文、runtime raw 先不动”的保守策略：
  - slug / meta / overview / FAQ / aliases / fallback 描述不能留中文
  - `data/kuailepu-runtime/<slug>.json` 内的上游中文元字段暂时保留，避免影响 runtime parity
  - 如果以后要清 runtime payload 里的中文字段，必须先确认不会碰坏 compare / publish 主链
- 这轮没有新增 hub，只对现有 guide 做回链增强：
  - `first-performance-letter-note-songs` 补入 `song-of-time`、`hes-a-pirate`
  - `march-and-parade-letter-note-songs` 补入 `hes-a-pirate`
  - `calm-and-lyrical-letter-note-songs`、`easy-songs-for-adult-beginners` 补入 `song-of-time`、`carrying-you`
  - `dance-and-waltz-letter-note-songs` 补入 `hes-a-pirate`
- 首页曲库 alias 搜索体验刚上线（`ca670df`）：
  - 如果用户输入的是 alias，卡片标题下方会显示命中的 alias
  - 默认列表和直接按正式歌名搜索时，不显示 alias
- 当前工作区状态：
  - `origin/main` 已包含上面两次 push
  - 本地唯一脏文件通常只剩 `tsconfig.tsbuildinfo`
  - 新对话接手前先跑：
    - `git status --short --branch`
    - `git log --oneline origin/main..HEAD`

## 最新补充（2026-04-11）

- 第二批灰度曲当前已在本地导入并通过 preflight compare：
  - `merry-go-round-of-life`
  - `my-heart-will-go-on`
  - `river-flows-in-you`
- 灰度曲执行规范已单独写入：
  - `docs/grey-song-rollout-playbook.md`
- 从这一轮开始，新增灰度曲有一条默认硬规则：
  - 同一轮必须补现有 `learn / hub` 内链
  - 不能只补 import / manifest / song SEO profile 就停
- 默认只做：
  - 现有 hub 的 `featuredSongSlugs`
  - section `songSlugs`
  - song-to-guide 推荐集合
- 默认不做：
  - 因为新增灰度曲就继续扩 learn / hub 页数量

## 最新补充（2026-04-14）

- `24a875e` 已 push：
  - 第四批灰度曲已上线：
    - `one-summers-day`
    - `princess-mononoke`
    - `path-of-the-wind`
- 当前公开 song pages 数量已更新为 `108`。
- 当前公开社交图链路已上线到 repo：
  - `src/app/song/[id]/opengraph-image.tsx`
  - `src/app/song/[id]/twitter-image.tsx`
  - `src/lib/songbook/songSocialImage.tsx`
- 当前仓库还包含内部 Pinterest 导图实验链：
  - `src/app/dev/pinterest/song/[id]/page.tsx`
  - `src/lib/songbook/pinterestPins.ts`
  - `scripts/export-pinterest-pin.ts`
- 当前 Pinterest 图仍属实验阶段：
  - 代码已 push
  - `exports/` 下导出的测试图继续只保留本地，不进入 git
- 当前移动端已有两处已 push 的壳层补充：
  - song page 的 `More controls` 可开关，且桌面/移动端控件不再重复进入可访问树
  - 首页 `A–Z` 模式已新增 `Back to top` 浮动按钮
- 当前工作区如果只剩：
  - `tsconfig.tsbuildinfo`
  - `.tmp-playwright-3ue-profile/`
  这通常都属于噪音，不必带入提交。

## 最新补充（2026-04-17）

- 当前公开 song pages 数量已更新为 `121`。
- 本轮最新已补齐并准备上线 / 已上线的 3 首歌：
  - `yesterday`
  - `the-sound-of-silence`
  - `right-here-waiting`
- 这 3 首当前都已完成 deployable raw JSON、compact SongDoc、manifest、song SEO profile、learn / hub 内链和中国网络下 compare / preflight 校验。
- 内部 Pinterest 导图链当前也已补完一轮稳定性收尾：
  - 无 artwork 预览页按内容高度收口
  - 导图导出脚本等待布局稳定后按导图终点裁切
  - `Frere Jacques` 的 `English 8-Hole Recorder` preset 已补齐
- 首页、learn 入口页和 song page SEO 壳层当前已额外自然覆盖：
  - `tabs`
  - `finger chart`
  - `fingering chart`
  这批词来自 2026-04-17 本地导出的 GSC 近 28 天 query 小样本观察。
- song page SEO 模板当前也已补过一轮基础语法修正，避免继续产出：
  - `melody melody`
  - `a intermediate`

## 最新补充（2026-04-15 历史本地待审核状态记录）

- 当前本地又导入了 3 首**已 commit、尚未 push 的灰度曲待审核项**：
  - `moon-river`
  - `can-you-feel-the-love-tonight`
  - `yesterday-once-more`
- 这 3 首当前已经在本地完成：
  - `reference/songs/<slug>.json`
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts` 现有 learn / hub 内链补齐
  - 中国网络下 `validate:content` / `doctor:song` / `preflight:kuailepu-publish` 都已通过
- 重要：
  - 线上和 `origin/main` 当前是 `111` 首
  - 本地工作区如果把这 3 首算进去，会暂时变成 `114`
  - 新对话不要把“本地待审核 114”说成“线上已经 114”
- 当前本地还额外有一首**已导入、已补本地公开内容层、但尚未 commit / 尚未 push** 的灰度曲：
  - `zeldas-lullaby`
  - 当前已经完成：
    - `data/kuailepu-runtime/zeldas-lullaby.json`
    - `data/kuailepu/zeldas-lullaby.json`
    - `data/songbook/public-song-manifest.json`
    - `data/songbook/song-seo-profiles.json`
    - `src/lib/learn/content.ts`
    - 中国网络下 `validate:content` / `doctor:song` / `preflight:kuailepu-publish` 都已通过
- 所以：
  - 本地工作区如果把这 4 首灰度曲算进去，会暂时变成 `115`
  - 新对话不要把“本地待审核 115”说成“线上已经 115”
- 当前仓库还新增了一条更清晰的内部灰度曲追踪入口：
  - `data/songbook/grey-song-rollout.json`
  - `/dev/song-import-dashboard` 里的 `Grey Song Tracker`
  - 当前用来区分 `live`、`committed-local`、`imported-only` 三种灰度曲状态
- 当前又新增一条协作规则：
  - 完整任务已完成、且本地必要验证已经通过时，可以自行 `commit` 留档
  - **未经用户明确同意，不要 push**
  - 因为 push 会触发 Vercel 自动部署并直接改线上代码

## 最新补充（2026-04-16 历史 Pinterest 本地调整记录）

- 当前内部 Pinterest 工作流已经补到“手动截图工作台”：
  - `src/app/dev/pinterest/page.tsx`
  - `src/app/dev/pinterest/song/[id]/page.tsx`
- 这轮调整仍然只属于内部 Pinterest 预览 / 导出链，不是公开 `/song/<slug>` 主链改动。
- 当前更推荐的执行方式是：
  - 优先直接跑导图命令
  - 只有需要人工目测版式时，再打开 `/dev/pinterest` / `/dev/pinterest/song/[id]`
- 工作台主画布当前默认只保留：
  - runtime 谱面
  - 单行 `playbyfingering.com` 水印
  - 底部引流文案
  - 功能区默认隐藏；底部引流文案本身可点击打开控制弹窗
- 历史 `scripts/export-pinterest-pin.ts` 与 `src/lib/songbook/pinterestPins.ts` 仍保留，主要给旧 preset / 自动导出链兼容使用。
- 所以新对话不要再假设：
  - “本地通常只剩 tsconfig.tsbuildinfo”
  - 正确动作仍然是先跑 `git status --short --branch`

## 最新补充（2026-04-18 Pinterest 默认导图流程）

- 当前内部 Pinterest 导图默认命令已经收口为：
  ```bash
  npm run export:pinterest-portrait -- --slug <slug> --instrument <o12|o6|r8b|r8g|w6>
  ```
- 当前默认参数：
  - `width=500`
  - `height=1280`
  - `dpr=2`
  - `capture=canvas`
  - 初始 `sheet_scale=11`
  - 自动把最终成图宽度收口到约 `1000px`
  - 自动把最终成图高度收口到不超过 `1700px`
- 当前导图脚本会：
  - 截完整导图画布
  - 保留 runtime 原始标题
  - 在截图后裁掉“标题和首行图谱之间”的空白横带
  - 如果图片仍然过长，就自动下调 `sheet_scale`
- 这条链仍然只是 internal-only 工具链：
  - 不修改公开 `/song/<slug>` 行为
  - 不改公开 runtime 主链
  - `exports/` 成品继续本地保留，不提交
- 关于部署判断：
  - `src/app/dev/pinterest/...` 保留在仓库没有问题
  - 就算一起部署到线上，对公开用户页性能影响也很小，因为它是独立 dev route
  - 但产品层面仍不需要给外部用户任何入口

## 最新补充（2026-04-16 Recorder 语义反馈）

- `r/Recorder` 线程里一位已经使用过网站并给过正向评价的用户，又补了一条更技术性的反馈：
  - 他们能理解 `1 = G 6/8` 的来源，但认为这类顶层标签不适合 recorder 语境
  - `English 8-hole recorder G fingering` 这种公开文案会让 western recorder 用户困惑
  - 他们特别强调 recorder 用户可能会用 `written pitch` 而不是纯 `sounding pitch helper` 的方式理解 note labels
- 当前判断：
  - 这更像 recorder-specific note-label semantics / trust issue
  - 还不能直接推导成“全站 letter-note conversion 算错了”
  - 对 ocarina / tin whistle，现阶段仍更像 practical playing aid；对 recorder，用户更容易按 staff / method-book 习惯来审视显示语义
- 当前最小产品动作方向已经明确为：
  - 优先隐藏容易误导 western recorder 用户的顶层 SVG 元信息，如 `1=...`、拍号和 `X fingering` / 乐器说明行
  - 先不要在没有清楚定义前仓促重写 recorder 专用字母谱算法
  - 如果后续 recorder 用户继续重复指出 note labels 问题，再决定是否要为 `r8b / r8g` 单独定义 written-pitch 语义

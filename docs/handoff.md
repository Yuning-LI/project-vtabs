# Handoff Notes

这份文档写给“第一次接手这个项目的新程序员”。目标不是概述，而是尽量把当前业务、架构、上线流程、注意事项写成可直接执行的说明。

如果任务涉及内部打印 PDF、未授权版权曲的本地存档、或 `MusicXML` 私有输入链，额外继续阅读：

- `docs/internal-print-workflow.md`
- `docs/song-ingest-input-spec.md`

如果任务涉及公开增长、SEO 入口页、learn / hub / guide 页面，继续阅读：

- `docs/seo-growth-roadmap.md`

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

- 公开 runtime 已补齐英文文本模式。
- 对仍保留显示的 SVG 文本，`Composer`、`Play order` 等标签会在我们自己的 runtime 后处理中英文化。
- 调号 `1=...`、纯拍号、速度类 `=120` 信息以及指法图谱上方的乐器 / 指法标题行，当前在 english runtime 下默认隐藏，不再要求这些行继续可见。
- 这条隐藏规则同样作用于公开 song page、`/dev/print/song/<slug>` 和 `/dev/pinterest/song/[id]` 这几条 english runtime 入口。
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
- 首页与 song page metadata title 现已进一步覆盖多乐器搜索意图：
  - 首页 title 会同时覆盖 `ocarina tabs`、`recorder notes`、`tin whistle letter notes`
  - song page title 不再只写 `Ocarina Tabs`
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
- 本轮后续又新增并通过 preflight compare 的 2 首高流量 folk 候选：
  - `wellerman`
  - `bella-ciao`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `Wellerman` 的快乐谱页明确使用英文标题 `Wellerman`
  - `Bella Ciao` 当前导入自 `啊朋友再见` 页；由于该页歌词为纯中文，公开页将继续默认隐藏歌词且不显示歌词开关
- 本轮后续又新增并通过 preflight compare 的 1 首 holiday 候选：
  - `jolly-old-saint-nicholas`
- 中国网络下已对这首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 组合一致
- 当前这首歌导入自快乐谱页 `欢乐圣诞`，按旋律身份映射为 `Jolly Old Saint Nicholas` 公开；当前为器乐页，无公开歌词
- 本轮后续又新增并通过 preflight compare 的 1 首 holiday / hymn 候选：
  - `joy-to-the-world`
- 中国网络下已对这首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 组合一致
- 当前这首歌导入自快乐谱页 `普世歡騰 / 敬拜頌讚`，按英文常用名映射为 `Joy to the World` 公开；由于该页歌词为纯中文，公开页将继续默认隐藏歌词且不显示歌词开关
- 本轮后续又新增并通过 preflight compare 的 3 首 western 候选：
  - `home-on-the-range`
  - `la-cucaracha`
  - `drinking-song`
- 中国网络下已对这 3 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `15 / 15` 组合一致
- 其中：
  - `Home on the Range` 导入自快乐谱页 `牧场上的家`；纯中文歌词仍按公开规则默认隐藏
  - `La Cucaracha` 当前为器乐页，无公开歌词
  - `Drinking Song` 当前导入自 `饮酒歌 / 威尔第`；纯中文歌词仍按公开规则默认隐藏
- 本轮后续又新增并通过 preflight compare 的 2 首直接导入候选：
  - `el-condor-pasa`
  - `happy-new-year`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `El Condor Pasa` 导入自 `老鹰之歌 If I Could (El Condor Pasa)` 器乐页，无公开歌词
  - `Happy New Year` 导入自 `新年好 Happy New Year` 页，当前为中英混合歌词
- `Edelweiss` 虽然曾被导入，但快乐谱来源明确写了 `Richard Rodgers`，不符合当前公版曲库规则，已在上线前从公开内容层与 deployable raw 中移除
- 本轮后续又补齐并通过 preflight compare 的 3 首既有公开曲：
  - `santa-lucia`
  - `turkish-march`
  - `can-can`
- 这 3 首原本已在公开内容层，这次补齐为快乐谱 raw JSON 主链并完成中国网络下的 compare：
  - `Santa Lucia`
  - `Turkish March`
  - `Can-Can`
- 本轮后续又新增并通过 preflight compare 的 2 首器乐候选：
  - `spanish-bullfighting-tune`
  - `woodpecker-polka`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `Spanish Bullfighting Tune` 导入自 `西班牙斗牛曲 玛奎纳` 器乐页，无公开歌词
  - `Woodpecker Polka` 导入自 `啄木鸟波尔卡 Woodpecker Polka` 器乐页，无公开歌词
- 本轮后续又新增并通过 preflight compare 的 1 首器乐候选：
  - `blacksmith-polka`
- 中国网络下已对这首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 组合一致
- 当前这首歌导入自 `铁匠波尔卡 / 陶笛二重奏` 页；来源作曲者字段为 `约瑟夫·施特劳斯`，公开页按纯器乐曲处理，无公开歌词
- 本轮后续又新增并通过 preflight compare 的 1 首 folk 候选：
  - `loch-lomond`
- 中国网络下已对这首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 组合一致
- 当前这首歌导入自 `罗莽湖畔 / 苏格兰民谣` 页；来源作曲者字段为空，公开页按传统苏格兰民谣处理，无公开歌词
- 本轮后续又新增并通过 preflight compare 的 2 首候选：
  - `grenadiers-march`
  - `the-internationale`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `Grenadiers March` 导入自 `掷弹兵进行曲` 页，来源作曲者字段为空，公开页按器乐进行曲处理
  - `The Internationale` 导入自 `国际歌 / 比尔` 页，公开页按旋律页处理，无公开歌词
- 本轮后续又新增并通过 preflight compare 的 1 首国歌候选：
  - `russian-national-anthem`
- 中国网络下已对这首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 组合一致
- 当前这首歌导入自 `俄罗斯联邦国歌(俄罗斯，我们神圣的祖国)` 页；来源作曲者字段为空，公开页保持歌词隐藏
- 本轮后续又新增并通过 preflight compare 的 1 首 march 候选：
  - `parade-of-the-wooden-soldiers`
- 中国网络下已对这首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `5 / 5` 组合一致
- 当前这首歌导入自 `木偶兵进行曲` 页；来源作曲者字段为 `L·拉塞尔`，公开页按器乐进行曲处理，无公开歌词
- 本轮后续又新增并通过 preflight compare 的 2 首 song 候选：
  - `katyusha`
  - `moscow-nights`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `Katyusha` 导入自 `喀秋莎` 页；来源作曲者字段为空，公开页按旋律页处理，无公开歌词
  - `Moscow Nights` 导入自 `莫斯科郊外的晚上` 页；来源作曲者字段为 `瓦西里·索洛维约夫·谢多伊`，公开页保持歌词隐藏
- 本轮后续又新增并通过 preflight compare 的 2 首 song 候选：
  - `troika`
  - `the-pathway`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `Troika` 导入自 `三套车` 页；来源作曲者字段为空，公开页保持歌词隐藏
  - `The Pathway` 导入自 `小路（苏）` 页；来源作曲者字段为空，公开页保持歌词隐藏
- 本轮后续又新增并通过 preflight compare 的 2 首 song 候选：
  - `red-berries-blossom`
  - `the-hawthorn-tree`
- 中国网络下已对这 2 首歌的 5 个公开乐器补跑 live-vs-local `number` 模式 hash 对照：
  - `10 / 10` 组合一致
- 其中：
  - `Red Berries Blossom` 导入自 `红莓花儿开` 页；来源作曲者字段为 `苏 伊·杜那耶夫斯基`
  - `The Hawthorn Tree` 导入自 `山楂树` 页；来源作曲者字段为空，公开页保持歌词隐藏
- 截至当前工作区：
  - 本地分支仍存在未 push 提交。
  - 新对话接手或准备上线前，先执行：
    - `git status --short --branch`
    - `git log --oneline origin/main..HEAD`
  - 不要跳过这一步直接 push，因为本地提交数量会随着后续文档或导歌收尾继续变化。
- 当前公开 `learn` 体系累计已有 40 个公开页面：
  - `1` 个 `/learn` 总入口
  - `39` 个 `/learn/[slug]` guide / hub 页面
- 最近一轮已推送的是 instrument-accurate landing 入口层：
  - `6-hole-ocarina-letter-notes`
  - `easy-ocarina-songs-for-beginners`
  - `easy-6-hole-ocarina-songs`
  - `easy-12-hole-ocarina-songs`
  - `easy-christmas-ocarina-songs`
  - `easy-christmas-recorder-songs`
  - `easy-christmas-tin-whistle-songs`
- 其中：
  - `6-hole-ocarina-letter-notes` / `easy-6-hole-ocarina-songs` 的 song card 允许直接打开同一个公开 `/song/<slug>` 页面并预选 `?instrument=o6`
  - `recorder-letter-notes` / `easy-recorder-songs-for-beginners` / `easy-christmas-recorder-songs` 会优先把 song card 打到 `?instrument=r8b`
  - `tin-whistle-letter-notes` / `easy-tin-whistle-songs` / `celtic-tin-whistle-songs` / `easy-christmas-tin-whistle-songs` 会优先把 song card 打到 `?instrument=w6`
- 这属于公开 SEO 入口页参数适配，不是新增第二条详情页路线，也没有改 runtime 核心行为。
- `b190dea` 之后追加的最新公开页是：
  - `lullaby-and-bedtime-letter-note-songs`
  - `dance-and-waltz-letter-note-songs`
- `02cc997` 已 push 上线，新增了：
  - `how-to-start-ocarina-with-letter-notes`
  - `how-to-start-recorder-with-letter-notes`
  - `how-to-start-tin-whistle-with-letter-notes`
- 当前本地最新一轮继续扩展的公开页是：
  - `how-to-practice-ocarina-with-letter-notes`
  - `how-to-practice-recorder-with-letter-notes`
  - `how-to-practice-tin-whistle-with-letter-notes`
  - `easy-sing-along-letter-note-songs`
  - `first-performance-letter-note-songs`
- 这 8 个 start / practice / intent guide 仍然只属于公开 SEO 入口层：
  - 不新增第二条详情页路线
  - 不改 runtime / iframe / 曲谱 / 指法图谱核心行为
  - 只是把更宽的 beginner / practice query 导到同一个公开 `/song/<slug>` 主链
- 这两个入口页继续只做公开 SEO / 导流壳层：
  - `lullaby-and-bedtime-letter-note-songs` 面向 lullaby / bedtime / quiet practice 意图
  - `dance-and-waltz-letter-note-songs` 面向 dance / polka / waltz-like melody 意图
- `src/lib/learn/content.ts` 的 related guides 规则也已继续补强：
  - `lullaby` / `moonlight-sonata` / `schubert-serenade` / `traumerei` / `air-on-the-g-string` / `moscow-nights` / `going-home` / `sakura-sakura` 会优先导向 `lullaby-and-bedtime-letter-note-songs`
  - `can-can` / `habanera` / `woodpecker-polka` / `blacksmith-polka` / `the-hawthorn-tree` / `dancing-doll-and-teddy-bear` / `swan-lake` / `turkish-march` 会优先导向 `dance-and-waltz-letter-note-songs`
  - `twinkle-twinkle-little-star` / `mary-had-a-little-lamb` / `row-row-row-your-boat` / `old-macdonald` / `happy-birthday-to-you` / `jingle-bells` / `deck-the-halls` / `we-wish-you-a-merry-christmas` / `joy-to-the-world` / `auld-lang-syne` 会优先导向 `easy-sing-along-letter-note-songs`
  - `happy-birthday-to-you` / `ode-to-joy` / `amazing-grace` / `canon` / `wedding-march` / `wedding-march-alt` / `american-patrol` / `turkish-march` / `parade-of-the-wooden-soldiers` / `jingle-bells` 会额外导向 `first-performance-letter-note-songs`

### 1.1.2 2026-04-05 内部打印工作流补充

- 已新增内部打印预览页：
  - `/dev/print/song/<slug>`
- 已新增本地 PDF 导出脚本：
  - `npm run export:print-pdf -- --slug <slug> ...`
- 这条打印链不是恢复快乐谱原生“获取打印谱”后端，而是：
  - 继续复用当前 deployable raw JSON + 原始 Kuailepu runtime 主链出谱
  - 由本站自己提供打印页壳、纸张方向和 PDF 导出
- 当前打印页已支持轻量站点导流文案：
  - `playbyfingering.com`
- 当前执行边界：
  - 打印工具只供本地内部使用
  - 当前不要在公开 song page 暴露打印入口
  - `exports/` 与 `private/` 必须保持本地，不进入 git
- 相关执行规范已经单独写入：
  - `docs/internal-print-workflow.md`

### 1.1.3 2026-04-09 公开 SEO 入口层补充

- 已新增公开 `/learn` 总入口：
  - `src/app/learn/page.tsx`
- 当前 learn / hub / guide 页面已改为数据驱动：
  - `src/lib/learn/content.ts`
  - `src/app/learn/[slug]/page.tsx`
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
- 首页当前已显式挂出 learn 入口，并补了公开 FAQ / WebSite / ItemList JSON-LD：
  - `src/app/page.tsx`
- sitemap 已自动覆盖 `/learn` 与所有 guide 页面：
  - `src/app/sitemap.ts`
- song page 已补 `related guides` 与 `more songs to explore`，让 Pinterest / Reddit / Google 流量进入单曲页后有继续浏览路径：
  - `src/app/song/[id]/page.tsx`
- song SEO profile 当前已继续补到第四批高认知歌曲，新增覆盖：
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
- song SEO profile 当前已支持 per-song `metaTitle`，并已补强两批高潜力歌曲：
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/songbook/seoProfiles.ts`
  - `src/lib/songbook/presentation.ts`
- 第五批已继续补强的 classical / folk evergreen 候选包括：
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
- 第六批已继续补强的 folk / classical / Celtic 候选包括：
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
- 当前 `data/songbook/song-seo-profiles.json` 已补齐全部 published songs 的 `metaTitle`，对 `data/songbook/public-song-manifest.json` 统计后当前是 0 缺口。
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
- 当前这条 SEO 增长线仍然有明确边界：
  - 可以继续新增公开入口页、guide 页、metadata、FAQ、ItemList、相关推荐
  - 不要为 SEO 擅自改 runtime、iframe、指法图谱或曲谱正确性逻辑

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

以当前工作区为准：

- `songCatalog.length = 118`
  - 当前公开 song pages 数。
- `allSongCatalog.length = 118`
  - 当前仓库保留的总曲库数，已与公开 song pages 对齐。
- `data/songbook/public-song-manifest.json = 118`
  - 当前公开内容 manifest 数量。
- `data/kuailepu-runtime/*.json = 118`
  - 当前生产可部署 raw JSON 数量。
- `reference/songs/*.json = 119`
  - 本机原始研究层数量，已清理旧重复 / 残留参考文件。
- `data/kuailepu/*.json = 112`

## 5.5 2026-04-05 新增可公开曲目

- 本轮新导入并通过 preflight compare 的 5 首歌：
  - `Hej Sokoly`
  - `Irish Morning Wind`
  - `Dancing Doll and Teddy Bear`
  - `Grandfather's Clock`
  - `Irish Blackbird`
- 导入结果：
  - 都已写入 `reference/songs`
  - 都已写入 `data/kuailepu-runtime`
  - 都已补进 `data/kuailepu`
  - 都支持当前 5 个公开乐器：`o12`、`o6`、`r8b`、`r8g`、`w6`
  - 公开歌词仍不可见

## 6.5 自制曲输入规范草案

- 已新增一份后续待做文档：
  - `docs/song-ingest-input-spec.md`
- 当前还新增了一个最小可执行工具：
  - `scripts/prepare-song-ingest.ts`
  - `npm run prepare:song-ingest -- <input.musicxml> ...`
- 这份文档的定位不是公开产品文案，而是给后续“快乐谱里没有的歌，如何从 MusicXML / MIDI / 简谱资料半自动补齐”的内部执行规范。
- 当前建议顺序：
  - `MusicXML` 作为优先输入
  - `MIDI` 作为备选输入
  - 纯图片简谱只作为最后人工兜底
- 真正开始做 happi123 / 快乐谱制谱自动化前，先按这份输入规范收集原始资料，避免后续每首歌重新猜字段。
- 当前这版工具会先把 `MusicXML` 转成内部 draft JSON，产出：
  - 推荐标题 / slug
  - 推荐 keynote / tonicMidi
  - 结构化简谱行
  - 对齐歌词行
  - happi123 可继续人工整理的基础文本
- 当前仍不支持：
  - `.mxl` 压缩 MusicXML
  - `MIDI` 轨道自动抽旋律
  - 复杂多声部 / 和弦 / grace note / tuplet 的完整保真转换
- 如果只是本地打印或内部版权评估，当前不必先接 happi123：
  - 可以先把 MusicXML 整成内部 draft
  - 再走 `/dev/print/song/<slug>` 或后续私有打印页导出 PDF

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
  - 除 `searchTerms` 外，如果某首歌存在稳定英文别名，也应同步维护 `aliases`。
  - 这些 aliases 现在会同时服务：
    - 首页列表页站内搜索
    - song page 的 title / description / 正文 alias 覆盖
- `reference/songs/*.json`
  - 本地导歌 / 调试 fallback。
- `src/app/dev/song-import-dashboard/page.tsx`
  - 内部导歌控制台入口。
  - 聚合 public manifest、SEO profile、deployable raw JSON、compact SongDoc、candidate pool 和 git 状态。
- `src/lib/songbook/importDashboard.ts`
  - 内部导歌控制台的数据聚合层。
  - 负责输出 release issue、recent imports、candidate pool snapshot。

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
- `/dev/song-import-dashboard`
  - 内部网页入口。
  - 适合先看“这轮导歌之后还有哪些 manifest / SEO / runtime 缺口”，再决定是否继续导入或准备发布。
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
- `amazing-grace`、`canon`、`greensleeves` 等公开页已确认看不到中文标签；当前 english runtime 下，指法图谱上方的乐器 / 指法标题行默认隐藏，不再依赖英文化后放宽 `textLength` 来避免重叠
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
- 如果歌曲存在稳定英文别名、译名或常见副标题，新增 / 上线时应同时补 `aliases`，不要只写正文不补站内搜索入口。
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

### 17.0.1 暂缓事项：`tonality.html` 内部收编

- 快乐谱教程页 `https://www.kuaiyuepu.com/static/taodijiaocheng/html/tonality.html` 隐含了一套很有价值的“陶笛指法 / 筒音 / 音域 / 调性”映射结构。
- 这件事长期看值得收编成内部配置表，因为它对：
  - 乐器规则层管理
  - 后续扩乐器
  - 理解快乐谱产品层与 runtime 上下文
  都有帮助。
- 但当前阶段先不要把这条线接入正式运行逻辑。
- 更合适的推进时机是：
  - 以后专门做快乐谱代码拆解 / HC 引擎理解阶段
  - 或者明确开始做更系统的乐器规则层工程化时
- 当前优先级仍然是：
  - 保持公开 song page 主链稳定
  - 继续运营和拿第一波流量

### 17.1 当前下一步的真实阻塞点

如果下一轮任务是“继续扩充曲库”，当前上下文要记住：

- 中国网络下已经整理出一版快乐谱 western 候选池：
  - `data/songbook/kuailepu-western-candidate-pool.json`
- 但快乐谱站内搜索对这些英文/中文标题的命中率很差，经常返回同一批兜底推荐
- 2026-04-04 在美国 VPN 下实测：
  - `npm run search:kuailepu -- "Joy to the World"` 返回 `ERR_CONNECTION_CLOSED`
  - 说明当前美国侧网络更适合做 western 关键词调研，不适合直接做快乐谱导歌
- 所以继续加歌时，不能只依赖现有搜索脚本结果，可能要人工浏览或换别名再搜
- 真正开始导入前，仍然必须先跑 `npm run preflight:kuailepu-publish -- <slug...>`
- 如果 preflight 报登录失效，就先让人工执行 `npm run login:kuailepu`

### 17.1.1 2026-04-04 中国 VPN 下已落地的快乐谱 western 候选池

这轮中国网络下已经把“快乐谱里能找到的 western 相关候选”收口成一份文件：

- `data/songbook/kuailepu-western-candidate-pool.json`

这份文件不是快乐谱全站 `6000+` 首曲目的完整清单，而是当前产品更相关的第一版 western 子集。当前这份文件已经升级为 `schemaVersion = 2`，接手时不要只看旧 `status`，而要优先看：

- `workflowStatus`
- `statusReason`
- `recommendedTitle`
- `recommendedSlug`
- `lastCheckedOn`

当前统计是：

- `uniqueResults = 30`
- `alreadyPublic = 12`
- `newCandidatesWithLatinTitles = 14`
- `immediateScreeningCandidates = 0`
- `skipForNowCandidates = 18`
- `queuedCandidates = 0`
- `holdCandidates = 4`
- `blockedCandidates = 11`
- `referenceOnlyCandidates = 2`
- `duplicateCandidates = 1`

这轮在国外 VPN 下已经完成第一轮 western 流量与可用性筛选，随后又在中国网络下补做了一轮扩池。当前结论是：

1. 首轮 `screen-next` 已全部收口；当前 `workflowStatus=queued` 为空
2. 中国网络后续扩池并结合美国侧第二轮筛选后，`Home on the Range`、`La Cucaracha`、`Drinking Song` 都已经导入并通过 preflight compare
3. 当前这份候选池里已经没有剩余待直接导入项；下一轮应先重新做中国网络扩池
4. `The Last Waltz` 与 `Tennessee Waltz` 只保留为 western 需求参考标题
5. `Vientos Suaves` 与 `Polska` 暂时保留，但都缺少足够清晰的单曲 landing-page 身份
6. `Lullaby of the Manifold` 已基本确认偏现代版权曲，不再属于当前导歌队列
7. `Salut d'Amour` 虽然在快乐谱能找到，但该页只有 `instrument=none`，当前不能进入公开曲页队列
8. `G Major Minuet` 也在快乐谱能找到，但该页缺少当前公开乐器集对应的可用图谱，当前同样不进入队列

内部控制台现已可直接查看这份候选池：

- `/dev/song-import-dashboard`

该页会显示：

- 当前 `workflowStatus` 分布
- 当前 `statusReason` 分布
- `queued` 导入队列
- 每条候选的推荐标题、推荐 slug、当前映射、source UUID 与最近检查日期

当前已明确更适合先跳过的代表项有：

- `O son do ar`
  - 已有作曲者 `Bieito Romero`，更像现代版权曲
- `The Imperial March`
  - 识别度高，但不属于当前公版扩曲范围
- `Waltz No.2`
  - 标题强，但版权风险高
- `Hymn To The Sea`
  - 现代电影配乐，不在当前队列
- `Merry Christmas Mr. Lawrence`
  - 现代作品，不在当前队列

这轮候选池里已落地完成并不应再重复导入的有：

- `home-on-the-range`
- `la-cucaracha`
- `drinking-song`
- `joy-to-the-world`
- `jolly-old-saint-nicholas`

另外：

- `what-child-is-this` 仍不建议优先做
  - 它和当前已上线的 `greensleeves` 共用旋律
  - 现阶段先优先扩新的 melody 页面

下一步如果继续扩 western 曲库，仍建议保持这套分工：

- 国外 VPN：
  - 只做更大范围的 western 候选扩池与需求验证
- 中国 VPN：
  - 回到快乐谱继续扩新候选
  - 导歌
  - 跑 preflight compare

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

到 2026-04-05 当前交接时，核心产品链路没有额外必须收尾的公开主线：

- 公开 `/song/<slug>` 仍是 deployable raw JSON + 原始 Kuailepu runtime。
- 默认 `letter`、可选 `number`、发布前 gate 仍看 `number`。
- 公开最小乐器集仍是：
  - `o12`
  - `o6`
  - `r8b`
  - `r8g`
  - `w6`
- 功能区与节拍器当前已经公开并经过本地回归。
- 内部打印链当前也已落地：
  - `/dev/print/song/<slug>`
  - `npm run export:print-pdf -- --slug <slug> ...`
  - 当前只供本地使用，不向公开前台暴露
- 当前最需要注意的“剩余状态”不是再改主链，而是：
  - 本地分支可能比远端超前
  - 新对话接手前先看 `git status --short --branch`
  - 准备上线前先看 `git log --oneline origin/main..HEAD`
  - 确认每个本地提交都属于应上线内容后再 push
- 截至 2026-04-17 当前工作区，这一轮最重要的新增公开内容是：
  - `tennessee-waltz`
  - `the-last-waltz`
  - `waltz-no-2`
- 这 3 首当前在 HEAD 已完成：
  - `data/kuailepu-runtime/<slug>.json`
  - `data/kuailepu/<slug>.json`
  - `data/songbook/public-song-manifest.json`
  - `data/songbook/song-seo-profiles.json`
  - `src/lib/learn/content.ts`
  - 中国网络下 compare / preflight 校验
- 当前 HEAD 的公开 song pages 数量口径已更新为 `118`。
- 当前仓库还新增了一条更清晰的内部灰度曲追踪入口：
  - `data/songbook/grey-song-rollout.json`
  - `/dev/song-import-dashboard` 里的 `Grey Song Tracker`
  - 当前用来区分 `live`、`committed-local`、`imported-only` 三种灰度曲状态
- 当前内部 Pinterest 导图链也已收口到一版更稳定的导出逻辑：
  - 无 artwork 预览页按内容高度收口
  - 导图导出脚本等待布局稳定后按导图终点裁切
  - `Frere Jacques` 的 `English 8-Hole Recorder` 导图 preset 已补齐
- 首页、learn 入口页和 song page SEO 壳层当前已开始额外自然覆盖：
  - `tabs`
  - `finger chart`
  - `fingering chart`
  这是根据 2026-04-17 本地导出的 GSC 近 28 天 query 小样本做的词面补强。
- song page SEO 模板当前也已收口一轮基础语法问题，避免继续产出：
  - `melody melody`
  - `a intermediate`
- 当前又新增一条协作规则：
  - 完整任务已完成、且本地必要验证已经通过时，可以自行 `commit` 留档
  - **任何 push 前都必须先得到用户明确同意**
  - 不要因为本地验证通过就默认可以触发 Vercel 自动部署

`tsconfig.tsbuildinfo`、调试截图、`.tmp` 文件、临时日志都属于噪音，不应带入提交。

## 19. 新对话初始化指令

下面这条可以直接复制给新对话：

`Follow AGENTS.md first. Then read README.md, docs/handoff.md, docs/agent-handoff.md, docs/kuailepu-compatibility-roadmap.md, docs/manual-runtime-qa-checklist.md, src/lib/kuailepu/runtime.ts, and docs/instrument-rollout-plan.md in that order before changing anything. If the task touches internal print/PDF export, copyrighted-song local workflow, or MusicXML ingest, also read docs/internal-print-workflow.md and docs/song-ingest-input-spec.md. Keep public /song/<slug> on deployable raw JSON plus the original Kuailepu runtime path. Do not change the public runtime main chain, do not restore SongClient as the public detail page, keep letter mode as default, keep number mode as the compare/preflight/publish gate, and keep all visible site copy in English without exposing Kuailepu/reference/source wording. Pure Chinese lyrics must stay hidden publicly and must not be re-exposed by query params. The current public instrument set is o12, o6, r8b, r8g, and w6. Metronome is public as a docked toolbar above the fingering chart, not a blocking modal. The current public library count is 118 songs. Public song pages now expose opengraph and twitter image routes, and the repo also contains an internal Pinterest preview/export workflow for ongoing social-image experiments. Internal print preview exists at /dev/print/song/<slug>, PDF export uses npm run export:print-pdf, and exports/ plus private/ must remain local-only. Before any release decision, run git status --short --branch and git log --oneline origin/main..HEAD. The latest shipped songs are tennessee-waltz, the-last-waltz, and waltz-no-2. The repo also contains an internal grey-song tracker at data/songbook/grey-song-rollout.json, surfaced in /dev/song-import-dashboard under Grey Song Tracker. Recent SEO wording updates now intentionally cover tabs, finger chart, and fingering chart phrasing based on small GSC query samples. If the task needs Kuailepu import, compare, preflight, parity, or login checks, require a China-reachable network first. If it needs Google or western keyword research, ask for a foreign VPN first. If Kuailepu login is invalid, stop and ask the user to run npm run login:kuailepu.`

### 19.2 2026-04-17 当前状态补丁

`Current HEAD now exposes 118 public songs, with the latest shipped additions being tennessee-waltz, the-last-waltz, and waltz-no-2. Their deployable raw JSON, compact SongDoc, manifest entries, song SEO profiles, learn/hub internal-link updates, and China-network compare/preflight checks are already in place. The repo still contains an internal grey-song tracker at data/songbook/grey-song-rollout.json, visible in /dev/song-import-dashboard under Grey Song Tracker, but do not confuse that tracker with current public count. Internal Pinterest export tuning has also been committed: /dev/pinterest/song/[id] now shrinks to content height on non-artwork presets, and export-pinterest-pin crops after layout stabilizes instead of clipping a fixed canvas. Recent homepage, learn, and song-page SEO wording also now covers tabs, finger chart, and fingering chart phrasing based on small GSC query samples.`

### 19.1 2026-04-09 公开 SEO 入口层继续推进

- 已继续沿 `docs/seo-growth-roadmap.md` 执行公开 SEO 入口层，不碰 runtime / 曲谱 / 指法图谱核心逻辑。
- learn 入口当前又补了 8 个公开主题页：
  - `easy-recorder-songs-for-beginners`
  - `easy-tin-whistle-songs`
  - `nursery-rhyme-letter-notes`
  - `easy-songs-for-adult-beginners`
  - `hymns-and-spiritual-letter-note-songs`
  - `celtic-tin-whistle-songs`
  - `march-and-parade-letter-note-songs`
  - `wedding-and-ceremony-letter-note-songs`
  - `calm-and-lyrical-letter-note-songs`
- learn 入口当前又继续补了更窄意图的专题页：
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
  - `wedding-and-ceremony-letter-note-songs`
  - `calm-and-lyrical-letter-note-songs`
  - `lullaby-and-bedtime-letter-note-songs`
  - `dance-and-waltz-letter-note-songs`
- `src/lib/learn/content.ts` 的 song page related guides 规则也已细化：
  - nursery / song 更优先导向 nursery / beginner / recorder 入口
  - holiday 更优先导向 christmas / lyrics / whistle 入口
  - folk / hymn 更优先导向 folk / hymn / adult beginner 入口，Celtic / Irish folk 会额外导向 whistle 专题入口
  - classical 更优先导向 reading / instrument hub / adult beginner 入口
  - march 更优先导向 `march-and-parade-letter-note-songs` / classical / classroom 入口
  - `yankee-doodle` / `american-patrol` / `scotland-the-brave` / `cavalry-march` / `grenadiers-march` / `the-internationale` / `russian-national-anthem` / `katyusha` 会额外导向 `patriotic-and-anthem-letter-note-songs`
  - `arirang` / `jasmine-flower` / `sakura-sakura` / `bella-ciao` / `la-cucaracha` / `el-condor-pasa` / `hej-sokoly` / `moscow-nights` / `troika` / `red-berries-blossom` / `the-hawthorn-tree` 会额外导向 `world-folk-letter-note-songs`
  - `canon` / `wedding-march` / `wedding-march-alt` / `amazing-grace` / `air-on-the-g-string` / `going-home` 会额外导向 `wedding-and-ceremony-letter-note-songs`
  - `amazing-grace` / `air-on-the-g-string` / `going-home` / `greensleeves` / `londonderry-air` / `lullaby` / `moonlight-sonata` / `on-wings-of-song` / `sakura-sakura` / `santa-lucia` / `scarborough-fair` / `schubert-serenade` / `traumerei` 会额外导向 `calm-and-lyrical-letter-note-songs`
  - `lullaby` / `moonlight-sonata` / `schubert-serenade` / `traumerei` / `air-on-the-g-string` / `moscow-nights` / `going-home` / `sakura-sakura` 会额外导向 `lullaby-and-bedtime-letter-note-songs`
  - `can-can` / `habanera` / `woodpecker-polka` / `blacksmith-polka` / `the-hawthorn-tree` / `dancing-doll-and-teddy-bear` / `swan-lake` / `turkish-march` 会额外导向 `dance-and-waltz-letter-note-songs`
- `data/songbook/song-seo-profiles.json` 已补第三批高潜力 song profile：
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
- `data/songbook/song-seo-profiles.json` 当前又补了第五批 classical / folk evergreen 候选：
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
- `data/songbook/song-seo-profiles.json` 当前又补了第六批 folk / classical / Celtic 候选：
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
- 当前已补齐全部 published songs 的 `metaTitle`，后续这条线可以从“补缺口”转到“细化首屏 copy / searchTerms / intent 文案”。
- `src/lib/songbook/seoProfiles.ts` 与 `src/lib/songbook/presentation.ts` 当前已新增 per-song `overview` 能力，用于覆盖 song page 首段文案，先补了一批更需要差异化 opening paragraph 的高潜力页：
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
- 此后又继续补了两批定制 `overview`，当前 published songs 里已有 52 首使用 song-specific opening paragraph。新增覆盖包括：
  - `mary-had-a-little-lamb` / `yankee-doodle` / `can-can` / `american-patrol` / `arirang` / `auld-lang-syne-english` / `deck-the-halls` / `do-your-ears-hang-low` / `god-rest-you-merry-gentlemen` / `long-long-ago`
  - `minuet-in-g` / `moonlight-sonata` / `old-macdonald` / `red-river-valley` / `santa-lucia` / `schubert-serenade` / `scotland-the-brave` / `we-wish-you-a-merry-christmas` / `wedding-march` / `were-you-there`
  - `home-sweet-home` / `flight-of-the-bumblebee` / `going-home` / `habanera` / `londonderry-air` / `lullaby` / `on-wings-of-song` / `sakura-sakura` / `swan-lake` / `traumerei`
  - `cavalry-march` / `twinkle-variations` / `wedding-march-alt` / `oh-susanna` / `row-row-row-your-boat` / `spring-song` / `simple-gifts` / `wellerman`
  - `london-bridge`
- 此后又继续把 remaining published songs 的 `overview` 全部补齐；当前 `public-song-manifest` 范围内 108 首公开歌曲都已有 song-specific opening paragraph，后续可以把重点从“补覆盖”转到“继续精修高价值曲目文案”和“补更多高意图公开专题页”。
- `src/lib/songbook/seoProfiles.ts` 与 `src/lib/songbook/presentation.ts` 当前又补了 per-song `metaDescription` 与 `extraFaqs` 能力，允许单曲页 metadata 和 FAQ 不再完全依赖统一模板。
- 第一批已补定制 `metaDescription` 与 `extraFaqs` 的高潜力曲目包括：
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
- 本轮又新增一批更偏 sing-along / first-performance / seasonal 长尾的定制 `metaDescription` 与 `extraFaqs`：
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
- 这批 FAQ 主要补的是每首歌更自然的长尾意图，而不是继续套统一问法，例如：
  - first song / classroom starter
  - church / memorial / wedding / sing-along / holiday use
  - 常见别名或 tune family 关联
- 当前阶段默认仍只允许继续做：
  - learn / hub / guide / blog-style 页面
  - song page title / meta / 首屏文案 / FAQ / related guides / 结构化数据
- 如果后续要改公开 runtime、iframe、曲谱展示或指法图谱正确性，仍然必须先问用户。

### 1.1.4 2026-04-10 最新 SEO 收尾与灰度曲流程补充

- `b5e85dc` 已 push：公开 SEO `Phase 2` 已完成收尾。
- 当前公开 `learn` 体系仍锁定为 `40` 个页面：
  - `1` 个 `/learn`
  - `39` 个 `/learn/[slug]`
- hub / collection 审计已完成：
  - 已审计 `25` 个 hub / collection 页面
  - 当前没有任何 `<5` 首 unique songs 的 hub
  - 最低 unique song count 为 `6`
  - 因此本轮没有做 hub 合并或新增 hub
- 现有 hub 页已完成去模板化重写：
  - H1 下方导语已改成定制英文 `heroSummary`
  - `/learn` 与 `/learn/[slug]` 底部已补 breadcrumb 与 related-category 闭环导航
  - `learn` / `hub` 核心正文当前保持静态输出，不做客户端按需加载；后续若要减重，优先看 song 页 hydration，而不是懒加载 SEO 正文
- 当前 `public-song-manifest` 内的 `96` 首公开歌曲都已经具备：
  - song-specific `metaTitle`
  - song-specific `overview`
  - song-specific `metaDescription`
  - 至少 `2` 条 `extraFaqs`
- 全局 Footer 免责声明已经上线：
  - 组件在 `src/components/layout/SiteFooter.tsx`
  - 根布局接入在 `src/app/layout.tsx`
  - `/dev` 路由默认隐藏 Footer
  - 当前文案是英文，邮箱位置仍为通用占位表述 `please contact us by email`
- 当前公开增长已从“继续加 hub”切到“灰度热门曲半自动引入”：
  - 工作流固定为 `AI 扫库推荐 -> 用户人工审核 -> AI 深抓与英文清洗 -> 用户验收 -> 用户确认后 push`
  - 当前节奏固定为每天最多 `3` 首
  - 第二批暂未开始，等用户下一次确认
- 第一批灰度热门曲已经上线并 push（`dd01ba7`）：
  - `song-of-time`
  - `carrying-you`
  - `hes-a-pirate`
- 这三首的处理边界要记住：
  - 公开页面层、slug、meta、overview、FAQ、aliases、fallback 描述必须保持纯英文
  - `data/kuailepu-runtime/<slug>.json` 内的上游中文元数据当前保留，不主动清洗 runtime payload，避免 compare / parity 风险
  - 如果以后要连 `/api/kuailepu-runtime/*` 返回 payload 里的中文字段也一起清掉，先问用户
- 这轮没有新增 hub，40 页上限保持不变；只做了现有入口层回链增强：
  - `first-performance-letter-note-songs` 加入 `song-of-time` 与 `hes-a-pirate`
  - `march-and-parade-letter-note-songs` 加入 `hes-a-pirate`
  - `calm-and-lyrical-letter-note-songs` 与 `easy-songs-for-adult-beginners` 加入 `song-of-time`、`carrying-you`
  - `dance-and-waltz-letter-note-songs` 加入 `hes-a-pirate`
- 首页曲库列表的 alias 搜索体验也已上线（`ca670df`）：
  - 用户如果通过别名命中歌曲，卡片标题下方会显示命中的 alias 小字
  - 默认列表与直接按正式歌名搜索时，不显示 alias
- 截至当前工作区：
  - `origin/main` 已包含上面两次 push
  - 本地未提交改动通常只剩 `tsconfig.tsbuildinfo`
  - 新对话接手前仍建议先执行：
    - `git status --short --branch`
    - `git log --oneline origin/main..HEAD`

### 1.1.5 2026-04-11 灰度曲第二批与内链同步规则补充

- 第二批灰度曲当前已在本地导入并通过 preflight compare：
  - `merry-go-round-of-life`
  - `my-heart-will-go-on`
  - `river-flows-in-you`
- 当前灰度曲执行规范已单独沉淀到：
  - `docs/grey-song-rollout-playbook.md`
- 从这一轮开始，灰度曲流程新增一条硬规则：
  - 每次新增灰度曲，不只补 import / manifest / SEO profile
  - 还必须在同一轮把新歌接入现有 `learn / hub` 内链体系
  - 优先更新 `src/lib/learn/content.ts` 里的：
    - `featuredSongSlugs`
    - section `songSlugs`
    - song-to-guide 推荐集合
- 当前默认策略仍然是：
  - 只更新现有 hub 的回链与导流
  - 不因为新增灰度曲就继续扩 learn / hub 页数量

### 1.1.6 2026-04-14 第四批灰度曲、公开社交图链路与移动端补充

- `24a875e` 已 push：
  - 第四批灰度曲已上线：
    - `one-summers-day`
    - `princess-mononoke`
    - `path-of-the-wind`
- 当前公开 song page 数量已更新为 `108` 首：
  - `songCatalog.length = 108`
  - `data/songbook/public-song-manifest.json = 108`
  - `data/kuailepu-runtime/*.json = 108`
- 第四批灰度曲同样已完成：
  - 英文公开层 title / description / aliases / metaTitle / metaDescription / FAQ
  - 现有 `learn / hub` 内链接入
  - China-network 下 preflight compare 通过
- 当前仓库已新增公开社交图链路：
  - `src/app/song/[id]/opengraph-image.tsx`
  - `src/app/song/[id]/twitter-image.tsx`
  - `src/lib/songbook/songSocialImage.tsx`
- 当前仓库也已保留一条内部 Pinterest 导图实验链：
  - `src/app/dev/pinterest/song/[id]/page.tsx`
  - `src/lib/songbook/pinterestPins.ts`
  - `scripts/export-pinterest-pin.ts`
- 当前 Pinterest 图仍处于实验阶段：
  - 代码已 push
  - `exports/` 下的导图产物继续只保留本地，不进入 git
  - 后续如果继续做 Pinterest 视觉模板，不要误把 `exports/` 里的测试图当成可提交资产
- 当前移动端额外已做两处壳层优化：
  - song page 的 `More controls` 可开关，且移动端只渲染一套控件
  - 首页 `A–Z` 模式已新增 `Back to top` 浮动按钮
- 截至当前工作区：
  - `origin/main` 已包含第四批灰度曲与社交图链路提交
  - 本地通常只剩噪音文件：
    - `tsconfig.tsbuildinfo`
    - `.tmp-playwright-3ue-profile/`

### 1.1.7 2026-04-16 Pinterest 本地导图补充

- 当前工作区还额外存在一组**未 commit 的 Pinterest 本地导图调整**：
  - `scripts/export-pinterest-pin.ts`
  - `src/app/dev/pinterest/song/[id]/page.tsx`
  - `src/components/song/KuailepuRuntimeFrame.tsx`
  - `src/lib/songbook/pinterestPins.ts`
- 这轮调整不是公开主链改动，而是内部导图实验链的收尾：
  - 无 artwork 的 Pinterest 预览页改成按内容高度收口，不再强制固定 1500 高
  - 导图脚本改成先等待布局稳定，再按导图终点裁切
  - `Frere Jacques` 已补 `English 8-Hole Recorder` 的 Pinterest pin preset，并专门调过“右侧不截断、底部完整、footer 保留”的版式
- 当前本地 `exports/pinterest-first-wave/` 已刻意清理到只剩两张正式图：
  - `amazing-grace.png`
  - `frere-jacques.png`
  - 以及对应 `manifest.json`
- 继续遵守：
  - `exports/` 只保留本地，不进入 git
  - 不要把 `exports/` 里的导图产物当成应提交资产
  - 新对话不要再默认“当前本地只剩 tsconfig.tsbuildinfo 脏文件”；应先跑 `git status --short --branch`

### 1.1.8 2026-04-16 Recorder 语义反馈补充

- `r/Recorder` 线程里一位已经访问过站点并给过详细正向反馈的用户，又补了一条更技术性的 recorder 视角评论：
  - `1 = G 6/8` 这类顶层信息会被 western recorder 用户读成不自然甚至误导的 notation label
  - `English 8-hole recorder G fingering` 这类公开文本会暴露快乐谱内部语义，不像 recorder-native wording
  - 对方特别提出了 `written pitch` vs `sounding pitch` 的问题，说明 recorder 用户会用比 ocarina / tin whistle 更严格的 notation 视角看 note labels
- 当前产品判断：
  - 这是 recorder-specific note-label semantics / trust issue
  - 目前还不能据此断定全站 letter-note conversion 在音高关系上普遍出错
  - ocarina / tin whistle 现阶段仍更像以演奏辅助为主；recorder 更接近 staff / method-book 语境
- 当前最小动作方向：
  - 优先隐藏顶部容易误导的 SVG 文本，如 `1=...`、拍号和 `X fingering` / 乐器说明行
  - 暂不在这个信号刚出现时就仓促为 `r8b / r8g` 重写专用算法
  - 如果 recorder 用户继续重复指出 note labels 问题，再单独评估 whether `r8b / r8g` should adopt a written-pitch-facing rule

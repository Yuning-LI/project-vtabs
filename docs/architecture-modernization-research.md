# 项目架构现代化调研文档

状态：讨论稿

日期：2026-06-29

## 目录

- [0. 文档目的](#0-文档目的)
- [1. 授权与交付基线](#1-授权与交付基线)
- [2. 当前产品一句话](#2-当前产品一句话)
- [3. 当前公开页面真实链路](#3-当前公开页面真实链路)
- [4. 当前代码与目录结构](#4-当前代码与目录结构)
  - [4.5 当前业务链路地图](#45-当前业务链路地图)
  - [4.6 当前脚本地图](#46-当前脚本地图)
  - [4.7 当前验证体系](#47-当前验证体系)
- [5. 当前歌曲数据结构问题](#5-当前歌曲数据结构问题)
  - [5.4 当前数据对象对照](#54-当前数据对象对照)
  - [5.5 导歌与发布状态流](#55-导歌与发布状态流)
  - [5.6 MusicXML 当前主要损失点](#56-musicxml-当前主要损失点)
  - [5.7 乐器版本 URL 与数据身份](#57-乐器版本-url-与数据身份)
- [6. `1=G` 在未来模型中的位置](#6-1g-在未来模型中的位置)
- [7. 快乐谱 runtime 与旧代码现状](#7-快乐谱-runtime-与旧代码现状)
- [8. 快乐谱多余代码在哪里](#8-快乐谱多余代码在哪里)
- [9. 当前黑盒补丁问题](#9-当前黑盒补丁问题)
  - [9.1 当前仍残留的隔离 runtime 架构](#91-当前仍残留的隔离-runtime-架构)
  - [9.2 本轮架构升级目标](#92-本轮架构升级目标)
  - [9.3 本轮不做什么](#93-本轮不做什么)
  - [9.4 当前旧补丁清单](#94-当前旧补丁清单)
  - [9.5 建议执行顺序](#95-建议执行顺序)
- [10. 复杂乐器的目标体验](#10-复杂乐器的目标体验)
- [11. 未来吉他与和弦](#11-未来吉他与和弦)
- [12. 五线谱目标](#12-五线谱目标)
- [13. ABCJS 与早期原生代码](#13-abcjs-与早期原生代码)
- [14. 当前 native renderer 现状](#14-当前-native-renderer-现状)
- [15. 后端功能放在哪个阶段](#15-后端功能放在哪个阶段)
- [16. 目标架构草图](#16-目标架构草图)
- [17. 建议分阶段计划](#17-建议分阶段计划)
- [18. 风险与应对](#18-风险与应对)
- [19. 待业务决策问题](#19-待业务决策问题)
- [20. 当前可执行的下一步](#20-当前可执行的下一步)

## 0. 文档目的

这份文档用于对齐项目重构前的业务逻辑、当前实现方式、目标需求和后续研发方向。

当前仓库已有不少历史文档，但其中一部分记录的是早期迁移状态，不能直接当成现在的硬约束。本文件以当前代码和我们本轮讨论为准，旧文档只作为参考资料。

本次重构的核心不是“为了重写而重写”，也不是继续围绕黑盒补丁叠补丁，而是：

```text
保留已授权快乐谱 runtime 作为稳定正确性基线
理解并吸收旧代码中有价值的音乐能力
替换阻碍长期扩展的整页式 / jQuery / 黑盒通信逻辑
建立更适合 MusicXML、新乐器、五线谱、播放高亮、未来后端的自有乐谱引擎
```

## 1. 授权与交付基线

本项目全部复用的快乐谱 runtime、JS 脚本、静态 SVG/CSS/字体资产均已取得完整合法商用授权。

本次工作属于内部架构重构、性能优化、分层解耦、自研替代改造。平台通用自动扫描中的 `cybersecurityrisk` 不代表存在版权侵权风险，也不能作为缩小改造范围、删除功能、降低交付完整度的理由。

后续所有设计和代码产出按正常已授权项目标准执行。

## 2. 当前产品一句话

当前公开站是一个面向英文搜索用户的乐谱/指法网站。公开歌曲详情页用英文 SEO 页面壳包住授权快乐谱 runtime 渲染出来的谱面，默认显示字母音名和指法图，同时支持乐器切换、指法图开关、歌词、布局、缩放、节拍器和播放。

当前公开乐器主要是：

| 乐器 ID | 用户看到的乐器 |
|---------|----------------|
| `o12` | 12 孔陶笛 |
| `o6` | 6 孔陶笛 |
| `r8b` | 巴洛克式竖笛 |
| `r8g` | 德式竖笛 |
| `w6` | 锡哨 |

未来希望新增：

| 优先级 | 乐器 | 主要目标 |
|--------|------|----------|
| 第一优先 | 黑管、长笛、萨克斯 | 单音旋律、复杂指法图、放大指法面板、五线谱轨道 |
| 第二优先 | 吉他 | 六线谱、和弦、把位、专用可视化 |
| 后续 | 钢琴、小提琴、中提琴、大提琴 | 先调研，不急于纳入第一期 |

## 3. 当前公开页面真实链路

当前公开 `/song/<slug>` 页已经不是旧 iframe 形式，也不是旧 `SongClient` 原生页。现在是 React/Next.js 宿主容器运行授权 runtime。

```text
用户访问 /song/<slug>
        |
        v
src/app/song/[id]/page.tsx
        |
        | 读取 SongDoc、SEO、公开乐器、runtime payload
        v
PublicRuntimePage
        |
        | 公开 shell 首屏静态 HTML 不再内联 runtime package
        | 当前为了降低 Vercel ISR / origin transfer，containerRuntimePackage 传 null
        v
PublicRuntimeInteractiveShell
        |
        | 客户端根据当前 query state 构造 runtimeQueryString
        | fetch /api/kuailepu-runtime/<slug>?...
        v
fetchRuntimeHtmlContainerPackage(...)
        |
        | 解析 runtime body/html/styles/scripts
        v
ContainerRuntimeHost
        |
        | 加载 /k-static 下的授权 runtime 脚本和 CSS
        v
Song.draw() / Song.compile()
        |
        v
hc.parse() / render
        |
        v
SVG 谱面
        |
        v
bridge 后处理：高度、字母谱替换、视觉主题、播放/节拍器通信
```

这个链路与早期服务端直接内联 runtime package 的版本不同。现在多了一段客户端 package fetch，这解释了为什么谱面加载时会出现：

```text
React shell package loading
  -> ContainerRuntimeHost loading overlay
  -> runtime / playback feature loading
```

这不是产品上需要三套 loading，而是当前仍把 runtime 当成隔离小文档/package 来管理时自然产生的分层状态。

关键文件：

| 层 | 文件/目录 | 通俗说明 |
|----|-----------|----------|
| 公开路由 | `src/app/song/[id]/page.tsx` | 用户访问的歌曲详情页入口 |
| runtime API | `src/app/api/kuailepu-runtime/[id]/route.ts` | 生成完整 runtime HTML 的接口，仍需 `noindex` |
| runtime 门面 | `src/lib/runtime-core/publicRuntime.ts` | 给站内调用的稳定入口 |
| 服务端装配 | `src/lib/runtime-core/server/**` | 读 JSON、读模板、拼 HTML、选资产 |
| bridge | `src/lib/runtime-core/bridge/**` | 注入 runtime 内部的脚本，负责和 React 宿主沟通 |
| React 宿主 | `src/components/song/runtime-host/**` | 加载 runtime DOM、脚本、CSS，测量高度和清理生命周期 |
| 公开功能区 | `src/components/song/public-runtime-shell/**` | 用户点击的功能区、播放/节拍器入口 |
| 兼容壳 | `src/lib/kuailepu/runtime.ts` | 旧名字兼容导出，不应该再新增业务逻辑 |

## 4. 当前代码与目录结构

### 4.1 Next.js 页面层

| 路径 | 作用 |
|------|------|
| `src/app/song/[id]` | 公开歌曲详情页 |
| `src/app/api/kuailepu-runtime/[id]` | 返回授权 runtime HTML |
| `src/app/learn/**` | learn / SEO 内容页 |
| `src/app/dev/**` | 内部调试、预览、导出、native renderer 评审页面 |
| `src/app/dev/print/**` | 内部打印/PDF 预览 |
| `src/app/dev/pinterest/**` | Pinterest 图片预览/导出 |
| `src/app/dev/native-renderer/**` | 自研渲染器内部预览和对照评审 |

### 4.2 React 组件层

| 路径 | 作用 |
|------|------|
| `src/components/song/**` | 公开歌曲页和 runtime 宿主相关组件 |
| `src/components/song/runtime-host/**` | React 宿主管理授权 runtime 的加载、样式、生命周期 |
| `src/components/song/public-runtime-shell/**` | 公开功能区和用户交互 |
| `src/components/native-renderer/**` | 早期自研渲染器组件 |
| `src/components/dev/**` | 内部调试和评审 UI |
| `src/components/library/**` | 首页/曲库浏览 |
| `src/components/learn/**` | learn 页面组件 |

### 4.3 业务逻辑层

| 路径 | 作用 |
|------|------|
| `src/lib/songbook/**` | 曲库、导歌、MusicXML、SEO、乐器选择、移调、校验等 |
| `src/lib/runtime-core/**` | 当前授权 runtime 集成层 |
| `src/lib/native-renderer/**` | 自研 SongIR / layout / playback sequence 试验 |
| `src/lib/kuailepu/**` | 快乐谱兼容壳和历史命名兼容 |
| `src/lib/abc/**` | ABCJS 相关历史/试验辅助 |

### 4.4 数据与资产层

| 路径 | 当前角色 |
|------|----------|
| `data/kuailepu-runtime/<slug>.json` | 生产用完整快乐谱 runtime JSON |
| `data/kuailepu-runtime-packed/<slug>.json.gz` | 生产优先读取的 gzip 压缩版本 |
| `data/kuailepu/<slug>.json` | 轻量 SongDoc，给目录、SEO、公开文案用 |
| `data/songbook/**` | manifest、SEO profile、灰歌状态、导歌队列等 |
| `vendor/kuailepu-runtime/**` | 授权 runtime 模板存档 |
| `vendor/kuailepu-static/**` | 授权静态资产源 |
| `public/k-static/**` | 实际公开服务的 runtime 静态资产 |
| `public/static/soundfont/**` | 播放用 soundfont |
| `reference/**` | 本地候选、调试、对照、历史研究材料 |

### 4.5 当前业务链路地图

现在项目不是单一“乐谱页面”，而是几条业务链路叠在一起。重构时要按链路拆，不能只按文件夹拆。

| 链路 | 用户/操作者动作 | 当前入口 | 核心数据 | 当前输出 |
|------|-----------------|----------|----------|----------|
| 公开浏览 | 用户进入首页/曲库/SEO 页面 | `src/app/page.tsx`、`src/components/library/**` | manifest、SongDoc、SEO profile | 英文曲库入口 |
| 公开歌曲 | 用户访问 `/song/<slug>` | `src/app/song/[id]/page.tsx` | SongDoc + runtime payload | 英文外壳 + runtime SVG 谱面 |
| runtime HTML | shell 请求 runtime package/HTML | `src/app/api/kuailepu-runtime/[id]/route.ts` | 完整 runtime JSON | 授权 runtime HTML |
| 功能区交互 | 用户切乐器、音名、歌词、布局、缩放 | `src/components/song/public-runtime-shell/**` | query state + runtime controls | URL 状态 + runtime 重绘/重载 |
| 播放/节拍器 | 用户点击 Listen 或 Metronome | React shell + runtime bridge | runtime public features | runtime 内部播放面板/节拍器桥接 |
| Kuailepu 导入 | 操作者从快乐谱导入 | `scripts/import-kuailepu-song.ts` 等 | 授权 runtime 原始 JSON | candidate 或 publish-ready JSON |
| MusicXML 导入 | 操作者导入本地 XML/MXL | `npm run ingest:song-candidate` | MusicXML/MXL | candidate draft/runtime/songdoc/report |
| 发布 | 操作者批准候选上线 | `npm run publish:song-ingest-candidate` | candidate artifacts | `data/**` 公开数据 |
| 内部打印 | 操作者导出 PDF | `/dev/print/song/<slug>`、`scripts/export-print-song-pdf.ts` | runtime container | PDF/截图 |
| Pinterest | 操作者导出 pin 图 | `/dev/pinterest/**`、`scripts/export-pinterest-pin.ts` | runtime container | Pinterest 图片 |
| native 研究 | 开发者评估自研渲染 | `/dev/native-renderer/**` | SongIR v0 | 内部对照页 |

整体关系可以简化成：

```text
公开站
  |
  +-- 目录/SEO/learn
  |     |
  |     v
  |   SongDoc + SEO profile
  |
  +-- 歌曲详情页
        |
        +-- React shell 控件
        |
        +-- runtime container
              |
              +-- 完整 runtime payload
              +-- 授权 JS/CSS/font/SVG
              +-- bridge 后处理

内部工具
  |
  +-- 导入/发布
  +-- runtime 对照
  +-- native renderer 试验
  +-- print/Pinterest 导出
```

### 4.6 当前脚本地图

`scripts/**` 体量不小，但大部分都有明确用途。后续整理时建议先按用途分组，再决定迁移/归档。

| 脚本组 | 代表命令/文件 | 用途 | 重构时处理建议 |
|--------|---------------|------|----------------|
| runtime 资产 | `sync:kuailepu-static`、`pack:kuailepu-runtime` | 同步授权静态资产、压缩 runtime JSON | 保留，等新引擎稳定后再缩小角色 |
| 快乐谱导入 | `search:kuailepu`、`import:kuailepu`、`compare:kuailepu-runtime` | 快乐谱歌曲搜索、导入、线上对照 | 保留为授权来源和回归 oracle |
| MusicXML 导入 | `prepare:song-ingest`、`ingest:song-candidate`、`generate:kuailepu-from-ingest` | XML/MXL 生成候选 runtime/SongDoc | 未来升级为 `OriginalScore` 入口 |
| 发布校验 | `doctor:song`、`doctor:song-ingest`、`preflight:kuailepu-publish` | 发布前检查 | 保留并逐步接入新模型校验 |
| 指法优化 | `optimize:runtime-fingerings`、`compare:runtime-fingerings` | runtime 指法候选审计和排序 | 后续迁移为 fingering registry/audit |
| native 分析 | `analyze:native-song-ir`、`check:native-renderer-regressions` | SongIR/native renderer 内部验证 | 作为新引擎测试基础继续扩展 |
| HC/语法分析 | `analyze:hc-parser-grammar` 等 | 理解快乐谱/HC 语法 | 保留到替代完成，作为旧语义证据 |
| 导出 | `export:print-pdf`、`export:pinterest-pin` | 生成打印/Pinterest 输出 | 现阶段仍依赖 runtime container |
| 增长/内容 | `validate:content`、`audit:learn-gsc` | SEO/learn/内容验证 | 与谱面引擎相对独立 |

### 4.7 当前验证体系

当前验证可以分成“内容正确”“runtime 可渲染”“发布可上线”“native 研究”四类。

| 命令 | 保护什么 | 什么时候用 |
|------|----------|------------|
| `npm run validate:content` | 公开内容、SEO、manifest 基本一致性 | 发布前、内容结构变更后 |
| `npm run validate:songbook` | 曲库/SongDoc 数据结构 | 导歌、发布、数据迁移后 |
| `npm run doctor:song -- <slug>` | 单首公开歌曲数据和页面条件 | 单首发布前 |
| `npm run doctor:song-ingest -- <slug>` | MusicXML 候选生成质量 | 候选进入人工审核前 |
| `npm run preflight:kuailepu-publish -- <slug>` | runtime 渲染、线上对照、发布前检查 | 正式发布前 |
| `npm run validate:kuailepu-runtime` | runtime payload 可用性 | runtime 数据批量变更后 |
| `npm run compare:kuailepu-runtime` | 与快乐谱线上/授权 runtime 对照 | 快乐谱来源歌曲或 runtime 变更后 |
| `npm run analyze:public-runtime-syntax-inventory` | 当前公开谱面语法覆盖 | native renderer 规划前 |
| `npm run analyze:native-runtime-song-ir` | runtime payload -> SongIR 覆盖率 | native renderer 研发阶段 |
| `npm run check:native-renderer-regressions` | native renderer 回归 | native 代码变更后 |
| `npm run build` | Next.js 构建、类型/路由集成 | 发布前或大改后 |
| `npm run test:e2e` | 端到端页面行为 | 重大交互/发布前抽查 |

注意：

```text
build 和 test:e2e 不要在同一工作区同时跑
因为两者都会读写 .next，可能制造假失败
```

## 5. 当前歌曲数据结构问题

### 5.1 当前数据受快乐谱格式影响

当前公开歌曲页的核心 runtime 数据来自快乐谱结构。快乐谱是简谱系统，所以它天然需要 `1=G`、`1=C` 这种基准音。

现状可以理解成：

```text
歌曲数据先被整理成快乐谱 runtime JSON
        |
        v
快乐谱 runtime 读取 keynote / notation / instrumentFingerings
        |
        v
渲染简谱 + 指法图
```

这对于从快乐谱导入的歌很自然，但对 MusicXML 不自然。

MusicXML 本身更像完整乐谱数据，天然包含：

| MusicXML 信息 | 当前转快乐谱时可能的问题 |
|---------------|--------------------------|
| 绝对音高 | 被转成简谱数字后依赖 `1=...` 解释 |
| 小节内部时间 | `backup` / `forward` / 多声部时容易丢失结构 |
| 声部 | 当前主旋律抽取可能压扁 |
| 休止 | 隐式休止可能被忽略 |
| 和弦 | 目前不是核心模型 |
| 反复/跳房子 | 当前已有部分处理，但还不够系统 |
| 调号/拍号 | 需要转成快乐谱字段 |

### 5.2 目标数据结构

我们讨论后的目标是：先存原版歌曲的旋律绝对音高，再给每个乐器存该歌为了适配该乐器应该移调的量。

已确认业务决策：

```text
OriginalScore 保存原曲原调作为基准真相
每个乐器的适配、移调、音域处理都放在对应 InstrumentEdition 中
```

建议升级成三层：

```text
OriginalScore
  保存原版旋律和结构，尽量接近 MusicXML 的真实音乐信息

InstrumentEdition
  保存某个乐器版本的移调、音域适配、指法系统、可演奏性

RenderView
  根据 OriginalScore + InstrumentEdition 生成字母谱、简谱、五线谱、指法图、播放高亮
```

更具体的关系：

```text
MusicXML / 快乐谱 JSON / 手工录入
        |
        v
OriginalScore  统一内部真相
        |
        +-------------------+
        |                   |
        v                   v
InstrumentEdition(o12)    InstrumentEdition(clarinet)
rangeTranspose=+5         rangeTranspose=-2
writtenTranspose=0        writtenTranspose=+2
        |                   |
        v                   v
RenderView              RenderView
字母谱/简谱/指法图       五线谱/字母谱/放大指法图
```

### 5.3 建议的核心字段

| 字段 | 含义 |
|------|------|
| `soundingMidi` | 实际发声音高，用于播放 |
| `writtenMidi` | 乐手在五线谱上看到的音高 |
| `fingeringMidi` | 查指法图时使用的音高 |
| `rangeTranspose` | 为适配乐器音域而整体移调的半音数 |
| `writtenTranspose` | 移调乐器的记谱偏移，例如 Bb 黑管 |
| `sourceKey` | 原始调性，仅作元数据 |
| `jianpuTonic` | 简谱显示时派生出的 `1=G`，不作为核心真相 |

对陶笛、竖笛、锡哨来说，`soundingMidi`、`writtenMidi`、`fingeringMidi` 往往相同。

对黑管、萨克斯这类移调乐器来说，它们可能不同。例如：

```text
实际听到 C4
Bb 黑管谱面可能写 D4
指法表查的是黑管自己的 D4 指法
```

这就是为什么未来不能只靠一个 `keynote` 字段。

通俗解释：

| 概念 | 含义 | 用在哪里 |
|------|------|----------|
| `soundingMidi` | 实际听到的音高 | 播放、和原曲旋律对齐 |
| `writtenMidi` | 乐手谱面上看到的音高 | 五线谱、部分字母谱显示 |
| `fingeringMidi` | 查指法图时用的音高 | 指法图、alternate fingering |

很多乐器看到什么音、吹出来什么音是一样的，例如长笛、陶笛、竖笛。这类可以先按 concert pitch 处理。

但黑管和萨克斯常见型号是移调乐器。比如 Bb 黑管：

```text
目标实际听到：C
Bb 黑管谱面写：D
演奏者按 D 的指法
乐器实际发声：C
```

所以“黑管/萨克斯五线谱默认显示 written pitch，播放用 sounding pitch”的意思是：

```text
用户看到的是这个乐器演奏者真正该读的谱
网站播放出来的是歌曲实际应该听到的旋律
指法图跟着用户看到/要按的那个 written pitch 走
```

这不是显示错音，而是移调乐器的正常记谱习惯。后续设计文档需要把每个型号的 offset 规则写清，并用样例歌验证。

### 5.4 当前数据对象对照

当前公开页至少同时使用两类“歌曲数据”，未来还会引入自有模型。它们不能混为一个东西。

| 数据对象 | 当前位置 | 当前用途 | 优点 | 问题 |
|----------|----------|----------|------|------|
| 公开 manifest | `data/songbook/public-song-manifest.json` | 决定哪些 slug 是公开曲库 | 轻、适合路由/列表 | 不含完整音乐结构 |
| SongDoc | `data/kuailepu/<slug>.json` | SEO、目录、英文展示、字母谱辅助 | 轻、可读、适合站点业务 | `notation: string[]` 仍是降维后的简谱格式 |
| runtime payload | `data/kuailepu-runtime/<slug>.json` | 授权 runtime 真正渲染所需完整上下文 | 线上稳定、覆盖快乐谱语义 | 体积大、格式受旧 runtime 约束 |
| packed runtime payload | `data/kuailepu-runtime-packed/<slug>.json.gz` | 生产构建优先读取的压缩版本 | 大幅减小仓库/部署读取压力 | 仍然是 runtime payload，只是压缩 |
| candidate draft | `reference/song-publish-candidates/drafts/<slug>.json` | MusicXML 导入中间稿 | 保留较多导入诊断 | 不是公开数据 |
| candidate runtime/songdoc | `reference/song-publish-candidates/runtime|songdocs/**` | 本地预览和审核 | 可调试、可审核 | 未批准前不能当公开发布 |
| SongIR v0 | `src/lib/native-renderer/songIr.ts` 运行时生成 | native renderer 内部试验 | 已有事件/小节/和弦/反复雏形 | 不是最终目标模型，缺多乐器/五线谱/指法大图 |
| 未来 OriginalScore | 暂无 | 保存原始音乐真相 | 更适合 MusicXML 和多轨 | 需要设计 |
| 未来 InstrumentEdition | 暂无 | 保存乐器移调/指法/记谱版本 | 解决多乐器音域问题 | 需要设计 |

当前手工统计到的体量级别：

| 目录 | 体量/数量 | 含义 |
|------|-----------|------|
| `data/kuailepu-runtime` | 约 739MB，约 471 个 JSON | 完整 runtime payload 很重 |
| `data/kuailepu-runtime-packed` | 约 14MB | 压缩后体积大幅下降 |
| `data/kuailepu` | 约 2.4MB，约 465 个 JSON | 轻量 SongDoc 很轻 |
| `public/k-static` | 约 4MB，73 个文件 | 授权 runtime 静态资产并不算最大头 |
| `reference` | 约 813MB | 本地候选、历史、对照材料，不能当公开包体看 |

这说明第一阶段性能优化的重点不是“盲删 `public/k-static` 文件”，而是：

```text
减少公开主链对 full-template 的依赖
压缩/重构 runtime payload 数据形态
把播放、节拍器、指法显示逐步迁到自有模块
最后再收缩 asset profile
```

### 5.5 导歌与发布状态流

当前 MusicXML 导入已经有比较完整的候选流：

```text
MusicXML / MXL
      |
      v
npm run ingest:song-candidate
      |
      +-- prepare-song-ingest
      |     |
      |     v
      |   reference/song-publish-candidates/drafts/<slug>.json
      |   reference/song-publish-candidates/source-sanity/<slug>.json
      |
      +-- generate-kuailepu-runtime-from-ingest
            |
            v
          reference/song-publish-candidates/runtime/<slug>.json
          reference/song-publish-candidates/songdocs/<slug>.json
          reference/song-publish-candidates/reports/<slug>-report.json
      |
      v
doctor:song-ingest + external review
      |
      v
npm run publish:song-ingest-candidate
      |
      v
data/kuailepu-runtime/<slug>.json
data/kuailepu/<slug>.json
data/songbook/public-song-manifest.json
data/songbook/song-seo-profiles.json
```

这里有一个重要边界：

| 状态 | 数据位置 | 是否公开 |
|------|----------|----------|
| 上游语料 | `private/openewld/dataset/**` | 否 |
| 本地候选 | `reference/song-publish-candidates/**` | 否 |
| 本地预览 | dev routes 可读候选 runtime | 否 |
| 发布数据 | `data/**` | 是 |

未来重构时，MusicXML 入口应优先生成 `OriginalScore`，再从 `OriginalScore + InstrumentEdition` 派生：

```text
OriginalScore
  |
  +-- SongDoc / SEO fields
  +-- native renderer input
  +-- Kuailepu compatibility payload
  +-- print/Pinterest export data
```

### 5.6 MusicXML 当前主要损失点

当前 MusicXML 解析已经读取了不少结构信息：

| 已读取信息 | 当前用途 |
|------------|----------|
| part / voice | 选择主旋律 |
| measure offset/duration | 生成小节内事件 |
| backup / forward | 仅用于 timing，仍提示人工确认 |
| lyric syllable | 生成 aligned/display lyrics |
| harmony | 记录和弦名，当前不作为公开核心 |
| grace note | 记录为 source metadata，可选择写入 payload metadata |
| repeat/section 相关语义 | 部分通过 runtime/native 分析识别 |

主要损失发生在“为了兼容快乐谱 runtime，把结构压成 Happy123/Kuailepu notation 字符串”的步骤：

```text
MusicXML 结构化时间线
        |
        v
主旋律抽取 + 小节归一化
        |
        v
Happy123/Kuailepu notation 字符串
        |
        v
runtime payload
```

典型问题：

| 问题 | 原因 | 未来方向 |
|------|------|----------|
| 小节线位置偶尔不准 | 多声部、backup/forward、隐式休止被压扁 | 保留 measure timeline 和 explicit rest |
| 装饰音被省略 | 当前 runtime 输出只保留 source metadata | `OriginalScore` 保留 ornament，再按 renderer 能力决定展示 |
| 和弦不进入公开核心 | 当前公开乐器以单音为主 | 为吉他阶段预留 chord/harmony track |
| 歌词槽位需要人工查 | syllable 与音符对齐容易受 tie/延音影响 | 保存 note/lyric alignment，而不是只保存字符串 |
| 乐器移调只落到一个 keynote | 当前 public 是一首歌一个 published key | 未来拆成 per-instrument edition |

### 5.7 乐器版本 URL 与数据身份

已确认方向：

```text
未来有必要给不同乐器独立 URL
但黑管、萨克斯内部的具体型号不单独分页面
型号在对应乐器页面内作为可切换选项
```

推荐把数据身份分成三层：

| 层级 | 含义 | 示例 | 是否独立 URL |
|------|------|------|--------------|
| Song | 原曲身份 | Amazing Grace | 是 |
| InstrumentPage / InstrumentEdition | 某首歌的某个乐器版本 | Amazing Grace for Clarinet | 是 |
| InstrumentVariant | 乐器页面里的型号/调性 | Bb Clarinet、A Clarinet、Alto Sax | 否 |

推荐 URL 形态：

```text
/song/<slug>                     兼容旧入口，默认乐器页或总入口
/song/<slug>/<instrument-slug>   新的乐器独立页面
```

例子：

```text
/song/amazing-grace
/song/amazing-grace/ocarina
/song/amazing-grace/flute
/song/amazing-grace/clarinet
/song/amazing-grace/saxophone
/song/amazing-grace/guitar
```

页面内型号切换不做独立 SEO 页面：

```text
/song/amazing-grace/clarinet
  selector: Bb clarinet / A clarinet / Eb clarinet

/song/amazing-grace/saxophone
  selector: Alto sax / Tenor sax / Soprano sax / Baritone sax
```

为什么推荐独立乐器 URL：

| 维度 | 继续只用 query | 独立乐器 URL |
|------|----------------|--------------|
| SEO | Google 容易把它当同一页不同状态 | 每个乐器有明确搜索落地页 |
| 分享 | URL 可分享但语义弱 | 链接天然表达“这首歌的黑管谱” |
| 收藏 | 后端要从 query 解析收藏对象 | 收藏对象可以直接是 InstrumentEdition |
| 页面标题 | 一个页面很难同时服务所有乐器关键词 | 每页标题、FAQ、内链可针对乐器 |
| 未来付费 | 解锁边界不清楚 | 可按乐器版本、PDF、功能定权限 |
| 迁移成本 | 当前最省事 | 需要路由和 canonical 策略 |

建议分阶段迁移：

| 阶段 | 做法 | 目的 |
|------|------|------|
| 第一阶段 | 保留 `/song/<slug>` 和 query 参数，不破坏现有页面 | 保持现有 SEO 和分享链接稳定 |
| 第二阶段 | 新增 `/song/<slug>/<instrument-slug>` 内部预览 | 验证乐器页模型和渲染 |
| 第三阶段 | query 版本 canonical 或 redirect 到独立 URL | 避免重复页面 |
| 第四阶段 | 为新乐器优先公开独立 URL | 黑管、长笛、萨克斯天然需要专属体验 |
| 第五阶段 | 决定是否把现有 o12/o6/recorder/whistle 也迁到独立 URL | 全站统一 |

关键设计原则：

```text
乐器是页面级身份
型号是页面内选项
用户设置是 query/local state
```

注意：黑管/萨克斯的型号选择不只是“换一张指法图”这么简单。因为型号可能改变 written pitch 与 sounding pitch 的关系，所以同一个乐器页面内切型号时，至少需要重新计算：

| 变化 | 说明 |
|------|------|
| 五线谱 written pitch | 演奏者实际要看的谱面音高 |
| 指法图查表音高 | 当前型号下该按哪个 written note |
| 播放 sounding pitch | 网站播放仍要保持目标旋律 |
| 音域适配提示 | 不同型号可演奏范围可能不同 |

但这不意味着要给每个型号单独做页面。型号适合作为页面内选择项。

## 6. `1=G` 在未来模型中的位置

当前快乐谱必须有 `1=G`，因为简谱数字 `1 2 3 4 5 6 7` 必须知道 `1` 是哪个实际音。

未来模型里，`1=G` 应该这样产生：

```text
OriginalScore 原始绝对音高
        |
        | 加上某乐器 rangeTranspose
        v
当前乐器版本的实际音高
        |
        | 选择一个简谱显示基准
        v
派生出 1=G / 1=C / 1=F
```

所以：

| 问题 | 当前快乐谱模型 | 未来模型 |
|------|----------------|----------|
| 歌曲本体是否必须有 `1=G` | 是 | 否 |
| 简谱显示是否还需要 `1=G` | 是 | 是，但派生 |
| 为不同乐器移调是否应该独立存储 | 不自然 | 是 |
| MusicXML 是否需要先压成快乐谱格式 | 当前需要 | 未来不应该需要 |

## 7. 快乐谱 runtime 与旧代码现状

### 7.1 当前实际使用的 HC 版本

当前公开 runtime 模板实际使用：

```text
cdn/js/dist/hc.min_1cfae5fe62.js
```

仓库中还有其它版本，例如：

```text
hc.min_02d898293e.js
hc.min_1fefdac49d.js
```

这些目前主要用于历史参考、本地分析或 fallback 查找，不应理解为公开页同时加载了三个 HC。

### 7.2 历史 HC 资料

`reference/hc-history-investigation/2026-04-02/**` 中已有大量历史文件和分析材料，包括：

| 文件/目录 | 价值 |
|-----------|------|
| `files/20240727-hc_b2867c4f28.js` | 较易读的历史 HC 文件 |
| `files/20240727-hc.kit_1ef1a6fd8b.js` | 历史 HC kit 支撑代码 |
| `live-files/hc_*.js` | 线上历史版本 |
| `live-files/hc.kit_*.js` | 线上历史 kit |
| `hc-engine-structure-map.md` | 引擎结构分析 |
| `hc-module-evidence-matrix.md` | 模块证据矩阵 |
| `combined-summary-for-coding-ai.md` | 给 AI/开发者的综合摘要 |

这意味着后续理解 HC 时，不必只盯着当前压缩版。可以用历史文件恢复变量含义、模块边界和实现思路。

### 7.3 是否应该拆 HC

建议不是简单二选一。

| 方案 | 评价 |
|------|------|
| 继续整体黑盒使用 | 短期稳，但长期扩展差 |
| 直接机械拆当前 `hc.min` | 风险高，压缩变量和初始化顺序难保证 |
| 参考历史 HC，理解并吸收模块 | 推荐 |
| 适合现代架构的旧模块直接复用 | 可以 |
| 不适合 React/Next 的全局/jQuery/整页逻辑替换 | 推荐 |
| 完全从零重写且不参考旧代码 | 不推荐，浪费已有稳定经验 |

推荐策略：

```text
历史 HC / 结构文档 -> 理解旧能力
当前 hc.min -> 当正确性 oracle
新 TypeScript 模块 -> 吸收后重建
```

## 8. 快乐谱多余代码在哪里

当前公开站不需要快乐谱整页那么多代码。多余代码不全在 HC 里，而是分布在多个地方。

| 位置 | 内容 | 当前公开站是否需要 |
|------|------|--------------------|
| `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt` | 原详情页 HTML、header、footer、菜单、评论、媒体、tag、modal | 大部分不需要 |
| `public/k-static/lib/jqueryui/**` | jQuery UI | 只在完整旧模板中需要 |
| `public/k-static/lib/materialize/**` | Materialize modal/select/UI | 当前公开壳应由 React 接管 |
| `public/k-static/lib/soundmanager2/**` | 旧播放 UI | 未来播放应由 React 和统一 timeline 接管 |
| `public/k-static/lib/art-template/**` | 旧模板引擎 | 不应成为新功能依赖 |
| `public/k-static/lib/clipboard.js/**` | 旧复制功能 | 公开主链不需要 |
| `public/k-static/cdn/js/microphone_*.js` | 麦克风 | 当前公开主链不需要 |
| `public/k-static/cdn/js/user_favorite*.js` | 旧收藏/登录相关 | 未来应走自有后端 |
| `public/k-static/cdn/js/media_*.js` | 旧媒体模块 | 当前公开主链不需要 |
| `public/k-static/cdn/js/chip_tag*.js` | 旧标签 UI | 当前公开主链不需要 |
| `public/k-static/cdn/js/i18n/all_*.js` | 大量旧产品多语言文案 | 大部分不需要 |
| `public/k-static/cdn/js/song_1f2ad3c3ba.js` | 旧页面控制器，包含菜单、设置、重绘、播放、节拍器等 | 部分能力仍被 runtime 路径依赖 |
| `public/k-static/cdn/js/dist/hc.min_1cfae5fe62.js` | 核心解析、布局、渲染、指法、MIDI 等 | 当前仍是核心 |

当前已经有一个资产 profile 概念：

| Profile | 用途 |
|---------|------|
| `public-song` | 只读谱面，已移除一批旧脚本 |
| `full-template` | compare、debug、恢复路径，以及 playback/metronome 等完整旧链路 |

后续瘦身不应该先删文件，而应该逐步替换能力：

```text
某功能由自有模块接管
        |
        v
确认 runtime 不再需要旧脚本
        |
        v
调整 asset profile
        |
        v
保留 vendor 恢复路径直到彻底迁移完成
```

当前资产 profile 的关键结论：

| 场景 | profile | 当前结果 |
|------|---------|----------|
| 只读谱面 | `public-song` | 会移除 jQuery UI、Materialize、旧播放、旧收藏、旧媒体等一批脚本，并注入兼容 stub |
| 播放/节拍器 | `full-template` | 仍加载完整授权模板脚本链，保证旧播放/节拍器稳定 |
| compare/debug | `full-template` | 保留最大兼容性，避免把瘦身问题误判成谱面问题 |

所以当前公开歌曲页虽然已经有 `public-song` 瘦身能力，但因为详情页会启用 playback feature，实际经常会回到 `full-template`。

这给出一个明确优化顺序：

```text
1. React shell 接管播放 UI
2. React shell 接管节拍器 UI
3. 自有 timeline 负责播放/高亮
4. runtime 只负责只读谱面或 fallback
5. public-song profile 成为公开详情页默认路径
6. 再清理不再需要的旧静态资产
```

## 9. 当前黑盒补丁问题

当前公开功能区仍有一些 iframe/黑盒时代留下的结构问题。

| 当前现象 | 根因 | 目标 |
|----------|------|------|
| 切换乐器或指法图会触发谱面整体刷新 | 状态必须塞回 runtime context 重新 draw | native 支持后只更新乐器 edition、指法轨道或 focus panel |
| 打开节拍器会影响 runtime container | 旧节拍器 modal 在快乐谱页面内部 | 节拍器由 React shell 拥有 |
| Listen 播放面板出现在谱面 container 中 | 旧播放 UI 属于快乐谱页面 | 播放面板由 React shell 拥有 |
| 字母谱是 SVG 后处理替换 | 快乐谱原生输出数字谱 | 自有 renderer 直接输出字母/数字/五线谱轨道 |
| 控件变化常靠 URL/query/remount 保守实现 | 黑盒 runtime 稳定性优先 | native 支持后改为本地状态驱动和局部更新 |

当前控制状态大致这样流动：

```text
用户点功能区
    |
    v
PublicRuntimeInteractiveShell 归一化 query state
    |
    v
buildPublicRuntimeUrl / fetchRuntimeHtmlContainerPackage
    |
    v
/api/kuailepu-runtime/<slug>?instrument=...&show_graph=...
    |
    v
服务端重新组 runtime HTML/package
    |
    v
ContainerRuntimeHost 替换 bodyHtml / 重载脚本
    |
    v
授权 runtime 重 draw
```

这条链路稳定但重。它适合黑盒 runtime，不适合未来的自有 React/Next 架构。

目标控制状态应该变成：

```text
用户点功能区
    |
    v
React 本地 score state
    |
    +-- instrumentEdition 改变
    +-- visibleTracks 改变
    +-- fingeringFocus 改变
    +-- playbackTimeline 状态改变
    |
    v
局部更新对应轨道/面板
```

这里需要区分两类操作：

| 操作 | 当前是否可能整谱刷新 | 未来理想行为 |
|------|----------------------|--------------|
| 切换乐器 | 是 | 切换 InstrumentEdition，必要时重算指法轨/音域提示 |
| 切换指法图方向 | 是 | 只更新指法图渲染参数 |
| 显示/隐藏歌词 | 是 | 只切 lyric track |
| 显示/隐藏小节号 | 是 | 只切 layout decoration |
| 调整谱面缩放 | 是 | CSS/layout scale 局部更新 |
| 开节拍器 | 可能影响 container | React shell 独立节拍器 |
| Listen | runtime 面板在 container 内 | React shell 播放面板 + timeline |
| 字母/数字切换 | SVG 后处理 | renderer 直接输出对应 track |

目标结构：

```text
React Page
  |
  +-- Function Zone
  |     +-- Instrument selector
  |     +-- Fingering selector
  |     +-- Staff / letter / jianpu view toggles
  |     +-- Playback controls
  |     +-- Metronome controls
  |
  +-- Score Renderer
  |     +-- staff track
  |     +-- letter / jianpu track
  |     +-- fingering anchor track
  |     +-- lyric track
  |
  +-- Fingering Focus Panel
  |     +-- current note large diagram
  |     +-- previous / next note
  |     +-- alternate fingerings
  |
  +-- Playback Timeline
        +-- drives note highlight
        +-- drives focus panel
        +-- drives metronome alignment
```

### 9.1 当前仍残留的隔离 runtime 架构

iframe DOM 已经移除，但当前公开页仍保留了大量“隔离 runtime 小页面”的架构假设。这里说的旧架构不是指页面里还有 iframe，而是指状态更新方式仍然像 iframe 时代一样：通过 URL/query 重新生成一份 runtime 文档，再让宿主重新加载它。

当前可以把问题拆成三层：

| 层级 | 当前状态 | 判断 |
|------|----------|------|
| 宿主形态 | iframe 已删除，runtime 挂在 React-owned container | 已完成第一层迁移 |
| 状态模型 | 功能区状态仍主要进入 runtime query/context | 仍是旧隔离模型 |
| 能力所有权 | 播放、节拍器、渲染、指法仍大量依赖授权 runtime / hc | 仍是黑盒能力复用阶段 |

当前关键证据：

| 文件 / 模块 | 大致职责 | 架构含义 |
|-------------|----------|----------|
| `src/components/song/public-runtime-shell/PublicRuntimeInteractiveShell.tsx` | 功能区状态、URL/query、runtime package fetch、host session、播放状态 | shell 仍承担过多“runtime 小页面协调器”职责 |
| `src/components/song/runtime-host/ContainerRuntimeHost.tsx` | 挂载 runtime body、注入样式和脚本、显示 loading | 运行时仍被当作一份可重建文档 |
| `src/components/song/runtime-host/RuntimeScriptLoader.tsx` | 顺序加载旧脚本、bootstrap、触发 `Kit.context.triggerLoad` | 旧全局初始化链仍是主路径 |
| `src/lib/runtime-core/client/containerBootstrap.ts` | 保护 `triggerLoad` 幂等、清理旧 modal/overlay | 这是修二重奏等问题的补丁层 |
| `src/lib/runtime-core/bridge/playback/publicRuntimePlaybackBridge.ts` | 观察和控制旧播放面板 / 播放状态 | 播放 UI 和状态仍依赖 runtime 内部结构 |
| `src/lib/runtime-core/bridge/metronome/publicRuntimeMetronomeBridge.ts` | 控制旧节拍器入口 | 节拍器仍未完全归 React shell |
| `src/lib/runtime-core/bridge/svg/publicRuntimeSvgBridge.ts` | SVG 后处理、字母谱/视觉主题/属性修正 | 当前 visual/letter 是渲染后补丁，不是 renderer 原生输出 |
| `src/lib/runtime-core/server/assets/publicRuntimeAssets.ts` | `public-song` / `full-template` profile 与兼容 stub | 资产瘦身仍通过“保留旧链 + 打 stub”实现 |
| `src/components/song/runtime-host/useRuntimeContainerMeasurement.ts` | 监听高度、SVG 输出和 loading 状态 | 仍需要适配旧 runtime 异步绘制和 DOM 高度 |

这些代码不应简单判定为“坏代码”。它们是去 iframe 过程中为了保持公开站稳定而建立的兼容层。但从长期架构看，它们应该逐步收口，而不是继续在其上叠更多产品功能。

当前多重 loading、功能区操作刷新 container、Listen 首次可能切 full-template、二重奏幂等保护，都属于这一类旧隔离模型的症状。

### 9.2 本轮架构升级目标

本轮目标不是立刻重写 HC / native renderer，而是先完成“去 iframe 思维”的中间层升级。

核心目标：

```text
从：
  query/context -> 重新 fetch runtime package -> 重挂 container -> 旧 runtime 重 draw

升级为：
  React shell score state -> host command / local state update -> 必要时 runtime 局部 redraw
```

本轮完成后，理想状态是：

| 目标 | 说明 |
|------|------|
| loading 状态统一 | 不再出现外层文字 loading、内层卡片、播放 loading 互相割裂 |
| 轻量设置不重建 container | zoom、显示/隐藏歌词、小节号、指法图显示、视觉参数优先局部更新 |
| shell 状态与 runtime package 状态分离 | URL 仍可分享，但 UI 状态变化不必总是变成 package fetch |
| host command 协议更明确 | 不再只支持 playback/redraw，而是逐步支持 display setting / score setting |
| 播放和节拍器迁出 container | 先做 shell UI 所有权，再逐步迁 timeline / audio |
| full-template 依赖下降 | 默认公开读谱尽量长期停留在 `public-song` profile |
| 为 native renderer 铺路 | 后续 native renderer 可以接入同一套 shell state / timeline / focus panel |

这轮升级完成后，不代表已经摆脱授权 runtime。它代表我们不再用“重建一个 runtime 小页面”的方式处理所有交互。

### 9.3 本轮不做什么

为了控制风险，本轮不应和下面工作混在一起：

| 暂不纳入 | 原因 |
|----------|------|
| 重写 `Song.draw()` / `hc.parse` / SVG renderer | 这是 native renderer 阶段，不应和 host 状态收口混做 |
| 改变公开谱面正确性基线 | `note_label_mode=number` compare 仍是授权 runtime baseline |
| 新增复杂乐器公开入口 | 先把宿主和状态模型理顺，再扩乐器 |
| 一次性删除 `full-template` | 播放/节拍器未迁出前需要保留 |
| 删除 vendor / public/k-static 资产 | 应通过 asset profile 和替代能力逐步收缩 |
| 改歌曲数据主模型 | `OriginalScore` 是下一阶段设计，不应阻塞本轮宿主收口 |

### 9.4 当前旧补丁清单

| 旧补丁 / 旧架构点 | 当前表现 | 建议处理 | 风险 |
|-------------------|----------|----------|------|
| 外层 package loading | 客户端 fetch runtime package 时显示纯文字 `Loading sheet...` | 抽统一 `SheetLoadingCard`，外层/内层共用 | 低 |
| `runtimeHostSessionKey` 包含完整 query | 任意 runtimeQueryString 变化都会 remount host | 拆分“需重建”和“可命令更新”的状态 | 中 |
| 功能区 select/toggle 全生成 `href` | 选择 zoom/布局/显示项会走 URL 状态并触发 package fetch | 保留 URL 同步，但先尝试本地 apply，再按需 fallback 重建 | 中 |
| `public_feature=playback` 改变 package | 首次 Listen 从只读 runtime 切完整 runtime | 播放 UI 先归 shell；后续按需加载 audio/timeline，而非重建谱面 | 高 |
| metronome 通过 runtime feature | 打开节拍器可能切 package / 影响 container | React shell 节拍器先独立，runtime 只提供 tempo/grid fallback | 中高 |
| `triggerLoad` 幂等 guard | 防止刷新或脚本竞态导致二重奏 | 短期保留；播放自有化后弱化 | 中 |
| runtime modal / overlay 清理 | dispose 时清旧播放/节拍器/Materialize 节点 | 播放/节拍器 shell 化后减少需要清理的对象 | 中 |
| SVG letter / visual 后处理 | 运行后改 SVG 文本和样式 | 短期保留；native renderer 输出原生轨道后替代 | 中高 |
| 高度 measurement 轮询/观察 | 等旧 runtime 异步出 SVG 后再调容器高度 | 短期保留；自有 renderer 后变普通布局 | 中 |
| asset compatibility stub | `public-song` profile 删除旧脚本后补 API/stub | 替代能力越多，stub 越少 | 中 |
| `runtime_host=iframe` 兼容信号 | 查询参数仍接受但渲染 container | 继续保留诊断兼容，不恢复 iframe | 低 |

### 9.5 建议执行顺序

这条工作线建议命名为：

```text
Runtime Interaction Ownership Upgrade
中文：运行时交互所有权迁移 / 去 iframe 思维收口
```

建议分 6 个小阶段，每个阶段都能独立验证和回滚。

这一轮不是 loading 视觉打磨轮，也不是把两层 loading 强行做成同款卡片的轮子。
本轮的判断标准是：

- 不再闪纯文字 loading
- 不再因为同一个交互意图产生多次 package remount
- loading 的语义边界清楚
- 视觉可以先不完全统一，等状态模型收口后再收边

当前决策：

- 先回退掉本轮 loading 视觉统一尝试
- 暂时允许外层 package loading 和内层 container loading 保持各自原样
- 等阶段 A/B/C 推进后，再决定是否只保留一套 loading 状态和一套 loading 视觉

### 9.5.0 执行台账

这个表是活文档。每完成一个小阶段，就更新一次状态和备注。

| 阶段 | 状态 | 当前判定 | 文档更新动作 |
|------|------|----------|--------------|
| A | 暂停推进 | loading / fetch baseline 已记录；loading 视觉统一不再作为当前硬目标，等待 B/C/D 后自然收敛 | 后续只在状态模型收口后再更新 loading 策略 |
| B | 基本完成 | shell 第一轮收口已完成：package request、host/session、display settings/selects/toggles、setting navigation、playback controls 已迁出 | 人工验收通过后进入阶段 C |
| C | 进行中 | Zoom / sheet scale 已改成 runtime display command，不再 fetch package / remount container | 继续处理 measure numbers、lyrics、fingering chart 显隐 |
| D | 待做 | 中等设置 redraw 未开始 | 完成后记录哪些设置仍会 remount |
| E | 待做 | 播放 / 节拍器所有权迁移未完成 | 完成后记录 UI 归属和 fallback 行为 |
| F | 待做 | 与 native / 新数据模型衔接未开始 | 完成后记录 adapter 接口与复用方式 |

#### 9.5.1 阶段 A：加载与状态基线收口

目标：

- 统一外层 package loading 与内层 container loading 的状态语义。
- 明确 runtime loading / package loading / playback loading 三者的状态边界。
- 给当前主要操作记录“是否触发 package fetch / host remount”的基线。

产物：

- `SheetLoadingCard` 或同等统一组件。
- 一份 runtime interaction baseline 表。
- 可选：开发环境 console/debug 标记 runtime package fetch 原因。

验收：

| 验收项 | 标准 |
|--------|------|
| 首屏加载 | 不再先闪纯文字 `Loading sheet...` |
| 控件操作 | 能明确知道哪个操作触发了 package fetch |
| 回归 | 谱面默认加载、Listen、Metronome 不变 |
| 视觉要求 | 这轮暂不追求两层 loading 同款；先按各自原样保留 |
| 人工验收 | 打开 song 页时不再先闪孤立文字（外层 package loading 已恢复原始文字态） |
| 人工验收 | 切换会触发 package fetch 的操作时，能在开发工具里看到对应 baseline 事件 |
| 人工验收 | listen / metronome 行为不因为 baseline 记录而变慢或失真 |

后续规划说明：

| 问题 | 当前判断 |
|------|----------|
| 架构升级完成后是否可以只剩一套状态 | 可以，而且应该。等 score intent、display settings、playback intent 收口后，loading 也会自然只剩一个主语义。 |
| 是否现在就统一 loading | 不建议。现在统一只会把两个未完成状态模型包成一个更复杂的外壳。 |
| 什么时候收敛 loading | 等阶段 B/C/D 至少推进到“轻量设置不重建 container、中等设置 redraw”之后再做。 |

#### 9.5.2 阶段 B：拆分 public shell 状态机

目标：

- 从 `PublicRuntimeInteractiveShell.tsx` 拆出 runtime package 状态、score setting 状态、playback 状态。
- 不改变用户行为，只让职责清晰。
- 为后续“本地 apply 或 fallback remount”提供状态边界。

当前进度：

- `runtime package` 请求逻辑已迁移到 `useRuntimePackageRequest.ts`
- `host ready / controller` 生命周期已迁移到 `useRuntimeHostSession.ts`，并保留 runtime ready 后补发 pending Listen 命令、全局错误监控、fallback timeout 清理
- `activeInstrument`、query 归一化、runtime query string、session key、功能区 `selects/toggles` 已迁移到 `useRuntimeDisplaySettings.ts`
- URL 替换、query apply、`SONG_PAGE_LINK_STATE_EVENT` 广播已迁移到 `useRuntimeSettingNavigation.ts`
- Listen action、播放消息订阅、旧 runtime playback command 发送、播放面板关闭监听已迁移到 `useRuntimePlaybackControls.ts`
- 修复了“旧 Metronome 已启动时再点 Listen 触发 runtime 重挂，遗留 `setInterval(Metronome.update)` 报 `tick` undefined”的生命周期问题：metronome bridge 记录 interval，runtime loader 卸载前先停止并清理
- `PublicRuntimeInteractiveShell.tsx` 现在主要保留页面装配、播放 loading 进度、监控事件和 toolbar/container 组合
- 本阶段已通过 `npm run typecheck -- --pretty false`

下一步：

- 先人工验收阶段 B：默认加载、功能区 URL 同步、Listen 首次打开/停止/再次打开、播放面板关闭、Metronome 开关
- 验收通过后进入阶段 C 的轻量显示项“不重建 container”试点

建议模块：

```text
src/components/song/public-runtime-shell/useRuntimePackageRequest.ts
src/components/song/public-runtime-shell/useRuntimeHostSession.ts
src/components/song/public-runtime-shell/useRuntimeDisplaySettings.ts
src/components/song/public-runtime-shell/useRuntimeSettingNavigation.ts
```

验收：

| 验收项 | 标准 |
|--------|------|
| 文件职责 | shell 主组件明显变薄 |
| URL 同步 | 现有分享 URL 和 query 行为不变 |
| 功能 | 乐器、指法、note mode、layout、zoom、lyrics、Listen、Metronome 均可用 |

#### 9.5.3 阶段 C：轻量显示项不重建 container

优先处理不改变音乐数据和指法系统的设置。

当前进度：

- 已新增 `vtabs-runtime-display-setting` command。
- 已新增 `useRuntimeDisplaySettingCommands.ts`，React shell 负责把当前轻量显示设置发给 runtime。
- `sheet_scale` 已从 runtime package query 中移除：URL 仍保留 `sheet_scale`，但不再因此请求 `/api/kuailepu-runtime/...` 或重挂 `ContainerRuntimeHost`。
- runtime bridge 收到 `sheetScale` 后调用授权 runtime 的 `Song.scaleSheet()`，只重 draw 谱面 SVG，不重新加载脚本。
- 已验证：`happy-birthday-to-you` 打开 More Tools 后切 Zoom 到 120%，URL 同步为 `?sheet_scale=12`，没有新的 runtime API 请求，谱面高度从约 533px 变为约 779px。

候选顺序：

| 设置 | 目标方式 | 备注 |
|------|----------|------|
| Zoom / sheet scale | CSS 或 runtime command 局部更新 | 优先级最高，用户感知明显 |
| show measure numbers | SVG / DOM 层显示切换或 redraw command | 不应重新加载脚本 |
| lyrics on/off | 轨道显隐或 redraw command | 注意无歌词歌曲 |
| fingering chart on/off | 图谱层显隐 | 不改具体指法数据 |
| visual theme on/off | 复用现有 SVG bridge apply，不 remount | 当前已有后处理基础 |

建议新增命令类型：

```text
PUBLIC_RUNTIME_DISPLAY_SETTING_MESSAGE
```

命令数据只传稳定、可序列化字段：

```text
{
  type: 'vtabs-runtime-display-setting',
  songId,
  settings: {
    sheetScale,
    showLyric,
    showMeasureNum,
    showGraph,
    visualTheme
  }
}
```

验收：

| 验收项 | 标准 |
|--------|------|
| 无 package fetch | 上述设置变化不请求新的 `/api/kuailepu-runtime/...` |
| 无 host remount | `ContainerRuntimeHost` 不因这些设置换 key |
| URL 保留 | 地址栏仍能反映用户选择，刷新后可恢复 |
| 视觉正确 | 谱面不闪白、不回到顶部、不丢播放状态 |

#### 9.5.4 阶段 D：中等设置降级为 redraw，不重载脚本

处理会影响 runtime context 但理论上不需要重新加载全部脚本的设置。

候选：

| 设置 | 目标方式 | 风险 |
|------|----------|------|
| fingering key / fingering_index | 更新 runtime context 后 `Song.draw()` / redraw | 指法图正确性需重点测 |
| chart direction / show_graph 具体方向 | 更新图谱参数后 redraw | 中 |
| note label letter/number | 重新应用 letter track / SVG transform | 中高 |
| layout compact/mono | runtime redraw 或 layout command | 中高 |

这阶段可以接受“重 draw SVG”，但目标是不重新 fetch package、不重新加载脚本、不重建 container。

验收：

| 验收项 | 标准 |
|--------|------|
| 不重载脚本 | `/k-static` runtime 脚本不重新执行 |
| 可重 draw | SVG 可以重绘，但 loading 不应回到 package loading |
| 指法正确 | o12/o6/r8b/r8g/w6 抽样无错图 |
| letter/number | 切换后文本、highlight、播放状态不乱 |

#### 9.5.5 阶段 E：播放与节拍器所有权迁移

目标：

- Listen 面板归 React shell，不再显示在 runtime container 内。
- Metronome UI 归 React shell。
- 首次 Listen 不以“重建 full-template runtime package”为唯一方案。
- 保留旧 runtime 播放能力作为 fallback，直到自有 timeline/audio 稳定。

建议拆成两步：

| 子阶段 | 内容 |
|--------|------|
| E1 | React shell 接管 UI，底层仍调用旧 runtime 播放/节拍器命令 |
| E2 | 自有 playback timeline / metronome grid 接管底层，旧 runtime 播放只做 fallback |

验收：

| 验收项 | 标准 |
|--------|------|
| Listen 面板位置 | 不再进入谱面 container |
| 节拍器位置 | 不再依赖 runtime modal |
| 二重奏风险 | 多次刷新/Listen/Stop/Continue 不出现重复播放 |
| 资产 profile | 默认读谱长期保持 `public-song`，只有 fallback 才进 `full-template` |

#### 9.5.6 阶段 F：与 native / 新数据模型衔接

这不是本轮立即实现的代码，而是本轮完成后的接口衔接。

目标：

- shell state、display setting、playback timeline、fingering focus panel 都能被 native renderer 复用。
- 授权 runtime fallback 和 native renderer 使用同一组用户意图状态。
- 未来 `OriginalScore` / `InstrumentEdition` 接入时，不需要再次重写功能区。

目标结构：

```text
Public Song Shell
  |
  +-- scoreIntentState
  |     +-- instrumentEditionId
  |     +-- visibleTracks
  |     +-- displaySettings
  |     +-- playbackIntent
  |
  +-- renderer adapter
        +-- authorized-runtime adapter
        +-- native-renderer adapter
```

验收：

| 验收项 | 标准 |
|--------|------|
| renderer 可替换 | shell 不直接依赖 runtime DOM 细节 |
| native 可复用 | native preview 能复用功能区状态模型 |
| fallback 清楚 | 不支持 native 的歌能显式走 authorized runtime |

## 10. 复杂乐器的目标体验

黑管、长笛、萨克斯的指法图比陶笛复杂，不能继续把详细图塞进每个音符下面的小格子。

推荐交互：

```text
桌面端
┌──────────────────────────────────────────────────────────────┐
│ Song title / controls                                         │
├──────────────────────────────────────────────┬───────────────┤
│ Score                                        │ Fingering     │
│                                              │ Focus Panel   │
│  staff:     ♩ ♫ ♩                            │               │
│  letters:   C  D  E                          │  Large SVG    │
│  anchors:   ●  ●  ●                          │  current note │
│  lyrics:    ...                              │  alternatives │
│                                              │               │
└──────────────────────────────────────────────┴───────────────┘
```

```text
移动端
┌──────────────────────────────┐
│ Compact controls             │
├──────────────────────────────┤
│ Score tracks                  │
│ staff / letters / anchors     │
│ lyrics                        │
├──────────────────────────────┤
│ Sticky current fingering      │
│ large SVG + current note      │
└──────────────────────────────┘
```

播放或点击音符时：

```text
当前音符高亮
        |
        +-- 字母/五线谱/简谱轨道同步高亮
        |
        +-- 指法锚点高亮
        |
        +-- 大指法图切换到当前音
        |
        +-- 播放 timeline 推进
```

## 11. 未来吉他与和弦

吉他应后推，因为它不是简单“单音 + 指法图”的问题。

吉他至少可能需要：

| 能力 | 说明 |
|------|------|
| 六线谱 | 与五线谱/字母谱不同的渲染轨道 |
| 和弦 | 需要和弦名、和弦图、节奏型 |
| 把位 | 同一个音有多种弦/品位置 |
| 指法 | 左手按弦、右手拨弦可能都要建模 |
| 编配版本 | 吉他版可能不是简单旋律移调 |

所以第一阶段不建议被吉他牵制。数据模型可以预留和弦/多轨能力，但实现优先黑管、长笛、萨克斯。

## 12. 五线谱目标

五线谱不是只展示图片，而应作为一条可播放、可高亮、可导出的谱面轨道。

目标：

```text
同一个 Score Timeline
        |
        +-- staff track
        +-- letter track
        +-- jianpu track
        +-- fingering track
        +-- lyric track
        +-- playback audio
        +-- metronome alignment
```

五线谱 renderer 的候选：

| 方案 | 优点 | 风险 |
|------|------|------|
| VexFlow | 成熟、灵活、适合自定义 | 需要自己处理较多布局和交互 |
| OSMD | MusicXML 支持强 | 定制复杂，包体和控制成本要评估 |
| ABCJS | 仓库已有历史试验 | 旧实验有错位问题，不应默认接回主链 |
| 自研 SVG/React | 可控性最高 | engraving 工作量大 |

建议等 `OriginalScore / InstrumentEdition` 设计稳定后，再正式评估五线谱 renderer。

## 13. ABCJS 与早期原生代码

仓库中存在 ABCJS 和早期原生渲染代码，但当前不在公开主链路。

| 文件 | 当前判断 |
|------|----------|
| `src/components/song/AbcRenderer.tsx` | 五线谱试点/历史参考，不是公开主链 |
| `src/app/song/SongClient.tsx` | 旧原生详情页，公开页不再 fallback |
| `src/lib/songbook/abcImport.ts` | 旧导入/校验辅助 |
| `src/lib/abc/**` | ABC 解析辅助 |
| `tests/test-grace-notes.js` | ABCJS 试验测试 |

后续处理建议：

```text
先标记为 legacy / research
不要让它们影响目标架构
等新 score-engine 设计稳定后，再决定保留、归档或删除
```

## 14. 当前 native renderer 现状

已有内部试验：

| 文件/路径 | 作用 |
|-----------|------|
| `src/lib/native-renderer/songIr.ts` | SongIR v0 类型 |
| `src/lib/native-renderer/fromRuntimeNotation.ts` | 快乐谱 runtime notation -> SongIR |
| `src/lib/native-renderer/fromMusicXmlDraft.ts` | MusicXML draft -> SongIR |
| `src/lib/native-renderer/layout.ts` | 简单 melody layout |
| `src/lib/native-renderer/playbackSequence.ts` | 播放顺序/反复结构分析 |
| `src/components/native-renderer/NativeMelodySheet.tsx` | 内部原生谱面组件 |
| `/dev/native-renderer/song/[id]` | 原生预览 |
| `/dev/native-renderer/review/[id]` | runtime vs native 对照 |

限制：

| 限制 | 说明 |
|------|------|
| 只支持窄范围 `o12` | 还不是多乐器模型 |
| 不是公开主链 | 仅内部预览/评审 |
| 五线谱未成型 | 现在主要是 melody sheet |
| 播放/节拍器未迁移 | 只有 playback sequence 分析 |
| 导出未迁移 | print/Pinterest 仍走 runtime container |

这部分可以作为起点，但未来目标模型应比当前 `SongIR v0` 更完整。

当前 native renderer 已做出的有价值部分：

| 已有能力 | 价值 | 是否可直接进入目标架构 |
|----------|------|------------------------|
| `SongIR v0` | 已经把 note/rest/chord/measure/repeat/section/playOrder 拆成结构 | 可参考，但需要升级 |
| MusicXML draft -> SongIR | 验证了从候选草稿进入结构化模型的路径 | 可作为 `OriginalScore` adapter 原型 |
| runtime payload -> SongIR | 可把现有 400+ 首公开歌批量审计 | 可作为迁移分析工具 |
| playback sequence audit | 已能判断 repeat/ending/playOrder 的复杂度 | 可升级为统一 timeline |
| support/fallback contract | 不支持时明确 fallback，不静默错渲染 | 必须保留这种原则 |
| NativeMelodySheet | 证明 React/SVG 渲染方向可行 | 只是 melody sheet，不是最终 UI |

当前已知覆盖情况来自旧研究文档和本次代码阅读：

| 指标 | 状态 |
|------|------|
| MVP seed | 15 首 MusicXML-backed 内部种子 |
| 已支持 seed | 约 12 首 |
| runtime-probe 覆盖 | 曾在 400 首中支持约 104 首内部结构化分析 |
| 主要阻塞 | repeat/ending、parenthesized groups、tuplet、指法覆盖、复杂歌词/语义 |

因此对“先拆老代码还是先写新 renderer”的判断是：

```text
不要机械拆当前 hc.min
不要无视旧代码从零写
应该用三条线并行收敛：

1. 当前授权 runtime 保持线上 oracle
2. 历史 HC 和语法分析文档帮助理解旧语义
3. 新 score-engine 用 TypeScript 重新表达清晰边界
```

如果能从旧代码中干净抽出无全局副作用、可测试、适合 React/Next 的纯逻辑，可以复用。但旧页面控制器、jQuery UI、全局 DOM 初始化、旧 modal/播放面板，不应成为新架构基础。

## 15. 后端功能放在哪个阶段

未来要做：

- 数据库
- 注册/登录
- 收藏
- 付费订阅
- Adsense

建议不要现在和乐谱引擎重构混在一起。

原因：

```text
收藏的到底是 song、instrument edition、还是某个调性的版本？
付费订阅解锁的是全站、某个乐器、某个高级指法图、还是 PDF/export？
用户上传/导入的歌曲存什么格式？
```

这些都依赖新的数据身份模型。

建议阶段：

| 阶段 | 后端工作 |
|------|----------|
| 数据模型稳定前 | 不接正式后端模板 |
| `OriginalScore / InstrumentEdition` 稳定后 | 可并行调研 auth/database 模板 |
| 公开产品形态稳定后 | 接收藏、用户库 |
| 权限边界稳定后 | 接付费订阅 |
| 页面性能和 UX 稳定后 | 接 Adsense |

开源模板可以用，但选择模板前要先明确数据模型和权限边界，避免被模板反向绑架。

## 16. 目标架构草图

```text
                ┌─────────────────────┐
                │  Source Importers     │
                │  MusicXML / Kuailepu  │
                │  manual / future DB   │
                └──────────┬──────────┘
                           │
                           v
                ┌─────────────────────┐
                │   OriginalScore      │
                │   canonical truth    │
                └──────────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          v                v                v
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ Edition o12     │ │ Edition flute   │ │ Edition clarinet│
│ range transpose │ │ range transpose │ │ written offset  │
└───────┬────────┘ └───────┬────────┘ └───────┬────────┘
        │                  │                  │
        v                  v                  v
┌────────────────────────────────────────────────────────┐
│                    Render Pipeline                      │
│ staff / letter / jianpu / fingering / lyric / tablature │
└──────────────────────────┬─────────────────────────────┘
                           │
                           v
┌────────────────────────────────────────────────────────┐
│                 Interaction Timeline                    │
│ playback / highlight / metronome / current fingering    │
└──────────────────────────┬─────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          v                v                v
  public song page       print/PDF        Pinterest/export
```

兼容层：

```text
OriginalScore / Edition
        |
        +-- native renderer path
        |
        +-- Kuailepu compatibility adapter
              |
              v
           runtime JSON / authorized runtime fallback
```

## 17. 建议分阶段计划

### 阶段 0：基线与资产盘点

目标：

- 确认当前公开主链
- 标记历史/实验代码
- 明确当前实际加载资产
- 确认当前验证命令和样例歌曲

产物：

- 本调研文档
- 后续可补一份 baseline checklist

验收：

| 验收项 | 标准 |
|--------|------|
| 当前公开链路 | 能从 `/song/<slug>` 追到 runtime payload、runtime HTML、SVG 输出 |
| 当前数据对象 | SongDoc/runtime payload/candidate/SongIR 边界写清 |
| 当前脚本 | 导入、发布、验证、分析、导出脚本分组清楚 |
| 当前风险 | 不确定业务问题列出，等待确认 |

### 阶段 1：运行时交互所有权迁移

目标：

- 摆脱“去掉 iframe 但仍按 iframe 小页面重建 runtime”的旧交互模型。
- 让功能区状态先进入 React shell 的 score intent / display setting 状态。
- 轻量显示项不再触发 runtime package fetch 和 container remount。
- 播放、节拍器、loading 状态逐步归 React shell 统一管理。

这一步是后续 `OriginalScore`、新乐器、五线谱、native renderer 的前置工程。它不要求立刻替换 HC，但会把公开页交互从“黑盒 runtime 补丁层”迁到我们自己的页面状态层。

产物：

- 第 9.5 节中的 A-F 小阶段执行记录。
- 更薄的 `PublicRuntimeInteractiveShell`。
- 明确的 runtime display command / fallback remount 边界。
- 统一 loading 组件和 runtime package fetch 基线。

验收：

| 验收项 | 标准 |
|--------|------|
| Loading | 首屏和 runtime 内部加载使用统一体验，不再闪纯文字 loading |
| 轻量设置 | zoom、歌词、小节号、指法图显示等不重建 container |
| 中等设置 | 指法 key、note mode、layout 至少能做到 redraw，不重新加载脚本 |
| 播放/节拍器 | UI 所有权从 runtime container 迁到 React shell，有清晰 fallback |
| 性能 | 默认读谱路径尽量保持 `public-song`，减少进入 `full-template` |
| 回归 | 公开歌曲、print、Pinterest/export 仍使用授权 runtime fallback 正确输出 |

### 阶段 2：目标数据模型设计

目标：

- 设计 `OriginalScore`
- 设计 `InstrumentEdition`
- 定义 `soundingMidi / writtenMidi / fingeringMidi`
- 定义移调逻辑
- 定义如何从新模型导出快乐谱兼容 payload

产物：

- `docs/score-engine-target-architecture.md`

建议先设计这些接口，不急着落大代码：

```text
OriginalScore
  id / title / source / rights
  timeline / measures / events / lyrics / harmonies / ornaments

InstrumentEdition
  instrumentId
  rangeTranspose
  writtenTranspose
  fingeringSystemId
  playableRange
  warnings

RenderTrack
  staff / letter / jianpu / fingeringAnchor / lyric / tablature

PlaybackTimeline
  ordered note events
  repeat expansion
  highlight anchors
  metronome grid
```

验收：

| 验收项 | 标准 |
|--------|------|
| MusicXML 适配 | 能表达 measure offset、rest、voice、lyrics、harmony |
| 快乐谱适配 | 能从新模型导出 runtime fallback payload |
| 多乐器 | 能表达同一首歌不同乐器的移调和指法系统 |
| 移调乐器 | 能区分 sounding/written/fingering pitch |

### 阶段 3：指法数据与指法显示模型

目标：

- 指法数据从陶笛硬编码中抽离
- 支持不同乐器的指法 SVG/部件/状态映射
- 支持小锚点和大图 focus panel 两种显示

可能模块：

```text
src/lib/score-engine/instruments/**
src/lib/score-engine/fingerings/**
src/components/fingering/**
```

第一批乐器建议按“单音管乐 + 大指法面板”做：

| 乐器 | 数据需求 | UI 需求 | 难度判断 |
|------|----------|---------|----------|
| 长笛 | MIDI -> SVG/按键状态 | 大图 focus panel | 中 |
| 黑管 | written/fingering pitch 需要清楚 | 大图 focus panel，可能有 alternate fingering | 中高 |
| 萨克斯 | 移调乐器家族需定义 | 大图 focus panel，按键复杂 | 中高 |

验收：

| 验收项 | 标准 |
|--------|------|
| 指法数据 | 不再散落在 renderer/页面里 |
| 小图/大图 | 同一份指法数据可渲染 anchor 和 focus panel |
| alternate | 支持同一音多个指法 |
| 缺失指法 | 有明确 fallback/警告，不静默显示错图 |

### 阶段 4：多轨渲染模型

目标：

- 同一份 score/edition 生成多条轨道
- 字母谱、简谱、五线谱、指法锚点、歌词统一对齐
- 播放高亮来自统一 timeline

重点：

- 评估 staff renderer
- 不急着公开替换当前 runtime

建议内部先做三条轨：

```text
staff track       五线谱
letter track      字母音名
fingering anchor  小锚点，点击后驱动大指法图
```

歌词作为第四条轨接入，因为歌词对齐会暴露 MusicXML timing 问题。

验收：

| 验收项 | 标准 |
|--------|------|
| 轨道对齐 | 同一个 note event 在各轨有同一 anchor id |
| 点击联动 | 点击任意轨音符能更新 focus panel |
| 播放高亮 | timeline 能驱动各轨同步高亮 |
| fallback | 不支持的语法明确回退 runtime |

### 阶段 5：native 交互层接入

目标：

- 播放面板从 runtime container 移到 React shell
- 节拍器从 runtime container 移到 React shell
- 点击/播放当前音驱动大指法图
- native 支持的歌曲尽量避免整页重绘

说明：

这一阶段接的是 native / score-engine 路径。播放面板和节拍器的 React shell 所有权应尽量在阶段 1 先完成；本阶段重点是让 native renderer、timeline、focus panel 复用这些 shell 状态。

验收：

| 当前问题 | 阶段 5 验收目标 |
|----------|-----------------|
| Listen 面板在 runtime container | native 路径复用 React shell 面板 |
| 节拍器在 runtime/container 逻辑里 | native 路径复用 React shell 节拍器 |
| 切换指法/乐器整谱刷新 | native 路径局部更新 |
| runtime bridge 状态复杂 | shell 与 score-engine 使用明确事件协议 |

### 阶段 6：兼容 fallback 与内部迁移

目标：

- 支持的歌曲/乐器内部走 native
- 不支持的继续走授权 runtime fallback
- public 不急于灰度，先内部充分验证

用户偏好：

```text
不赶时间
更倾向全做完、确认无误后再一次性公开上线
```

所以 public migration 应放在最后。

建议阶段 6 的内部验证方式：

```text
同一首歌
  |
  +-- runtime number baseline
  +-- runtime letter public view
  +-- native staff/letter/fingering view
  +-- playback timeline audit
  +-- screenshot/manual QA
```

达到稳定后再考虑公开迁移，而不是一开始就灰度给用户。

### 阶段 7：公开上线与旧代码收口

这个阶段只在前面都稳定后做。

目标：

- 决定是否一次性替换公开页
- runtime fallback 是否保留为内部开关
- 归档 ABCJS/SongClient/旧 native 试验代码
- 收缩 runtime asset profile
- 整理导出、打印、Pinterest 是否转到新 renderer

验收：

| 验收项 | 标准 |
|--------|------|
| 全曲库覆盖 | 没有公开歌静默错渲染 |
| 性能 | runtime/full-template 依赖显著下降 |
| 回滚 | 仍有明确 fallback 或回滚策略 |
| 仓库清晰度 | legacy/research 与 production 主链分明 |

## 18. 风险与应对

| 风险 | 说明 | 应对 |
|------|------|------|
| 机械拆 HC 破坏隐藏初始化顺序 | 老代码全局变量和加载顺序复杂 | 参考历史源码理解，当前 HC 做 oracle，新模块逐步替代 |
| MusicXML 转换继续丢信息 | 当前压成快乐谱格式会损失小节/声部/休止信息 | 先保存 `OriginalScore`，再派生快乐谱 payload |
| 黑管/萨克斯指法图挤爆谱面 | 复杂指法不适合小图格子 | 小锚点 + 大 focus panel |
| 移调乐器音高混乱 | written/sounding/fingering pitch 不同 | 显式建三个 pitch 字段 |
| 五线谱 renderer 选型过早 | 旧 ABCJS 不一定适合未来 | 先定数据模型，再评估 VexFlow/OSMD/ABCJS/自研 |
| 后端模板绑架数据模型 | 收藏/订阅对象不明确 | 数据身份稳定后再选模板 |
| 公开迁移回归 | runtime 当前覆盖很多边界 case | 保留 fallback 和对照工具 |

## 19. 待业务决策问题

下面这些不是技术上“现在不能做”，而是会影响产品形态和数据身份。建议你逐条确认。

| 编号 | 问题 | 当前结论 | 影响 |
|------|------|----------|------|
| Q1 | `OriginalScore` 是否保存原曲原调，所有乐器移调都放进 `InstrumentEdition`？ | 已确认：是 | 这是最利于 MusicXML 和未来多乐器的模型 |
| Q2 | 公开默认是否仍只有一个 `/song/<slug>`，乐器版本通过 query/状态切换？ | 倾向调整：未来给不同乐器独立 URL，旧入口保留兼容 | 影响 SEO、收藏、分享、后端主键 |
| Q3 | 是否给用户展示“原调版”和“乐器友好版”？ | 第一阶段不展示，只内部保存 | 避免普通用户被音乐概念干扰 |
| Q4 | 黑管/萨克斯五线谱默认显示 written pitch 还是 sounding pitch？ | 待最终确认：建议用户看 written pitch，播放用 sounding pitch | 影响 staff、播放、指法表查找 |
| Q5 | 黑管/萨克斯是否要区分具体调性/型号，例如 Bb clarinet、Eb alto sax、Bb tenor sax？ | 已确认：要区分型号，但型号不单独分页面 | 决定 instrument variant 和 writtenTranspose |
| Q6 | 长笛是否按 concert pitch 处理？ | 是 | 长笛比黑管/萨克斯简单，可作第一批样例 |
| Q7 | 第一批新乐器是否只做单音旋律，不做和弦？ | 是 | 与长笛/黑管/萨克斯优先级一致 |
| Q8 | 吉他和弦/六线谱是否推迟到第二大阶段？ | 是 | 避免过早拉高数据模型复杂度 |
| Q9 | Staff renderer 首选评估 VexFlow、OSMD、ABCJS 还是自研？ | 先写选型标准，再小样例试 VexFlow/OSMD | 影响工程量和可控性 |
| Q10 | 第一批验证新数据模型的歌曲选哪些？ | 已确认：MusicXML 导入歌 + 当前 runtime 常见歌混合 | 覆盖导入准确性和旧语义兼容 |
| Q11 | 是否允许新引擎内部完成后再一次性公开上线？ | 是，符合你的偏好 | 影响阶段 6/7 的发布策略 |
| Q12 | ABCJS / SongClient / 早期 native 代码何时归档？ | 等新设计文档确认后统一处理 | 避免现在误删参考材料 |
| Q13 | 快乐谱 compatibility payload 长期保留多久？ | 至少保留到全站 native 验证完成后 | 作为 fallback、oracle、导出对照 |
| Q14 | 未来收藏对象是 song、instrument edition，还是某个用户自定义调？ | 需要在后端前决定 | 影响数据库设计 |
| Q15 | 付费订阅解锁对象是什么？ | 暂不决定 | 可能是高级乐器、PDF、收藏、练习功能等 |

当前仍需要继续解释/细化的是 Q4。核心是：移调乐器页面里，用户看到的谱面应符合演奏者习惯，同时播放音频要保持真实歌曲旋律。

### 19.1 建议优先确认的样例集

为了避免抽象设计空转，下一份设计文档最好绑定一组样例歌。

建议样例分四类：

| 类别 | 目的 | 候选标准 |
|------|------|----------|
| 简单 MusicXML | 验证基础 timeline/lyrics/import | 小节规整、单声部、歌词少 |
| 复杂 MusicXML | 验证 backup/forward/休止/歌词问题 | 曾经导入不够准的歌 |
| 当前快乐谱稳定歌 | 验证 runtime 语义兼容 | 公开页现在表现稳定、用户可能常访问 |
| 结构复杂歌 | 验证 repeat/ending/playOrder | 有反复、跳房子、段落标记 |

如果你没有指定，我建议下一步先从现有 native MVP seeds 和 MusicXML 候选里选 10 首，再加 5 首当前公开高价值歌曲。

### 19.2 需要进一步调研但不阻塞当前文档的问题

| 问题 | 为什么暂不阻塞 |
|------|----------------|
| Tomplay 黑管/长笛/萨克斯/吉他具体 UI 细节 | 需要产品参考和截图分析，属于设计阶段 |
| 指法 SVG 具体资产格式 | 先定 registry 和 visual spec，再录资产 |
| 后端模板选型 | 依赖 song/edition/user-library 数据身份 |
| Adsense 插入位置 | 依赖最终谱面布局和性能 |
| PDF/Pinterest 是否改用 native renderer | 依赖 native renderer 输出质量 |

## 20. 当前可执行的下一步

建议下一步写目标架构设计文档：

```text
docs/score-engine-target-architecture.md
```

这份文档需要把调研结论变成具体接口和模块边界：

- `OriginalScore`
- `InstrumentEdition`
- pitch / transpose 规则
- fingering registry
- fingering visual spec
- track renderer interface
- playback timeline interface
- staff renderer 选型标准
- Kuailepu compatibility adapter
- fallback router
- 内部验证方式

在这份设计文档完成前，不建议开始大规模改代码。

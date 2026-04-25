# Instrument Rollout Plan

本文件用于记录“在不改公开 runtime 主链”的前提下，哪些快乐谱乐器适合逐步公开，以及为什么不建议一次性全开。

## Current Audit

以 2026-04-25 当前工作区为准，当前公开曲库的 142 首 song pages 全部包含同一组快乐谱乐器入口：

- `o12` 十二孔陶笛
- `o6` 六孔陶笛
- `r8b` 英式八孔竖笛
- `r8g` 德式八孔竖笛
- `w6` 爱尔兰哨笛
- `o3` 三管陶笛
- `a6` 六筒陶笛 APP
- `b6` 六孔竹笛
- `x8` 八孔埙
- `x10` 十孔埙
- `hx` 合埙
- `p8` 八孔箫
- `h7` 七孔葫芦丝
- `h9` 九孔葫芦丝
- `sn` 八孔唢呐
- `none` 简谱无图谱

换句话说：

- 当前公开 142 首歌不存在“只支持少数几首 recorder / whistle”的数据缺口。
- 从 deployable raw JSON 角度看，`o6` / `r8b` / `r8g` / `w6` 都具备公开产品化的前提。

## Product Recommendation

当前最小公开乐器集已经落地为：

1. `o12` 十二孔陶笛（默认）
2. `o6` 六孔陶笛
3. `r8b` 英式八孔竖笛
4. `r8g` 德式八孔竖笛
5. `w6` 爱尔兰哨笛

建议暂缓：

- `o3`
- `a6`
- `b6`
- `x8`
- `x10`
- `hx`
- `p8`
- `h7`
- `h9`
- `sn`
- `none`

## Why Not Open Everything At Once

虽然 raw JSON 里这些乐器都存在，但当前公开产品仍然是“ocarina-first 的多乐器 melody page”而不是全乐器百科：

- runtime 默认乐器优先仍是 `o12`
- compare / preflight / 发布 gate 仍围绕现有 song page 主链验证
- 当前前台与 SEO 已经开始覆盖 recorder / tin whistle，但还没有必要同步放开所有快乐谱乐器
- 如果继续无限扩乐器，会让 QA、文案和用户定位一起膨胀

因此如果一次性把所有快乐谱乐器都公开：

- 前台英文文案会立刻失真
- QA 维度会暴增
- sitemap / canonical / 页面定位也会变模糊
- 用户会误解本站已经从 ocarina-focused library 直接变成“全乐器百科”

## Why These Four Plus `w6`

### `o6`

- 与当前公开主站的陶笛定位最接近
- 对 song page 文案与用户心智的扰动最小
- 是最低风险的第一步

### `r8b` / `r8g`

- 都是英语用户可直接理解、可搜索的 western beginner instruments
- 与当前 melody-first 内容形态天然兼容
- 能显著扩大受众，但仍不需要改公开 runtime 主链

### `w6`

- 与 folk / hymn / holiday / nursery 曲库匹配度高
- 能补上 tin whistle 相关搜索意图
- 当前已经证明可以沿用同一条 runtime 主链稳定公开

## 2026-04-03 Validation Update

- 当前公开最小乐器集 `o12 / o6 / r8b / r8g / w6` 已完成一轮中国网络下的 live-vs-local `number` 模式 SVG hash 对照。
- 抽查样本：
  - `ode-to-joy`
  - `twinkle-twinkle-little-star`
  - `scarborough-fair`
  - `jingle-bells`
  - `fur-elise`
- 检查结果：
  - 5 首歌 x 5 乐器 = `25 / 25` 组合一致
- 过程中确认并修掉了一处 runtime 默认值继承问题：
  - 显式切换乐器时，默认指法与图谱方向应优先从所选乐器自己的 `fingeringSetList` / `graphList` 推导
  - 不能继续沿用 payload 根层默认乐器的 `fingering` / `show_graph`

## Current Position

- `w6` 爱尔兰哨笛现已按最小改法接入前台：
  - song page 文案使用 `Irish Tin Whistle` / `Tin Whistle`
  - 非默认乐器继续走 `?instrument=<id>` query state
  - 默认 canonical 仍收口到 `/song/<slug>`
- 中国网络下的 live-vs-local parity 已补跑通过。
- 当前更合理的下一梯队不是继续无限放更多乐器，而是：
  - 持续优化现有多乐器 song page 的 SEO 文案
  - 只在有明确搜索价值和 QA 预算时再评估 `o3` 等剩余乐器

## Implementation Rule

如果某首歌未来只支持部分公开乐器：

- 只给用户显示该曲实际支持的乐器选项
- 不要显示禁用态占位
- 不要承诺“所有曲目都支持全部乐器”

## Technical Rule

后续实现时继续遵守：

- 公开 `/song/<slug>` 仍走 deployable raw JSON + 原始 Kuailepu runtime
- 不恢复旧详情页
- 默认 note mode 仍是 `letter`
- compare / preflight / publish gate 仍坚持 `number`
- 乐器切换优先作为 song page 内部模式，不先扩成独立可索引 URL 体系

## Suggested Next Step

下一步更适合做：

1. 维持当前公开乐器集 `o12 / o6 / r8b / r8g / w6`
2. 继续把 song page SEO 文案自然扩到 `ocarina notes`、`recorder notes`、`tin whistle notes`
3. 如果以后再评估 `o3`，先看英文搜索需求是否足够大，再决定是否进入前台

# Instrument Rollout Plan

本文件用于记录“在不改公开 runtime 主链”的前提下，哪些快乐谱乐器适合逐步公开，以及为什么不建议一次性全开。

## Current Audit

以 2026-04-03 当前工作区为准，`data/kuailepu-runtime/*.json` 的 60 首公开曲目全部包含同一组快乐谱乐器入口：

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

- 当前公开 60 首歌不存在“只支持少数几首 recorder / whistle”的数据缺口。
- 从 deployable raw JSON 角度看，`o6` / `r8b` / `r8g` / `w6` 都具备公开产品化的前提。

## Product Recommendation

建议公开上线顺序：

1. `o6` 六孔陶笛
2. `r8b` 英式八孔竖笛
3. `r8g` 德式八孔竖笛
4. `w6` 爱尔兰哨笛

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

虽然 raw JSON 里这些乐器都存在，但当前公开产品层仍明显围绕 `12-hole AC ocarina` 构建：

- 首页与 song page metadata 仍大量写死 `12-hole AC ocarina`
- 详情页 hero pill 也仍写死 `12-Hole AC Ocarina`
- runtime 默认乐器优先仍是 `o12`
- compare / preflight / 发布 gate 目前只围绕现有 song page 主链验证

因此如果一次性把所有快乐谱乐器都公开：

- 前台英文文案会立刻失真
- QA 维度会暴增
- sitemap / canonical / 页面定位也会变模糊
- 用户会误解本站已经从 ocarina-focused library 直接变成“全乐器百科”

## Why These Four

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
- 未来可以单独做一波 tin whistle landing / category expansion
- 但它比 recorder 更容易牵出新的 SEO 定位问题，所以建议排在 recorder 后面

## 2026-04-03 Validation Update

- 当前公开最小乐器集 `o12 / o6 / r8b / r8g` 已完成一轮中国网络下的 live-vs-local `number` 模式 SVG hash 对照。
- 抽查样本：
  - `ode-to-joy`
  - `twinkle-twinkle-little-star`
  - `scarborough-fair`
  - `jingle-bells`
  - `fur-elise`
- 检查结果：
  - 5 首歌 x 4 乐器 = `20 / 20` 组合一致
- 过程中确认并修掉了一处 runtime 默认值继承问题：
  - 显式切换乐器时，默认指法与图谱方向应优先从所选乐器自己的 `fingeringSetList` / `graphList` 推导
  - 不能继续沿用 payload 根层默认乐器的 `fingering` / `show_graph`

## Current Pending Next Step

- `w6` 爱尔兰哨笛目前数据层已具备条件，但还没有公开到前台。
- 如果下一轮继续推进，优先做：
  1. song page 的前台 copy / URL 状态设计
  2. 最小公开切换接入
  3. 中国网络下的 live-vs-local parity 校验

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

下一步先做：

1. song page 最小乐器切换壳
2. 第一批公开 `o6`
3. 回归验证后再追加 `r8b`
4. 再追加 `r8g`
5. 最后再评估 `w6`

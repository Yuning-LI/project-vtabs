# Manual Runtime QA Checklist

这份清单用于“准备上线一首歌”或“修改了 runtime / 字母谱 / 页面壳之后”的人工核查。当前自动化已经很强，但人工 QA 仍然负责兜底页面体验、SEO 外壳和个别视觉异常。

## 1. 什么时候需要跑这份清单

以下任一情况出现时，都建议跑一轮：

- 新导入一首快乐谱歌曲，准备公开
- 修改了 `src/lib/kuailepu/runtime.ts`
- 修改了 iframe 高度桥接逻辑
- 修改了字母谱显示规则
- 修改了 song page 页面壳或详情页 SEO 文案布局

## 2. 发布前固定前置动作

### 2.1 检查本地登录态

```bash
npm run check:kuailepu-login
```

如果失败：

```bash
npm run login:kuailepu
```

### 2.2 跑 compare gate

```bash
npm run compare:kuailepu-runtime -- http://127.0.0.1:3000 <slug...>
```

规则：

- compare 不通过，不进入人工“看起来差不多”的判断阶段
- compare 必须基于 `number` 模式

## 3. 人工 QA 重点看什么

当前人工 QA 的重点不是“谱面有没有大致像”，而是下面这些自动化不一定能覆盖的页面质量问题：

- 页面有没有闪烁
- 有没有灰色遮罩
- iframe 高度是否正确
- 谱面底部有没有大块空白
- 长页有没有 iframe 内层滚动条
- 字母谱有没有压到歌词或指法图
- `number` 模式能否回到快乐谱原版效果
- 页面可见文案是否仍是英文
- 页面有没有意外暴露来源说明
- 功能区是否仍紧凑、不会把指法图谱明显推到首屏以下
- 节拍器是否停靠在谱面上方且不遮挡指法图

## 4. 建议的人工检查顺序

### 4.1 打开三个视图

以某个 slug 为例，同时打开：

- `http://127.0.0.1:3000/song/<slug>`
- `http://127.0.0.1:3000/song/<slug>?note_label_mode=number`
- `http://127.0.0.1:3000/api/kuailepu-runtime/<slug>?note_label_mode=number`

### 4.2 先看默认详情页

确认：

- 首屏不明显闪简谱
- 标题、副标题、正文都是英文
- 详情页没有来源说明
- 指法图、字母谱可直接进入视野
- 如果该曲存在公开可见歌词，歌词与旋律仍可读
- 如果该曲只有纯中文歌词，默认不显示歌词且前台不显示 `Lyrics` 开关

### 4.3 再看 number 模式

确认：

- 能恢复到快乐谱原版简谱阅读样式
- 没有被字母谱残留节点污染
- 乐句、小节、歌词、指法图仍正常

### 4.4 最后看裸 runtime 页面

确认：

- 能稳定出 `svg.sheet-svg`
- 没有 overlay
- 谱面高度能完整渲染

## 5. 字母谱专项检查

默认 `letter` 模式下逐项确认：

- 音符数字已替换成字母
- 休止显示为 `R`
- 延时线保留 `-`
- `Eb5`、`F#5` 这类标签能显示
- 西式换气记号是逗号样式
- 歌词仍和旋律对齐
- 指法图没有被遮挡
- 没有明显的字母与字母重叠

## 6. 简谱专项检查

切到 `number` 模式后确认：

- 快乐谱原版简谱样式完整恢复
- 连音、延音、小节、反复等原始结构还在
- 不出现字母谱西式换气符号
- 不出现残留白色遮盖块

## 7. 首页与 SEO 外壳专项检查

如果本次改动涉及首页或 `presentation.ts`，另外检查：

- 首页 song list 卡片只显示歌名
- 首页无右上角黑框统计区
- 首页和详情页都没有中文可见文案
- 详情页 `About`、`FAQ`、`How To Use This Page` 仍然自然、英文、贴合曲目
- 详情页文案不会把页面写成只支持 ocarina；支持 recorder / tin whistle 的曲页应允许自然覆盖这些搜索意图
- 不出现第三方来源披露

## 7.5 功能区与节拍器专项检查

如果本次改动涉及功能区或节拍器，另外确认：

- 下拉项与切换项都能正常跳转并保持 query state
- `Instrument`、`Fingering Chart`、`Layout`、`Zoom` 的默认值正确
- `Lyrics` 开关只在公开可见歌词存在时出现
- `Metronome` 打开后不会遮挡指法图
- 节拍器可见文案全部是英文
- `Time Signature`、`BPM`、`Start` / `Stop` 与下拉框对齐，没有额外空白占位

## 8. 当前建议优先人工抽查的曲目

这些歌覆盖了当前最容易出问题的几类场景。

### 8.1 长页与高度问题

- `turkish-march`
- `canon`
- `jingle-bells`
- `we-wish-you-a-merry-christmas`

### 8.2 歌词与英文版选择问题

- `twinkle-twinkle-little-star`
- `silent-night`
- `greensleeves`
- `scarborough-fair`

### 8.3 复杂指法与节拍密度问题

- `moonlight-sonata`
- `wedding-march`
- `air-on-the-g-string`
- `fur-elise`

### 8.4 已有人工确认无误的样本

以下几首已经被人工明确核对过，无需每次都重看，但可以作为快速回归样本：

- `frere-jacques`
- `london-bridge`
- `old-macdonald`
- `do-your-ears-hang-low`

## 9. 如果发现问题，优先排查顺序

### 9.1 先区分问题属于哪一层

按顺序判断：

1. `number` 模式原谱就有问题
2. `number` 正常，只有 `letter` 模式异常
3. 裸 runtime 正常，只有详情页壳异常

对应处理：

- 1：先查 raw JSON / runtime 兼容链 / compare 条件
- 2：先查字母谱覆盖层
- 3：先查 `KuailepuLegacyRuntimePage.tsx` 和 iframe 测高逻辑

### 9.2 常见异常与第一检查点

- 闪烁：
  - 查 pending mask 和 `Song.draw()` patch
- 灰遮罩：
  - 查 `.lean-overlay` 是否仍被隐藏
- 底部空白：
  - 查 bridge script 是否回退成 `body.scrollHeight` 优先
- 内层滚动条：
  - 查 runtime 文档 `overflow-y: hidden`
- 字母压歌词：
  - 查字母字号与覆盖块尺寸

## 10. 人工 QA 通过的判断标准

只有下面三层都成立，才算通过：

1. compare 通过
2. `letter` 和 `number` 模式切换都正常
3. 页面壳、英文文案、SEO 可见内容都符合当前产品要求

## 11. 当前交接后的默认操作建议

后续每次新增曲子或上线曲子，建议把 QA 节点固定在这里：

1. 导入后
2. compare 通过后
3. 正式公开前

这是当前最合适的节点，因为：

- raw JSON 和轻量 SongDoc 都已经稳定
- 还没公开，回滚成本最低
- 人工能同时看 runtime 真相和前台页面壳效果

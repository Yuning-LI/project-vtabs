# 自制曲输入规范草案

## 目标

这份文档用于后续处理“快乐谱里没有，但我们想上线”的曲子。

目标不是直接替代当前公开 runtime 主链，而是先把外部原始谱源整理成一份稳定、可复用、可手工检查的基础输入，再进入 happi123 / 快乐谱制谱流程。

## 推荐输入优先级

1. `MusicXML`
2. `MIDI`
3. 人工录入的结构化简谱文本
4. 图片 / PDF 简谱，仅作最后兜底

原因：

- `MusicXML` 最容易保留调号、小节、时值、休止、反复、歌词对位等结构信息。
- `MIDI` 更适合拿到旋律和时值，但经常缺歌词、调号和清晰的小节信息。
- 纯图片简谱最难自动处理，人工校对成本最高。

## 一首歌至少要收集哪些信息

- 英文公开标题
- 原始标题或常见别名
- 预期 slug
- 曲目类型
  - `folk`
  - `march`
  - `dance`
  - `song`
  - `holiday`
  - `hymn`
  - `classical`
- 作曲者或来源说明
- 版权判断备注
- 原始谱源文件
  - `MusicXML` 或 `MIDI`
- 是否需要歌词
  - 当前如果只有纯中文歌词，公开页仍默认隐藏

## MusicXML 最理想应包含的内容

- 主旋律单声部
- 清晰小节线
- 拍号
- 调号
- 速度或基础节拍信息
- 休止符
- 反复记号或已展开后的完整旋律
- 若有歌词，尽量保留 syllable 对位

如果一份 `MusicXML` 含多个声部，后续默认只取主旋律声部，不做和声公开化。

## MIDI 最低可接受要求

- 能清楚分辨主旋律轨
- 时值基本正确
- 小节边界不要严重错乱
- 不要只有伴奏没有主旋律

如果 `MIDI` 有多轨，后续需要先人工指定哪一轨是主旋律。

## 转成快乐谱 / happi123 前需要补齐的内部字段

- 英文标题
- slug
- family
- 目标默认调
- 目标拍号
- 目标旋律文本
- 是否含歌词
- 歌词语言
- 公共可见歌词策略
  - `show publicly`
  - `hide by default`
  - `do not expose toggle`

## 后续计划中的半自动流程

1. 读取 `MusicXML` 或 `MIDI`
2. 提取主旋律、小节、时值、拍号、调号
3. 转成一份内部基础简谱数据
4. 人工校对标题、来源、版权备注、歌词策略
5. 再复制到 happi123 / 快乐谱制谱入口生成完整上下文
6. 导回本仓库做 compare / preflight / publish

## 当前已落地的第一步工具

仓库里现在已经有一个最小可执行的 MusicXML draft 工具：

```bash
npm run prepare:song-ingest -- <input.musicxml> [--title=...] [--slug=...] [--family=folk] [--part=P1] [--voice=1] [--keynote=1=G] [--lyric-policy=show-publicly|hide-by-default|do-not-expose-toggle|no-lyrics] [--out=reference/song-ingest-drafts/<slug>.json]
```

当前这一步的定位：

- 只做内部 draft，不直接发布到公开 song page
- 当前只支持未压缩的 `MusicXML` / `.xml`
- 会输出：
  - 推荐标题 / slug
  - 推荐 keynote / tonicMidi
  - 结构化简谱行
  - 对齐歌词行
  - happi123 可继续人工整理的基础文本
  - 当前识别到的风险 / 警告

当前暂不覆盖：

- `MIDI` 自动选主旋律轨
- `.mxl` 压缩 MusicXML
- 复杂多声部 / 和弦 / grace note / tuplet 的完整等价转换

但它已经足够作为“你发我 MusicXML，我先快速整理出内部基础输入”的第一版工作台。

## 当前不做的事情

- 不直接把 `MusicXML` 当公开 song page 的生产格式
- 不跳过快乐谱 runtime compare gate
- 不恢复旧 SongClient 详情页作为公开主链
- 不在前台暴露中文来源说明或第三方来源措辞

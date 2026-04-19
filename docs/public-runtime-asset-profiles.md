# Public Runtime Asset Profiles

这份文档专门说明：公开 `/song/<slug>` 页面在继续使用快乐谱原始 runtime 的前提下，如何缩小默认脚本集，同时保留以后恢复功能的路径。

## 1. 核心规范

- 当前公开详情页对快乐谱旧资产的默认策略不是“直接删除”。
- 正确策略是：
  - 公开详情页默认不加载当前不会触发的旧模块
  - 本地快照资产继续保留在 `vendor/kuailepu-static` 和 `public/k-static`
  - 未来恢复功能时，优先调整 runtime asset profile，而不是重新回源抓线上文件

这条规则是仓库规范，不是临时建议。

## 2. 为什么不能随手删文件

当前公开页虽然不暴露登录、播放、收藏、节拍器等入口，但这些能力未来仍可能回归。

如果现在把相关旧脚本直接从仓库里删掉，后续会立刻遇到这些问题：

- 不知道当时对应的是哪一版线上静态资源
- 不知道模板原本引用的 hash 是什么
- 需要重新依赖快乐谱线上环境才能找回
- 新对话很容易把“当前公开页不用”误判成“永久废弃”

因此，默认不加载可以做，物理删除要极其谨慎。

## 3. 当前控制点

当前公开 runtime 资产的默认注入策略，统一放在：

- `src/lib/kuailepu/runtime.ts`

这里维护 runtime asset profile。

当前保留两个 profile：

- `public-song`
  - 公开详情页默认使用
  - 停用当前公开页不需要的保留脚本注入
  - 当前默认模板脚本数：`6`
- `full-template`
  - 调试 / 对照 / 恢复行为时可用
  - 保留快乐谱原模板脚本注入
  - 当前模板脚本数：`28`

当前 `src/app/api/kuailepu-runtime/[id]/route.ts` 支持：

- 默认走 `public-song`
- 查询参数 `runtime_asset_profile=full-template` 时切回完整模板注入

当前建议：

- 先停在这版 `public-song = 6 个脚本`
- 暂时不要继续为了更小脚本集而无限扩张 compatibility stub
- 如果以后还要进一步减载，先补新的收益证据，再决定是否值得继续增加维护复杂度

## 4. 当前硬依赖

下面这批在当前公开详情页仍然是硬依赖，不应在最小脚本集阶段贸然停用：

- `cdn/js/kit_9b7263d863.js`
- `cdn/js/dist/hc.min_1cfae5fe62.js`
- `cdn/js/song_builder_a87186a4c4.js`
- `cdn/js/song_1f2ad3c3ba.js`
- `cdn/js/i18n_d3be79dfbd.js`

## 5. 当前已验证默认停用的保留脚本

下面这批脚本当前已经验证，在 `public-song` 默认 profile 下可以停用：

- 在公开 `/song/ode-to-joy?note_label_mode=number` 下默认不加载
- `svg.sheet-svg` 仍能正常渲染
- 页面壳和 loading 不受影响
- 不再出现 pageerror
- 相关静态文件继续保留，未来需要时可重新加入 profile

当前默认停用：

- `lib/jqueryui/1.11.4/jquery-ui.min.js`
- `lib/materialize/0.97.5/js/materialize.min.js`
- `lib/soundmanager2/2.97a.20150601/script/soundmanager2-nodebug-jsmin.js`
- `lib/soundmanager2/2.97a.20150601/script/bar-ui.min.js`
- `lib/art-template/3.0.1/template.js`
- `lib/clipboard.js/1.5.12/clipboard.min.js`
- `cdn/js/i18n/all_2916f8e4dd.js`
- `cdn/js/lib/web-audio-scheduler_1823326334.js`
- `cdn/js/metronome_7124fad0b0.js`
- `cdn/js/microphone_7bba73959e.js`
- `cdn/js/chip_tag_4b7d8a0043.js`
- `cdn/js/chip_tag.song_f7c06ec607.js`
- `cdn/js/media_24bd4df64f.js`
- `cdn/js/user_favorite.kit_2cf017fc27.js`
- `cdn/js/midi_context_dea7103763.js`
- `cdn/js/midi_number_659c66b334.js`
- `cdn/js/midi_soundfont_fb98b7a74c.js`
- `cdn/js/midi_player_62c3ad29f7.js`
- `cdn/js/countdown_852b2933cb.js`
- `cdn/js/diaohao_aab9dd0b9e.js`
- `cdn/js/cangqiang_f2fb865e71.js`
- `cdn/js/cangqiang.song_1ce5916de5.js`

这批脚本默认停用后，公开详情页模板脚本从 `28` 个降到 `6` 个。

这也是当前建议先停下来的主要边界：

- 收益已经有了
- 恢复路径还在
- 但继续往下减，会越来越依赖我们自己的 stub 和模板内行为判断

## 6. 当前保留但不默认加载的原因

这些脚本虽然默认不加载，但当前仍然保留在快照里，不是废弃文件。

原因包括：

- 未来可能恢复登录、播放、收藏、节拍器、麦克风等能力
- 调试或对照时仍可能需要完整模板模式
- 某些脚本现在依赖 runtime 里注入的兼容 stub；这说明它们已不再是公开谱面的硬依赖，但仍属于“保留资产”

如果以后要恢复这些模块，优先做法是切回 `full-template` 或把对应脚本重新加入 `public-song`，不要先去重抓线上资源。

## 7. CSS 的当前口径

CSS 目前还不进入第一阶段默认停用。

原因：

- 单文件拦截时谱面仍能出来
- 但多文件一起停用时，iframe 内部布局宽度会变化
- 这说明它们对视觉稳定性还有影响，需要后续做截图或布局对比后再减

所以当前优先级是：

1. 先收缩 JS
2. 再评估 CSS

## 8. 以后恢复功能时怎么做

如果以后要恢复下面这些能力：

- 登录
- 播放
- 收藏
- 节拍器
- 麦克风

推荐顺序：

1. 先确认恢复的是哪个功能范围
2. 把对应脚本重新加入 runtime asset profile
3. 再决定是否恢复相关菜单 / UI
4. 最后做公开页验证，不要只看“脚本已加载”

不要直接去改 `vendor/` 里的文件名或重新抓一份线上资源，除非现有快照已明确缺失。

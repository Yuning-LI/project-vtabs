# Metronome Recovery Audit

本文件记录 2026-04-03 这一轮对“公开页是否容易恢复快乐谱原节拍器”的最小审计结论。

## Scope

- 不改公开 `/song/<slug>` 主链
- 不把节拍器直接公开到前台
- 只验证当前仓库内保留的快乐谱模板、脚本与静态资源，是否仍存在一条清晰恢复路径

## What Was Checked

本轮在本地 dev 环境下对 `ode-to-joy` 做了两组检查：

1. 默认 `public-song` profile
2. `runtime_asset_profile=full-template`

重点看：

- 相关 JS/CSS 是否实际加载
- `#metronome-modal`、`#metronome-play`、`#metronome-bpm` 等 DOM 是否存在
- 页面是否出现 script error
- 在 `full-template` 下直接触发节拍器控件后，节拍计数是否实际变化

## Findings

### 1. `public-song` 下节拍器脚本没有加载

- 默认 profile 没有加载：
  - `web-audio-scheduler`
  - `metronome`
  - `media`
  - `midi_player`
  - `soundmanager`
  - `materialize`
- `#metronome-bpm` 没有选项
- `#metronome-play` 文案为空
- 当前公开页里看到的相关全局对象主要来自 compatibility stub，不代表节拍器真的可用

结论：

- 公开默认 profile 下，节拍器仍然是“保留资产，但未恢复功能”的状态。

### 2. `full-template` 下节拍器脚本与 DOM 仍然可工作

- 已确认实际加载：
  - `lib/materialize/0.97.5/js/materialize.min.js`
  - `lib/soundmanager2/2.97a.20150601/script/soundmanager2-nodebug-jsmin.js`
  - `lib/soundmanager2/2.97a.20150601/script/bar-ui.min.js`
  - `cdn/js/lib/web-audio-scheduler_1823326334.js`
  - `cdn/js/metronome_7124fad0b0.js`
  - `cdn/js/media_24bd4df64f.js`
  - `cdn/js/user_favorite.kit_2cf017fc27.js`
  - `cdn/js/midi_player_62c3ad29f7.js`
- 页面未出现 `pageerror`
- `#metronome-modal`、`#metronome-play`、`#metronome-bpm`、`#metronome-time-signature` 都存在
- `#metronome-bpm` 已填充 281 个选项
- `#metronome-time-signature` 已填充 8 个选项
- 直接触发 `#metronome-play` 后，按钮文案从 `start` 切到 `stop`，`#metronome-beat` 出现跳动数值

结论：

- 节拍器的“模板 + 资源 + 基本执行链”并没有坏掉。
- 恢复它不需要重新抓快乐谱线上资源。

### 3. 当前主要阻断点是我们自己的公开页覆盖层

当前 `src/lib/kuailepu/runtime.ts` 的公开覆盖样式默认隐藏了：

- `#menu-modal`
- `#metronome-modal`
- `.modal`

这意味着：

- 即使切到 `full-template`，公开页用户仍看不到节拍器入口和 modal
- 当前不是“快乐谱节拍器本体失效”，而是“我们故意把入口层关掉了”

## Recovery Difficulty

以当前仓库状态判断，节拍器属于“恢复路径相对清晰”的一类功能。

原因：

- 脚本、样式、模板 DOM、i18n 文案都还在仓库内
- `full-template` 下已验证到最基本的计数动作可运行
- 主要工作更像公开页产品化，而不是底层重建

## Minimal Recovery Path

如果下一轮要恢复节拍器，建议最小顺序：

1. 只恢复节拍器，不连带恢复播放 / 收藏 / 登录
2. 优先选择：
   - 给公开页单独恢复节拍器所需脚本
   - 或先局部切到 `full-template` 做验证
3. 解除 `#metronome-modal` 与对应入口的公开隐藏
4. 用英文文案检查一次可见 UI
5. 补一轮公开页 e2e / 人工回归

## Not Yet Audited

本轮还没有完成下面这些更深的检查：

- 节拍器在移动端上的可用性
- 节拍器与播放器同时恢复时的冲突面
- 节拍器公开后是否需要额外的 loading / 权限提示
- 节拍器相关可见文案是否还有中文残留

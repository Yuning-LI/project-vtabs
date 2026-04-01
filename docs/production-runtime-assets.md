# Production Runtime Assets

这份文档只回答一件事：

当前公开 `/song/<slug>` 页面在生产环境真正依赖哪些文件，哪些文件只能留在本地。

## 1. 生产必需文件

以下文件必须随 Git / Vercel 部署一起进入生产环境：

- `data/kuailepu-runtime/<slug>.json`
  - 公开 runtime 详情页使用的完整快乐谱 raw JSON。
- `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
  - 公开 runtime HTML 模板与归档静态资源来源。
- `vendor/kuailepu-static/**`
  - 已补齐并提交的本地静态依赖。
- `data/kuailepu/*.json`
  - song catalog / SEO / 列表页使用的轻量 SongDoc。

## 2. 仅本地文件

以下文件允许存在，但不能再当成生产硬依赖：

- `reference/songs/*.json`
  - 本地导歌、compare、调试 fallback。
- `reference/快乐谱代码.txt`
  - 本地研究归档 fallback。
- `reference/auth/kuailepu-profile/`
  - 本地 Playwright 登录态。
- `reference/generated-svg/**`
  - 本地截图 / parity / 调试产物。
- `reference/compare/**`
  - 本地 compare 结果。

## 3. 当前生产读取顺序

### 3.1 raw JSON

公开 runtime 读取顺序：

1. `data/kuailepu-runtime/<slug>.json`
2. `reference/songs/<slug>.json`

也就是说：

- 生产环境必须有 `data/kuailepu-runtime`
- `reference/songs` 只作为本地 fallback

### 3.2 runtime 归档

公开 runtime 模板读取顺序：

1. `vendor/kuailepu-runtime/kuaiyuepu-runtime-archive.txt`
2. `reference/快乐谱代码.txt`

也就是说：

- 生产环境必须有 `vendor/kuailepu-runtime`
- `reference/快乐谱代码.txt` 只作为本地 fallback

## 4. 当前公开链路

当前公开 `/song/<slug>` 主链是：

`data/kuailepu-runtime/<slug>.json -> /api/kuailepu-runtime/<slug> -> runtime HTML -> /k-static/... -> final SVG`

## 5. 导歌后的更新要求

如果新增或更新一首快乐谱歌曲，当前最少要同时更新两层：

1. `data/kuailepu-runtime/<slug>.json`
2. `data/kuailepu/<slug>.json`

本地 `reference/songs/<slug>.json` 可以继续保留，但它不再是公开部署的唯一真相源。

## 6. 当前验证结论

本轮已验证：

- 在一个完全不包含 `reference/` 的临时环境中，`npm run build` 可通过
- 同一环境中，公开 `/song/ode-to-joy` 可返回 `200`
- 同一环境中，`/api/kuailepu-runtime/ode-to-joy?note_label_mode=number` 可返回 `200`

这说明当前公开生产链路已经不再硬依赖 `reference/`

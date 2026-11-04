# Blink for X · Quantumult X

在 X/Twitter 网页右下角加一个 **Blink** 按钮，点开后进入 Blink 首页或搜索页。脚本已托管，订阅不需要替换任何占位符。

仓库：[nori5555/blink-qx](https://github.com/nori5555/blink-qx) · Blink：[TestFlight](https://testflight.apple.com/join/MtRpthjp)

## 直接安装

Quantumult X → 设置 → **重写 → 引用 → 添加**，粘贴正式版地址：

```text
https://raw.githubusercontent.com/nori5555/blink-qx/main/blink-x.snippet.conf
```

然后开启重写和 MITM，确认 QX CA 证书已安装并信任。在 Safari 新开/刷新 X 页面，右下角出现 Blink 按钮。

- 资源内含脚本真实直链和 `hostname`，按 QX 官方 remote snippet 格式组织；不是整份配置，不要拿它替换主配置。
- 若 GitHub raw 无法访问，检查 QX 对 GitHub 的代理策略。
- 正式版和测试版二选一，不要同时启用，避免重叠重写。

## 功能边界

| 功能 | 状态 |
|---|---|
| `blink://` 拉起 App | 用户真机验证 |
| `blink://widget/home` 进入首页 | 开发者确认 |
| `blink://widget/search` 进入搜索页 | 开发者确认；没有确认携带搜索词的参数 |
| 当前帖子/个人主页/文章直接打开 | **尚未确认深链格式，不宣称已实现** |
| x.com Universal Link 关联到 Blink | 未核验 AASA + App entitlement；HTTP 重定向不能证明有或没有 |

旧版说明里“iMazing 提取就是 IPA”“Info.plist 含 associated-domains”“HTTP 重定向证明无 Universal Link”“猜的路由全进首页说明不存在深链”均不严谨。此版删除这些错误结论。

QX 在网页响应里注入 UI，不是 Safari Web Extension；自定义 scheme 通常需要用户点击并允许系统跳转。不会冒充官方扩展，不会修改 App 或下载 TF 安装包。

## 可选：深链诊断测试版

只在需要试候选参数时使用这个资源，先停用正式版：

```text
https://raw.githubusercontent.com/nori5555/blink-qx/main/blink-x-test.snippet.conf
```

测试版的帖子页显示 10 条未验证候选 + 2 个确认入口。仅 **首页/搜索的准确 URL** 标绿，`widget/home?url=...` 并未确认。候选返回首页只表示这一格式没有命中，不能推导 App 不支持帖子深链。

拿到开发者给出的帖子格式后，在脚本顶部填写 `POST_TEMPLATE`，再运行 `node build.js` 更新派生文件。模板支持 `{URL}` 原始当前 URL、`{ENC}` URL 编码后的 URL、`{ID}` 帖子 ID、`{USER}` 用户名。传 URL 查询参数时优先用 `{ENC}`，避免 `&` 截断参数。正式版配置有效模板后，点击悬浮按钮直接打开该模板。

## 技术行为与隐私

- 只改匹配路径的成功 HTML GET 文档；不改 API JSON、POST、3xx、图片/视频响应。
- 覆盖根页、常见入口、帖子、个人主页及 `/i/article/<id>`；页面内 SPA 导航继续使用按钮。
- **保留原 CSP 与所有响应头**。复用被 `script-src[-elem]` 允许的 nonce，并处理 style nonce；若存在冲突策略则原样放行，不为了按钮关闭整页安全策略。
- 通过 Shadow DOM 隔离样式；1.5 秒检查一次按钮是否被 SPA 移除。
- 不使用 Cookie、不发额外 HTTP 请求、不上传链接、不读取浏览历史。诊断版只在当前 `sessionStorage` 记录最后点击的候选，正式版不记。
- MITM 是 QX 本地 TLS 解密；账户仍需正确安装和信任自己的证书。响应编码/长度由 QX 处理，视频图片通常在 twimg 域名，本模块没添加它们。

QX **支持非越狱的本地脚本**：保存在“我的 iPhone / Quantumult X / Scripts”或“iCloud Drive / Quantumult X / Scripts”，规则尾部写脚本文件名。远程订阅已经托管，正常安装无需这个步骤。

## 测试与开发

```sh
node build.js
node --check blink-x.js
node --check blink-x-test.js
node test_qx.js
```

本地 Node 模拟和浏览器验证覆盖配置匹配、HTML 注入、CSP nonce、重复注入、测试/正式 UI；不等同于 QX 真机与 Blink 目标页面验收。真实帖子直达仍以 App 真机结果为准。

### 文件

- `blink-x.snippet.conf` / `blink-x.js`：正式版订阅及脚本
- `blink-x-test.snippet.conf` / `blink-x-test.js`：独立候选测试版
- `build.js`：生成派生资源与 `preview.html`
- `test_qx.js`：自动化回归
- `preview.html`：本地 UI 预览，`?test=1` 开测试模式

官方依据：[QX 配置样例](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf) · [QX remote snippet](https://github.com/crossutility/Quantumult-X/blob/master/sample-import-rewrite.snippet) · [Apple Universal Links](https://developer.apple.com/documentation/xcode/supporting-associated-domains)

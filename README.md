# Blink for X · Quantumult X v2.1.2

进入支持的 X/Twitter 帖子、个人主页或文章时，自动尝试打开 Blink 一次。底部真实链接仍可手动打开。

## 修复两条打开请求

X 的未登录网页有独立的外部 WebView 检查，会在某些环境下主动打开 `x-safari-https://redirect.x.com/...`，默认携带 `ct=rw-null`；同时插件在请求打开 Blink，因此可能出现 Safari 和 Blink 两条请求。已在公开的 X 入口脚本中定位并用其原函数复现这条 Safari 请求；此前把原因主要归于浏览器对自动点击的处理，判断不完整。

v2.1.2 在 X 的启动脚本前，用 `history.replaceState` 为支持页面补上 `ct=blink-qx`。已检查的 X 入口在 `ct` 非空时会跳过这段强制外部浏览器跳转。已有非空 `ct`、登录跳转参数和其他查询值会保留；不增加网络请求或历史条目。Blink 按钮的点击也停止冒泡到页面监听器，同时保留链接的默认打开动作。

这针对已定位的 X 分支；X 后续更新或其他浏览器自身行为仍需设备验证。脚本点击没有真实触摸权限，不保证每个浏览器都显示 App 确认框。

## 安装

QX → 设置 → **重写 → 引用 → 添加**，粘贴：

```text
https://raw.githubusercontent.com/nori5555/blink-qx/main/blink-x.snippet.conf
```

[一键添加到 QX](quantumult-x:///add-resource?remote-resource=%7B%22rewrite_remote%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2Fnori5555%2Fblink-qx%2Fmain%2Fblink-x.snippet.conf%2C%20tag%3DBlink%20for%20X%20v2.1.2%2C%20enabled%3Dtrue%22%5D%7D)

1. 停用旧版 Blink 重写资源，避免相同规则重叠；只启用这一份。
2. 开启重写和 MitM；QX 的 CA 证书须安装并信任。
3. 更新资源后，关闭旧 X 标签页，在 Safari 新开一个帖子或个人主页。页面会自动请求打开 Blink 一次。
4. 如果没有弹系统确认框，点击底部按钮；Safari 可能拦截缺少用户手势的自动 scheme 导航。首页、搜索、登录等非内容页面不自动打开。

资源自带 hostname 和脚本 HTTPS 地址；v2.1.2 固定脚本地址可避开旧版缓存。添加资源保留现有配置，不要用 snippet 覆盖主配置。

## 支持的路由

| 页面 | Blink 路由 |
|---|---|
| 帖子 | `blink://open/post/{ID}` |
| 帖子图片 | `blink://open/post/{ID}/photo/{1-4}` |
| 帖子视频 | `blink://open/post/{ID}/video/{1-4}` |
| 个人主页 | `blink://open/profile/{用户名}` |
| 文章 | `blink://open/article/{ID}` |

支持 `https://x.com`、`www.x.com`、`mobile.x.com` 及对应 `twitter.com` 主机。用户名 1–15 字符；ID 保持字符串不转 Number，避免丢失精度。页面内 SPA 切换后同步更新链接。

这次已移除旧版的所有猜测路由。`blink-x-test.snippet.conf` 仅保留为旧订阅地址兼容入口，内容与正式版相同，请二选一。

## 行为与隐私

- 默认 `AUTO_OPEN = true`：每个页面生命周期中，对同一 Blink 目标仅自动尝试一次；取消、失败、从 App 返回或重复渲染都不重试。同一页面切换至新的支持目标时可再次尝试，刷新页面可重新测试。
- 默认 `GUARD_X_SAFARI_REDIRECT = true`：仅对支持的内容页面，在 X 入口执行前补齐 `ct=blink-qx`；设为 `false` 可关闭此兼容处理。它与 `AUTO_OPEN` 独立，地址栏会保留这个非秘密标记。
- 后台标签页和正在编辑输入框时暂不自动打开，恢复前台或结束编辑后再处理。
- 不请求额外网络，不读取 Cookie/账户凭据，不上传 URL 或浏览记录。
- 自动尝试记录仅在页面内存中；`sessionStorage` 仅存关闭按钮的布尔标记，不持久保存帖子链接。
- 保留响应头和 CSP，复用允许的 script/style nonce；冲突或不支持的策略下原样放行。
- 只改成功的 HTML GET 响应；不改 API JSON、POST、跳转和媒体二进制。
- 这里仅发布插件、配置、说明和虚构输入的测试代码，不分发应用安装包、签名材料、抓包或账户数据。

## 本地脚本备用方式

如果设备加载远程脚本失败，把 [blink-x.js](https://raw.githubusercontent.com/nori5555/blink-qx/v2.1.2/blink-x.js) 存到“我的 iPhone/Quantumult X/Scripts”或“iCloud Drive/Quantumult X/Scripts”，停用远程资源，再按 `main-config-example.conf` 合并规则与 hostname。不要整份覆盖自己的配置。

需要恢复纯手动模式，可将本地脚本顶部 `AUTO_OPEN` 改成 `false`，或使用固定的 [v2.0.0 手动版订阅](https://raw.githubusercontent.com/nori5555/blink-qx/v2.0.0/blink-x.snippet.conf)；两种资源只启用一个。

## 验证范围

路由来自已分析版本使用的外部链接格式。回归覆盖 URL 校验、精度、HTML 注入、CSP、幂等性、订阅规则与旧地址兼容性；网页控件已做浏览器检查。自动测试不代替 QX/iOS Safari/Blink 的设备验收。

如果没有按钮，检查 QX 资源更新、MitM 命中、本地脚本/远程脚本加载与 CSP 日志。按钮被关闭后该 Safari 标签页会话内隐藏，新标签页可以重新显示。若按钮存在但 App 未直达，核对 App 是否支持表中的路由。

开发命令：

```sh
node build.js
node --check blink-x.js
node test_qx.js
```

官方配置格式：[remote rewrite snippet](https://github.com/crossutility/Quantumult-X/blob/master/sample-import-rewrite.snippet) · [QX URL scheme](https://github.com/crossutility/Quantumult-X/blob/master/url-scheme.md)

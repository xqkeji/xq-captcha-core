# xq-captcha-core

`xq-click-captcha` 与 `xq-slide-captcha` 的共享核心：请求传输、响应解析、回调、状态、选项合并、通用 UI 基础件与门面基类 `BaseCaptcha`。

两个验证码包只保留各自特有的交互实现，公开 API 与后端协议由 core 统一保证，避免两处重复维护导致行为漂移。

## 环境要求

- Node.js `^20.19.0 || >=22.12.0`
- 构建：unbuild；测试：Node 内置 `node:test`（无额外测试依赖）

## 使用

普通用户不直接安装本包——安装 `xq-click-captcha` 或 `xq-slide-captcha` 时会自动带入。

如果你想基于同一套后端协议实现新的验证码类型：

```ts
import {
  BaseCaptcha,
  CaptchaBehaviour,
  type CaptchaHooks,
  type BaseOptions,
  type CaptchaData,
} from 'xq-captcha-core';

// 1. 实现 CaptchaBehaviour：构建弹窗、附加交互、应用后端数据等
// 2. 定义 CaptchaHooks：日志前缀、captcha 类型、选择器、类名等
// 3. class MyCaptcha extends BaseCaptcha {}
```

`CaptchaBehaviour` 通过 `bindContext()` 接收基类注入的共享 `dom / state / options / submit`，不要自行创建 `Dom` 或 `State`，否则会与门面状态脱节。

## 导出

- 主入口 `xq-captcha-core`：含 `BaseCaptcha` / `CaptchaBehaviour` / `ModalHost` 等依赖 DOM 与 Bootstrap 的全部 API。
- 纯逻辑入口 `xq-captcha-core/logic`：只含不依赖 DOM 的解析/请求/选项 API，可在 Node 环境直接引用或测试。

## 开发与验证

```bash
npm install
npm run typecheck
npm test        # 14 项：响应解析、选项合并、transport、数据校验
npm run build   # dist/index.{mjs,cjs,d.ts} + dist/logic.*
```

## 发布

OIDC Trusted Publishing，打 `v*` tag 触发 workflow。必须先于两个消费包发布：

1. `xq-captcha-core`
2. `xq-click-captcha` / `xq-slide-captcha`

## 许可

AGPL-3.0-only © xqkeji.cn

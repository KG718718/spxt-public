# Batch 10: installation/login page and cloud browser component gate

Date: 2026-09-11. Implements the existing public Windows L2 plan; no business API or financial rule change.

## Source and scope

The entire source login.html and shared theme were read, together with the three required visual/interaction references. Original login had no first-Admin form; source theme still contained a private brand watermark. Both public-requirement probes failed before adaptation. The new public login page uses the reviewed layout/theme structure, K⁺-SESSION text, no external fonts/images/assets, no company mark or preset credentials. Theme prefixes and filename are public-specific. Original files are unchanged.

First-install form calls the existing public /api/setup handler, asks for an installer-chosen username and repeated password, locks duplicate submissions, preserves correctable inputs and clears secrets after creation. A failed or unconfirmed POST asks to check state instead of retrying or deleting data. Successful creation returns to login, not an automatic session. Existing/remote installations can reach the regular login form; malformed/unavailable setup responses do not present a new-install form. Error rendering uses textContent. Login retains the existing username/role/token handoff and same-origin cookies; it requires a valid successful response before navigation.

## Cloud browser boundary

New hosted-only component test serves the actual public HTML/theme and actual first-Admin HTTP handler in a fresh synthetic directory. Its login route and landing page are deliberately simulated: this proves UI request/handoff/error behavior, NOT complete application authentication or approval-page integration.

The test uses GitHub runner Edge with exact playwright-core 1.63.0 (registry integrity pinned; Apache-2.0; no transitive npm dependencies; devDependency only). No local browser, public file or company instance is created. The future production package must exclude this development dependency and all fixtures/evidence. Browser screenshots/report remain in Actions artifacts; they contain only synthetic data. Runtime exceptions fail the gate; deliberately injected setup 403/503 and transport errors are distinguished from unexpected console errors.

Checks include desktop/narrow rendering, readable measured text contrast, keyboard focus, disabled state, repeated passwords, unknown request result, duplicate suppression, real first Admin with empty business arrays, refresh preservation, synthetic login failure/success, service/malformed/remote-denial states. No full-system or installer claim.

## Third-party notice correction

A failing name-recognition probe showed ThirdPartyNotices.txt was missed by the earlier separator-required filename matcher. Collection now uses a shared tested matcher and records development-only dependencies explicitly. 27 license-policy checks pass in RAM, including eight notice names and three unrelated names. Original terms/attribution are retained, never rewritten as MIT.

## Verification status

Inline/page-test/license scripts pass syntax checks. Browser acceptance and locked dependency validation are pending this commit's hosted run. Native runtime, OCR, full service/pages and final package license/installation gates remain pending. No PR, main merge, Release, deployment, local public checkout or company data/service change.


### 首轮云端反例与最小修正

- 运行 34566868014 中 14 项页面交互通过，最终 console 门禁失败：模拟登录跳转页缺少 favicon，浏览器请求 /favicon.ico 返回 404。首次安装/login.html 本身已经使用空 data favicon。
- 只给测试专用跳转页补同样的 favicon；不放宽 console 零异常断言，不增加生产业务按钮，不冒充完整登录后业务验收。复跑结果待写入。

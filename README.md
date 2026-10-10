# 两地价 v0.2 · 个人云同步版

MUJI、UNIQLO、DECATHLON 的内地 / 香港商品对照、心愿单和出行清单。

**先打开 [DEPLOY.html](./DEPLOY.html) 或 [DEPLOY.md](./DEPLOY.md) 按步骤部署。**

## 三个位置，不要混淆

GitHub Pages 发布本仓库的静态网页；Supabase Free 保存已登录用户的购物资料；iCloud Drive 存你主动导出的 JSON 备份。不需要付费订阅即可按免费额度先使用，但平台规则可能变化，不承诺永久免费或永不暂停。

## 相比 v0.1 的改动

- 加入邮箱密码登录、Auth 身份检查和数据库准入名单，不开放网页注册。
- Supabase RLS 隔离每个用户的资料；公开配置拒绝管理密钥。
- 自动保存、回到页面检查更新、显式同步状态。
- 原子版本检查、幂等重试、断网草稿和分标签页恢复；按整个购物空间提示冲突，不自动合并。
- 兼容 v0.1 JSON；支持备份到用户选择的文件或浏览器下载。
- 采用相对路径，适配 GitHub Pages 仓库子路径；生产页面无第三方 CDN 依赖。
- 首次账户为空，不自动写入旧的示例商品。

## 本版没有承诺的功能

没有部署 Python 采集器、自动汇率服务、小程序自动抓取、自动 iCloud 写入、实时多人协作或完整离线 PWA。进入已登录页面后遇到断网可保留草稿；首次打开仍需要联网。

本版以整个 JSON 购物空间保存，客户端体积限制 2 MB、最多 3000 件商品，适合个人轻量使用，不用于大型商品数据库。每次保存会传输整个购物空间，请保留备份并适度清理过长历史。

## 密钥与数据

`config.js` 中只填 Project URL 和 `sb_publishable_` 公开密钥。不要上传网站密码、数据库密码、`sb_secret_`、`service_role`、个人数据备份或 SQLite 文件。`.gitignore` 不能替代手动核对网页上传文件。

SQL Editor 依次执行 `supabase/01-schema.sql`、自行填 UUID 的 `02-authorize.sql`、`03-check.sql`。必须保留 RLS。

## 测试

```bash
node --test tests/sync.test.cjs
```

浏览器 DOM 测试：`python3 tests/browser_test.py`（开发环境需安装 Playwright 和 Chromium）。此测试在 about:blank 注入本地页面，模拟存储、Auth/PostgREST 与下载捕获；不联系真正的 Supabase，也不改写浏览器访问策略。它验证应用逻辑和布局，不等于部署、权限策略或原生文件选择器已完成实测。

所有测试细节见 [TEST_REPORT.md](./TEST_REPORT.md)。真实上线后必须按 DEPLOY 中的双设备验收再检查一次。

## 官方参考

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Supabase Auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Free](https://supabase.com/pricing)

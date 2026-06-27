# 花店電商平台

全端花店電商應用，提供商品瀏覽、購物車、訂單管理與後台管理功能。

## 技術棧

| 層級 | 技術 | 版本 |
|------|------|------|
| Web 框架 | Express.js | 4.16.1 |
| 資料庫 | SQLite (better-sqlite3) | 12.8.0 |
| 認證 | jsonwebtoken (JWT HS256) | 9.0.2 |
| 密碼雜湊 | bcrypt | 6.0.0 |
| 前端框架 | Vue 3 (CDN) | — |
| 樣板引擎 | EJS | 5.0.1 |
| CSS 框架 | Tailwind CSS | 4.2.2 |
| API 文件 | swagger-jsdoc (OpenAPI 3.0.3) | 6.2.8 |
| 測試框架 | Vitest + supertest | 2.1.9 / 7.2.2 |
| ID 生成 | uuid v4 | 11.1.0 |

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env，至少填入：
# JWT_SECRET=<任意長字串>

# 3. 啟動伺服器（自動建立 SQLite DB 與種子資料）
npm start

# 4. 開啟瀏覽器
open http://localhost:3001
```

預設管理員帳號（種子資料）：
- Email：`admin@hexschool.com`
- 密碼：`12345678`

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm start` | 建置 CSS 後啟動伺服器 |
| `npm run dev:server` | 僅啟動伺服器（開發時使用） |
| `npm run dev:css` | 監聽 Tailwind CSS 變更並即時編譯 |
| `npm run css:build` | 生產版本壓縮 CSS |
| `npm test` | 執行所有測試 |
| `npm run openapi` | 從 JSDoc 重新生成 openapi.json |

## 文件索引

| 文件 | 內容 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 目錄結構、啟動流程、API 路由表、DB Schema、中介軟體說明 |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 命名規則、新增 API/DB 步驟、環境變數表、JSDoc 規範 |
| [FEATURES.md](./FEATURES.md) | 功能清單、行為描述、業務邏輯、錯誤碼 |
| [TESTING.md](./TESTING.md) | 測試結構、執行順序、撰寫新測試步驟 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新記錄 |

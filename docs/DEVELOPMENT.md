# DEVELOPMENT.md

## 命名規則

| 類型 | 規則 | 範例 |
|------|------|------|
| 路由檔案 | camelCase + `Routes` 後綴 | `authRoutes.js`、`adminProductRoutes.js` |
| Middleware 檔案 | camelCase + `Middleware` 後綴 | `authMiddleware.js`、`sessionMiddleware.js` |
| 測試檔案 | 功能名稱 + `.test.js` | `auth.test.js`、`adminOrders.test.js` |
| Vue 頁面腳本 | kebab-case | `admin-products.js`、`order-detail.js` |
| EJS 頁面模板 | kebab-case | `product-detail.ejs`、`order-detail.ejs` |
| 資料庫欄位 | snake_case | `user_id`、`created_at`、`recipient_name` |
| API 請求 body 欄位 | camelCase | `productId`、`recipientName`、`recipientAddress` |
| 環境變數 | UPPER_SNAKE_CASE | `JWT_SECRET`、`ECPAY_HASH_KEY` |

---

## 模組系統

專案使用 **CommonJS**（`require` / `module.exports`），vitest.config.js 例外（使用 ESM `import`）。

```javascript
// 引入
const express = require('express');
const db = require('../database');

// 匯出
module.exports = router;
```

---

## 新增 API 路由

1. **建立路由檔案**：在 `src/routes/` 新增 `featureRoutes.js`
   ```javascript
   const express = require('express');
   const router = express.Router();
   // ... 定義路由
   module.exports = router;
   ```

2. **定義路由與業務邏輯**：根據需要掛載 middleware（`authMiddleware`、`adminMiddleware`）

3. **掛載至 app.js**：
   ```javascript
   const featureRoutes = require('./src/routes/featureRoutes');
   app.use('/api/feature', featureRoutes);
   ```

4. **加入 OpenAPI JSDoc**：在每個端點前加 `@openapi` 註解（格式見下方 JSDoc 說明）

5. **重新生成 API 文件**：
   ```bash
   npm run openapi
   ```

6. **撰寫測試**：在 `tests/` 新增 `feature.test.js`，並將檔案加入 `vitest.config.js` 的 `sequence.files` 陣列

---

## 新增 Middleware

1. 在 `src/middleware/` 新增 `featureMiddleware.js`：
   ```javascript
   function featureMiddleware(req, res, next) {
     // 處理邏輯
     next();
   }
   module.exports = featureMiddleware;
   ```

2. 在 `app.js` 全域掛載（置於路由掛載之前）：
   ```javascript
   const featureMiddleware = require('./src/middleware/featureMiddleware');
   app.use(featureMiddleware);
   ```
   或在特定路由掛載：
   ```javascript
   router.use(featureMiddleware);
   ```

---

## 新增資料庫表格

在 `src/database.js` 的 `initializeDatabase()` 函式內，於 `db.exec()` 的 SQL 字串中加入新的 `CREATE TABLE IF NOT EXISTS` 陳述式：

```javascript
db.exec(`
  -- 現有表格 ...

  CREATE TABLE IF NOT EXISTS new_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
```

> 注意：`better-sqlite3` 使用同步 API，所有資料庫操作均為同步呼叫。

---

## 環境變數

檔案：`.env`（本機）、`.env.example`（範本，進 git）

| 變數 | 用途 | 必要 | 預設值 |
|------|------|------|--------|
| `JWT_SECRET` | JWT 簽署密鑰 | **必填** | 無（未設定則啟動失敗） |
| `BASE_URL` | 後端基礎 URL | 選填 | `http://localhost:3001` |
| `FRONTEND_URL` | 前端 URL（CORS 用途） | 選填 | `http://localhost:5173` |
| `ADMIN_EMAIL` | 種子管理員 Email | 選填 | `admin@hexschool.com` |
| `ADMIN_PASSWORD` | 種子管理員密碼 | 選填 | `12345678` |
| `ECPAY_MERCHANT_ID` | 綠界特店編號 | 選填（金流未啟用） | `3002607`（staging） |
| `ECPAY_HASH_KEY` | 綠界 Hash Key | 選填 | — |
| `ECPAY_HASH_IV` | 綠界 Hash IV | 選填 | — |
| `ECPAY_ENV` | 綠界環境 | 選填 | `staging` |

> 特殊：`NODE_ENV=test` 時，`seedAdminUser()` 使用 `bcrypt` saltRounds = 1（加快測試速度），生產環境使用 10。

---

## OpenAPI JSDoc 格式

所有 API 端點須在路由處理器前加入 `@openapi` JSDoc 區塊，swagger-jsdoc 會自動解析並生成 `openapi.json`。

**範例（帶認證的 POST 端點）：**

```javascript
/**
 * @openapi
 * /api/cart:
 *   post:
 *     summary: 加入商品到購物車
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []     # JWT Bearer token（在 swagger-config.js 定義）
 *       - sessionId: []      # X-Session-Id header
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *     responses:
 *       200:
 *         description: 已加入購物車
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                 error:
 *                   type: string
 *                   nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: 參數缺失或庫存不足
 *       404:
 *         description: 商品不存在
 */
router.post('/', dualAuth, (req, res) => { ... });
```

**Security schemes**（定義於 `swagger-config.js`）：
- `bearerAuth`：HTTP Bearer JWT
- `sessionId`：`X-Session-Id` header（apiKey 類型）

執行 `npm run openapi` 後，`openapi.json` 會更新於專案根目錄。

---

## 計畫歸檔流程

### 命名格式

```
docs/plans/YYYY-MM-DD-<feature-name>.md
```

範例：`docs/plans/2026-04-20-payment-integration.md`

### 計畫文件結構

```markdown
# 功能名稱

## User Story
身為 <角色>，我希望 <功能>，以便 <效益>。

## Spec
- 功能規格點 1
- 功能規格點 2

## Tasks
- [ ] 任務 1
- [ ] 任務 2
- [x] 已完成任務
```

### 功能完成後

1. 將計畫檔案移至 `docs/plans/archive/`
2. 更新 `docs/FEATURES.md`（將功能標記為完成，補充行為描述）
3. 更新 `docs/CHANGELOG.md`（新增版本記錄）

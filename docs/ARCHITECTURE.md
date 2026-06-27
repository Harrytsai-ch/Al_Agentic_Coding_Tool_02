# ARCHITECTURE.md

## 目錄結構

```
2026-ai-adv-homework-course01/
├── server.js                      # 進入點：驗證 JWT_SECRET、啟動 HTTP server (port 3001)
├── app.js                         # Express app 設定：middleware 掛載、路由掛載、錯誤處理
├── package.json                   # 依賴與 npm scripts
├── vitest.config.js               # Vitest 設定（測試順序、hook timeout）
├── swagger-config.js              # OpenAPI 3.0.3 規格定義（info、servers、securitySchemes）
├── generate-openapi.js            # 執行 swagger-jsdoc 生成 openapi.json
├── .env.example                   # 環境變數範本（9 個變數）
├── .env                           # 本機環境變數（不進 git）
├── database.sqlite                # SQLite 資料庫檔案（首次啟動自動建立，不進 git）
│
├── src/
│   ├── database.js                # DB 初始化：建表、seed admin、seed 8 個花卉商品
│   └── middleware/
│   │   ├── sessionMiddleware.js   # 提取 X-Session-Id header → req.sessionId
│   │   ├── authMiddleware.js      # 驗證 JWT Bearer token → req.user
│   │   ├── adminMiddleware.js     # 檢查 req.user.role === 'admin'
│   │   └── errorHandler.js        # 全域錯誤處理，遮蔽內部錯誤細節
│   └── routes/
│       ├── authRoutes.js          # POST /register、POST /login、GET /profile
│       ├── productRoutes.js       # GET /products、GET /products/:id（公開）
│       ├── cartRoutes.js          # 購物車 CRUD（雙模式認證：JWT 或 session）
│       ├── orderRoutes.js         # 訂單建立、查詢、付款模擬（需登入）
│       ├── adminProductRoutes.js  # 管理員商品 CRUD（需 admin 角色）
│       ├── adminOrderRoutes.js    # 管理員訂單查詢（需 admin 角色）
│       └── pageRoutes.js          # EJS 頁面渲染路由
│
├── public/
│   ├── js/
│   │   ├── api.js                 # apiFetch() 封裝：自動帶 Auth headers、處理 401 導頁
│   │   ├── auth.js                # Auth singleton：token/user 管理、session ID 生成
│   │   ├── notification.js        # Toast 通知元件（success/error/warning/info）
│   │   ├── header-init.js         # 頁面載入後更新 header 狀態與購物車數量徽章
│   │   └── pages/
│   │       ├── index.js           # Vue 3 app：商品列表 + 分頁
│   │       ├── product-detail.js  # Vue 3 app：商品詳情 + 加入購物車
│   │       ├── cart.js            # Vue 3 app：購物車 CRUD
│   │       ├── checkout.js        # Vue 3 app：結帳表單 + 建立訂單
│   │       ├── login.js           # Vue 3 app：登入 / 註冊 Tab 切換
│   │       ├── orders.js          # Vue 3 app：使用者訂單列表
│   │       ├── order-detail.js    # Vue 3 app：訂單詳情 + 模擬付款
│   │       ├── admin-products.js  # Vue 3 app：後台商品管理
│   │       └── admin-orders.js    # Vue 3 app：後台訂單管理
│   ├── css/
│   │   ├── input.css              # Tailwind CSS 輸入檔
│   │   └── output.css             # 編譯後的 CSS（不進 git）
│   └── stylesheets/               # 補充樣式
│
├── views/
│   ├── layouts/
│   │   ├── front.ejs              # 前台共用版型（head、header、footer、notification）
│   │   └── admin.ejs              # 後台共用版型
│   ├── pages/
│   │   ├── index.ejs              # 首頁（商品列表）
│   │   ├── product-detail.ejs     # 商品詳情頁
│   │   ├── cart.ejs               # 購物車頁
│   │   ├── checkout.ejs           # 結帳頁
│   │   ├── login.ejs              # 登入 / 註冊頁
│   │   ├── orders.ejs             # 我的訂單列表
│   │   ├── order-detail.ejs       # 訂單詳情頁
│   │   ├── 404.ejs                # 404 錯誤頁
│   │   └── admin/
│   │       ├── products.ejs       # 後台商品管理頁
│   │       └── orders.ejs         # 後台訂單管理頁
│   └── partials/                  # 可重用局部模板（head、header、footer、notification 等）
│
├── tests/
│   ├── setup.js                   # 測試輔助函式：getAdminToken()、registerUser()
│   ├── auth.test.js               # 認證端點測試
│   ├── products.test.js           # 商品端點測試
│   ├── cart.test.js               # 購物車端點測試（訪客 + 已登入）
│   ├── orders.test.js             # 訂單端點測試
│   ├── adminProducts.test.js      # 管理員商品 CRUD 測試
│   └── adminOrders.test.js        # 管理員訂單查詢測試
│
└── docs/
    ├── README.md
    ├── ARCHITECTURE.md
    ├── DEVELOPMENT.md
    ├── FEATURES.md
    ├── TESTING.md
    ├── CHANGELOG.md
    └── plans/
        └── archive/               # 已完成功能的計畫文件
```

---

## 伺服器啟動流程

```
node server.js
  │
  ├─ 1. 檢查 JWT_SECRET（未設定則 throw 並終止）
  ├─ 2. require('app') → require('src/database') → initializeDatabase()
  │       ├─ 建立 5 張表（IF NOT EXISTS）
  │       ├─ 啟用 WAL mode 與 foreign_keys
  │       ├─ seedAdminUser()（若 admin 帳號不存在則建立）
  │       └─ seedProducts()（若 products 表為空則寫入 8 筆）
  ├─ 3. app.js 掛載 middleware（sessionMiddleware、JSON parser、CORS、static files）
  ├─ 4. 掛載所有路由
  └─ 5. app.listen(3001)
```

---

## API 路由總覽

### 認證路由（`/api/auth`）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/auth/register` | 無 | 註冊新帳號，回傳 JWT |
| POST | `/api/auth/login` | 無 | 登入，回傳 JWT |
| GET | `/api/auth/profile` | JWT | 取得目前使用者資訊 |

### 商品路由（`/api/products`）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/products` | 無 | 商品列表（含分頁） |
| GET | `/api/products/:id` | 無 | 單一商品詳情 |

### 購物車路由（`/api/cart`）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/cart` | JWT 或 Session | 查看購物車 |
| POST | `/api/cart` | JWT 或 Session | 加入商品至購物車 |
| PATCH | `/api/cart/:itemId` | JWT 或 Session | 修改購物車商品數量 |
| DELETE | `/api/cart/:itemId` | JWT 或 Session | 移除購物車商品 |

### 訂單路由（`/api/orders`）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| POST | `/api/orders` | JWT | 從購物車建立訂單 |
| GET | `/api/orders` | JWT | 取得使用者訂單列表 |
| GET | `/api/orders/:id` | JWT | 取得訂單詳情 |
| PATCH | `/api/orders/:id/pay` | JWT | 模擬付款（success / fail） |

### 管理員商品路由（`/api/admin/products`）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/admin/products` | JWT + admin | 取得所有商品（含分頁） |
| POST | `/api/admin/products` | JWT + admin | 新增商品 |
| PUT | `/api/admin/products/:id` | JWT + admin | 更新商品 |
| DELETE | `/api/admin/products/:id` | JWT + admin | 刪除商品（有 pending 訂單時禁止） |

### 管理員訂單路由（`/api/admin/orders`）

| 方法 | 路徑 | 認證 | 說明 |
|------|------|------|------|
| GET | `/api/admin/orders` | JWT + admin | 取得所有訂單（可按狀態篩選） |
| GET | `/api/admin/orders/:id` | JWT + admin | 取得訂單詳情（含使用者資訊） |

### 頁面路由（EJS 渲染）

| 路徑 | 渲染頁面 |
|------|---------|
| `GET /` | 首頁（商品列表） |
| `GET /products/:id` | 商品詳情 |
| `GET /cart` | 購物車 |
| `GET /checkout` | 結帳 |
| `GET /login` | 登入 / 註冊 |
| `GET /orders` | 我的訂單 |
| `GET /orders/:id` | 訂單詳情 |
| `GET /admin/products` | 後台商品管理 |
| `GET /admin/orders` | 後台訂單管理 |

---

## 統一回應格式

所有 API 端點均使用以下 JSON 結構回應：

```json
{
  "data": { ... },
  "error": null,
  "message": "成功"
}
```

**成功範例（GET /api/products）：**
```json
{
  "data": {
    "products": [...],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  },
  "error": null,
  "message": "成功"
}
```

**失敗範例（400 驗證錯誤）：**
```json
{
  "data": null,
  "error": "VALIDATION_ERROR",
  "message": "productId 為必填欄位"
}
```

**錯誤碼（error 欄位值）：**

| error | HTTP 狀態 | 說明 |
|-------|-----------|------|
| `VALIDATION_ERROR` | 400 | 欄位驗證失敗 |
| `CART_EMPTY` | 400 | 購物車為空 |
| `STOCK_INSUFFICIENT` | 400 | 庫存不足 |
| `INVALID_STATUS` | 400 | 訂單狀態不允許此操作 |
| `UNAUTHORIZED` | 401 | 未提供或無效 token |
| `FORBIDDEN` | 403 | 權限不足（非 admin） |
| `NOT_FOUND` | 404 | 資源不存在 |
| `CONFLICT` | 409 | 資源衝突（如 email 重複、商品有 pending 訂單） |

---

## 認證與授權機制

### Middleware 串聯

```
請求進入
  │
  ├─ sessionMiddleware（全域掛載）
  │   └─ 提取 X-Session-Id header → req.sessionId
  │
  ├─ 一般 API：不套用 authMiddleware
  │
  ├─ 需登入 API（/api/auth/profile、/api/orders/*）：
  │   └─ authMiddleware → 驗證 Bearer token → req.user
  │
  ├─ 管理員 API（/api/admin/*）：
  │   └─ authMiddleware → adminMiddleware → 驗證 role === 'admin'
  │
  └─ 購物車 API（/api/cart/*）：
      └─ dualAuth（內建於 cartRoutes）
```

### JWT 參數

| 項目 | 值 |
|------|-----|
| 演算法 | HS256 |
| 有效期 | 7 天 |
| Payload | `{ userId, email, role }` |
| 傳遞方式 | `Authorization: Bearer <token>` |

### 購物車雙模式認證（dualAuth）

```
Authorization: Bearer <token> 存在且有效
  → req.user = { userId, email, role }
  → 以 user_id 識別購物車

Authorization header 不存在，但 X-Session-Id 存在
  → req.sessionId 已由 sessionMiddleware 設定
  → 以 session_id 識別購物車（訪客模式）

兩者皆不存在（或 Bearer token 無效）
  → 401 UNAUTHORIZED
```

---

## 資料庫 Schema

### users

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PK | UUID v4 |
| email | TEXT | UNIQUE, NOT NULL | 使用者 Email |
| password_hash | TEXT | NOT NULL | bcrypt 雜湊（10 rounds；測試環境 1 round） |
| name | TEXT | NOT NULL | 顯示名稱 |
| role | TEXT | NOT NULL, DEFAULT 'user', CHECK IN ('user','admin') | 角色 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | 建立時間（UTC ISO 字串） |

### products

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PK | UUID v4 |
| name | TEXT | NOT NULL | 商品名稱 |
| description | TEXT | — | 商品描述 |
| price | INTEGER | NOT NULL, CHECK(price > 0) | 價格（新台幣，不含小數） |
| stock | INTEGER | NOT NULL, DEFAULT 0, CHECK(stock >= 0) | 庫存數量 |
| image_url | TEXT | — | 商品圖片 URL |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | 建立時間 |
| updated_at | TEXT | NOT NULL, DEFAULT datetime('now') | 最後更新時間 |

### cart_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PK | UUID v4 |
| session_id | TEXT | — | 訪客 session ID（與 user_id 二擇一） |
| user_id | TEXT | FK → users.id | 已登入使用者 ID |
| product_id | TEXT | NOT NULL, FK → products.id | 商品 ID |
| quantity | INTEGER | NOT NULL, DEFAULT 1, CHECK(quantity > 0) | 數量 |

> 注意：`session_id` 與 `user_id` 不強制互斥（資料庫層無約束），由應用程式邏輯決定使用哪個欄位。

### orders

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PK | UUID v4 |
| order_no | TEXT | UNIQUE, NOT NULL | 人類可讀訂單號（格式：`ORD-YYYYMMDD-XXXXX`） |
| user_id | TEXT | NOT NULL, FK → users.id | 下單使用者 |
| recipient_name | TEXT | NOT NULL | 收件人姓名 |
| recipient_email | TEXT | NOT NULL | 收件人 Email |
| recipient_address | TEXT | NOT NULL | 收件地址 |
| total_amount | INTEGER | NOT NULL | 訂單總金額 |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','paid','failed') | 訂單狀態 |
| created_at | TEXT | NOT NULL, DEFAULT datetime('now') | 建立時間 |

### order_items

| 欄位 | 型別 | 約束 | 說明 |
|------|------|------|------|
| id | TEXT | PK | UUID v4 |
| order_id | TEXT | NOT NULL, FK → orders.id | 所屬訂單 |
| product_id | TEXT | NOT NULL, FK → order_items.product_id（商品 snapshot） | 商品 ID |
| product_name | TEXT | NOT NULL | 下單時的商品名稱快照 |
| product_price | INTEGER | NOT NULL | 下單時的商品價格快照 |
| quantity | INTEGER | NOT NULL | 購買數量 |

---

## ECPay 整合現況

目前 ECPay 相關環境變數（`ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`、`ECPAY_ENV`）已預留在 `.env.example` 中，但**尚未串接真實金流**。

付款功能目前透過 `PATCH /api/orders/:id/pay` 端點模擬：
- `action: "success"` → 訂單狀態更新為 `paid`
- `action: "fail"` → 訂單狀態更新為 `failed`
- 只有 `status === 'pending'` 的訂單可執行此操作

---

## SQLite 設定

```javascript
db.pragma('journal_mode = WAL');  // 提升並發讀取效能
db.pragma('foreign_keys = ON');   // 強制外鍵約束
```

資料庫檔案路徑：`<project_root>/database.sqlite`（由 `src/database.js` 決定，相對於該檔案的上一層）。

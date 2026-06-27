# CHANGELOG.md

## [1.1.0] - 2026-04-19

### 新增

**綠界 AIO 金流串接（本地端模式）**
- `src/services/ecpay.js`：SHA256 CheckMacValue、AIO 送單參數、`QueryTradeInfo/V5` 主動查詢
- `POST /api/orders/:id/ecpay`：產生送單所需 `actionUrl` 與參數，並指派永久 `MerchantTradeNo`
- `GET /api/orders/:id/payment-status`：主動呼叫綠界查詢 API，依 `TradeStatus` 同步訂單狀態
- `POST /orders/payment-return`：接收綠界瀏覽器 POST，解析 `MerchantTradeNo` 後轉址至 `/orders/:id?payment=verifying`
- `orders` 表新增欄位：`merchant_trade_no`、`ecpay_trade_no`、`payment_type`、`paid_at`
- 結帳頁：送出訂單後自動 submit 表單到綠界付款頁
- 訂單詳情頁：新增「前往綠界付款」與「重新查詢付款結果」按鈕；付款返回後自動輪詢查詢 API 直到結果確認

### 變更
- 訂單詳情頁移除「模擬付款成功 / 失敗」按鈕（原 `PATCH /api/orders/:id/pay` 仍保留給測試使用）

### 架構注意
- 本機環境無法接收綠界 Server Notify（ReturnURL），付款結果一律以主動查詢 `QueryTradeInfo/V5` 為最終事實
- `MerchantTradeNo` 為 `F + Unix 時間戳 + 5 碼隨機`，總長 ≤16 字，符合綠界 20 字上限與永久唯一要求

## [1.0.0] - 2026-04-19

### 新增

**使用者認證**
- POST /api/auth/register：使用者註冊（bcrypt 加密、JWT 回傳）
- POST /api/auth/login：使用者登入
- GET /api/auth/profile：取得個人資料（需認證）

**商品**
- GET /api/products：公開商品列表（分頁）
- GET /api/products/:id：公開商品詳情

**購物車（雙模式：JWT 或 X-Session-Id）**
- GET /api/cart：查看購物車
- POST /api/cart：加入商品（累加數量）
- PATCH /api/cart/:itemId：修改數量
- DELETE /api/cart/:itemId：移除商品

**訂單**
- POST /api/orders：從購物車建立訂單（原子 transaction：建訂單、扣庫存、清購物車）
- GET /api/orders：查詢使用者訂單列表
- GET /api/orders/:id：查詢訂單詳情
- PATCH /api/orders/:id/pay：模擬付款（success/fail）

**管理員**
- GET /api/admin/products：管理員商品列表
- POST /api/admin/products：新增商品
- PUT /api/admin/products/:id：更新商品
- DELETE /api/admin/products/:id：刪除商品（有 pending 訂單時禁止）
- GET /api/admin/orders：管理員訂單列表（支援狀態篩選）
- GET /api/admin/orders/:id：管理員訂單詳情（含使用者資訊）

**前端（EJS + Vue 3 CDN）**
- 首頁商品列表、商品詳情、購物車、結帳、登入/註冊頁
- 使用者訂單列表、訂單詳情（含付款模擬）
- 後台商品管理、後台訂單管理

**基礎建設**
- SQLite 資料庫自動初始化（WAL 模式、外鍵約束）
- 種子資料：管理員帳號、8 筆花卉商品
- OpenAPI 3.0.3 規格（swagger-jsdoc）
- Vitest 測試套件（6 個測試檔案，順序執行）
- Tailwind CSS 4.2 建置流程

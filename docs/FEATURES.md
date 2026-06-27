# FEATURES.md

## 功能完成狀態總覽

| 功能模組 | 狀態 |
|---------|------|
| 使用者認證（註冊/登入/個人資料） | 完成 |
| 商品列表與詳情（公開） | 完成 |
| 購物車（訪客 + 已登入雙模式） | 完成 |
| 訂單建立（從購物車） | 完成 |
| 訂單查詢（使用者自己的訂單） | 完成 |
| 付款模擬 | 完成 |
| 管理員商品 CRUD | 完成 |
| 管理員訂單查詢 | 完成 |
| 真實金流（ECPay） | 未完成（預留 env vars） |

---

## 1. 使用者認證

### 1.1 註冊（POST /api/auth/register）

**驗證規則：**
- `email`：必填，符合 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` 格式
- `password`：必填，最少 6 個字元
- `name`：必填

**行為描述：**
系統以 bcrypt（10 rounds）雜湊密碼後存入 `users` 表，同時以 UUID v4 生成使用者 ID。若 email 已存在回 409。成功後回傳使用者資訊（不含密碼）與有效期 7 天的 JWT token。

**回應（201）：**
```json
{
  "data": {
    "user": { "id": "...", "email": "...", "name": "...", "role": "user" },
    "token": "<JWT>"
  },
  "error": null,
  "message": "註冊成功"
}
```

**錯誤情境：**
- 400：email/password/name 缺失或格式錯誤
- 409：email 已被使用

### 1.2 登入（POST /api/auth/login）

**行為描述：**
以 email 查詢使用者，若不存在或 `bcrypt.compare` 失敗，一律回傳 401（不區分「帳號不存在」與「密碼錯誤」，避免帳號枚舉攻擊）。成功回傳 JWT token（有效 7 天）。

**請求 body（必填）：** `email`、`password`

**錯誤情境：**
- 401：帳號不存在或密碼錯誤

### 1.3 個人資料（GET /api/auth/profile）

**認證：** JWT Bearer token 必填

**回應（200）：**
```json
{
  "data": { "id": "...", "email": "...", "name": "...", "role": "user", "created_at": "..." },
  "error": null,
  "message": "成功"
}
```

**錯誤情境：**
- 401：未提供 token 或 token 無效
- 404：token 有效但使用者已被刪除

---

## 2. 商品

### 2.1 商品列表（GET /api/products）

**查詢參數：**

| 參數 | 預設值 | 最大值 | 說明 |
|------|--------|--------|------|
| `page` | 1 | — | 頁碼 |
| `limit` | 10 | 100 | 每頁筆數 |

**行為描述：**
依 `created_at DESC` 排序。回傳商品陣列與分頁資訊（total、page、limit、totalPages）。

**回應（200）：**
```json
{
  "data": {
    "products": [
      { "id": "...", "name": "粉色玫瑰花束", "price": 1680, "stock": 30, "image_url": "...", "description": "..." }
    ],
    "pagination": { "total": 8, "page": 1, "limit": 10, "totalPages": 1 }
  },
  "error": null,
  "message": "成功"
}
```

### 2.2 商品詳情（GET /api/products/:id）

回傳單一商品的完整資訊（含 `description`、`created_at`、`updated_at`）。

**錯誤情境：**
- 404：商品不存在

---

## 3. 購物車（雙模式認證）

### 雙模式認證機制

購物車 API 使用內建的 `dualAuth` middleware（非 authMiddleware），依以下優先順序識別使用者：

1. `Authorization: Bearer <token>` 存在且有效 → 使用 `user_id` 識別購物車
2. `Authorization` header 不存在，但 `X-Session-Id` header 存在 → 使用 `session_id` 識別購物車（訪客模式）
3. 若 Bearer token 存在但無效 → **立即回 401**（不 fallback 到 session）
4. 兩者皆不存在 → 401

> 前端 `auth.js` 的 `getSessionId()` 方法會在 `localStorage` 中生成並快取一個 UUID，作為訪客的 session ID。

### 3.1 查看購物車（GET /api/cart）

**行為描述：**
根據識別方式（user_id 或 session_id）查詢 `cart_items`，JOIN `products` 取得商品即時資訊（名稱、價格、庫存、圖片）。`total` 欄位為所有品項的 `price × quantity` 總和。

**回應（200）：**
```json
{
  "data": {
    "items": [
      {
        "id": "cart-item-uuid",
        "product_id": "product-uuid",
        "quantity": 2,
        "product": { "name": "粉色玫瑰花束", "price": 1680, "stock": 30, "image_url": "..." }
      }
    ],
    "total": 3360
  },
  "error": null,
  "message": "成功"
}
```

### 3.2 加入購物車（POST /api/cart）

**請求 body：**
| 欄位 | 必填 | 預設值 | 說明 |
|------|------|--------|------|
| `productId` | 是 | — | 商品 UUID |
| `quantity` | 否 | 1 | 正整數 |

**行為描述（數量累加）：**
若該商品已在購物車中（相同 user_id 或 session_id），**累加**數量而非新增一筆。累加後若超出庫存則回 400。若商品不在購物車，直接插入新的 cart_item。

**錯誤情境：**
- 400：`productId` 未提供、`quantity` 非正整數、庫存不足（`STOCK_INSUFFICIENT`）
- 404：商品不存在

### 3.3 修改數量（PATCH /api/cart/:itemId）

**請求 body：** `quantity`（必填，正整數）

**行為描述：**
直接**設定**為指定數量（非累加）。設定前檢查庫存，若超出則回 400。

**錯誤情境：**
- 400：庫存不足
- 404：購物車品項不存在（或不屬於此使用者 / session）

### 3.4 移除商品（DELETE /api/cart/:itemId）

**行為描述：**
刪除指定購物車品項。刪除前確認品項屬於此使用者 / session，否則回 404。

---

## 4. 訂單

### 4.1 建立訂單（POST /api/orders）

**認證：** JWT 必填（不接受 session 模式，訪客需先登入）

**請求 body（皆為必填）：**
| 欄位 | 說明 |
|------|------|
| `recipientName` | 收件人姓名 |
| `recipientEmail` | 收件人 Email（需符合 email 格式） |
| `recipientAddress` | 收件地址 |

**業務邏輯（Transaction）：**

以下四個步驟在 `db.transaction()` 內原子執行，任一步驟失敗整體 rollback：

1. **讀取購物車**：查詢當前使用者的 `cart_items`（JOIN `products`）
2. **庫存驗證**：若任何品項數量超出庫存，回 400 並列出不足商品名稱
3. **計算總金額**：`Σ(price × quantity)`
4. **建立訂單**：
   - 在 `orders` 插入一筆（生成 `ORD-YYYYMMDD-XXXXX` 格式訂單號）
   - 在 `order_items` 插入每個品項（快照商品名稱、價格，商品修改不影響歷史訂單）
   - `products.stock -= quantity`（每個商品）
   - `DELETE FROM cart_items WHERE user_id = ?`（清空購物車）

**訂單號格式：** `ORD-YYYYMMDD-XXXXX`（XXXXX 為 UUID 前 5 碼大寫，範例：`ORD-20260419-A3F9B`）

**回應（201）：**
```json
{
  "data": {
    "id": "...",
    "order_no": "ORD-20260419-A3F9B",
    "total_amount": 5040,
    "status": "pending",
    "items": [
      { "product_name": "粉色玫瑰花束", "product_price": 1680, "quantity": 3 }
    ],
    "created_at": "2026-04-19T10:00:00"
  },
  "error": null,
  "message": "訂單建立成功"
}
```

**錯誤情境：**
- 400：必填欄位缺失、email 格式錯誤、購物車為空（`CART_EMPTY`）、庫存不足（`STOCK_INSUFFICIENT`）

### 4.2 訂單列表（GET /api/orders）

回傳當前使用者的所有訂單（`id`、`order_no`、`total_amount`、`status`、`created_at`），依 `created_at DESC` 排序。

### 4.3 訂單詳情（GET /api/orders/:id）

驗證訂單 `user_id` 必須等於當前使用者，防止跨使用者存取。回傳完整訂單欄位 + `items` 陣列。

### 4.4 付款模擬（PATCH /api/orders/:id/pay）

**請求 body：** `action`（必填，只接受 `"success"` 或 `"fail"`）

**行為描述：**

| action | 訂單狀態變更 | 說明 |
|--------|------------|------|
| `"success"` | `pending` → `paid` | 模擬付款成功 |
| `"fail"` | `pending` → `failed` | 模擬付款失敗 |

只有 `status === 'pending'` 的訂單可呼叫此 API，否則回 400（`INVALID_STATUS`）。

---

## 5. 管理員功能

### 5.1 管理員商品列表（GET /api/admin/products）

與公開商品列表相同格式，支援 `page` / `limit` 分頁。需 JWT + admin 角色。

### 5.2 新增商品（POST /api/admin/products）

**請求 body：**
| 欄位 | 必填 | 驗證 |
|------|------|------|
| `name` | 是 | 非空字串 |
| `price` | 是 | 正整數（> 0） |
| `stock` | 是 | 非負整數（>= 0） |
| `description` | 否 | 字串 |
| `image_url` | 否 | 字串 |

**回應（201）：** 新建商品的完整資訊（含 `created_at`、`updated_at`）

### 5.3 更新商品（PUT /api/admin/products/:id）

支援部分更新（只傳需修改的欄位）。更新時自動設定 `updated_at = datetime('now')`。驗證規則與新增相同（若欄位存在才驗證）。

**錯誤情境：**
- 400：`price` <= 0 或 `stock` < 0
- 404：商品不存在

### 5.4 刪除商品（DELETE /api/admin/products/:id）

**行為描述：**
刪除前檢查該商品是否有 `status = 'pending'` 的訂單明細（JOIN `order_items` → `orders`）。若有，回 409（`CONFLICT`），禁止刪除，避免影響進行中的訂單。

**錯誤情境：**
- 404：商品不存在
- 409：商品有 pending 訂單，無法刪除

### 5.5 管理員訂單列表（GET /api/admin/orders）

**查詢參數：**

| 參數 | 說明 |
|------|------|
| `page` | 頁碼（預設 1） |
| `limit` | 每頁筆數（預設 10） |
| `status` | 篩選訂單狀態：`pending` / `paid` / `failed`（不傳則回傳全部） |

依 `created_at DESC` 排序。

### 5.6 管理員訂單詳情（GET /api/admin/orders/:id）

回傳訂單完整資訊 + `items` 陣列 + `user` 物件（`name`、`email`）。管理員可查閱所有使用者的訂單。

---

## 6. 種子資料

| 類型 | 資料 |
|------|------|
| 管理員帳號 | email: `admin@hexschool.com`，密碼: `12345678` |
| 商品數量 | 8 筆花卉商品 |
| 商品範例 | 粉色玫瑰花束（$1,680）、白色百合花禮盒（$1,280）、繽紛向日葵花束（$980）、紫色鬱金香盆栽（$750）、乾燥花藝術花圈（$1,450）、迷你多肉組合盆（$580）、經典紅玫瑰花束（$3,980）、季節鮮花訂閱月配（$890） |

種子資料僅在對應表格為空時才寫入（`products` 計數為 0 才插入）。

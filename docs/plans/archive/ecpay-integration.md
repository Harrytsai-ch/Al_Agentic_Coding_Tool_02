# ECPay 金流整合計畫

## 目標

將花店電商的結帳流程串接綠界 **AIO 全方位金流（CMV-SHA256）**，取代現行的 `PATCH /api/orders/:id/pay` 模擬付款。

本專案僅運行於本地端（localhost:3001），**無法接收綠界 Server Notify（ReturnURL）**，因此：

- `ReturnURL` 雖為必填參數，仍會設定，但不依賴其通知。
- 付款狀態改由本地端**主動呼叫 `QueryTradeInfo/V5`** 查詢確認。
- `OrderResultURL` 由消費者瀏覽器 POST 回本地端，可正常運作，作為觸發查詢的入口。

## 架構決策

| 項目 | 選擇 | 理由 |
|------|------|------|
| 金流服務 | AIO（CMV-SHA256） | 流程最簡單、採用率最高；適合跳轉式網頁付款 |
| 驗證機制 | SHA256 CheckMacValue + `QueryTradeInfo/V5` | 本地端無法接收 ReturnURL，改以主動查詢為最終事實 |
| 付款方式 | `ChoosePayment=ALL` | 讓使用者在綠界頁面自選 |
| 商店編號策略 | 每筆訂單建立後產生 `merchant_trade_no`（`F` + 時間戳 + 5 碼隨機） | 綠界要求 ≤20 字、永久唯一；本系統訂單 ID 為 UUID 無法直接使用 |
| 驗證流程 | 瀏覽器 POST 回 `OrderResultURL` → 重導至訂單頁 → 前端輪詢 `QueryTradeInfo` | Server Notify 在本地不可用，以主動查詢為準 |

## 資料流

```
1. 使用者在 /checkout 填寫收件資訊 → POST /api/orders
2. 後端建立 pending 訂單（現有邏輯）
3. 前端呼叫 POST /api/orders/:id/ecpay
   ├── 後端產生 merchant_trade_no 並寫入 orders 表
   ├── 組出 AIO 參數 + CheckMacValue
   └── 回傳 { actionUrl, params }
4. 前端動態產生 <form> 自動 submit 到 payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
5. 使用者在綠界頁面完成付款（測試卡：4311-9522-2222-2222 / SMS 1234）
6. 綠界瀏覽器 POST 回 OrderResultURL：http://localhost:3001/orders/payment-return
7. 該路由讀取 MerchantTradeNo，302 轉址至 /orders/:id?payment=verifying
8. 前端偵測 payment=verifying，呼叫 GET /api/orders/:id/payment-status
9. 後端呼叫 QueryTradeInfo/V5，驗證 CheckMacValue：
   ├── TradeStatus=1 → 更新 status=paid、寫入 ecpay_trade_no / payment_type / paid_at
   ├── TradeStatus=0 → 回傳 pending，前端可再輪詢
   └── TradeStatus=10200095 → 更新 status=failed
10. 前端顯示最終結果
```

## 後端變更

### Schema（SQLite，向後相容新增欄位）

`orders` 表新增：
- `merchant_trade_no TEXT UNIQUE` — 送給綠界的交易編號
- `ecpay_trade_no TEXT` — 綠界回傳的 TradeNo
- `payment_type TEXT` — 綠界回傳的 PaymentType（如 `Credit_CreditCard`）
- `paid_at TEXT` — 付款完成時間（綠界的 PaymentDate）

以 `PRAGMA table_info(orders)` 檢查欄位是否存在，不存在則 `ALTER TABLE` 新增，保持既有資料。

### 新檔案

- `src/services/ecpay.js`
  - `ecpayUrlEncode(str)` — SDK 相容的 URL encode（CMV 專用）
  - `generateCheckMacValue(params)` — SHA256
  - `verifyCheckMacValue(params)` — timing-safe 比對
  - `buildCheckoutParams({ merchantTradeNo, amount, itemName, tradeDesc })` — AIO 送單參數
  - `queryTradeInfo(merchantTradeNo)` — POST 至 `/Cashier/QueryTradeInfo/V5`，解析 URL-encoded 回應並驗證 CheckMacValue
  - 設定常數：`merchantId`, `hashKey`, `hashIv`, actionUrl / queryUrl（依 `ECPAY_ENV` 切 stage / prod）

### 新 API 端點（`src/routes/orderRoutes.js`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/api/orders/:id/ecpay` | 產生 AIO 送單參數（若尚未指派 merchant_trade_no 就建立） |
| `GET` | `/api/orders/:id/payment-status` | 主動呼叫 QueryTradeInfo，同步更新訂單狀態 |

保留 `PATCH /api/orders/:id/pay`，測試仍可使用（但實際付款流程不再使用）。

### 新頁面路由（`src/routes/pageRoutes.js`）

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST`/`GET` | `/orders/payment-return` | 接收綠界瀏覽器 POST，依 `MerchantTradeNo` 查訂單後 302 至 `/orders/:id?payment=verifying` |

## 前端變更

- `views/pages/checkout.ejs` / `public/js/pages/checkout.js`
  - 送出訂單成功後，呼叫 `POST /api/orders/:id/ecpay`，動態建立 `<form>` 自動 submit 至綠界
- `views/pages/order-detail.ejs` / `public/js/pages/order-detail.js`
  - 移除「付款成功 / 付款失敗」模擬按鈕
  - 加入「前往綠界付款」按鈕（`status=pending` 時顯示）
  - 當 query string 帶 `payment=verifying`，進入輪詢查詢模式（每 3 秒、最多 20 次）
  - 顯示 `payment_type` 與 `paid_at`（若有）

## 環境變數

既有 `.env` 已含：
```
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
ECPAY_HASH_IV=EkRm7iFT261dpevs
ECPAY_ENV=staging
```

新增（選填）：
```
BASE_URL=http://localhost:3001   # 用於組 ReturnURL / OrderResultURL / ClientBackURL
```

## 測試驗證

- 既有測試不受影響（PATCH `/pay` 端點保留）
- 手動驗證步驟：
  1. 登入 → 加入商品 → 結帳
  2. 自動跳轉到綠界付款頁
  3. 使用測試卡 `4311-9522-2222-2222`、任意安全碼、未來日期、3D 驗證碼 `1234`
  4. 付款完成後跳回 `/orders/:id?payment=verifying`
  5. 前端自動查詢，訂單狀態變為 `paid`，顯示付款時間

## 已知限制與注意事項

- 本地端收不到 `ReturnURL`（Server Notify），因此：
  - 僅透過 `QueryTradeInfo` 主動確認結果
  - 綠界會重送 4 次 ReturnURL 通知最終仍視為失敗，這不影響本地交易結果，但會讓綠界後台有「付款結果通知失敗」紀錄，屬預期行為
- `MerchantTradeNo` 永久唯一；若同一筆 pending 訂單重新付款，可重用其已發放的 `merchant_trade_no`（金額不可變）
- `QueryTradeInfo` 的 `TimeStamp` 有效期為 3 分鐘，每次呼叫前以 `Math.floor(Date.now()/1000)` 重新產生
- 僅支援 TWD

## 歸檔

完成後將本文件移至 `docs/plans/archive/ecpay-integration.md`，並更新 `docs/FEATURES.md` / `docs/CHANGELOG.md`。

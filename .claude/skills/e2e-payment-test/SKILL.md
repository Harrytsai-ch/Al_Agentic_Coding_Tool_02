---
name: e2e-payment-test
description: >
  綠界金流（ECPay）端對端 E2E 測試助手（e2e, e2e payment, 金流測試, ecpay 測試, playwright 測試, 付款流程測試）。
  使用 Playwright MCP 自動化瀏覽器，驗證從進入商品頁 → 登入 → 加入購物車 → 結帳 →
  導向綠界 staging Cashier → 選擇「網路 ATM（WebATM）／台灣土地銀行」付款 → 導向銀行 WebATM 頁 → 返回訂單頁的完整流程。
  涵蓋正常流程（happy path）與異常情境（付款失敗 / 取消、欄位驗證錯誤）。
  帳密讀自 .env 的 ADMIN_EMAIL / ADMIN_PASSWORD。
metadata:
  { "author": "harry", "platforms": ["claude-code"] }
---

# 綠界金流 E2E 測試助手

> ⚠️ **這是測試 Skill，只觀察與驗證行為，不修改 Business Logic。**
> 僅使用 **ECPay staging 測試環境**（`payment-stage.ecpay.com.tw`），切勿在正式金流環境跑自動化測試。

## 1. 測試目標

驗證**綠界金流（ECPay）網路 ATM（WebATM）完整流程**可正常運作：
使用者從進入商品頁、登入、加入購物車、結帳、被導向綠界 Cashier，
選擇 **網路 ATM（WebATM）→ 台灣土地銀行**，成功導向銀行 WebATM 付款頁，並正確返回訂單頁顯示待付款狀態。

> 📌 **付款方式：網路 ATM（WebATM）／台灣土地銀行（銀行代碼 005）**。
> WebATM 與「ATM 虛擬帳號」不同：WebATM 會在選銀行後**導向該銀行的 WebATM 線上刷卡頁**（需實體讀卡機），
> staging 為模擬頁；E2E 確認「已成功導向土地銀行 WebATM 頁、訂單維持待付款」即視為流程通過，不需真的刷卡轉帳。

## 2. 工具：Playwright MCP

本 Skill 使用 **Playwright MCP**（`mcp__playwright__*`）驅動瀏覽器。
若工具尚未載入，先用一次 ToolSearch 批次載入核心工具：

```
ToolSearch query:
select:mcp__playwright__browser_navigate,mcp__playwright__browser_snapshot,mcp__playwright__browser_click,mcp__playwright__browser_type,mcp__playwright__browser_fill_form,mcp__playwright__browser_select_option,mcp__playwright__browser_wait_for,mcp__playwright__browser_take_screenshot,mcp__playwright__browser_console_messages,mcp__playwright__browser_network_requests,mcp__playwright__browser_navigate_back
```

| 動作 | Playwright MCP 指令 |
|------|--------------------|
| 開啟頁面 | `browser_navigate({ url })` |
| 讀取頁面結構（取 ref） | `browser_snapshot()` |
| 點擊元素 | `browser_click({ element, target })` |
| 輸入文字 | `browser_type({ element, target, text })` |
| 一次填整張表單 | `browser_fill_form({ fields })` |
| 下拉選單選值（選銀行） | `browser_select_option({ element, target, values })` |
| 等待文字 / 元素出現 | `browser_wait_for({ text })` |
| 截圖佐證 | `browser_take_screenshot({ filename })` |
| 讀 console（驗證錯誤） | `browser_console_messages({ level })` |
| 讀網路請求（驗 API） | `browser_network_requests({ filter, static })` |
| 返回上一頁 | `browser_navigate_back()` |

> 先 `browser_snapshot()` 取得元素 `ref` 後再 `browser_click` / `browser_type`，不要盲點座標。
> snapshot 很大時可用 `depth` 或 `target`（指定父層 ref）縮小範圍。

## 3. 前置準備

1. 確認伺服器已啟動於 **port 3001**。可先 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/` 探測；
   回 `000` 代表未啟動，需先背景啟動 `npm run dev:server`，再輪詢到回 `200` 才開始。
2. 確認 `ECPAY_ENV=staging`（`.env`），測試帳密為綠界公開測試 Merchant（測試帳號三 / MerchantID 3002607）。
3. 帳密讀自 `.env`：`ADMIN_EMAIL`、`ADMIN_PASSWORD`（預設 `admin@hexschool.com` / `12345678`）。
   - **嚴禁將帳密寫入檔案、log、測試報告或截圖檔名**。寫入 `$TMPDIR` 也會被安全機制擋下。
   - 若需確認 `.env` 是否為預設值，用布林比對而非印出值：
     `node -e "require('dotenv').config(); console.log(process.env.ADMIN_PASSWORD==='12345678')"`
   - 帳密僅在 `browser_fill_form` 的輸入欄位填入。

關鍵路由（本專案）：

| 頁面 / 動作 | 路徑 |
|------|------|
| 首頁 / 商品列表 | `http://localhost:3001/` |
| 商品頁 | `http://localhost:3001/products/:id` |
| 登入 | `http://localhost:3001/login` |
| 購物車 | `http://localhost:3001/cart` |
| 結帳 | `http://localhost:3001/checkout` |
| 訂單列表 | `http://localhost:3001/orders` |
| 訂單明細 | `http://localhost:3001/orders/:id` |
| 登入 API | `POST /api/auth/login`（成功 200 / 帳密錯 401） |
| 建立訂單 | `POST /api/orders`（成功 **201**） |
| 產生綠界送單參數 | `POST /api/orders/:id/ecpay`（成功 **200**，回 `actionUrl`+`params`，前端自動 form submit） |
| 付款狀態輪詢 | `GET /api/orders/:id/payment-status` |
| 綠界 staging Cashier | `https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5` |

> 本專案 `ChoosePayment: 'ALL'`，故付款方式（網路 ATM）與銀行（台灣土地銀行）是在**綠界 Cashier 頁面**上選擇，非本站表單。

## 4. 測試步驟（正常流程 Happy Path）

> 以下標注的 `ref`（e30、e49…）為某次實測值，**每次都會變動**；務必先 `browser_snapshot` 取當下 ref，僅作為元素定位參考。

1. `browser_navigate` → `http://localhost:3001/`，`browser_snapshot` 確認商品列表載入（首頁有「精選推薦」與「探索所有花藝」兩區，卡片含「加入購物車」按鈕）。
2. 前往 `/login`：
   - 欄位：`textbox "請輸入 Email"`、`textbox "請輸入密碼"`；送出鈕為 form 內 `button "登入"`。
   - 用 `browser_fill_form` 填入 `ADMIN_EMAIL` / `ADMIN_PASSWORD`，點登入。
   - 成功會**導向首頁**且導覽列出現 `Admin` 徽章與「登出」鈕。
3. 回首頁點商品卡片的 `button " 加入購物車"`，前往 `/cart` 確認品項、數量、金額（導覽列購物車徽章數 +1）。
4. 於 `/cart` 點 `button " 前往結帳"`。
5. `/checkout` 填寫收件資訊三欄並送出：
   - `textbox "請輸入收件人姓名"`、`textbox "請輸入 Email"`、`textbox "請輸入收件地址"`，送出鈕 `button " 確認送出訂單"`。
   - 送出會觸發 `POST /api/orders`（201）與 `POST /api/orders/:id/ecpay`（200），接著自動 form submit。
6. `browser_wait_for` 頁面被自動導向綠界 staging Cashier（URL 含 `payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5`，標題「選擇支付方式｜綠界科技」，可見訂單編號與金額）。
7. 在綠界頁 `browser_snapshot`（建議 `target` 指向「付款方式」區塊縮小輸出），於付款方式清單點選 **網路 ATM**：
   - 對應 `listitem "WebATM"`（顯示文字「網路ATM」）。注意**不要**點到 `listitem "ATM"`（那是「ATM 虛擬帳號」）。
8. 在出現的「選擇銀行」下拉選 **台灣土地銀行**：
   - `browser_select_option`，target 為該 `combobox`，values 用 `["台灣土地銀行"]`。
9. 點付款按鈕（WebATM 區塊的「立即付款 / 確認」連結；以 snapshot 當下文字為準），`browser_wait_for` 導向**台灣土地銀行 WebATM 付款頁**，`browser_take_screenshot` 存證（檔名勿含帳密）。
10. 返回本站訂單：導向 `/orders` 或 `/orders/:id`，確認新訂單狀態為 **待付款 / pending**；訂單明細的收件人、Email、地址、品項、金額與輸入一致；付款區塊有「前往綠界付款」「重新查詢付款結果」按鈕。

> WebATM 屬線上即時扣款（需讀卡機），staging 為模擬頁。E2E **成功導向土地銀行 WebATM 頁**即視為下單付款流程成功；實際扣款不在 E2E 範圍，訂單正確維持 pending（不可被誤標已付款）。

## 5. 預期結果

### 正常流程（pass 條件）
- 登入成功、購物車品項正確、訂單成功建立（`POST /api/orders` → 201、`/ecpay` → 200）。
- 成功導向綠界 staging Cashier。
- 選擇「網路 ATM + 台灣土地銀行」後成功導向銀行 WebATM 付款頁。
- 返回訂單頁狀態為「待付款 / pending」，訂單資料正確，無未預期 console error。

### 異常情境（需驗證系統能正確處理）
1. **付款失敗 / 取消付款**：在綠界 / 銀行頁取消或模擬失敗 → 返回訂單頁應維持**待付款 / 付款失敗**狀態，**不可被誤標為已付款**（庫存不可被當成已付款扣減）。
2. **欄位驗證錯誤**：
   - 登入：錯誤密碼 → `POST /api/auth/login` 回 **401**，停留登入頁、不導向結帳（已實測 PASS）。
   - 結帳：必填收件欄位留空 → 前端攔截，**不發出** `POST /api/orders`、不導向綠界（已實測 PASS）。
   - 空購物車結帳 → 應阻擋並提示。
3. **驗證手段**：`browser_console_messages({ level: "error" })` 檢查無未預期錯誤；
   `browser_network_requests({ filter, static:false })` 檢查 `POST /api/orders`、`/ecpay`、`/api/auth/login`、`payment-status` 的 HTTP 狀態（成功 2xx、驗證失敗 4xx）。

## 6. 已知良性訊息（非 bug，可忽略）

- `Failed to load resource: 404 ... /favicon.ico` — 缺 favicon，純外觀。
- `401 ... /api/auth/login` — 若來自「錯誤密碼」異常測試，是**預期結果**。
- `ReferenceError: Swiper is not defined`（來源 `payment-stage.ecpay.com.tw/Scripts/_actions.js`）— 綠界自家頁面腳本，非本專案問題。

## 7. 產出

每次測試結束輸出一份摘要：
- 各步驟 PASS / FAIL 與失敗原因（含關鍵 API HTTP 狀態碼）。
- 關鍵畫面截圖（商品頁、結帳、綠界選 WebATM/土地銀行、銀行 WebATM 頁、訂單狀態）。
- 異常情境覆蓋結果（付款失敗 / 取消、登入與結帳欄位驗證、空購物車）。
- 觀察到的 console / network 錯誤（區分良性與真實問題）。
- 測試後若伺服器是本次為測試而啟動，記得關閉（`pkill -f "node server.js"`，exit code 143 屬正常 SIGTERM）。

## 8. 注意事項

- 僅在 **staging** 測試，勿用正式 Merchant 與真實帳號。
- 綠界 Cashier 頁面 UI 可能改版；以 `browser_snapshot` 取得當下實際元素 ref 為準，勿硬編座標或 ref。
- 避免觸發瀏覽器 modal/alert 對話框，會阻斷後續自動化。
- 帳密一律讀自 `.env`，不得寫入測試報告、log 或截圖檔名。

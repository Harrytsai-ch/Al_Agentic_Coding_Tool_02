# TESTING.md

## 測試框架

- **Vitest 2.1.9**：測試 runner，設定於 `vitest.config.js`
- **supertest 7.2.2**：HTTP 請求模擬，直接測試 Express app（不需啟動真實伺服器）

## 測試檔案總覽

| 檔案 | 涵蓋功能 | 測試數 |
|------|---------|--------|
| `tests/auth.test.js` | 註冊、登入、個人資料、401 / 409 錯誤 | ~6 |
| `tests/products.test.js` | 商品列表（分頁）、商品詳情、404 | ~4 |
| `tests/cart.test.js` | 訪客模式（session）CRUD、已登入模式 CRUD、庫存錯誤 | ~8 |
| `tests/orders.test.js` | 建立訂單、空購物車錯誤、未授權、查詢列表、查詢詳情 | ~5 |
| `tests/adminProducts.test.js` | Admin 商品 CRUD、一般使用者被拒（403）、未登入被拒（401） | ~5 |
| `tests/adminOrders.test.js` | Admin 訂單列表、狀態篩選、訂單詳情（含使用者資訊）、授權 | ~4 |

## 執行順序

`vitest.config.js` 強制指定測試檔案執行順序，**必須依序執行**（`fileParallelism: false`）：

```
1. tests/auth.test.js
2. tests/products.test.js
3. tests/cart.test.js
4. tests/orders.test.js
5. tests/adminProducts.test.js
6. tests/adminOrders.test.js
```

> 順序至關重要：後面的測試（如 orders）依賴前面的測試（auth、cart）所建立的資料。

## 共用輔助函式（tests/setup.js）

```javascript
// 以管理員身份登入，回傳 JWT token（字串）
async function getAdminToken()

// 建立一個新的測試使用者，回傳 { user, token }
// overrides 可覆蓋預設欄位（email、password、name）
async function registerUser(overrides = {})
```

**注意：** `registerUser()` 每次呼叫都使用隨機 email（基於時間戳），確保測試之間不衝突。

## 如何執行測試

```bash
# 執行全部測試
npm test

# 監聽模式（儲存時自動重跑）
npx vitest --watch

# 執行特定測試檔案
npx vitest tests/cart.test.js
```

## 撰寫新測試的步驟

### 1. 建立測試檔案

在 `tests/` 目錄下新增 `featureName.test.js`：

```javascript
import request from 'supertest';
import app from '../app.js';
import { getAdminToken, registerUser } from './setup.js';

describe('Feature Name', () => {
  let token;

  beforeAll(async () => {
    const { token: t } = await registerUser();
    token = t;
  });

  it('should do something', async () => {
    const res = await request(app)
      .get('/api/feature')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.error).toBeNull();
  });
});
```

### 2. 加入 vitest.config.js 執行序列

```javascript
sequence: {
  files: [
    'tests/auth.test.js',
    // ... 現有檔案
    'tests/featureName.test.js',  // 加在這裡，注意順序
  ],
}
```

### 3. 測試購物車（訪客模式）的範例

```javascript
it('guest can add to cart using session id', async () => {
  const sessionId = 'test-session-' + Date.now();
  const res = await request(app)
    .post('/api/cart')
    .set('X-Session-Id', sessionId)
    .send({ productId: '<valid-product-id>', quantity: 1 })
    .expect(200);

  expect(res.body.data.quantity).toBe(1);
});
```

## 常見陷阱

### bcrypt saltRounds 在測試環境

`src/database.js` 的 `seedAdminUser()` 會依據 `NODE_ENV` 決定 bcrypt 的 saltRounds：
```javascript
const saltRounds = process.env.NODE_ENV === 'test' ? 1 : 10;
```

Vitest 執行時需確保 `NODE_ENV=test` 已設定（Vitest 預設會設定）。若使用 `npm test` 以外的方式執行，請手動設定。

### 共用 SQLite 資料庫狀態

所有測試共用同一個 SQLite 資料庫（`database.sqlite`）。測試結束後資料**不會清除**。如需乾淨的環境，可在 `beforeAll` / `afterAll` 中手動刪除特定資料，或使用 `beforeEach` 重置狀態。

### 順序依賴

`orders.test.js` 中的測試需要先有有效的購物車資料（由 `cart.test.js` 加入）。若單獨執行 `orders.test.js` 可能因購物車為空而失敗，必須按完整順序執行。

### supertest 不需啟動伺服器

`request(app)` 直接使用 Express app 物件，不需要呼叫 `app.listen()`。`app.js` 不啟動伺服器（只匯出 app 物件），`server.js` 才呼叫 `listen()`，因此測試時只需 `import app from '../app.js'`。

### Hook Timeout

`vitest.config.js` 設定 `hookTimeout: 10000`（10 秒），若 `beforeAll` 中有非同步操作（如資料庫初始化）超時，可在 vitest.config.js 調整此值。

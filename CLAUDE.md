# CLAUDE.md

## 專案概述

花店電商平台後端 — Node.js/Express + SQLite (better-sqlite3) + Vue 3 (CDN) + EJS 樣板 + Tailwind CSS 4.2

伺服器監聽 **port 3001**，同時提供 REST API（`/api/*`）與 EJS 頁面（`/`）。資料庫為單一 SQLite 檔案 `database.sqlite`，首次啟動時自動建立表格與種子資料。

## 常用指令

| 指令 | 說明 |
|------|------|
| `npm start` | 建置 Tailwind CSS 後啟動伺服器 |
| `npm run dev:server` | 僅啟動 Express 伺服器（不重建 CSS） |
| `npm run dev:css` | 監聽模式編譯 Tailwind CSS |
| `npm run css:build` | 生產環境壓縮 CSS |
| `npm test` | 執行全部 Vitest 測試 |
| `npm run openapi` | 從 JSDoc 重新生成 `openapi.json` |

## 關鍵規則

- **JWT_SECRET 必填**：`server.js` 啟動時若未設定會立即拋錯，不得使用空字串。
- **購物車雙模式**：Cart API 接受 JWT Bearer token（已登入）或 `X-Session-Id` header（訪客），兩者都沒有才回 401。不可讓購物車 API 要求強制登入。
- **訂單建立使用 Transaction**：建立訂單、寫入訂單明細、扣庫存、清空購物車必須在同一個 `db.transaction()` 內完成，任何步驟失敗整體 rollback。
- **ECPay 目前為 staging 模擬**：付款功能為前端模擬（`PATCH /api/orders/:id/pay`），ECPay env vars 已預留但尚未串接真實金流。
- **計畫歸檔流程**：功能開發時在 `docs/plans/` 撰寫計畫，完成後移至 `docs/plans/archive/`，並同步更新 `docs/FEATURES.md` 與 `docs/CHANGELOG.md`。

## 詳細文件

- [docs/README.md](./docs/README.md) — 項目介紹、技術棧、快速開始
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 架構、目錄結構、API 路由總覽、資料庫 Schema
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — 開發規範、命名規則、新增 API/DB 流程、計畫歸檔
- [docs/FEATURES.md](./docs/FEATURES.md) — 功能列表、行為描述、業務邏輯
- [docs/TESTING.md](./docs/TESTING.md) — 測試規範、執行順序、撰寫指南
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) — 更新日誌

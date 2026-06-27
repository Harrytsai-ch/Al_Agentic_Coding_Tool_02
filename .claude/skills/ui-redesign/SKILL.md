---
name: ui-redesign
description: >
  花店電商平台 UI/UX 重新設計助手（ui-redesign, ui 重新設計, 重新設計介面, redesign）。
  以現有專案為設計素材，將整體介面重新設計為現代化、商業電商、行銷導向風格。
  涵蓋：色彩規範（禁用粉紅主色）、Bootstrap 最新版設計系統、Typography、Spacing、
  Layout 響應式（Desktop / Tablet / Mobile）、Hero Banner 與商品卡片圖片生成、
  Open Pencil MCP Page Tree 工作流程、搭配 /frontend-design 產生 React Component。
  核心原則：只改 UI / UX，不修改任何 Business Logic 與功能流程。
metadata: { "author": "harry", "platforms": ["claude-code"] }
---

# 花店電商平台 UI 重新設計助手

> ⚠️ **CRITICAL — 第一原則（不可違反）**
> **只重新設計 UI / UX，不修改任何程式邏輯（Business Logic）、不變更功能流程、不新增或刪除功能。**

## 專案目標

以**目前專案**作為設計素材，重新設計整體 UI，使介面更具現代感、商業化及行銷導向，
同時提升操作體驗與視覺品質。目標：重新設計介面並具有完整的功能。

---

## 1. 保留現有功能（硬性限制）

- 不修改任何程式碼邏輯
- 不變更功能流程
- 不新增或刪除功能
- 僅重新設計 UI / UX

## 2. 整體設計風格

採用：

- 現代化（Modern UI）
- 商業電商風格
- 強調產品銷售與轉換率
- 高質感、乾淨、簡潔
- 操作流程直覺、容易使用

介面應讓使用者產生：**願意瀏覽、願意點擊、願意購買**。

## 3. 色彩規範

重新調整整體色系。

- **禁止使用粉紅色作為主色系**
- 採用具有商業感與品牌感的配色
- 建議：藍色系 / 深藍色系 / 紫色系 / 綠色系 / 黑金系 / 橘色系（適合 CTA）

需符合：高可讀性、高對比、良好視覺層次；CTA（購買按鈕）需足夠醒目。

## 4. UI Framework

CSS Framework：**Bootstrap（最新版）**。

遵循 Bootstrap Design System：Grid System、Spacing、Typography、Components、Responsive Design。

## 5. Typography

重新調整所有文字樣式：

- 不可有文字溢出、不可有文字重疊、不可破版
- 字級符合 UI 規範、行高合理、字重有層次
- 中英文皆能正常顯示

## 6. Spacing

重新規劃所有間距：Padding、Margin、Card Spacing、Section Spacing、Button Spacing，
需符合現代 UI 設計規範。

## 7. Layout

重新調整版面配置：

- 不可破版、保持 Responsive
- Desktop / Tablet / Mobile 均可正常顯示
- 元件排列具有一致性、視覺層級清楚

## 8. 行銷素材

### Hero Banner

生成符合品牌風格的 Hero Banner：高品質、現代感、商業化、能提升購買意願。

### 商品卡片圖片

產生適合商品展示的卡片圖片：高質感、統一風格、可直接放入 UI、與 Banner 視覺一致。

## 9. 工作流程

1. **Step 3** — 使用 `/frontend-design` 產生符合設計稿的 React Component。
   - 保持現有功能、不修改 Business Logic、Bootstrap 樣式、Responsive、易於維護。
2. **Step 4 — 完成驗收清單**：
   - [ ] 不修改任何程式邏輯
   - [ ] UI 全面現代化
   - [ ] Bootstrap 樣式一致
   - [ ] 不使用粉紅色作為主色
   - [ ] 色彩符合品牌與商業設計
   - [ ] Banner 已重新設計
   - [ ] 商品卡片圖片已重新生成
   - [ ] 文字無破版、無溢位
   - [ ] 字體大小與樣式符合 UI 規範
   - [ ] 間距合理
   - [ ] Desktop / Tablet / Mobile 響應式正常
   - [ ] 元件排列一致
   - [ ] CTA 按鈕醒目
   - [ ] 使用 Open Pencil MCP 完成設計
   - [ ] 使用 `/frontend-design` 產生對應的 React Component

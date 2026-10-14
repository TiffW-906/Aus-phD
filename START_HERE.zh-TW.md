# 2028 澳洲博士申請管理 — 完整程式碼

這是目前已發布工作站的原始碼快照，包含字體放大版、官方公告更新，以及 The Nature of Code 的 16 週閱讀計畫。

網站：https://au-phd-2028-workspace.tiffw.chatgpt.site
來源版本：2b8b193aea01efb7c3076aedfcbf528ef2949dbf
整理日期：2026-10-14

## 內容與技術

- React + TypeScript + Vinext / Vite
- CSS / Tailwind CSS；繁體中文與響應式排版
- Cloudflare Workers 後端、D1 / SQLite 資料庫
- ChatGPT / Sites 私人登入與使用者資料隔離
- 任務清單、學校資料、教授聯繫、研究材料、IELTS 記錄與 JSON / CSV 匯出
- 官方公告獨立儲存、版本衝突保護、每週更新流程
- 16 週 The Nature of Code 閱讀與 p5.js 實作計畫

## 主要檔案

| 檔案 | 用途 |
| --- | --- |
| app/dashboard.tsx | 儀表板、導覽、頁面、表單、進度儲存與匯出 |
| app/globals.css | 完整視覺樣式與手機排版 |
| app/data.ts | 學校官方連結、博士申請任務與時間線 |
| app/reading.ts | 閱讀週任務與保留既有進度的合併邏輯 |
| app/model.ts | 私人工作站資料格式與驗證 |
| app/official.ts | 官方公告格式、校方來源驗證與資訊合併 |
| app/api/workspace/route.ts | 個人進度讀取與儲存 API |
| app/api/official/route.ts | 私人站台的官方公告背景更新 API |
| app/chatgpt-auth.ts | Sites / ChatGPT 身分與登入 |
| db/schema.ts | 資料庫資料表定義 |
| drizzle/ | SQL 遷移與 Drizzle 結構記錄 |
| scripts/test-workspace.mjs | 資料儲存、使用者隔離、版本衝突與閱讀計畫測試 |
| scripts/official-sync.py | 官方公告背景讀寫輔助工具 |
| .openai/weekly-updates.md | 每週查核與通知流程 |
| .openai/hosting.json | 原工作站的部署識別與資料庫綁定 |
| package.json / pnpm-lock.yaml | 依賴、版本與執行指令 |
| vite.config.ts / build/ | Vinext、Workers 與 Sites 整合 |

## 本機安裝與執行

建議使用 Node.js 24 與 pnpm 11.25.0。解壓縮後，於 au-phd-2028 資料夾開啟終端機。

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm run build
```

首次使用本機 D1 時，先依序套用兩份遷移；這只建立本機資料庫，不會變更線上資料：

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_legal_ma_gnuci.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_remarkable_bruce_banner.sql
pnpm run dev
```

開啟終端機顯示的本機網址（通常 http://localhost:5173）。本機 portable 模式可使用 `/signin-with-chatgpt?return_to=/` 建立測試登入；不代表連接了真實 ChatGPT 帳戶，也不會取得線上私人進度。

檢查程式：

```bash
pnpm exec tsc --noEmit
node scripts/test-workspace.mjs
```

## 部署與資料注意事項

1. 這是完整的前後端專案，不是單一 HTML。登入、進度儲存與背景更新需要對應的執行環境。
2. .openai/hosting.json 保留原工作站的 project_id，並非存取密鑰。若要建立另一個獨立站台，必須由 Sites 建立新專案並換成新識別碼；不要直接部署覆蓋原站台。
3. 正式站台的 owner-private 存取規則保護 /api/official。若移至其他平台或改為公開網站，需要先為公告寫入介面加上等效授權。
4. 每週排程是 ChatGPT 中的外部自動化，不會因下載原始碼自動搬移或啟用。壓縮檔包含更新程式與流程，不含排程服務帳戶或憑證。
5. 不包含私人資料庫記錄、勾選進度、教授筆記、帳號憑證、node_modules、建置輸出及執行快取。依賴由 pnpm 安裝；私人進度可另由工作站「匯出進度」取得。
6. 壓縮檔中的 SOURCE_MANIFEST.json 列出每個檔案的 SHA-256，可用於檢查原始碼快照。

完整保留第三方整合程式與授權檔案。原始英文 README.md 另提供框架與 D1 操作說明。

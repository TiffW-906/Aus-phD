# 2028 澳洲博士申請管理 — 自架版

原本在 ChatGPT Sites 上的工作站，搬到你自己的 Cloudflare 帳號。架構不變：

- React + TypeScript + Vinext / Vite
- Cloudflare Workers 後端、D1 / SQLite 資料庫（同樣的兩份遷移）
- 登入：**Cloudflare Access** 取代 ChatGPT 登入。只有你允許的 Email 能進入，Worker 會再驗證 Access 簽章（`app/access.ts`）。
- GitHub Actions：推送到 `main` 會自動檢查、建置、套用資料庫遷移並部署。

## 這一版新增的功能

- 匯入 JSON：可還原「匯出進度」的檔案。
- 刪除任務與教授紀錄。閱讀計畫的 16 週任務請在「閱讀與實作」頁管理。
- 兩個分頁同時編輯時，可選「載入最新版本」或「保留本頁修改」，不會卡在無法儲存。
- 「關鍵申請節點」加入你在學校頁填的截止日、倒數天數，以及「日期待確認」的項目。
- 清單預設隱藏閱讀計畫（可勾選顯示），新增「已逾期」篩選；首頁另外顯示本週閱讀。
- 右上角新增登出按鈕。

## 第一次部署（約 20–30 分鐘，只需做一次）

### 1. Cloudflare 帳號與資料庫
1. 到 https://dash.cloudflare.com 註冊免費帳號。
2. 左側選單 **Storage & Databases → D1 SQL Database → Create**，名稱填 `au-phd-2028`。
3. 建好後複製 **Database ID**。
4. 在 **Workers & Pages** 頁面右側找到並複製 **Account ID**。

### 2. 建立 API Token
1. 右上角頭像 → **My Profile → API Tokens → Create Token**。
2. 選範本 **Edit Cloudflare Workers**，再按 **+ Add more** 加一條權限：**Account → D1 → Edit**。
3. 建立後複製 Token。這組只會顯示一次，請勿貼到任何公開地方。

### 3. 把設定填進 GitHub
到 GitHub repo → **Settings → Secrets and variables → Actions**：

| 種類 | 名稱 | 值 |
| --- | --- | --- |
| Secrets | `CLOUDFLARE_API_TOKEN` | 步驟 2 的 Token |
| Secrets | `CLOUDFLARE_ACCOUNT_ID` | 步驟 1 的 Account ID |
| Variables | `D1_DATABASE_ID` | 步驟 1 的 Database ID |
| Variables | `OWNER_EMAILS` | 你的 Email（多個用逗號分隔） |

### 4. 第一次部署
把程式合併到 `main`（或到 **Actions → Check and deploy → Run workflow**）。完成後網址是：
`https://au-phd-2028.<你的子網域>.workers.dev`

此時網頁會顯示「工作站尚未載入」，這是正常的：還沒設定登入，資料一律拒絕讀取。

### 5. 開啟 Cloudflare Access（登入保護）
1. **Workers & Pages → au-phd-2028 → Settings → Domains & Routes**，在 `workers.dev` 那一列開啟 **Cloudflare Access**。第一次使用會請你建立 Zero Trust 團隊名稱，並選擇 **Free** 方案。
2. 到 **Zero Trust → Access → Applications**，編輯剛產生的應用程式：Policy 設為 **Allow**，條件 **Emails** 只填你的 Email。
3. 在應用程式的 Overview 複製 **Application Audience (AUD) Tag**。
4. 團隊網域在 **Zero Trust → Settings** 可以看到，格式是 `你的團隊名稱.cloudflareaccess.com`。

### 6. 填入 Access 設定並重新部署
GitHub **Variables** 再加兩個：

| 名稱 | 值 |
| --- | --- |
| `ACCESS_TEAM_DOMAIN` | `你的團隊名稱.cloudflareaccess.com` |
| `ACCESS_AUD` | 步驟 5 的 AUD Tag |

到 **Actions → Check and deploy → Run workflow** 重新部署。打開網址後，Cloudflare 會寄驗證碼到你的 Email，登入後就能使用。

## 之後怎麼更新
- 修改程式後推送到 `main`，GitHub Actions 會自動檢查並部署。
- 定期按「匯出進度」備份。

## 每週官方公告查核
- 每週一早上，Claude 的排程任務會依 `docs/official-updates.md` 到各校官網查詢最新資訊。
- 有實質變動時，Claude 只修改 `app/official-data.json`，並開一個標題為「官方公告更新 日期」的 Pull Request，內容列出各校變動、實際期限、對準備的影響和官方來源。
- 你確認內容沒問題後按 Merge，網站會自動部署；沒有變動就不會開 PR。
- 個人進度（任務、勾選、教授筆記）存在資料庫，不會被自動更新修改。

## 和原版的差異
- 官方公告原本存在資料庫，由 ChatGPT 直接寫入；現在改存在 repo 檔案 `app/official-data.json`，每次變動都經過你審核，也留有版本紀錄。
- 原版的 `.openai/`、`scripts/official-sync.py` 與 `SOURCE_MANIFEST.json` 只適用於 ChatGPT Sites，已移除；需要時可從 git 歷史找回。

## 本機開發
建議使用 Node.js 22 以上與 pnpm 11.25.0。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state
pnpm run dev
```

開發模式（http://localhost:5173）不經過 Cloudflare Access，會用固定的本機測試帳號。

檢查程式：

```bash
pnpm exec tsc --noEmit
node scripts/test-workspace.mjs
```

# Wu.D dessert 線上訂購網站

規格見 [CLAUDE.md](CLAUDE.md)。技術：Next.js（App Router）＋ Supabase ＋ LINE Pay v3 ＋ Vercel ＋ Tailwind CSS。

## 頁面

| 網址 | 用途 |
| --- | --- |
| `/` | 商品頁：今日現貨區塊＋分類商品、購物車抽屜 |
| `/checkout` | 結帳：取貨日曆、30 分鐘時段、LINE Pay／現場付現 |
| `/order/[訂單編號]` | 訂單完成頁 |
| `/admin` | 今日總覽（新訂單即時出現、提示音、分頁標題顯示未讀數） |
| `/admin/products` | 商品狀態：現貨／可預訂／暫停、剩餘數量、預訂天數、換照片 |
| `/admin/orders` | 訂單列表（手機卡片／電腦表格、篩選、CSV 備份） |
| `/admin/settings` | 公休日月曆、營業取貨日與時間 |

## 重要檔案

- `supabase/migrations/…_init.sql`：資料表、RLS 權限、下單交易 `place_order`（鎖定商品、用資料庫價格重算、扣庫存）、取消補庫存觸發器、LINE Pay 逾時釋放 `expire_linepay_orders`
- `lib/pickup.ts`：取貨日期規則（前台日曆和伺服器驗證共用）
- `app/api/orders/route.ts`：建立訂單；`app/api/linepay/*`：LINE Pay 付款確認／取消
- `data/products.json`：商品初始資料；`npm run seed:sql` 產生 `supabase/seed.sql`

## 上線步驟

### 1. Supabase
1. 到 [supabase.com](https://supabase.com) 建立專案（Region 選 Tokyo 或 Singapore）。
2. 建立資料表：打開 **SQL Editor**，依序貼上並執行
   `supabase/migrations/20261017000000_init.sql` 和 `supabase/seed.sql`。
   （或用 CLI：`npx supabase link` → `npx supabase db push` → 再執行 seed.sql）
3. 建立賣家帳號：**Authentication → Users → Add user**，輸入 Email 與密碼（勾選 Auto Confirm）。
   再到 SQL Editor 執行（Email 換成剛剛建立的）：
   ```sql
   insert into admin_users (user_id) select id from auth.users where email = '你的email';
   ```
4. **Authentication → Sign In / Providers**：關閉「Allow new users to sign up」，避免陌生人註冊。
5. **Project Settings → API** 記下 Project URL、anon key、service_role key。

### 2. LINE Pay（先用 Sandbox）
到 [LINE Pay Developers](https://pay.line.me/tw/developers/techsupport/sandbox/creation) 申請 Sandbox，取得 Channel ID 與 Channel Secret。正式上線時換成正式商店的金鑰，並把 `LINEPAY_ENV` 改成 `production`。

### 3. Vercel
1. 在 Vercel 匯入這個 GitHub repo，**Root Directory 設為 `dessert-shop`**。
2. 在 Environment Variables 填入 `.env.example` 列出的變數（`SITE_URL` 填 Vercel 給的正式網址）。
3. Deploy。之後推到 main 分支就會自動更新。

## 本機開發

```bash
npm install
npx supabase start          # 需要 Docker；會印出本機 URL 與金鑰
npx supabase db reset       # 套用 migration + seed
cp .env.example .env.local  # 填入 supabase start 印出的值
npm run dev                 # http://localhost:3000
npm test                    # 取貨規則與 LINE Pay 簽章測試
```

## 規則補充

- 金額、取貨日期時段、商品狀態、庫存都在伺服器重新驗證；訂單明細保存商品名稱與單價快照。
- LINE Pay 訂單在付款確認（Confirm API 成功且金額相符）後才標記為已付款；
  客人取消、付款失敗或 20 分鐘未付款（`store_settings.linepay_timeout_minutes`）會自動取消並補回現貨。
- 訂單取消後無法恢復（避免重複扣庫存）；LINE Pay 已付款的訂單取消後，請在 LINE Pay 商家後台退款，再於後台標記「已退款」。
- 公休日設定不會自動取消當天已有的訂單，後台會列出受影響訂單提醒聯繫客人。
- 品牌色定義在 `app/globals.css` 的 `@theme`；商品照片在後台「商品」頁直接上傳（自動裁成正方形並壓縮）。

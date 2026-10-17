# Wu.D dessert 線上訂購網站

客人瀏覽菜單 → 選口味、加入購物車 → 填資料結帳（LINE Pay／自取現金）→ 訂單存進資料庫，
賣家在 `/admin.html` 後台核對、改狀態、填運費、匯出 Excel（CSV）、看備料統計。

和本 repo 其他部分（PhD 申請追蹤器）完全獨立，部署成另一個 Cloudflare Worker。

## 檔案說明

| 檔案 | 用途 |
| --- | --- |
| `public/menu.json` | **菜單、價格、口味、店家資訊**。改價格或新增商品只要改這個檔案 |
| `public/images/` | 商品照片（見資料夾內說明） |
| `public/index.html`, `app.js`, `style.css` | 客人下單頁 |
| `public/admin.html`, `admin.js`, `admin.css` | 賣家後台 |
| `src/worker.js` | API：建立訂單、後台查詢／更新 |
| `src/orders.js` | 訂單檢查（價格一律以 menu.json 為準，客人無法竄改） |
| `migrations/` | D1 資料庫結構 |

## 付款流程

- **LINE Pay**：客人送出訂單後，頁面會請客人加入官方 LINE `@327uqhcn` 並傳送訂單編號；
  賣家回覆 LINE Pay 付款連結，收款後在後台把狀態改成「已付款」。
  （若之後申請到 LINE Pay 商店帳號，可以再串接官方 API 自動付款。）
- **現金**：只有選「工作室自取」時可以選。
- 7-11 店到店／黑貓宅配的運費由賣家在後台填入，總計會自動更新。

## 第一次部署（Cloudflare，免費方案即可）

```bash
cd dessert-shop
npm install
npx wrangler login
npx wrangler d1 create wud-dessert-orders     # 把回傳的 database_id 貼進 wrangler.jsonc
npm run db:migrate                            # 建立訂單資料表
npx wrangler secret put ADMIN_PASSWORD        # 設定後台密碼
npm run deploy                                # 會得到 https://wud-dessert.<帳號>.workers.dev
```

之後修改菜單或頁面，再執行一次 `npm run deploy` 即可。也可以在 Cloudflare 綁定自己的網域。

## 本機測試

```bash
echo "ADMIN_PASSWORD=test123" > .dev.vars
npm run db:migrate:local
npm run dev          # 開 http://localhost:8787 ，後台是 /admin.html
npm test             # 訂單檢查的單元測試
```

## 訂單狀態

待確認 → 待付款 → 已付款 → 可取貨／已出貨 → 已完成（或已取消）。
狀態名稱定義在 `src/orders.js` 的 `STATUSES`。

import type { Task, Workspace } from "./model";
export const readingWeeks = [
{"week": 1, "id": "noc-20261019-w01", "title": "導讀＋Ch.0 隨機漫步", "url": "https://natureofcode.com/introduction/", "phase": "核心", "output": "複習變數、迴圈、陣列、物件與 class；完成一個隨機漫步，記錄看懂與卡住的地方。", "start": "2026-10-19", "due": "2026-10-25"},
{"week": 2, "id": "noc-20261019-w02", "title": "Ch.0 噪聲與自然變化", "url": "https://natureofcode.com/random/", "phase": "核心", "output": "比較 random 與 Perlin noise，做一個霧或漂浮花瓣的動態草圖，記錄三個參數。", "start": "2026-10-26", "due": "2026-11-01"},
{"week": 3, "id": "noc-20261019-w03", "title": "Ch.1 向量", "url": "https://natureofcode.com/vectors/", "phase": "核心", "output": "用位置、速度與加速度向量控制一片花瓣，能用自己的話說明三者關係。", "start": "2026-11-02", "due": "2026-11-08"},
{"week": 4, "id": "noc-20261019-w04", "title": "Ch.2 力", "url": "https://natureofcode.com/forces/", "phase": "核心", "output": "加入風力、重力或阻力，做兩種運動版本並比較觀感。", "start": "2026-11-09", "due": "2026-11-15"},
{"week": 5, "id": "noc-20261019-w05", "title": "Ch.3 振盪", "url": "https://natureofcode.com/oscillation/", "phase": "核心", "output": "用 sin / cos 做呼吸般的明暗或尺寸變化，以滑桿或滑鼠控制振幅。", "start": "2026-11-16", "due": "2026-11-22"},
{"week": 6, "id": "noc-20261019-w06", "title": "Ch.4 粒子系統：基礎", "url": "https://natureofcode.com/particles/", "phase": "核心", "output": "以 class 與陣列管理粒子，加入生成、壽命與消失，完成可重用的粒子草圖。", "start": "2026-11-23", "due": "2026-11-29"},
{"week": 7, "id": "noc-20261019-w07", "title": "Ch.4 粒子系統：作品延伸", "url": "https://natureofcode.com/particles/", "phase": "核心", "output": "做花瓣飄散或聚合效果；加入一個輸入控制，保存 30 秒示範影片。", "start": "2026-11-30", "due": "2026-12-06"},
{"week": 8, "id": "noc-20261019-w08", "title": "Ch.5 自主代理：行為", "url": "https://natureofcode.com/autonomous-agents/", "phase": "核心", "output": "做 seek / flee 行為，以滑鼠代表觀眾位置，比較接近與遠離的回饋。", "start": "2026-12-07", "due": "2026-12-13"},
{"week": 9, "id": "noc-20261019-w09", "title": "Ch.5 自主代理：群體", "url": "https://natureofcode.com/autonomous-agents/", "phase": "核心", "output": "理解 separation / alignment / cohesion；調整群體由聚合到分散的行為。", "start": "2026-12-14", "due": "2026-12-20"},
{"week": 10, "id": "noc-20261019-w10", "title": "Ch.6 物理函式庫", "url": "https://natureofcode.com/physics-libraries/", "phase": "延伸選讀", "output": "先理解碰撞、邊界與約束，重現一個範例；記錄是否真的適用於自己的作品。", "start": "2026-12-21", "due": "2026-12-27"},
{"week": 11, "id": "noc-20261019-w11", "title": "Ch.7 細胞自動機", "url": "https://natureofcode.com/cellular-automata/", "phase": "延伸選讀", "output": "理解局部規則如何形成整體圖樣，完成一個規則變化的圖樣實驗。", "start": "2026-12-28", "due": "2027-01-03"},
{"week": 12, "id": "noc-20261019-w12", "title": "Ch.8 碎形", "url": "https://natureofcode.com/fractals/", "phase": "延伸選讀", "output": "理解遞迴，做一個枝狀或生長圖樣；練習說明視覺意象與程式規則。", "start": "2027-01-04", "due": "2027-01-10"},
{"week": 13, "id": "noc-20261019-w13", "title": "Ch.9 演化計算", "url": "https://natureofcode.com/genetic-algorithms/", "phase": "延伸選讀", "output": "理解族群、適應度、選擇、交配與突變，先改一個現成範例，不要求寫完整新系統。", "start": "2027-01-11", "due": "2027-01-17"},
{"week": 14, "id": "noc-20261019-w14", "title": "Ch.10 神經網路", "url": "https://natureofcode.com/neural-networks/", "phase": "延伸選讀", "output": "理解輸入、輸出與訓練，完成範例與一頁筆記；說明使用機器學習的必要性。", "start": "2027-01-18", "due": "2027-01-24"},
{"week": 15, "id": "noc-20261019-w15", "title": "Ch.11 神經演化", "url": "https://natureofcode.com/neuroevolution/", "phase": "延伸選讀", "output": "閱讀概念並觀察範例，整理與一般演化計算的差異；時間不足可先保留為選讀。", "start": "2027-01-25", "due": "2027-01-31"},
{"week": 16, "id": "noc-20261019-w16", "title": "整合：互動藝術研究原型", "url": "https://natureofcode.com/particles/", "phase": "整合成果", "output": "選兩項核心技術，做一個文學意象或身體回饋原型；完成程式連結、30–60 秒影片與一頁中英研究說明。", "start": "2027-02-01", "due": "2027-02-07"}
];
export const readingTasks: Task[] = readingWeeks.map(w=>({
 id:w.id,title:`Nature of Code W${String(w.week).padStart(2,"0")}｜${w.title}`,
 description:`閱讀 45 分鐘＋p5.js 實作 45 分鐘。${w.output}\n官方章節：${w.url}\n${w.phase}；日期可依實際進度調整。`,
 category:w.phase==="整合成果"?"作品集":"研究",due:w.due,deadlineType:"suggested",priority:"normal",school:"all",done:false,
}));
// Add this requested plan by stable ID. Existing progress, custom dates and notes win.
export function mergeReadingPlan(data:Workspace):Workspace {
 const ids=new Set(data.tasks.map(t=>t.id));
 const missing=readingTasks.filter(t=>!ids.has(t.id));
 return missing.length ? {...data,tasks:[...data.tasks,...missing]} : data;
}

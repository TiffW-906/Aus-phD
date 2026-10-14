import { env } from "cloudflare:workers";
import { getUser } from "../../auth";
import { initialWorkspace } from "../../data";
import { mergeReadingPlan } from "../../reading";
import { workspaceSchema } from "../../model";
import { z } from "zod";
export const dynamic = "force-dynamic";
function json(data: unknown, status=200) { return Response.json(data,{status,headers:{"Cache-Control":"no-store"}}); }
export async function GET() {
  const user=await getUser();
  if(!user) return json({error:"請重新登入後開啟工作站。"},401);
  if(!env.DB) return json({error:"目前無法讀取工作站，請稍後重試。"},503);
  try {
    const row=await env.DB.prepare("SELECT data, revision, updated_at FROM application_workspaces WHERE user_id = ?").bind(user.userId).first<{data:string;revision:number;updated_at:string}>();
    return json({data:mergeReadingPlan(row ? JSON.parse(row.data):initialWorkspace),revision:row?.revision??0,updatedAt:row?.updated_at??null});
  } catch { return json({error:"讀取失敗，請重新整理。"},503); }
}
export async function PUT(request: Request) {
  const user=await getUser();
  if(!user) return json({error:"登入狀態已變更，請重新登入。"},401);
  const origin=request.headers.get("origin");
  if(origin && origin!==new URL(request.url).origin) return json({error:"請從工作站儲存。"},403);
  if(!env.DB) return json({error:"目前無法儲存，請稍後重試。"},503);
  let body;
  try {
    const raw=await request.text();
    if(raw.length>800000) return json({error:"資料過大，請縮短備註。"},413);
    body=z.object({revision:z.number().int().min(0),data:workspaceSchema}).parse(JSON.parse(raw));
  } catch { return json({error:"資料格式有誤，尚未儲存。"},400); }
  try {
    const updatedAt=new Date().toISOString();
    let row;
    if(body.revision===0) {
      row=await env.DB.prepare("INSERT INTO application_workspaces (user_id, data, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING RETURNING revision").bind(user.userId,JSON.stringify(mergeReadingPlan(body.data)),updatedAt).first<{revision:number}>();
    } else {
      row=await env.DB.prepare("UPDATE application_workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ? RETURNING revision").bind(JSON.stringify(mergeReadingPlan(body.data)),updatedAt,user.userId,body.revision).first<{revision:number}>();
    }
    if(!row) return json({error:"另一個視窗已更新進度。請先匯出本頁資料，再重新整理取得最新版本。"},409);
    return json({revision:row.revision,updatedAt});
  } catch { return json({error:"儲存失敗；本頁修改仍保留，請重試。"},503); }
}

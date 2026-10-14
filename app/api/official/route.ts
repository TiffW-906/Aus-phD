import { env } from "cloudflare:workers";
import { z } from "zod";
import { initialOfficial, officialSchema, effectiveSchools } from "../../official";
import { homepages } from "../../data";
import { getUser } from "../../auth";
export const dynamic="force-dynamic";
// Shared school metadata and announcements. Only signed-in owners (verified via
// Cloudflare Access) can read or change it; personal progress lives elsewhere.
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(){
  if(!await getUser())return json({error:"請重新登入。"},401);
  if(!env.DB)return json({error:"公告資料暫時無法讀取。"},503);
  try{
    const row=await env.DB.prepare("SELECT data, revision FROM official_updates WHERE id = ?").bind("official").first<{data:string;revision:number}>();
    const data=row?officialSchema.parse(JSON.parse(row.data)):initialOfficial;
    return json({data,revision:row?.revision??0,effectiveSchools:effectiveSchools(data),homepages,updateInstructions:"PUT {revision,data} to this endpoint as a signed-in owner. Only official metadata and announcement records are writable; personal progress is stored separately."});
  }catch{return json({error:"公告讀取失敗，請稍後重試。"},503);}
}
export async function PUT(request:Request){
  if(!await getUser())return json({error:"Sign-in required"},401);
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)return json({error:"Invalid origin"},403);
  if(!env.DB)return json({error:"公告資料暫時無法儲存。"},503);
  let body;
  try{
    const raw=await request.text();if(raw.length>1000000)return json({error:"Payload too large"},413);
    body=z.object({revision:z.number().int().min(0),data:officialSchema}).parse(JSON.parse(raw));
  }catch{return json({error:"Invalid official update data"},400);}
  try{
    const at=new Date().toISOString();let row;
    if(body.revision===0)row=await env.DB.prepare("INSERT INTO official_updates (id, data, revision, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO NOTHING RETURNING revision").bind("official",JSON.stringify(body.data),at).first<{revision:number}>();
    else row=await env.DB.prepare("UPDATE official_updates SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING revision").bind(JSON.stringify(body.data),at,"official",body.revision).first<{revision:number}>();
    if(!row)return json({error:"Concurrent update; reread and merge before retrying"},409);
    return json({revision:row.revision,updatedAt:at});
  }catch{return json({error:"Official update failed"},503);}
}

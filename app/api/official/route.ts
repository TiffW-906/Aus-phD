import { loadOfficial, effectiveSchools } from "../../official";
import { homepages } from "../../data";
import { getUser } from "../../auth";
import officialData from "../../official-data.json";
export const dynamic="force-dynamic";
// Shared school metadata and announcements, read from app/official-data.json.
// Updates arrive as reviewed pull requests to that file, not through this API.
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(){
  if(!await getUser())return json({error:"請重新登入。"},401);
  try{
    const data=loadOfficial(officialData);
    return json({data,effectiveSchools:effectiveSchools(data),homepages});
  }catch{return json({error:"公告資料格式有誤，顯示先前核對資訊。"},500);}
}

import { z } from "zod";
import { checkedOn, universities } from "./data";
const schoolIds=universities.map(s=>s.id);
const officialDomains=["unimelb.edu.au","monash.edu","unsw.edu.au","rmit.edu.au","sydney.edu.au","unisc.edu.au"];
const text=z.string().max(5000);
const officialUrl=z.string().url().refine(value=>{const u=new URL(value);return u.protocol==="https:"&&officialDomains.some(d=>u.hostname===d||u.hostname.endsWith("."+d));},"必須使用校方官方 HTTPS 來源");
export const schoolOverrideSchema=z.object({course:text.optional(),unit:text.optional(),fit:text.optional(),ielts:text.optional(),intake:text.optional(),defer:text.optional(),note:text.optional(),url:officialUrl.optional(),apply:officialUrl.optional(),language:officialUrl.optional(),source:officialUrl.optional()});
export const announcementSchema=z.object({
  id:z.string().min(1).max(150),school:z.string().refine(id=>schoolIds.includes(id as typeof schoolIds[number])),
  title:z.string().min(1).max(250),summary:z.string().min(1).max(5000),source:officialUrl,
  publishedAt:z.string().max(10),detectedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind:z.enum(["application","scholarship","language","entry","intake"]),
});
export const officialSchema=z.object({
  checkedOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),checkedAt:z.string().datetime().nullable(),
  schools:z.record(schoolOverrideSchema).refine(v=>Object.keys(v).every(id=>schoolIds.includes(id as typeof schoolIds[number]))),
  announcements:z.array(announcementSchema).max(150),
});
export type Official=z.infer<typeof officialSchema>;
export const initialOfficial:Official={checkedOn,checkedAt:null,schools:{},announcements:[]};
export function effectiveSchools(data:Official){return universities.map(s=>({...s,...data.schools[s.id]}));}

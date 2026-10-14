import { z } from "zod";
export const categories = ["研究", "英文", "文件", "作品集", "教授", "申請", "資助", "行政", "發表"] as const;
export const taskSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().min(1).max(200), description: z.string().max(3000),
  category: z.enum(categories), due: z.string().max(10), deadlineType: z.enum(["suggested", "official", "confirm"]),
  priority: z.enum(["high", "normal"]), school: z.string().max(100), done: z.boolean(),
});
export const contactSchema = z.object({
  id: z.string().min(1).max(100), name: z.string().min(1).max(150), school: z.string().max(100),
  email: z.string().max(250), date: z.string().max(10), status: z.enum(["待聯繫", "已寄信", "待回覆", "已討論", "同意指導", "不適合"]),
  next: z.string().max(1000), notes: z.string().max(3000),
});
const schoolInfoSchema = z.object({
  status: z.enum(["評估中", "聯繫教授", "準備申請", "已送件", "取得 offer", "暫不申請"]),
  selected: z.boolean(), route: z.string().max(300), deadline: z.string().max(10), notes: z.string().max(5000),
});
const materialSchema = z.object({
  id: z.string().max(100), title: z.string().max(150), hint: z.string().max(1000),
  status: z.enum(["待準備", "製作中", "待審閱", "已就緒"]), link: z.string().max(2000), notes: z.string().max(5000),
});
export const workspaceSchema = z.object({
  goal: z.enum(["H1", "H2"]), research: z.string().max(10000), tasks: z.array(taskSchema).max(500),
  contacts: z.array(contactSchema).max(300), schools: z.record(schoolInfoSchema), materials: z.array(materialSchema).max(100),
  ielts: z.object({ date: z.string().max(10), overall: z.string().max(5), listening: z.string().max(5), reading: z.string().max(5), writing: z.string().max(5), speaking: z.string().max(5) }),
});
export type Task = z.infer<typeof taskSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export function progress(items: { done: boolean }[]) {
  const completed = items.filter(item => item.done).length;
  return { completed, total: items.length, percent: items.length ? Math.round(completed / items.length * 100) : 0 };
}
export function dateLabel(date: string) { return date ? date.replaceAll("-", "/") : "日期待確認"; }
export function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
export function safeLink(link: string) { try { const u = new URL(link); return ["http:", "https:"].includes(u.protocol) ? u.href : undefined; } catch { return undefined; } }

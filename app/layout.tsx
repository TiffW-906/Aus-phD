import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "2028 澳洲博士申請管理｜研究啟程",
  description: "互動藝術、新媒體與設計研究的私人申請工作站。整理學校、材料、教授聯繫與時間線。",
  icons: { icon:"/favicon.svg" },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}

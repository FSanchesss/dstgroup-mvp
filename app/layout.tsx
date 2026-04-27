import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastContainer } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/layout/theme-provider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DST Group — Sistema de Produção",
  description: "Gestão e rastreabilidade de produção — DST Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full bg-gray-100 dark:bg-[#141414]">
      <body className={`${geist.className} bg-gray-100 dark:bg-[#141414] text-gray-900 dark:text-gray-100 antialiased h-full`}>
        <ThemeProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 overflow-hidden pt-2 bg-gray-100 dark:bg-[#141414]">
              <main className="h-full overflow-y-auto bg-[#FAFAFA] dark:bg-[#0F0F0F] rounded-tl-[20px] border-t border-l border-[#E0E0E0] dark:border-[#2C2C2C]">{children}</main>
            </div>
          </div>
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Anton, Inter, Plus_Jakarta_Sans, Teko } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const teko = Teko({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-condensed" });

export const metadata: Metadata = {
  title: "ChillOuts — Meet Up. Find Each Other. Chill.",
  description: "Create a casual meetup, invite people with a QR code, and share live location.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${anton.variable} ${teko.variable}`}>
      <body className="min-h-screen bg-[#f8f9fd] text-slate-800 font-sans antialiased flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

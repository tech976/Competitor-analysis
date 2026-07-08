import type { Metadata } from "next";
import "./globals.css";
import SWRProvider from "@/components/SWRProvider";
import AuroraBackground from "@/components/ui/AuroraBackground";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AdGapIQ — Competitor Ad Intelligence",
  description:
    "Find competitors' winning Meta ads and see exactly where your client is losing — and how to win.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuroraBackground />
        <SWRProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 px-6 py-8 md:px-10 lg:px-12">{children}</main>
          </div>
        </SWRProvider>
      </body>
    </html>
  );
}

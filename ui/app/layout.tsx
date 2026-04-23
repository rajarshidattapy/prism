import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRISM — AI-Native Prediction Markets",
  description: "The autonomous agent infrastructure for verifiable prediction markets on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          {/* Top status bar */}
          <header className="border-b border-[#1a1a2e] px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-prism-purple glow-purple font-bold text-sm tracking-widest">
                ◈ PRISM
              </span>
              <span className="text-prism-dim text-xs">v1</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-prism-dim">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] inline-block animate-pulse" />
                DEVNET
              </span>
              <span>PRISM AGENT: ONLINE</span>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="border-t border-[#1a1a2e] px-4 py-2 text-xs text-prism-dim flex justify-between">
            <span></span>
            <span>Solana Devnet</span>
          </footer>
        </div>
      </body>
    </html>
  );
}

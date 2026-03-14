import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import { BrokerProvider } from "./context/BrokerContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARAGON ANALYTICS",
  description: "Catalogação probabilística e ranking por assertividade",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <BrokerProvider>
            {children}
            <a
              href="https://t.me/aragoncatalogador"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Suporte no Telegram @aragoncatalogador"
              className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-3 rounded-full border border-[#2563EB]/30 bg-[linear-gradient(180deg,rgba(37,99,235,0.95),rgba(29,78,216,0.95))] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-0.5 hover:brightness-110"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-current"
                >
                  <path d="M21.5 4.5c.3-.2.7-.1.9.2.2.3.2.7 0 1l-3.3 15.1c-.1.5-.5.8-1 .9-.4 0-.9-.2-1.2-.5l-4.2-3.1-2.1 2c-.3.3-.7.5-1.1.5-.7 0-1.2-.5-1.3-1.2l-.6-4.5-4.2-1.4c-.5-.2-.9-.7-.9-1.3s.4-1.1 1-1.3L20.9 4.8c.2-.1.4-.2.6-.3ZM8.9 14.1l.4 3.2 1.1-1c.5-.5 1.3-.5 1.9-.1l3.9 2.8 2.5-11.6-13 5.2 2.3.8c.5.2.8.6.9 1.1Z" />
                </svg>
              </span>
              <span className="hidden sm:flex sm:flex-col sm:leading-tight">
                <span>Suporte</span>
                <span className="text-xs font-medium text-[#DBEAFE]">@aragoncatalogador</span>
              </span>
            </a>
          </BrokerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

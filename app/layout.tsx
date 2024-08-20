import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import WalletProvider from '../providers/WalletProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BlinksGPT 🤖 - AI Assistant for Solana Actions & Blinks ✨",
  description:
    "BlinksGPT assists in understanding, coding, and creating fully functional Solana Actions & Blinks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>      
        {/* <WalletProvider> */}
          {children}
        {/* </WalletProvider> */}
        </body>
    </html>
  );
}

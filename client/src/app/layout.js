import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "FileJet — Send Large Files Instantly | P2P File Transfer",
  description:
    "Send files up to 100GB directly between devices with peer-to-peer technology. No upload limits, no waiting. End-to-end encrypted, blazing fast, free.",
  keywords: ["file transfer", "P2P", "WebRTC", "large files", "send files", "file sharing"],
  authors: [{ name: "FileJet" }],
  openGraph: {
    title: "FileJet — Send Large Files Instantly",
    description: "P2P file transfer with no size limits. End-to-end encrypted.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

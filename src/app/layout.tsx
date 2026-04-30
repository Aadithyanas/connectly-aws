import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connectly | Modern Chat",
  description: "High-performance real-time messaging.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#202c33",
};

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from 'sonner'
import { GoogleOAuthProvider } from '@react-oauth/google'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`font-sans h-[100dvh] antialiased`}
    >
      <body className="h-[100dvh] overflow-hidden flex flex-col">
        <Toaster position="top-right" richColors theme="dark" />
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "867281605707-1jb8vouiv8119aieto87h1q8ooq1270e.apps.googleusercontent.com"}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}

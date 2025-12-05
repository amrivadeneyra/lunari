import { ClerkProvider } from "@clerk/nextjs";

import type { Metadata } from "next";

// import { Inter } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { ThemeProvider } from "@/context/theme-provider";

// const inter = Inter({ subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Lunari AI - Asistente Virtual Inteligente para Atención al Cliente",
    template: "%s | Lunari AI",
  },
  description:
    "Asistente virtual inteligente con IA para mejorar la atención al cliente de tu empresa. Personaliza tu asistente virtual, gestiona conversaciones en tiempo real y optimiza la experiencia de tus clientes con tecnología de inteligencia artificial avanzada.",
  keywords: [
    "asistente virtual",
    "IA",
    "inteligencia artificial",
    "atención al cliente",
    "soporte al cliente",
    "asistencia al cliente",
    "OpenAI",
    "GPT",
    "conversación",
    "chat inteligente",
    "servicio al cliente automatizado",
  ],
  authors: [{ name: "Lunari AI" }],
  creator: "Lunari AI",
  publisher: "Lunari AI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://lunari-ai.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Lunari AI",
    title: "Lunari AI - Asistente Virtual Inteligente para Atención al Cliente",
    description:
      "Asistente virtual inteligente con IA para mejorar la atención al cliente de tu empresa. Personaliza y gestiona conversaciones en tiempo real con tecnología avanzada.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lunari AI - Asistente Virtual Inteligente para Atención al Cliente",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lunari AI - Asistente Virtual Inteligente para Atención al Cliente",
    description:
      "Asistente virtual inteligente con IA para mejorar la atención al cliente de tu empresa. Personaliza y gestiona conversaciones en tiempo real con tecnología avanzada.",
    images: ["/og-image.png"],
    creator: "@lunariai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <body className={jakarta.className} suppressHydrationWarning>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <SonnerToaster position="top-center" richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

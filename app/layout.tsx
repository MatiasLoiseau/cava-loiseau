import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "cava-loiseau.vercel.app";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;
  const title = "Cava Loiseau — Tu vinoteca personal";
  const description = "La colección personal de Cava Loiseau, curada y explicada por Juan, tu sommelier.";

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: socialImage, alt: "Cava Loiseau, una cava viva, botella a botella" }] },
    twitter: { card: "summary_large_image", title, description, images: [socialImage] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "../../../src/styles/public.css";

export const metadata: Metadata = {
  title: "BlockForge",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

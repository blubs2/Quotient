import "./globals.css";
import AppProvider from "@/components/AppProvider";
import { Chrome } from "@/components/ui";
import SWRegister from "@/components/SWRegister";

export const metadata = {
  title: "Quotient — daily cognitive training",
  description:
    "Daily matrix reasoning, number series, analogies, and spaced-repetition vocabulary. Every answer explained.",
  manifest: "/manifest.json",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport = {
  themeColor: "#2B4BD8",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <Chrome />
          <main className="qz-main">{children}</main>
        </AppProvider>
        <SWRegister />
      </body>
    </html>
  );
}

import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: { default: "Items", template: "%s" },
  description:
    "Escape From Tarkov Item and Task data insights. Task dependency graph displays all of the tasks that each trader provides along with their dependency direction",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="99a9c2b0-6cb1-4714-b582-db3d5e8e0725"
          strategy="afterInteractive"
          defer={true}
        />
      </body>
    </html>
  );
}

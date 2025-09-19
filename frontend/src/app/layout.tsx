import "./globals.css";

export const metadata = {
  title: { default: "Items", template: "%s" },
  description:
    "Escape From Tarkov Item and Task data insights. Task dependency graph displays all of the tasks that each trader provides along with their dependency direction",
  scripts: [
    {
      src: "https://cloud.umami.is/script.js",
      strategy: "defer",
      dataWebsiteId: "99a9c2b0-6cb1-4714-b582-db3d5e8e0725",
    },
  ],
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
      </body>
    </html>
  );
}

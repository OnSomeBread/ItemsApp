import "./globals.css";

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
      </body>
    </html>
  );
}

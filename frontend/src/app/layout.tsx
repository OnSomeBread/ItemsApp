import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Items</title>
        <meta
          name="description"
          content="Escape From Tarkov Item and Task data insights. Task dependency graph displays all of the tasks that each trader provides along with their dependency direction"
        />
        {/* <link
          rel="preload"
          href="/node_modules/@picocss/pico/css/pico.min.css"
          as="style"
          //onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="/node_modules/@picocss/pico/css/pico.min.css"
          />
        </noscript> */}

        {/* <link rel="stylesheet" href="/pico.min.css" /> */}
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}

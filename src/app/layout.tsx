import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "./globals.css";

import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});
import { Notifications } from "@mantine/notifications";
import { AppFrame } from "@/components/shell/AppFrame";
import { RightDrawerProvider } from "@/components/shell/RightDrawerProvider";
import { theme } from "@/lib/theme";

export const metadata: Metadata = {
  title: "GOVTECH Desk",
  description: "AI agent marketplace + builder prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps} className={plexSans.variable}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <Notifications />
          <RightDrawerProvider>
            <AppFrame>{children}</AppFrame>
          </RightDrawerProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

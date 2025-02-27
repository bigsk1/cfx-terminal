'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { theme } from './theme';
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>CFX-Terminal</title>
        <meta name="description" content="AI-powered X command center" />
      </head>
      <body>
        <ChakraProvider theme={theme}>
          {children}
        </ChakraProvider>
      </body>
    </html>
  );
}

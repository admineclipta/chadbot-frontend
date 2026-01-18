"use client"

import React from "react"
import "../styles/globals.css"
import { Providers } from "./providers"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // En CSR, manejamos los metadatos directamente en el DOM
  React.useEffect(() => {
    document.title = "Chadbot"
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Gestiona todas tus conversaciones de mensajería en un solo lugar')
    } else {
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = 'Gestiona todas tus conversaciones de mensajería en un solo lugar'
      document.head.appendChild(meta)
    }
  }, [])

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" href="/chadbot-isotipo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                document.documentElement.classList.add(theme);
              } catch (e) {
                document.documentElement.classList.add('light');
              }
            `,
          }}
        />
      </head>
      <body className="font-sans overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

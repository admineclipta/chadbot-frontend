"use client"

import React from "react"
import "./globals.css"
import { Providers } from "./providers"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // En CSR, manejamos los metadatos directamente en el DOM
  React.useEffect(() => {
    document.title = "Chadbot - Plataforma de Mensajería Multi-Tenant"
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
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
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

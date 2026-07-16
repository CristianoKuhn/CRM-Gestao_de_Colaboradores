import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Liderança Pro · Gestão de Colaboradores',
  description: 'Sistema de gestão de colaboradores',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

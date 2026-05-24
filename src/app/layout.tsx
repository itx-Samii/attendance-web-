import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aura Attendance Management ERP',
  description: 'Enterprise Student Daily Attendance and Parent Alert System',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read theme cookie to prevent layouts flickering/flashing on server rendering
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme');
  const initialTheme = (themeCookie?.value as 'light' | 'dark') || 'light';

  return (
    <html lang="en" className={initialTheme === 'dark' ? 'theme-dark' : 'theme-light'}>
      <body style={{ margin: 0, padding: 0 }}>
        <ThemeProvider initialTheme={initialTheme}>
          <div className="app-container">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

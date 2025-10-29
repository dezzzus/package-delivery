import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Package Tracker",
  description: "Track your packages easily",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
            <div className="container mx-auto px-4 h-16 flex items-center">
              <Link href="/" className="text-xl font-bold hover:text-blue-100 transition-colors">
                Package Tracker
              </Link>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

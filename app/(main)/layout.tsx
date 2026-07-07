import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/authServer";
import { 
  TrendingUp, 
  LayoutDashboard, 
  BarChart2, 
  Briefcase, 
  BookOpen, 
  User, 
  Bell, 
  LogOut, 
  Settings
} from "lucide-react";
import LogoutButton from "./LogoutButton";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Await cookies and load the server-side user profile
  const cookieStore = await cookies();
  const rawCookieHeader = cookieStore.toString();
  const user = await getServerUser(rawCookieHeader);

  // Fallback redirect if middleware missed it
  if (!user) {
    redirect("/login");
  }

  // Active styles will be determined client-side in the pages, 
  // but we can setup the base structure here.
  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Market", href: "/market", icon: BarChart2 },
    { label: "Portfolio", href: "/portfolio", icon: Briefcase },
    { label: "Orders", href: "/orders", icon: BookOpen },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 lg:pb-0">
      
      {/* Top Navbar */}
      <header className="sticky top-0 bg-white border-b border-slate-100 h-16 shrink-0 z-40 px-4 md:px-8 flex items-center justify-between shadow-sm shadow-slate-100/50">
        
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800">
            PaperTrade
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all"
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile controls & Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Notifications button */}
          <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 relative transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          </button>

          {/* User profile capsule */}
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 font-bold flex items-center justify-center uppercase text-sm">
              {user.display_name.substring(0, 2)}
            </div>
            
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-black text-slate-700 max-w-[120px] truncate">
                {user.display_name}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {user.role}
              </span>
            </div>

            {/* Logout Action Button */}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main page content area */}
      <main className="flex-grow flex flex-col p-4 md:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around z-40 px-2 shadow-lg shadow-slate-200/50">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center space-y-1 w-16 h-12 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </footer>

    </div>
  );
}

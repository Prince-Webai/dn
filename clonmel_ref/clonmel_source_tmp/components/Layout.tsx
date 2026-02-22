
import React from 'react';
import { useApp } from '../contexts/AppContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  LogOut,
  PlusCircle,
  Menu,
  CalendarDays,
  CloudCheck,
  Database,
  HardDrive,
  UserCircle
} from 'lucide-react';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, logout, currentView, setView, isSyncing, databaseError } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  if (!user) return <>{children}</>;

  const NavItem = ({ view, icon: Icon, label }: { view: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        setView(view as any);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === view
          ? 'bg-brand-50 text-brand-600 font-medium'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center relative">
          <div className="h-12 w-12 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg shadow-brand-500/30">
            CG
          </div>
          <h1 className="text-lg font-bold text-slate-800">Clonmel Glass</h1>
          <p className="text-xs text-slate-400">Invoice Hub</p>

          <div className="absolute top-4 right-4 flex items-center space-x-1" title={databaseError ? "Using Local Mock Data" : "Connected to Cloud DB"}>
            <div className={`h-2 w-2 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : databaseError ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
            <span className={`text-[8px] font-bold uppercase tracking-tighter ${databaseError ? 'text-amber-500' : 'text-slate-400'}`}>
              {isSyncing ? 'SYNC' : databaseError ? 'MOCK' : 'LIVE'}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="CALENDAR" icon={CalendarDays} label="Schedule" />
          <NavItem view="INVOICES" icon={FileText} label="Invoices" />
          <NavItem view="CREATE_INVOICE" icon={PlusCircle} label="New Invoice" />
          <NavItem view="CUSTOMERS" icon={UserCircle} label="Customers" />

          {user.role === UserRole.ADMIN && (
            <>
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Admin
              </div>
              <NavItem view="PRODUCTS" icon={Package} label="Products" />
              <NavItem view="USERS" icon={Users} label="Users" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <img src={user.avatar} alt="User" className="h-8 w-8 rounded-full bg-slate-200 border border-slate-100 shadow-sm" />
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-brand-500 rounded flex items-center justify-center text-white font-bold text-sm">CG</div>
            <span className="font-bold text-slate-800 text-sm">Clonmel Glass</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-full">
              <div className={`h-1.5 w-1.5 rounded-full ${isSyncing ? 'bg-blue-400 animate-pulse' : databaseError ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
              <span className={`text-[8px] font-bold ${databaseError ? 'text-amber-600' : 'text-slate-500'}`}>
                {isSyncing ? 'SYNC' : databaseError ? 'MOCK DATA' : 'LIVE DB'}
              </span>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600">
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute top-0 right-0 h-full w-64 bg-white shadow-xl p-4" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500">✕</button>
              </div>
              <nav className="space-y-2">
                <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
                <NavItem view="CALENDAR" icon={CalendarDays} label="Schedule" />
                <NavItem view="INVOICES" icon={FileText} label="Invoices" />
                <NavItem view="CREATE_INVOICE" icon={PlusCircle} label="New Invoice" />
                <NavItem view="CUSTOMERS" icon={UserCircle} label="Customers" />
                {user.role === UserRole.ADMIN && (
                  <>
                    <hr className="my-2 border-slate-100" />
                    <NavItem view="PRODUCTS" icon={Package} label="Products" />
                    <NavItem view="USERS" icon={Users} label="Users" />
                  </>
                )}
                <hr className="my-2 border-slate-100" />
                <button onClick={logout} className="w-full text-left px-4 py-3 text-red-600">Sign Out</button>
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

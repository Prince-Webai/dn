import React, { useState, useEffect } from 'react';
import { Menu, LayoutDashboard, Wrench, Users, Package, FileText, LogOut, User, Euro, PieChart, FileCheck, Kanban, Settings as SettingsIcon, ClipboardList, ShieldCheck, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo_v5.jpg';
import CommandPalette from '../components/CommandPalette';
import { Search } from 'lucide-react';


const Layout = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    // State for user name display
    const [userName, setUserName] = useState('Admin User');

    // Update form state when user loads
    useEffect(() => {
        if (user) {
            setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Admin User');
        }
    }, [user]);

    const handleSignOut = async () => {

        try {
            await signOut();
            // Clear dev bypass just in case
            localStorage.removeItem('dev_bypass');
            localStorage.removeItem('dev_role');
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            // Even on error, try to get back to login if session is weird
        }
    };

    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const navSections = [
        {
            title: 'Main',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
                { icon: Wrench, label: 'Jobs & Services', path: '/jobs' },
                { icon: Kanban, label: 'Pipeline', path: '/pipeline' },
                { icon: Users, label: 'Customers', path: '/customers' },
            ]
        },
        {
            title: 'Financial',
            items: [
                { icon: FileText, label: 'Invoices', path: '/invoices' },
                { icon: FileCheck, label: 'Quotes', path: '/quotes' },
                { icon: Euro, label: 'Payments', path: '/payments' },
            ]
        },
        {
            title: 'Inventory',
            items: [
                { icon: Package, label: 'Parts Inventory', path: '/inventory' },
            ]
        },
        {
            title: 'Reports & Admin',
            items: [
                { icon: ClipboardList, label: 'Service Reports', path: '/service-reports' },
                { icon: ShieldCheck, label: 'Warranty Forms', path: '/warranty-forms' },
                ...(user?.user_metadata?.role !== 'Engineer' ? [
                    { icon: PieChart, label: 'Analytics', path: '/reports' },
                    { icon: Users, label: 'Team & Engineers', path: '/team' },
                ] : []),
            ]
        },
    ];

    // Mobile Bottom Nav Structure
    const mobileNavItems = [
        { icon: LayoutDashboard, label: 'Home', path: '/' },
        { icon: Wrench, label: 'Jobs', path: '/jobs' },
        { icon: Users, label: 'Customers', path: '/customers' },
        { icon: ShieldCheck, label: 'Warranty', path: '/warranty-forms' },
    ];

    const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false);

    const closeSidebar = () => {
        setIsSidebarOpen(false);
        setIsMobileNavExpanded(false);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFB] font-sans text-[#1a1a1a]">
            {/* Desktop Header - Hidden on Mobile */}
            <header className="hidden md:block sticky top-0 z-[1000] border-b border-slate-200 bg-white shadow-sm">
                <div className="max-w-[1600px] mx-auto px-8 py-2 flex justify-between items-center flex-wrap gap-4">

                    <Link to="/" className="flex items-center pt-1 group">
                        <img
                            src={logoImg}
                            alt="Tony Condon Dairy Services"
                            className="h-[48px] w-auto mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                        />
                    </Link>

                    {/* Global Search Bar (Cmd+K) */}
                    <button 
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="hidden lg:flex flex-1 max-w-md items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:bg-white hover:border-delaval-blue hover:shadow-sm transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <Search size={18} className="group-hover:text-delaval-blue transition-colors" />
                            <span className="text-sm font-medium">Search jobs, customers, parts...</span>
                        </div>
                        <div className="flex items-center gap-0.5 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-400 group-hover:border-delaval-blue/30 group-hover:text-delaval-blue transition-colors">
                            CMD K
                        </div>
                    </button>

                    {/* User Info & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/settings')}
                            className="hidden md:flex p-2 text-slate-400 hover:text-delaval-blue hover:bg-blue-50 rounded-full transition-colors"
                            title="Settings"
                        >
                            <SettingsIcon size={20} />
                        </button>

                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                            <div className="w-9 h-9 rounded-full bg-delaval-blue text-white flex items-center justify-center font-bold">
                                <User size={20} />
                            </div>
                            <div className="text-slate-700 text-sm font-medium pr-2">
                                {userName}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Menu size={28} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <div className="max-w-[1600px] mx-auto min-h-screen md:p-4 lg:p-8 flex flex-col md:grid lg:grid-cols-[280px_1fr] gap-0 md:gap-8 bg-[#F8FAFB]">

                {/* Desktop Sidebar - Matching Prototype Card Style */}
                <aside className={`
          hidden md:block
          fixed inset-0 z-50 lg:static lg:z-auto bg-black/50 lg:bg-transparent
          transition-all duration-300
          ${isSidebarOpen ? 'opacity-100 visible' : 'opacity-0 invisible lg:opacity-100 lg:visible'}
        `} onClick={closeSidebar}>

                    <div onClick={e => e.stopPropagation()} className={`
            bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,81,165,0.12)] h-fit sticky top-[120px]
            w-[280px] max-w-[80vw] transform transition-transform duration-300
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>


                        {navSections.map((section, idx) => (
                            <div key={idx} className="mb-6 last:mb-0">
                                <h3 className="text-xs uppercase tracking-widest text-[#0051A5]/60 font-bold mb-3 px-3">{section.title}</h3>
                                <nav className="space-y-1">
                                    {section.items.map((item) => {
                                        const Icon = item.icon;

                                        const isActive = location.pathname === item.path;

                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={closeSidebar}
                                                className={`
                            flex items-center gap-3 px-3 py-3.5 rounded-xl font-medium transition-all duration-200
                            ${isActive
                                                        ? 'bg-gradient-to-br from-[#0051A5] to-[#003875] text-white shadow-[0_4px_12px_rgba(0,81,165,0.3)] relative overflow-hidden pl-4'
                                                        : 'text-[#1a1a1a] hover:bg-[#E6F0FF] hover:text-[#0051A5] hover:translate-x-1'
                                                    }
                          `}
                                            >
                                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[60%] bg-[#FF6B00] rounded-r"></div>}
                                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>
                        ))}

                        <div className="pt-6 border-t border-slate-100 mt-6">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-3 py-3 text-slate-600 hover:bg-slate-50 hover:text-red-600 rounded-xl font-medium transition-colors"
                            >
                                <LogOut size={20} />
                                Sign Out
                            </button>
                        </div>

                    </div>
                </aside>

                <main className="min-w-0 flex-1 w-full pb-28 md:pb-0">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[2000] shadow-[0_-1px_10px_rgba(0,0,0,0.05)] pb-safe">
                {/* Expanded Nav Overlay */}
                <AnimatePresence>
                    {isMobileNavExpanded && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileNavExpanded(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[-1]"
                            />
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="bg-white rounded-t-3xl p-6 pb-12 shadow-2xl overflow-y-auto max-h-[70vh]"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Full Navigation</h3>
                                    <button 
                                        onClick={() => setIsMobileNavExpanded(false)}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                        <ChevronDown size={24} className="text-slate-400" />
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    {navSections.flatMap(s => s.items).map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsMobileNavExpanded(false)}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${isActive ? 'bg-blue-50 text-delaval-blue ring-2 ring-delaval-blue/20' : 'bg-slate-50 text-slate-600 active:bg-slate-100'}`}
                                            >
                                                <div className={`p-2 rounded-xl ${isActive ? 'bg-delaval-blue text-white shadow-lg shadow-blue-900/20' : 'bg-white text-slate-400'}`}>
                                                    <Icon size={20} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-center leading-tight tracking-wider">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                    <button
                                        onClick={handleSignOut}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 active:bg-red-100"
                                    >
                                        <div className="p-2 rounded-xl bg-white text-red-400">
                                            <LogOut size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-center leading-tight tracking-wider">Sign Out</span>
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <div className="flex items-center justify-between px-1 pt-3 pb-2 relative bg-white">
                    {/* Home & Jobs */}
                    {mobileNavItems.slice(0, 2).map((item) => {
                        const Icon = item.icon;
                        const isActive = item.path === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.path);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileNavExpanded(false)}
                                className={`flex flex-col items-center gap-1 transition-all px-0 flex-1 ${isActive ? 'text-[#0051A5] translate-y-[-2px]' : 'text-slate-400'}`}
                            >
                                <Icon size={isActive ? 27 : 25} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[9px] uppercase font-bold tracking-tight">{item.label}</span>
                            </Link>
                        );
                    })}
                    
                    {/* Centered "More" Pull-up Button */}
                    <div className="flex-1 flex flex-col items-center">
                        <button
                            onClick={() => setIsMobileNavExpanded(!isMobileNavExpanded)}
                            className={`relative -top-3 flex flex-col items-center justify-center transition-all duration-300 ${isMobileNavExpanded ? 'text-[#0051A5] scale-110' : 'text-slate-500 hover:text-[#0051A5]'}`}
                        >
                            <div className={`w-14 h-14 bg-white rounded-full shadow-[0_4px_15px_rgba(0,81,165,0.15)] border border-slate-100 flex items-center justify-center mb-1 transition-transform ${isMobileNavExpanded ? 'rotate-180 bg-blue-50' : ''}`}>
                                <ChevronUp size={28} strokeWidth={3} />
                            </div>
                            <span className="text-[10px] uppercase font-black tracking-widest -mt-1">{isMobileNavExpanded ? 'Close' : 'More'}</span>
                        </button>
                    </div>

                    {/* Customers & Warranty */}
                    {mobileNavItems.slice(2, 4).map((item) => {
                        const Icon = item.icon;
                        const isActive = item.path === '/'
                            ? location.pathname === '/'
                            : location.pathname.startsWith(item.path);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileNavExpanded(false)}
                                className={`flex flex-col items-center gap-1 transition-all px-0 flex-1 ${isActive ? 'text-[#0051A5] translate-y-[-2px]' : 'text-slate-400'}`}
                            >
                                <Icon size={isActive ? 25 : 23} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[9px] uppercase font-bold tracking-tight">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <CommandPalette 
                isOpen={isCommandPaletteOpen} 
                onClose={() => setIsCommandPaletteOpen(false)} 
            />
        </div>
    );
};

export default Layout;

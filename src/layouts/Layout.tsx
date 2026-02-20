
import React, { useState, useEffect } from 'react';
import { Menu, LayoutDashboard, Wrench, Users, Package, FileText, LogOut, User, Euro, PieChart, FileCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import logoImg from '../assets/logo.png';

const Layout = ({ children }: { children: React.ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Form state for profile editing
    const [profileForm, setProfileForm] = useState({
        name: '',
        email: ''
    });

    // Update form state when user loads
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'Admin User',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleSignOut = async () => {
        try {
            await signOut();
            // Navigation to login is handled by ProtectedRoute/AuthContext state change
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.auth.updateUser({
                data: { name: profileForm.name }
            });
            if (error) throw error;
            setIsProfileModalOpen(false);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert(`Failed to update profile: ${error.message}`);
        }
    };

    // Prototype Sidebar Structure
    const navSections = [
        {
            title: 'Main',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
                { icon: Wrench, label: 'Jobs & Services', path: '/jobs' },
                { icon: Users, label: 'Customers', path: '/customers' },
            ]
        },
        {
            title: 'Inventory',
            items: [
                { icon: Package, label: 'Parts Inventory', path: '/inventory' },
                // { icon: Package, label: 'Parts Allocation', path: '/inventory' }, // Combined in React App
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
            title: 'Reports & Admin',
            items: [
                { icon: PieChart, label: 'Analytics', path: '/reports' },
                { icon: Users, label: 'Team & Engineers', path: '/team' },
            ]
        },
    ];

    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="min-h-screen bg-[#F8FAFB] font-sans text-[#1a1a1a]">
            {/* Header - Matching Prototype Gradient */}
            <header className="sticky top-0 z-[1000] border-b-4 border-delaval-accent shadow-[0_8px_32px_rgba(0,81,165,0.3)] backdrop-blur-3xl"
                style={{ background: 'linear-gradient(135deg, #003875 0%, #0051A5 50%, #0066CC 100%)' }}>
                <div className="max-w-[1600px] mx-auto px-8 py-6 flex justify-between items-center flex-wrap gap-4">

                    {/* Logo Section */}
                    <div className="flex items-center gap-4">
                        <img src={logoImg} alt="Tony Condon Dairy Services" className="h-[50px] w-auto rounded-lg bg-white p-1 shadow-[0_4px_16px_rgba(255,255,255,0.3)]" />
                        <div className="flex flex-col gap-1 text-white">
                            <h1 className="font-display text-xl font-bold tracking-tight leading-tight">Tony Condon<br />Dairy Services</h1>
                        </div>
                    </div>

                    {/* User Info & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        <div
                            onClick={() => {
                                setIsProfileModalOpen(true);
                            }}
                            className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/15 rounded-full backdrop-blur-md border border-white/10 cursor-pointer hover:bg-white/20 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-white text-[#0051A5] flex items-center justify-center font-bold">
                                <User size={20} />
                            </div>
                            <div className="text-white text-sm font-medium pr-2">
                                {profileForm.name}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Menu size={28} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <div className="max-w-[1600px] mx-auto p-4 lg:p-8 grid lg:grid-cols-[280px_1fr] gap-8">

                {/* Sidebar - Matching Prototype Card Style */}
                <aside className={`
          fixed inset-0 z-50 lg:static lg:block lg:z-auto bg-black/50 lg:bg-transparent
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

                <main className="min-w-0">
                    {children}
                </main>

            </div>

            {/* Edit Profile Modal */}
            {isProfileModalOpen && (
                <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Edit Profile">
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none"
                                value={profileForm.name}
                                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                // Emails are usually immutable in basic auth implementations or require re-confirmation
                                disabled
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed"
                                value={profileForm.email}
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-delaval-blue text-white rounded-lg hover:bg-delaval-blue/90"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default Layout;

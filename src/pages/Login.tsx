
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { ArrowRight, Loader2, Mail, Lock } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            showToast('Successfully logged in!', 'success');
            navigate('/');
        } catch (error: any) {
            showToast(error.message || 'Failed to login', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-br from-[#003875] to-[#0066CC] skew-y-[-6deg] origin-top-left translate-y-[-20%] z-0"></div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">
                <div className="p-8 pb-6 text-center">
                    <div className="w-16 h-16 bg-[#0051A5] text-white rounded-xl flex items-center justify-center font-extrabold text-2xl shadow-lg mx-auto mb-4">
                        CD
                    </div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Welcome Back</h1>
                    <p className="text-slate-500 mt-2">Sign in to Condon Dairy Management</p>
                </div>

                <form onSubmit={handleLogin} className="p-8 pt-0 space-y-5">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none transition-all"
                                placeholder="name@company.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-delaval-blue/20 focus:border-delaval-blue outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-delaval-blue hover:bg-delaval-dark-blue text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    {/* DEV ONLY BYPASS */}
                    <button
                        type="button"
                        onClick={() => {
                            showToast('Bypassing login for dev testing', 'success');
                            navigate('/inventory');
                        }}
                        className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl border border-slate-300 transition-all"
                    >
                        Bypass Login (Dev)
                    </button>
                </form>

                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
                    Protected System. Authorized Access Only.
                </div>
            </div>
        </div>
    );
};

export default Login;

import { useEffect, useState, useMemo } from 'react';
import {
    Euro, Wrench, AlertCircle, Package,
    Plus, Users, FileText, FilePlus, Calendar,
    ArrowUpRight, Clock, Send, CheckCircle2, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Job, Invoice } from '../types';
import { dataService } from '../services/dataService';
import { useToast } from '../context/ToastContext';

const Dashboard = () => {
    const { showToast } = useToast();
    const [stats, setStats] = useState({
        outstandingBalance: 0,
        activeJobs: 0,
        overdueInvoices: 0,
        lowStockItems: 0
    });
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invoiceData, allJobs, inventoryArray] = await Promise.all([
                dataService.getInvoices(),
                dataService.getJobs(),
                dataService.getInventory()
            ]);

            setInvoices(invoiceData);

            const unpaidInvoices = invoiceData.filter(inv => {
                const s = inv.status as string;
                return s !== 'paid' && s !== 'void';
            });
            const outstanding = unpaidInvoices.reduce((acc, inv) => acc + (inv.total_amount - (inv.amount_paid || 0)), 0);
            const activeJobsCount = allJobs.filter(j => ['scheduled', 'in_progress'].includes(j.status)).length;
            const lowStockCount = inventoryArray.filter(i => i.stock_level < 5).length;

            // Count truly overdue (past due_date and not paid)
            const overdueCount = invoiceData.filter(inv => {
                const s = inv.status as string;
                if (s === 'paid' || s === 'void') return false;
                if (inv.due_date && new Date(inv.due_date) < new Date()) return true;
                return s === 'overdue';
            }).length;

            setStats({
                outstandingBalance: outstanding,
                activeJobs: activeJobsCount,
                overdueInvoices: overdueCount,
                lowStockItems: lowStockCount
            });

            setRecentJobs(allJobs.slice(0, 5));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Overdue invoices for the reminder section
    const overdueInvoices = useMemo(() => {
        return invoices
            .filter(inv => {
                const s = inv.status as string;
                if (s === 'paid' || s === 'void') return false;
                if (inv.due_date && new Date(inv.due_date) < new Date()) return true;
                return s === 'overdue';
            })
            .sort((a, b) => {
                const daysA = a.due_date ? Math.floor((Date.now() - new Date(a.due_date).getTime()) / 86400000) : 0;
                const daysB = b.due_date ? Math.floor((Date.now() - new Date(b.due_date).getTime()) / 86400000) : 0;
                return daysB - daysA;
            })
            .slice(0, 5);
    }, [invoices]);

    // Revenue chart data — last 6 months
    const revenueData = useMemo(() => {
        const months: { label: string; amount: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = d.toLocaleDateString('en-IE', { month: 'short' });
            const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const amount = invoices
                .filter(inv => {
                    const s = inv.status as string;
                    return s === 'paid' && inv.payment_date?.startsWith(mKey);
                })
                .reduce((sum, inv) => sum + (inv.amount_paid || inv.total_amount || 0), 0);
            months.push({ label: monthStr, amount });
        }
        return months;
    }, [invoices]);

    const maxRevenue = Math.max(...revenueData.map(m => m.amount), 1);

    const handleSendReminder = async (inv: Invoice) => {
        setSendingReminder(inv.id);
        // Simulate sending reminder
        await new Promise(r => setTimeout(r, 1000));
        showToast('Reminder Sent', `Payment reminder sent for ${inv.customers?.name || 'customer'}`, 'success');
        setSendingReminder(null);
    };

    const getDaysOverdue = (inv: Invoice) => {
        if (!inv.due_date) return 0;
        return Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000));
    };

    const statCards = [
        {
            label: 'Outstanding Balance',
            value: `€${stats.outstandingBalance.toLocaleString()}`,
            icon: Euro,
            color: 'bg-[#E6F0FF] text-[#0051A5]',
            change: `${stats.overdueInvoices} overdue`,
            changeType: stats.overdueInvoices > 0 ? 'negative' : 'positive',
            link: '/payments'
        },
        {
            label: 'Active Jobs',
            value: stats.activeJobs,
            icon: Wrench,
            color: 'bg-[#E6F9F3] text-[#00A862]',
            change: 'Scheduled & in progress',
            changeType: 'positive',
            link: '/jobs'
        },
        {
            label: 'Overdue Invoices',
            value: stats.overdueInvoices,
            icon: AlertCircle,
            color: 'bg-[#FFE6E6] text-[#DC3545]',
            change: stats.overdueInvoices > 0 ? 'Urgent follow-up needed' : 'All clear',
            changeType: stats.overdueInvoices > 0 ? 'negative' : 'positive',
            link: '/invoices'
        },
        {
            label: 'Parts Alerts',
            value: stats.lowStockItems,
            icon: Package,
            color: 'bg-[#FFF3E6] text-[#FF6B00]',
            change: `${stats.lowStockItems} items low stock`,
            changeType: stats.lowStockItems > 0 ? 'negative' : 'positive',
            link: '/inventory'
        }
    ];

    const quickActions = [
        { icon: Plus, title: 'New Job', desc: 'Create service job', path: '/jobs', color: 'bg-blue-50 text-blue-600' },
        { icon: Users, title: 'Add Customer', desc: 'Register new account', path: '/customers', color: 'bg-green-50 text-green-600' },
        { icon: FileText, title: 'One-Time Invoice', desc: 'Instant charge invoice', path: '/invoices', color: 'bg-purple-50 text-purple-600' },
        { icon: FilePlus, title: 'Create Quote', desc: 'Generate estimate', path: '/quotes', color: 'bg-orange-50 text-orange-600' },
        { icon: Calendar, title: 'Monthly Invoice', desc: 'Bill customer account', path: '/invoices', color: 'bg-indigo-50 text-indigo-600' },
    ];

    return (
        <div className="flex flex-col gap-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={index} to={stat.link} className="stat-card group block">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-4xl font-bold font-display text-slate-900 mb-1 tracking-tight">
                                        {loading ? '-' : stat.value}
                                    </div>
                                    <div className="font-medium text-slate-500 mb-1 text-sm">{stat.label}</div>
                                    <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md mt-1
                                        ${stat.changeType === 'positive' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {stat.change}
                                    </div>
                                </div>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${stat.color}`}>
                                    <Icon size={24} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                        <Link key={index} to={action.path} className="group relative bg-white rounded-xl p-6 shadow-sm border-2 border-transparent hover:border-delaval-blue transition-all hover:-translate-y-1 hover:shadow-lg overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-delaval-light-blue to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-delaval-blue bg-[#E6F0FF]`}>
                                    <Icon size={20} />
                                </div>
                                <div className="font-bold text-slate-900 mb-1">{action.title}</div>
                                <div className="text-xs text-slate-500">{action.desc}</div>
                            </div>
                        </Link>
                    )
                })}
            </div>

            {/* Two-column: Overdue Reminders + Revenue Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overdue Invoices & Reminders */}
                <div className="section-card">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                <AlertCircle size={18} className="text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold font-display text-slate-900">Payment Reminders</h2>
                        </div>
                        <Link to="/invoices" className="text-xs font-bold text-delaval-blue hover:underline uppercase tracking-wider">
                            View All
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-6 text-center text-slate-400">Loading...</div>
                        ) : overdueInvoices.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-green-50 flex items-center justify-center">
                                    <CheckCircle2 size={24} className="text-green-500" />
                                </div>
                                <div className="font-bold text-slate-700">All Clear!</div>
                                <div className="text-sm text-slate-400 mt-1">No overdue payments at the moment</div>
                            </div>
                        ) : (
                            overdueInvoices.map(inv => {
                                const days = getDaysOverdue(inv);
                                const remaining = inv.total_amount - (inv.amount_paid || 0);
                                return (
                                    <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${days > 30 ? 'bg-red-100 text-red-600' : days > 14 ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'}`}>
                                                <Clock size={18} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 text-sm truncate">{inv.customers?.name || inv.guest_name || 'Unknown'}</div>
                                                <div className="text-xs text-slate-400">
                                                    {inv.invoice_number} · <span className={`font-bold ${days > 30 ? 'text-red-500' : days > 14 ? 'text-orange-500' : 'text-amber-500'}`}>{days} days overdue</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="font-bold text-slate-900 text-sm">€{remaining.toLocaleString()}</span>
                                            <button
                                                onClick={() => handleSendReminder(inv)}
                                                disabled={sendingReminder === inv.id}
                                                className="p-2 rounded-lg bg-delaval-blue/10 text-delaval-blue hover:bg-delaval-blue hover:text-white transition-all disabled:opacity-50"
                                                title="Send Reminder"
                                            >
                                                {sendingReminder === inv.id ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Send size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="section-card">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <TrendingUp size={18} className="text-emerald-500" />
                            </div>
                            <h2 className="text-lg font-bold font-display text-slate-900">Revenue (6 Months)</h2>
                        </div>
                        <Link to="/payments" className="text-xs font-bold text-delaval-blue hover:underline uppercase tracking-wider">
                            Details
                        </Link>
                    </div>
                    <div className="p-6">
                        <div className="flex items-end justify-between gap-3 h-[200px]">
                            {revenueData.map((m, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                    <div className="text-xs font-bold text-slate-700">
                                        {m.amount > 0 ? `€${(m.amount / 1000).toFixed(1)}k` : '—'}
                                    </div>
                                    <div
                                        className="w-full rounded-lg bg-gradient-to-t from-delaval-blue to-blue-400 transition-all duration-500 hover:from-delaval-dark-blue hover:to-delaval-blue relative group min-h-[4px]"
                                        style={{ height: `${Math.max((m.amount / maxRevenue) * 150, 4)}px` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            €{m.amount.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-400 uppercase">{m.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Jobs Table */}
            <div className="section-card">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold font-display text-slate-900">Recent Jobs</h2>
                    <div className="flex gap-3">
                        <Link to="/jobs" className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:text-delaval-blue transition-colors">
                            View All
                        </Link>
                        <Link to="/jobs" className="px-4 py-2 bg-gradient-to-br from-delaval-blue to-delaval-dark-blue text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            + New Job
                        </Link>
                    </div>
                </div>
                <div className="overflow-x-auto p-0">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8FAFB] border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Engineer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading jobs...</td></tr>
                            ) : recentJobs.map((job) => (
                                <tr key={job.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-slate-900">#{job.job_number}</div>
                                            <Link to={`/jobs/${job.id}`} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-delaval-blue transition-colors">
                                                <ArrowUpRight size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#E6F0FF] text-[#0051A5] flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                                                {job.customers?.name?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-700">{job.customers?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{job.service_type}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{job.engineer_name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{job.date_scheduled?.split('T')[0]}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                job.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-blue-100 text-blue-800'}`}>
                                            {job.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentJobs.length === 0 && !loading && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No recent jobs found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

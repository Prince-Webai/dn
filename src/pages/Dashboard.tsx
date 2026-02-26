import { useEffect, useState } from 'react';
import {
    Euro, Wrench, AlertCircle, Package,
    Plus, Users, FileText, FilePlus, Calendar, ArrowUpRight,
    Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Job } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import DatePicker from '../components/DatePicker';

const Dashboard = () => {
    const [stats, setStats] = useState({
        outstandingBalance: 0,
        activeJobs: 0,
        overdueInvoices: 0,
        lowStockItems: 0
    });
    const [recentJobs, setRecentJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Date Filtering State
    const [filterType, setFilterType] = useState<'all' | 'month' | 'year' | 'custom'>('all');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, [filterType, customRange]);

    const getEffectiveRange = () => {
        const now = new Date();
        if (filterType === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start, end: now };
        }
        if (filterType === 'year') {
            const start = new Date(now.getFullYear(), 0, 1);
            return { start, end: now };
        }
        if (filterType === 'custom') {
            return {
                start: new Date(customRange.start),
                end: new Date(customRange.end)
            };
        }
        return { start: null, end: null };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const userRole = user?.user_metadata?.role;
            const engineerName = userRole === 'Engineer' ? (user?.user_metadata?.name || user?.email?.split('@')[0]) : undefined;

            const [invoiceData, allJobs, inventoryArray] = await Promise.all([
                dataService.getInvoices(),
                dataService.getJobs(undefined, engineerName),
                dataService.getInventory()
            ]);

            const { start, end } = getEffectiveRange();

            // Filter Data by Date
            const filteredInvoices = start && end
                ? invoiceData.filter(inv => {
                    const date = new Date(inv.date_issued);
                    return date >= start && date <= end;
                })
                : invoiceData;

            const filteredJobs = start && end
                ? allJobs.filter(job => {
                    if (!job.date_scheduled) return false;
                    const date = new Date(job.date_scheduled);
                    return date >= start && date <= end;
                })
                : allJobs;

            const unpaidInvoices = filteredInvoices.filter(inv => {
                const s = inv.status as string;
                return s !== 'paid' && s !== 'void';
            });
            const outstanding = unpaidInvoices.reduce((acc, inv) => acc + (inv.total_amount - (inv.amount_paid || 0)), 0);
            const activeJobsCount = filteredJobs.filter(j => ['scheduled', 'in_progress'].includes(j.status)).length;
            const lowStockCount = inventoryArray.filter(i => i.stock_level < 5).length;

            const overdueCount = filteredInvoices.filter(inv => {
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

            setRecentJobs(filteredJobs.slice(0, 5));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `€${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `€${(value / 1000).toFixed(1)}K`;
        }
        return `€${value.toLocaleString()}`;
    };

    const statCards = [
        {
            label: 'Outstanding Balance',
            value: formatCurrency(stats.outstandingBalance),
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
        { icon: FileText, title: 'One-Time Invoice', desc: 'Instant charge invoice', path: '/invoices', color: 'bg-delaval-light-blue text-delaval-blue' },
        { icon: FilePlus, title: 'Create Quote', desc: 'Generate estimate', path: '/quotes', color: 'bg-orange-50 text-orange-600' },
        { icon: Calendar, title: 'Monthly Invoice', desc: 'Bill customer account', path: '/invoices', color: 'bg-indigo-50 text-indigo-600' },
    ];

    return (
        <div className="flex flex-col gap-8">
            {/* Header & Date Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                    <p className="text-slate-500 text-sm">Welcome back, {user?.user_metadata?.name || 'Administrator'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-48">
                        <SearchableSelect
                            label=""
                            searchable={false}
                            options={[
                                { value: 'all', label: 'All Time' },
                                { value: 'month', label: 'This Month' },
                                { value: 'year', label: 'This Year' },
                                { value: 'custom', label: 'Custom Range' }
                            ]}
                            value={filterType}
                            onChange={(val) => setFilterType(val as any)}
                            icon={<Filter size={14} />}
                        />
                    </div>

                    {filterType === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                            <div className="w-40">
                                <DatePicker
                                    value={customRange.start}
                                    onChange={(date) => setCustomRange({ ...customRange, start: date })}
                                    placeholder="Start Date"
                                />
                            </div>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">to</span>
                            <div className="w-40">
                                <DatePicker
                                    value={customRange.end}
                                    onChange={(date) => setCustomRange({ ...customRange, end: date })}
                                    placeholder="End Date"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

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

import { useEffect, useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    BarChart2, TrendingUp, Users, Euro, Package, Calendar,
    Clock, Send, Activity, User, Phone, Mail, CheckCircle2, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { Invoice, Job, InventoryItem } from '../types';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

// Safe render helper
const safeRender = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
};

interface RevenueData {
    name: string;
    revenue: number;
    target: number;
}

const Reports = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [jobStatusData, setJobStatusData] = useState<any[]>([]);
    const [inventoryValue, setInventoryValue] = useState(0);
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

    // Date Range Filter State
    const [dateRangeFilter, setDateRangeFilter] = useState<'6months' | 'ytd' | '12months'>('6months');

    // Tony Condon UX States
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const [invoices, jobs, inventory] = await Promise.all([
                dataService.getInvoices(),
                dataService.getJobs(),
                dataService.getInventory()
            ]);

            setAllInvoices(invoices);
            processRevenueData(invoices, dateRangeFilter);
            processJobStatusData(jobs);
            processInventoryData(inventory);
            processTopCustomers(invoices);

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (allInvoices.length > 0) {
            processRevenueData(allInvoices, dateRangeFilter);
        }
    }, [dateRangeFilter, allInvoices]);

    const processRevenueData = (invoices: Invoice[], range: '6months' | 'ytd' | '12months') => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartData: RevenueData[] = [];
        const now = new Date();

        if (range === '6months' || range === '12months') {
            const count = range === '6months' ? 6 : 12;
            for (let i = count - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                chartData.push({
                    name: months[d.getMonth()] + (range === '12months' ? ` '${d.getFullYear().toString().slice(2)}` : ''),
                    revenue: 0,
                    target: 5000 // Mock target
                });
            }
        } else if (range === 'ytd') {
            for (let i = 0; i <= now.getMonth(); i++) {
                chartData.push({
                    name: months[i],
                    revenue: 0,
                    target: 5000 // Mock target
                });
            }
        }

        invoices.forEach(inv => {
            if (inv.status !== 'void' && inv.date_issued) {
                const date = new Date(inv.date_issued);

                // Only include if it fits the range logic implicitly defined by chartData names
                const monthName = months[date.getMonth()];
                const fullName = range === '12months' ? monthName + ` '${date.getFullYear().toString().slice(2)}` : monthName;

                // YTD Check - must be current year
                if (range === 'ytd' && date.getFullYear() !== now.getFullYear()) return;

                const monthData = chartData.find(m => m.name === fullName || m.name === monthName);
                if (monthData) {
                    monthData.revenue += (inv.total_amount || 0);
                }
            }
        });

        setRevenueData(chartData);
    };

    // Payment Action Center (Overdue + Due within 3 days)
    const reminderCandidates = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        return allInvoices.filter(inv => {
            if (inv.status === 'paid' || inv.status === 'void') return false;

            // If no due date, fallback to overdue status check
            if (!inv.due_date) return inv.status === 'overdue';

            const dueDate = new Date(inv.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate <= threeDaysFromNow;
        }).sort((a, b) => {
            if (!a.due_date && !b.due_date) return 0;
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    }, [allInvoices]);

    const handleSendReminder = async (inv: Invoice) => {
        setSendingReminder(inv.id);

        const days = getDaysOverdue(inv);
        const remaining = inv.total_amount - (inv.amount_paid || 0);
        const customerName = inv.customers?.name || inv.guest_name || 'Customer';

        let message = '';
        if (days > 0) {
            message = `Dear ${customerName},\n\nThis is a friendly reminder that invoice ${inv.invoice_number} for €${remaining.toLocaleString()} is currently ${days} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\nCondon Dairy Services`;
        } else {
            message = `Dear ${customerName},\n\nThis is a quick reminder that invoice ${inv.invoice_number} for €${remaining.toLocaleString()} is due soon.\n\nThank you for your prompt payment,\nCondon Dairy Services`;
        }

        await new Promise(r => setTimeout(r, 800)); // Simulate sending

        showToast('Reminder Sent', `Payment reminder sent for ${customerName}`, 'success');
        setSendingReminder(null);
        setSelectedInvoiceForDetail(null);

        setTimeout(() => {
            alert(`Email Draft Ready:\n\n${message}\n\n(In a real setup, this would instantly email the client).`);
        }, 100);
    };

    const getDaysOverdue = (inv: Invoice) => {
        if (!inv.due_date) return 0;
        return Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000));
    };

    const processJobStatusData = (jobs: Job[]) => {
        const statusCounts: Record<string, number> = {};
        jobs.forEach(j => {
            statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
        });

        const data = Object.keys(statusCounts).map(status => ({
            name: status.replace('_', ' ').toUpperCase(),
            value: statusCounts[status]
        }));

        setJobStatusData(data);
    };

    const processInventoryData = (inventory: InventoryItem[]) => {
        const total = inventory.reduce((acc, item) => acc + (item.stock_level * item.cost_price), 0);
        setInventoryValue(total);
    };

    const processTopCustomers = (invoices: Invoice[]) => {
        const customerSpend: Record<string, number> = {};
        invoices.forEach(inv => {
            if ((inv as any).customers) {
                const name = (inv as any).customers.name;
                customerSpend[name] = (customerSpend[name] || 0) + (inv.total_amount || 0);
            }
        });

        const sorted = Object.entries(customerSpend)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        setTopCustomers(sorted);
    };

    const COLORS = ['#0051A5', '#00A862', '#FFC107', '#FF6B00', '#003875'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-delaval-blue/30 border-t-delaval-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-slate-900">Analytics & Reports</h1>
                <p className="text-slate-500">Overview of business performance and metrics</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Inventory Value</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">€{inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                        <Package size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Top Customer</p>
                        <h3 className="text-xl font-bold text-slate-900 mt-1">{topCustomers[0]?.name || 'N/A'}</h3>
                        <p className="text-xs text-green-600 font-medium">€{topCustomers[0]?.value?.toLocaleString() || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Revenue (Last 6M)</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">
                            €{revenueData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-12 h-12 bg-delaval-light-blue text-delaval-blue rounded-lg flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Action Center */}
                <div className="section-card border-none shadow-md overflow-hidden bg-white hover:border-transparent">
                    <div className="flex justify-between items-center p-6 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-delaval-light-blue flex items-center justify-center shadow-sm">
                                <Clock size={18} className="text-delaval-blue" />
                            </div>
                            <h2 className="text-sm font-black font-display text-slate-800 uppercase tracking-widest">
                                Payment Action Center
                            </h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm shadow-slate-100/50">
                            {reminderCandidates.length} Items
                        </span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto custom-scrollbar bg-slate-50/30 p-4 space-y-3">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-delaval-blue animate-spin mb-4" />
                                <div className="text-sm font-bold uppercase tracking-widest animate-pulse">Scanning Accounts</div>
                            </div>
                        ) : reminderCandidates.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white shadow-xl shadow-green-900/5 border border-green-50 flex items-center justify-center">
                                    <CheckCircle2 size={32} className="text-green-500" />
                                </div>
                                <div className="font-black text-slate-800 text-lg uppercase tracking-tight">All Clear</div>
                                <div className="text-sm font-medium text-slate-500 mt-1">No collections required right now</div>
                            </div>
                        ) : (
                            reminderCandidates.map(inv => {
                                const days = getDaysOverdue(inv);
                                const isOverdue = days > 0;
                                const remaining = inv.total_amount - (inv.amount_paid || 0);

                                return (
                                    <div
                                        key={inv.id}
                                        onClick={() => setSelectedInvoiceForDetail(inv)}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${isOverdue ? 'border-red-100 bg-red-50/30 hover:bg-red-50/60' : 'border-slate-100 bg-white hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-4 min-w-0 mb-4 sm:mb-0">
                                            <div className={`p-3 rounded-lg flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                <User size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 text-sm truncate mb-0.5">
                                                    {safeRender(inv.customers?.name || inv.guest_name || 'Unknown')}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                    <span className="flex items-center gap-1"><FileText size={12} /> {inv.invoice_number}</span>
                                                    {(inv.customers?.phone || inv.guest_name) && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            <span className="flex items-center gap-1"><Phone size={12} /> {inv.customers?.phone || 'No Phone'}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                                            <div className="text-left sm:text-right">
                                                <div className="font-black text-slate-900 text-base mb-0.5 whitespace-nowrap">
                                                    €{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className={`text-[9px] font-black uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                                                    {isOverdue ? `${days} Days Overdue` : 'Due Soon'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSendReminder(inv); }}
                                                disabled={sendingReminder === inv.id}
                                                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg transition-all ${sendingReminder === inv.id
                                                    ? 'bg-slate-100 text-slate-400 cursor-wait'
                                                    : 'bg-delaval-blue text-white hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                                                    }`}
                                                title="Send AI Reminder"
                                            >
                                                {sendingReminder === inv.id ? (
                                                    <Activity size={16} className="animate-spin" />
                                                ) : (
                                                    <Send size={16} />
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
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <BarChart2 size={20} className="text-slate-400" />
                            Revenue Trends
                        </h3>
                        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setDateRangeFilter('6months')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dateRangeFilter === '6months' ? 'bg-white text-delaval-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                6M
                            </button>
                            <button
                                onClick={() => setDateRangeFilter('12months')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dateRangeFilter === '12months' ? 'bg-white text-delaval-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                1Y
                            </button>
                            <button
                                onClick={() => setDateRangeFilter('ytd')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${dateRangeFilter === 'ytd' ? 'bg-white text-delaval-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                YTD
                            </button>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `€${value}`} />
                                <RechartsTooltip
                                    formatter={(value: any) => [`€${Number(value).toLocaleString()}`, 'Revenue']}
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="revenue" fill="#0051A5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Job Status Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-slate-400" />
                        Job Status Distribution
                    </h3>
                    <div className="h-80 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={jobStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#0051A5"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {jobStatusData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Customers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Euro size={20} className="text-slate-400" />
                        Top Customers by Spend
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Total Spend</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Contribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topCustomers.map((customer, index) => {
                                const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.revenue, 0);
                                const percentage = totalRevenue > 0 ? (customer.value / totalRevenue) * 100 : 0;

                                return (
                                    <tr key={index} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{customer.name}</td>
                                        <td className="px-6 py-4 text-slate-600 text-right">€{customer.value.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-xs text-slate-500">{percentage.toFixed(1)}%</span>
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-delaval-blue" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Client Detail Modal */}
            <Modal
                isOpen={!!selectedInvoiceForDetail}
                onClose={() => setSelectedInvoiceForDetail(null)}
                title="Client Payment Details"
            >
                {selectedInvoiceForDetail && (() => {
                    const inv = selectedInvoiceForDetail as Invoice;
                    const days = getDaysOverdue(inv);
                    const isOverdue = days > 0;
                    const remaining = inv.total_amount - (inv.amount_paid || 0);

                    return (
                        <div className="space-y-6">
                            {/* Giant Overdue Indicator */}
                            <div className={`p-8 rounded-2xl flex flex-col items-center justify-center text-center ${isOverdue ? 'bg-red-50 border-2 border-red-100' : 'bg-blue-50 border-2 border-blue-100'}`}>
                                <div className={`text-6xl font-black font-display tracking-tighter mb-2 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                                    {isOverdue ? days : 0}
                                </div>
                                <div className={`text-sm font-black uppercase tracking-widest ${isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                                    {isOverdue ? 'Days Overdue' : 'Due Soon'}
                                </div>
                            </div>

                            {/* Balance Breakdown */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Bill</div>
                                    <div className="font-bold text-slate-900">€{inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Paid So Far</div>
                                    <div className="font-bold text-emerald-600">€{(inv.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-delaval-blue/5 border border-delaval-blue/10">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-delaval-blue mb-1">Balance Due</div>
                                    <div className="text-xl font-black text-delaval-blue">€{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Customer / Farm</div>
                                    <div className="text-lg font-bold text-slate-900">{safeRender(inv.customers?.name || inv.guest_name || 'Unknown')}</div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                            <Phone size={14} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</div>
                                            <div className="font-medium text-slate-700">{inv.customers?.phone || 'No phone'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                            <Mail size={14} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</div>
                                            <div className="font-medium text-slate-700">{inv.customers?.email || 'No email'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Link
                                    to={`/invoices`}
                                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-center text-sm"
                                >
                                    View Full Invoice
                                </Link>
                                <button
                                    onClick={() => handleSendReminder(inv)}
                                    disabled={sendingReminder === inv.id}
                                    className="flex-[2] py-3 px-4 bg-delaval-blue hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                >
                                    {sendingReminder === inv.id ? (
                                        <Activity size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    Generate AI Reminder
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div >
    );
};

export default Reports;

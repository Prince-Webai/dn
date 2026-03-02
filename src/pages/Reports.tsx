import { useEffect, useState, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
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
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import DatePicker from '../components/DatePicker';
import { Filter } from 'lucide-react';

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
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [jobStatusData, setJobStatusData] = useState<any[]>([]);
    const [inventoryValue, setInventoryValue] = useState(0);
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

    // Date Range Filter State
    const [filterType, setFilterType] = useState<'all' | 'month' | 'year' | 'custom'>('all');
    const [customRange, setCustomRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Tony Condon UX States
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

    // Chart Granularity State
    const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
    const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);

    // Separate effect for auto-switching granularity on filter change
    useEffect(() => {
        if (filterType === 'month') {
            setGranularity('daily');
        } else if (filterType === 'year' || filterType === 'all') {
            setGranularity('monthly');
        }
    }, [filterType]);

    // Main data fetching effect
    useEffect(() => {
        fetchAnalyticsData();
    }, [filterType, customRange, granularity]);

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

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const userRole = user?.user_metadata?.role;
            const engineerName = userRole === 'Engineer' ? (user?.user_metadata?.name || user?.email?.split('@')[0]) : undefined;

            const [invoices, jobs, inventory] = await Promise.all([
                dataService.getInvoices(),
                dataService.getJobs(undefined, engineerName),
                dataService.getInventory()
            ]);

            const { start, end } = getEffectiveRange();

            // Filter Data by Date
            const filteredInvoices = start && end
                ? invoices.filter(inv => {
                    const date = new Date(inv.date_issued);
                    return date >= start && date <= end;
                })
                : invoices;

            const filteredJobs = start && end
                ? jobs.filter(job => {
                    if (!job.date_scheduled) return false;
                    const date = new Date(job.date_scheduled);
                    return date >= start && date <= end;
                })
                : jobs;

            setAllInvoices(filteredInvoices);
            // Chart always uses unfiltered invoices for Monthly view to show trend
            processRevenueData(invoices);
            processJobStatusData(filteredJobs);
            processInventoryData(inventory);
            processTopCustomers(filteredInvoices);

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const processRevenueData = (invoices: Invoice[]) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartData: RevenueData[] = [];
        const now = new Date();
        const { start, end } = getEffectiveRange();

        if (granularity === 'monthly') {
            // Logic for Monthly View - Default to last 12 months to show trend
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                chartData.push({
                    name: months[d.getMonth()] + " '" + d.getFullYear().toString().slice(2),
                    revenue: 0,
                    target: 5000
                });
            }
        } else if (granularity === 'weekly') {
            // Logic for Weekly View - Cleaner Labels
            const rangeStart = start || new Date(now.getTime() - 60 * 86400000);
            const rangeEnd = end || now;
            const diffDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
            const weeks = Math.max(1, Math.ceil(diffDays / 7));

            for (let i = 0; i < weeks; i++) {
                const d = new Date(rangeStart.getTime() + i * 7 * 86400000);
                chartData.push({
                    name: `${d.getDate()} ${months[d.getMonth()]}`,
                    revenue: 0,
                    target: 1200
                });
            }
        } else if (granularity === 'daily') {
            // Logic for Daily View
            if (!start || !end) {
                // Default to last 30 days if no range
                for (let i = 29; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
                    chartData.push({
                        name: d.getDate() + ' ' + months[d.getMonth()],
                        revenue: 0,
                        target: 200
                    });
                }
            } else {
                const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const actualDays = Math.min(diffDays, 60);
                for (let i = 0; i <= actualDays; i++) {
                    const d = new Date(start);
                    d.setDate(start.getDate() + i);
                    chartData.push({
                        name: d.getDate() + ' ' + months[d.getMonth()],
                        revenue: 0,
                        target: 200
                    });
                }
            }
        } else {
            // Custom/Consolidated View
            chartData.push({
                name: 'Total Revenue',
                revenue: 0,
                target: 5000
            });
        }

        // Aggregate Data
        invoices.forEach(inv => {
            if (inv.status !== 'void' && inv.date_issued) {
                const date = new Date(inv.date_issued);
                const monthName = months[date.getMonth()];
                const fullMonthName = monthName + " '" + date.getFullYear().toString().slice(2);
                const dayName = date.getDate() + ' ' + monthName;

                let dataPoint: RevenueData | undefined;

                if (granularity === 'monthly') {
                    dataPoint = chartData.find(d => d.name === fullMonthName);
                } else if (granularity === 'daily') {
                    dataPoint = chartData.find(d => d.name === dayName);
                } else if (granularity === 'weekly') {
                    const effectiveStart = start || new Date(now.getTime() - 60 * 86400000);
                    const weekIndex = Math.floor((date.getTime() - effectiveStart.getTime()) / (7 * 86400000));
                    if (weekIndex >= 0 && weekIndex < chartData.length) {
                        dataPoint = chartData[weekIndex];
                    }
                } else {
                    dataPoint = chartData[0];
                }

                if (dataPoint) {
                    dataPoint.revenue += (inv.total_amount || 0);
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
        const settings = await dataService.getSettings();

        if (settings?.webhook_url) {
            try {
                const response = await fetch(settings.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'invoice_reminder',
                        invoice_id: inv.id,
                        invoice_number: inv.invoice_number,
                        customer_email: inv.customers?.email,
                        customer_name: inv.customers?.name || inv.guest_name,
                        amount_due: inv.total_amount - (inv.amount_paid || 0),
                        due_date: inv.due_date
                    })
                });

                if (response.ok) {
                    showToast('Success', 'Reminder triggered via webhook', 'success');
                    setSendingReminder(null);
                    setSelectedInvoiceForDetail(null);
                    return;
                }
            } catch (error) {
                console.error('Webhook error:', error);
            }
        }

        const days = getDaysOverdue(inv);
        const remaining = inv.total_amount - (inv.amount_paid || 0);
        const customerName = inv.customers?.name || inv.guest_name || 'Customer';

        let message = '';
        if (days > 0) {
            message = `Dear ${customerName},\n\nThis is a friendly reminder that invoice ${inv.invoice_number} for €${remaining.toLocaleString()} is currently ${days} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n${settings?.company_name || 'Condon Dairy Services'}`;
        } else {
            message = `Dear ${customerName},\n\nThis is a quick reminder that invoice ${inv.invoice_number} for €${remaining.toLocaleString()} is due soon.\n\nThank you for your prompt payment,\n${settings?.company_name || 'Condon Dairy Services'}`;
        }

        await new Promise(r => setTimeout(r, 800)); // Simulate sending

        showToast('Reminder Sent', `Payment reminder prepared for ${customerName}`, 'success');
        setSendingReminder(null);
        setSelectedInvoiceForDetail(null);

        setTimeout(() => {
            alert(`Email Draft Ready:\n\n${message}\n\n(In a real setup, this would instantly email the client or use the webhook).`);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-display text-slate-900">Analytics & Reports</h1>
                    <p className="text-slate-500 text-sm">Overview of business performance and metrics</p>
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
                        <p className="text-slate-500 text-sm font-medium">Revenue ({filterType === 'all' ? 'All Time' : filterType === 'year' ? 'This Year' : 'Selected Period'})</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">
                            €{allInvoices.reduce((acc, curr) => acc + (curr.total_amount || 0), 0).toLocaleString()}
                        </h3>
                    </div>
                    <div className="w-12 h-12 bg-delaval-light-blue text-delaval-blue rounded-lg flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                </div>
            </div>

            {/* Main Visualizations Grid */}
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
                        {reminderCandidates.length === 0 ? (
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
                                            <div className={`flex items-center justify-center p-2 rounded-lg ${sendingReminder === inv.id ? 'bg-slate-100' : 'bg-delaval-blue text-white'}`}>
                                                {sendingReminder === inv.id ? <Activity size={16} className="animate-spin" /> : <Send size={16} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
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

                {/* Expanded Revenue Chart - Full width */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <BarChart2 size={24} className="text-delaval-blue" />
                                Revenue Trends
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Detailed performance analysis for the selected period</p>
                        </div>

                        {/* Granularity Toggle Buttons - Updated for all options */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            {[
                                { id: 'daily', label: 'Daily' },
                                { id: 'weekly', label: 'Weekly' },
                                { id: 'monthly', label: 'Monthly' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setGranularity(opt.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${granularity === opt.id
                                        ? 'bg-white text-delaval-blue shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                            <button
                                onClick={() => setIsRangeModalOpen(true)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${filterType === 'custom'
                                    ? 'bg-white text-delaval-blue shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Calendar size={12} />
                                Select Range
                            </button>
                        </div>
                    </div>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={{ stroke: '#f1f5f9', strokeWidth: 1 }}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                    dy={10}
                                    interval="preserveStartEnd"
                                    minTickGap={30}
                                />
                                <YAxis hide domain={['dataMin', 'dataMax + 100']} />
                                <RechartsTooltip
                                    cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/60 min-w-[140px]">
                                                    <p className="text-[#1a1a1a] font-bold text-[13px] mb-2">Total sales</p>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#0051A5]"></div>
                                                        <p className="text-slate-600 text-[12px] font-medium">{label}</p>
                                                    </div>
                                                    <p className="text-[#1a1a1a] font-semibold text-[13px] ml-4.5 bg-slate-100/50 inline-block px-1.5 py-0.5 rounded">
                                                        €{Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#0051A5"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#0051A5', stroke: '#ffffff', strokeWidth: 2 }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={40}
                                    content={() => (
                                        <div className="flex items-center justify-center gap-2 mt-4 text-[12px] font-medium text-slate-600">
                                            <div className="w-2 h-2 rounded-full bg-[#0051A5]"></div>
                                            {filterType === 'month' && 'This Month'}
                                            {filterType === 'all' && 'All Time'}
                                            {filterType === 'year' && 'This Year'}
                                            {filterType === 'custom' && `${customRange.start} — ${customRange.end}`}
                                        </div>
                                    )}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Customers */}
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

            {/* Modal remains at top level of return */}
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
                            <div className={`p-8 rounded-2xl flex flex-col items-center justify-center text-center ${isOverdue ? 'bg-red-50 border-2 border-red-100' : 'bg-blue-50 border-2 border-blue-100'}`}>
                                <div className={`text-6xl font-black font-display tracking-tighter mb-2 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                                    {isOverdue ? days : 0}
                                </div>
                                <div className={`text-sm font-black uppercase tracking-widest ${isOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                                    {isOverdue ? 'Days Overdue' : 'Due Soon'}
                                </div>
                            </div>

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

            {/* Select Range Modal */}
            <Modal
                isOpen={isRangeModalOpen}
                onClose={() => setIsRangeModalOpen(false)}
                title="Select Custom Date Range"
            >
                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label>
                            <DatePicker
                                value={customRange.start}
                                onChange={(date) => setCustomRange({ ...customRange, start: date })}
                                placeholder="Start Date"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">End Date</label>
                            <DatePicker
                                value={customRange.end}
                                onChange={(date) => setCustomRange({ ...customRange, end: date })}
                                placeholder="End Date"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                        <TrendingUp size={18} className="text-delaval-blue mt-0.5" />
                        <div className="text-xs text-blue-700 leading-relaxed font-medium">
                            Selecting a custom range will automatically update all dashboard KPIs and the Trends chart below.
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsRangeModalOpen(false)}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                setFilterType('custom');
                                setIsRangeModalOpen(false);
                                // Set sensible granularity based on range
                                const d1 = new Date(customRange.start);
                                const d2 = new Date(customRange.end);
                                const diff = Math.ceil((d2.getTime() - d1.getTime()) / (86400000));
                                if (diff <= 31) setGranularity('daily');
                                else if (diff <= 180) setGranularity('weekly');
                                else setGranularity('monthly');
                            }}
                            className="flex-[2] py-3 px-4 bg-delaval-blue hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 flex items-center justify-center gap-2 text-sm"
                        >
                            Apply Custom Range
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Reports;

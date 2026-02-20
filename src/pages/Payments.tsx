import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileText, AlertCircle, Euro, Clock, CheckCircle2, ArrowRight, Layers, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { Invoice } from '../types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const Payments = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    useEffect(() => {
        const fetchData = async () => {
            const data = await dataService.getInvoices();
            setInvoices(data);
        };
        fetchData();
    }, []);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
    const prevMonthDays = new Date(year, month, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const jumpToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };

    const todayStr = new Date().toISOString().split('T')[0];

    // Determine payment status
    const getPaymentStatus = (inv: Invoice): 'overdue' | 'pending' | 'settled' => {
        const s = inv.status as string;
        if (s === 'paid') return 'settled';
        if (s === 'overdue') return 'overdue';
        if (inv.due_date && new Date(inv.due_date) < new Date() && s !== 'paid') return 'overdue';
        return 'pending';
    };

    // Map invoices by date
    const invoicesByDate = useMemo(() => {
        const map: Record<string, Invoice[]> = {};
        invoices.forEach(inv => {
            const d = inv.due_date || inv.date_issued;
            if (!d) return;
            const dateStr = d.split('T')[0];
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(inv);
        });
        return map;
    }, [invoices]);

    // Build full 42-day calendar grid (6 weeks) like Clonmel Glass
    const calendarDays = useMemo(() => {
        const days: { day: number; month: number; year: number; currentMonth: boolean }[] = [];
        // Previous month fill
        for (let i = startDayOfMonth - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, month: month - 1, year, currentMonth: false });
        }
        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({ day: d, month, year, currentMonth: true });
        }
        // Next month fill
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, month: month + 1, year, currentMonth: false });
        }
        return days;
    }, [year, month, daysInMonth, startDayOfMonth, prevMonthDays]);

    const getInvoicesForDate = (day: number, m: number, y: number) => {
        const dateObj = new Date(y, m, day);
        const dateStr = dateObj.toISOString().split('T')[0];
        return invoicesByDate[dateStr] || [];
    };

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const selectedInvoices = useMemo(() => {
        return invoicesByDate[selectedDateStr] || [];
    }, [selectedDateStr, invoicesByDate]);

    const selectedTotalDue = selectedInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.amount_paid || 0)), 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-2xl shadow-xl shadow-purple-500/20">
                            <FileText size={26} />
                        </div>
                        Payment Schedule
                    </h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2 ml-[60px]">
                        <Target size={14} className="text-purple-500" />
                        Collection Strategy & Deadline Monitoring
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={jumpToToday}
                        className="px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm"
                    >
                        Today
                    </button>
                    <div className="flex items-center bg-white border-2 border-slate-100 rounded-xl p-1 shadow-sm">
                        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-slate-50 rounded-lg transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="px-4 text-xs font-black text-slate-800 uppercase tracking-widest min-w-[140px] text-center">
                            {monthNames[month]} {year}
                        </div>
                        <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-slate-50 rounded-lg transition-all">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Main Calendar Grid */}
                <div className="xl:col-span-3">
                    <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 bg-slate-50 border-b-2 border-slate-100">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                            ))}
                        </div>

                        {/* Calendar cells */}
                        <div className="grid grid-cols-7">
                            {calendarDays.map((date, idx) => {
                                const invs = getInvoicesForDate(date.day, date.month, date.year);
                                const dateObj = new Date(date.year, date.month, date.day);
                                const dateStr = dateObj.toISOString().split('T')[0];
                                const isToday = dateStr === todayStr;
                                const isSelected = selectedDateStr === dateStr;

                                const hasOverdue = invs.some(inv => getPaymentStatus(inv) === 'overdue');
                                const hasUnpaid = invs.some(inv => getPaymentStatus(inv) !== 'settled');
                                const allPaid = invs.length > 0 && invs.every(inv => getPaymentStatus(inv) === 'settled');

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(dateObj)}
                                        className={`relative h-28 p-3 border-r border-b border-slate-100 text-left transition-all group
                                            ${!date.currentMonth ? 'bg-slate-50/30 opacity-30' : 'bg-white'}
                                            ${isSelected ? 'ring-2 ring-inset ring-purple-500 bg-purple-50/20' : 'hover:bg-slate-50/50'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[11px] font-black
                                                ${isToday ? 'bg-purple-600 text-white h-6 w-6 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20' :
                                                    isSelected ? 'text-purple-600' : 'text-slate-400'}
                                            `}>
                                                {date.day}
                                            </span>

                                            {invs.length > 0 && (
                                                <div className="flex gap-1">
                                                    {hasOverdue && <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />}
                                                    {hasUnpaid && !hasOverdue && <div className="h-2 w-2 rounded-full bg-amber-400" />}
                                                    {allPaid && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                                                </div>
                                            )}
                                        </div>

                                        {invs.length > 0 && (
                                            <div className="mt-2">
                                                <div className="text-[10px] font-black text-slate-900 truncate">
                                                    {(invs[0].customers?.name || invs[0].guest_name || 'Unknown').split(' ')[0]}
                                                </div>
                                                {invs.length > 1 && (
                                                    <div className="text-[8px] font-black text-slate-400 uppercase mt-0.5">
                                                        + {invs.length - 1} other{invs.length > 2 ? 's' : ''}
                                                    </div>
                                                )}
                                                <div className="mt-2 text-[9px] font-bold text-purple-600">
                                                    €{invs.reduce((sum, i) => i.total_amount - (i.amount_paid || 0) + sum, 0).toLocaleString()}
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-6 flex flex-wrap gap-6 items-center px-4">
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settled</span>
                        </div>
                    </div>
                </div>

                {/* Dark Sidebar - matches Clonmel Glass style */}
                <div className="xl:col-span-1">
                    <div className="bg-black rounded-[2.5rem] p-8 shadow-2xl h-full flex flex-col border border-white/5 relative overflow-hidden">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20" />

                        {/* Day header */}
                        <div className="relative z-10 mb-8 pb-8 border-b border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">Day Overview</h3>
                                <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-500">
                                    <Clock size={16} />
                                </div>
                            </div>
                            <div className="text-xl font-black text-white leading-tight">
                                {selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}<br />
                                <span className="text-purple-400">
                                    {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        {/* Invoice cards */}
                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 relative z-10">
                            {selectedInvoices.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="h-20 w-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <Layers size={32} className="text-slate-700" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                                        No collections<br />slated for this day
                                    </p>
                                </div>
                            ) : (
                                selectedInvoices.map(inv => {
                                    const ps = getPaymentStatus(inv);
                                    const remaining = inv.total_amount - (inv.amount_paid || 0);

                                    return (
                                        <div
                                            key={inv.id}
                                            className="group bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 p-5 transition-all cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="max-w-[140px]">
                                                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                                        {inv.invoice_number}
                                                    </span>
                                                    <span className="block text-sm font-black text-white group-hover:text-purple-400 transition-colors truncate">
                                                        {inv.customers?.name || inv.guest_name || 'Unknown'}
                                                    </span>
                                                </div>
                                                <div className={`p-2 rounded-lg ${ps === 'settled' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    ps === 'overdue' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {ps === 'settled' ? <CheckCircle2 size={16} /> : ps === 'overdue' ? <AlertCircle size={16} /> : <Clock size={16} />}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Euro size={12} className="text-purple-500" />
                                                    <span className="text-sm font-black text-white">{formatCurrency(remaining)}</span>
                                                </div>
                                                <Link to={`/invoices`} className="p-2 bg-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-purple-600 transition-all">
                                                    <ArrowRight size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Summary strip */}
                        <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Due</span>
                                    <span className="text-base font-black text-white">{formatCurrency(selectedTotalDue)}</span>
                                </div>
                                <div className="bg-purple-600 p-4 rounded-2xl shadow-xl shadow-purple-500/10">
                                    <span className="block text-[9px] font-black text-purple-200 uppercase tracking-widest mb-1">Invoices</span>
                                    <span className="text-base font-black text-white">{selectedInvoices.length}</span>
                                </div>
                            </div>

                            {selectedInvoices.filter(inv => getPaymentStatus(inv) === 'overdue').length > 0 && (
                                <div className="mt-6 flex items-center gap-3 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                                    <AlertCircle size={18} className="text-rose-500 shrink-0" />
                                    <p className="text-[9px] font-bold text-rose-200 leading-relaxed">
                                        Priority notification: {selectedInvoices.filter(inv => getPaymentStatus(inv) === 'overdue').length} invoices require urgent follow-up today to maintain cash flow.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payments;

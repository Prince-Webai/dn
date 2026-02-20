import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileText, AlertCircle, Euro } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Invoice } from '../types';

const Payments = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const data = await dataService.getInvoices();
            setInvoices(data);
        };
        fetchData();
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date().toISOString().split('T')[0]); };

    const todayStr = new Date().toISOString().split('T')[0];

    // Determine payment status based on invoice data
    const getPaymentStatus = (inv: Invoice): 'overdue' | 'pending' | 'settled' => {
        const s = inv.status as string;
        if (s === 'paid') return 'settled';
        if (s === 'overdue') return 'overdue';
        if (inv.due_date && new Date(inv.due_date) < new Date() && s !== 'paid') return 'overdue';
        return 'pending';
    };

    const statusConfig = {
        overdue: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', label: 'Overdue', ring: 'ring-red-200' },
        pending: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending', ring: 'ring-amber-200' },
        settled: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Settled', ring: 'ring-emerald-200' },
    };

    // Map invoices to calendar by due_date
    const getInvoicesForDate = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return invoices.filter(inv => inv.due_date?.startsWith(dateStr) || (!inv.due_date && inv.date_issued?.startsWith(dateStr)));
    };

    const selectedDateInvoices = useMemo(() => {
        if (!selectedDate) return [];
        return invoices.filter(inv => {
            const d = inv.due_date || inv.date_issued;
            return d?.startsWith(selectedDate);
        });
    }, [selectedDate, invoices]);

    // Summary stats
    const stats = useMemo(() => {
        const totalDue = selectedDateInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.amount_paid || 0)), 0);
        const invoiceCount = selectedDateInvoices.length;
        const overdueCount = selectedDateInvoices.filter(inv => getPaymentStatus(inv) === 'overdue').length;
        return { totalDue, invoiceCount, overdueCount };
    }, [selectedDateInvoices]);

    // Overall month stats
    const monthStats = useMemo(() => {
        const monthInvoices = invoices.filter(inv => {
            const d = inv.due_date || inv.date_issued;
            if (!d) return false;
            const dt = new Date(d);
            return dt.getMonth() === month && dt.getFullYear() === year;
        });
        const totalDue = monthInvoices.reduce((sum, inv) => sum + (inv.total_amount - (inv.amount_paid || 0)), 0);
        const overdue = monthInvoices.filter(inv => getPaymentStatus(inv) === 'overdue').length;
        const pending = monthInvoices.filter(inv => getPaymentStatus(inv) === 'pending').length;
        const settled = monthInvoices.filter(inv => getPaymentStatus(inv) === 'settled').length;
        return { totalDue, overdue, pending, settled, total: monthInvoices.length };
    }, [invoices, month, year]);

    // Build calendar grid
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <FileText size={20} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold font-display text-slate-900">Payment Schedule</h1>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-2 ml-[52px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Collection Strategy & Deadline Monitoring
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={goToday} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        Today
                    </button>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-l-lg transition-colors"><ChevronLeft size={18} className="text-slate-600" /></button>
                        <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center">{monthNames[month].toUpperCase()} {year}</span>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-r-lg transition-colors"><ChevronRight size={18} className="text-slate-600" /></button>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-5">
                {/* Calendar Grid */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                        {dayNames.map(day => (
                            <div key={day} className="py-3 text-center text-[11px] font-bold text-slate-400 tracking-widest">{day}</div>
                        ))}
                    </div>

                    {/* Calendar cells */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, i) => {
                            if (day === null) return <div key={`e-${i}`} className="min-h-[110px] bg-orange-50/20 border-b border-r border-orange-100/40" />;

                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayInvoices = getInvoicesForDate(day);
                            const isToday = dateStr === todayStr;
                            const isSelected = dateStr === selectedDate;
                            const hasOverdue = dayInvoices.some(inv => getPaymentStatus(inv) === 'overdue');

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`min-h-[110px] p-2 border-b border-r cursor-pointer transition-all relative
                                        ${isSelected ? 'ring-2 ring-purple-400 ring-inset bg-purple-50/30 border-purple-200' : 'border-orange-100/40'}
                                        ${isToday && !isSelected ? 'bg-orange-50/40' : ''}
                                        ${!isToday && !isSelected ? 'bg-orange-50/10 hover:bg-orange-50/30' : ''}
                                    `}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                                            ${isToday ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600'}
                                        `}>
                                            {day}
                                        </span>
                                        {dayInvoices.length > 0 && (
                                            <div className="flex gap-0.5">
                                                {dayInvoices.map((inv, idx) => {
                                                    const ps = getPaymentStatus(inv);
                                                    return <div key={idx} className={`w-2 h-2 rounded-full ${statusConfig[ps].dot}`} />;
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Invoice entries */}
                                    <div className="space-y-1">
                                        {dayInvoices.slice(0, 2).map((inv) => {
                                            const ps = getPaymentStatus(inv);
                                            return (
                                                <div
                                                    key={inv.id}
                                                    className={`text-[11px] font-semibold truncate px-1.5 py-0.5 rounded ${statusConfig[ps].text}`}
                                                >
                                                    <div className="truncate">{inv.customers?.name || inv.guest_name || 'Unknown'}</div>
                                                    <div className="font-bold">€{(inv.total_amount - (inv.amount_paid || 0)).toLocaleString()}</div>
                                                </div>
                                            );
                                        })}
                                        {dayInvoices.length > 2 && (
                                            <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayInvoices.length - 2} more</div>
                                        )}
                                    </div>

                                    {hasOverdue && (
                                        <div className="absolute top-2 right-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-6 px-6 py-3 border-t border-slate-100 bg-slate-50/60">
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                            <div key={key} className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cfg.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dark Sidebar */}
                <div className="space-y-4">
                    {/* Day Overview Card - Dark theme */}
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
                        <div className="p-5">
                            <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-3">Day Overview</h3>
                            {selectedDate ? (
                                <>
                                    <div className="mb-4">
                                        <div className="text-white/60 text-xs font-medium">
                                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IE', { weekday: 'long' })}
                                        </div>
                                        <div className="text-white text-lg font-bold">
                                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>

                                    {selectedDateInvoices.length > 0 ? (
                                        <div className="space-y-3 mb-5">
                                            {selectedDateInvoices.map(inv => {
                                                const ps = getPaymentStatus(inv);
                                                const remaining = inv.total_amount - (inv.amount_paid || 0);
                                                return (
                                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                                                        <div>
                                                            <div className="text-[11px] text-white/40 font-medium uppercase tracking-wider mb-0.5">Due from</div>
                                                            <div className="text-white font-bold text-sm">{inv.customers?.name || inv.guest_name || 'Unknown'}</div>
                                                        </div>
                                                        <div className="text-right flex items-center gap-2">
                                                            <span className={`text-sm font-bold ${ps === 'overdue' ? 'text-red-400' : ps === 'settled' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                € {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${ps === 'overdue' ? 'bg-red-500/20' : ps === 'settled' ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                                                                <div className={`w-2 h-2 rounded-full ${statusConfig[ps].dot}`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <div className="text-white/20 text-sm font-medium">No payments due</div>
                                        </div>
                                    )}

                                    {/* Summary strip */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10">
                                            <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Total Due</div>
                                            <div className="text-white font-bold text-lg">€{stats.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <div className="flex-1 p-3 rounded-xl bg-gradient-to-br from-purple-600/30 to-purple-800/30 border border-purple-500/20">
                                            <div className="text-[10px] text-purple-300/60 font-bold uppercase tracking-wider mb-1">Invoices</div>
                                            <div className="text-white font-bold text-lg">{stats.invoiceCount}</div>
                                        </div>
                                    </div>

                                    {/* Alert */}
                                    {stats.overdueCount > 0 && (
                                        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-red-300 text-xs font-bold">Priority Notification</div>
                                                    <div className="text-red-400/70 text-[11px] mt-0.5">
                                                        {stats.overdueCount} overdue {stats.overdueCount === 1 ? 'invoice requires' : 'invoices require'} urgent follow-up today
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                                        <FileText size={20} className="text-white/30" />
                                    </div>
                                    <div className="text-white/30 text-sm font-medium">Select a day to view<br />payment details</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Month Summary */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">Month Summary</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Euro size={14} className="text-slate-400" />
                                    <span className="text-sm text-slate-600">Total Outstanding</span>
                                </div>
                                <span className="font-bold text-slate-900">€{monthStats.totalDue.toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-slate-100" />
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 rounded-lg bg-red-50">
                                    <div className="text-lg font-bold text-red-600">{monthStats.overdue}</div>
                                    <div className="text-[10px] font-bold text-red-400 uppercase">Overdue</div>
                                </div>
                                <div className="p-2 rounded-lg bg-amber-50">
                                    <div className="text-lg font-bold text-amber-600">{monthStats.pending}</div>
                                    <div className="text-[10px] font-bold text-amber-400 uppercase">Pending</div>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-50">
                                    <div className="text-lg font-bold text-emerald-600">{monthStats.settled}</div>
                                    <div className="text-[10px] font-bold text-emerald-400 uppercase">Settled</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payments;

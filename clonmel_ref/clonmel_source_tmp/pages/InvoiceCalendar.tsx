
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { PaymentStatus, Invoice } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  FileText,
  User,
  ArrowRight,
  Target,
  Euro,
  Layers
} from 'lucide-react';

const InvoiceCalendar = () => {
  const { invoices, setView, setSelectedInvoiceId } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const calendarDays = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysCount = daysInMonth(month, year);
    const startDay = startDayOfMonth(month, year);

    const days = [];
    const prevMonthDays = daysInMonth(month - 1, year);
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: month - 1, year: year, currentMonth: false });
    }
    for (let i = 1; i <= daysCount; i++) {
      days.push({ day: i, month: month, year: year, currentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year: year, currentMonth: false });
    }
    return days;
  }, [currentDate]);

  const invoicesByDate = useMemo(() => {
    const map: Record<string, Invoice[]> = {};
    invoices.forEach(inv => {
      try {
        if (!inv.dueDate) return;
        const date = new Date(inv.dueDate);
        if (isNaN(date.getTime())) return; // Skip invalid dates

        const dateStr = date.toISOString().split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(inv);
      } catch (e) {
        console.warn('Skipping invoice with invalid date:', inv.id);
      }
    });
    return map;
  }, [invoices]);

  const getInvoicesForDate = (day: number, month: number, year: number) => {
    const dateObj = new Date(year, month, day);
    const dateStr = dateObj.toISOString().split('T')[0];
    return invoicesByDate[dateStr] || [];
  };

  const selectedInvoices = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split('T')[0];
    return invoicesByDate[dateStr] || [];
  }, [selectedDate, invoicesByDate]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4">
            <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-xl shadow-brand-500/20">
              <CalendarIcon size={28} />
            </div>
            Payment Schedule
          </h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
            <Target size={14} className="text-brand-500" />
            Collection Strategy & Deadline Monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={jumpToToday}
            className="px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
          >
            Today
          </button>
          <div className="flex items-center bg-white border-2 border-slate-100 rounded-xl p-1 shadow-sm">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-all">
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 text-xs font-black text-slate-800 uppercase tracking-widest min-w-[140px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Calendar Grid */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-2xl overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 border-b-2 border-slate-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((date, idx) => {
                const invs = getInvoicesForDate(date.day, date.month, date.year);
                const dateObj = new Date(date.year, date.month, date.day);
                const dateStr = dateObj.toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                const isSelected = selectedDate?.toISOString().split('T')[0] === dateStr;

                const hasUnpaid = invs.some(i => i.status !== PaymentStatus.PAID);
                const hasOverdue = invs.some(i => i.status !== PaymentStatus.PAID && new Date(i.dueDate) < new Date());
                const allPaid = invs.length > 0 && invs.every(i => i.status === PaymentStatus.PAID);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dateObj)}
                    className={`relative h-28 p-4 border-r border-b border-slate-100 text-left transition-all group ${!date.currentMonth ? 'bg-slate-50/30 opacity-30 grayscale' : 'bg-white'
                      } ${isSelected ? 'ring-2 ring-inset ring-brand-500 bg-brand-50/20' : 'hover:bg-slate-50/50'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[11px] font-black ${isToday ? 'bg-brand-600 text-white h-6 w-6 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20' :
                        isSelected ? 'text-brand-600' : 'text-slate-400'
                        }`}>
                        {date.day}
                      </span>

                      {invs.length > 0 && (
                        <div className="flex gap-1">
                          {hasOverdue && <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="Overdue Items" />}
                          {hasUnpaid && !hasOverdue && <div className="h-2 w-2 rounded-full bg-amber-400" title="Pending Items" />}
                          {allPaid && <div className="h-2 w-2 rounded-full bg-emerald-500" title="All Settled" />}
                        </div>
                      )}
                    </div>

                    {invs.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[10px] font-black text-slate-900 truncate">
                          {invs[0].customerName.split(' ')[0]}
                        </div>
                        {invs.length > 1 && (
                          <div className="text-[8px] font-black text-slate-400 uppercase mt-0.5">
                            + {invs.length - 1} other{invs.length > 2 ? 's' : ''}
                          </div>
                        )}
                        <div className="mt-2 text-[9px] font-bold text-brand-600">
                          €{invs.reduce((sum, i) => sum + i.total, 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 items-center px-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settled</span>
            </div>
          </div>
        </div>

        {/* Sidebar Schedule Details */}
        <div className="xl:col-span-1">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl h-full flex flex-col border border-white/5 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 h-40 w-40 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

            <div className="relative z-10 mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Day Overview</h3>
                <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-500">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-xl font-black text-white leading-tight">
                {selectedDate?.toLocaleDateString(undefined, { weekday: 'long' })}<br />
                <span className="text-brand-400">
                  {selectedDate?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar relative z-10">
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
                  const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== PaymentStatus.PAID;

                  const handleInvoiceClick = () => {
                    setSelectedInvoiceId(inv.id);
                    setView('INVOICES');
                  };

                  return (
                    <div
                      key={inv.id}
                      onClick={handleInvoiceClick}
                      className="group bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 p-5 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="max-w-[140px]">
                          <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{inv.invoiceNumber}</span>
                          <span className="block text-sm font-black text-white group-hover:text-brand-400 transition-colors truncate">{inv.customerName}</span>
                        </div>
                        <div className={`p-2 rounded-lg ${inv.status === PaymentStatus.PAID ? 'bg-emerald-500/20 text-emerald-400' :
                          isOverdue ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                          {inv.status === PaymentStatus.PAID ? <CheckCircle2 size={16} /> : isOverdue ? <AlertCircle size={16} /> : <Clock size={16} />}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Euro size={12} className="text-brand-500" />
                          <span className="text-sm font-black text-white">€{inv.balanceDue.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => setView('INVOICES')}
                          className="p-2 bg-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-brand-600 transition-all"
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Due</span>
                  <span className="text-base font-black text-white">
                    €{selectedInvoices.reduce((sum, i) => sum + i.balanceDue, 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-brand-600 p-4 rounded-2xl shadow-xl shadow-brand-500/10">
                  <span className="block text-[9px] font-black text-brand-200 uppercase tracking-widest mb-1">Invoices</span>
                  <span className="text-base font-black text-white">{selectedInvoices.length}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertCircle size={18} className="text-rose-500 shrink-0" />
                <p className="text-[9px] font-bold text-rose-200 leading-relaxed">
                  Priority notification: 3 invoices require urgent follow-up today to maintain cash flow.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCalendar;


import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext.tsx';
import { PaymentStatus, UserRole, Invoice } from '../types';
import {
  Euro,
  FileText,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  BellRing,
  Mail,
  Sparkles,
  Activity,
  History,
  Send,
  User,
  Clock,
  Phone,
  X,
  Package,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyzeInvoiceTrends, generateReminderMessage } from '../services/geminiService.ts';
import { generatePreviewUrl } from '../services/pdfService';

const safeRender = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.message) return String(val.message);
    try {
      return JSON.stringify(val);
    } catch {
      return '—';
    }
  }
  return String(val);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{safeRender(label)}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{safeRender(value)}</h3>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const ClientDetailModal = ({ invoice, onClose, onSendReminder, isReminding }: {
  invoice: Invoice,
  onClose: () => void,
  onSendReminder: (inv: Invoice) => void,
  isReminding: boolean
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Modal Header */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-3xl flex items-center justify-center text-white shadow-xl ${isOverdue ? 'bg-rose-500' : 'bg-brand-600'}`}>
              <User size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{invoice.customerName}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Client Profile & Payment Status</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Contact & Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={18} className="text-brand-500" />
                <span className="text-sm font-bold">{invoice.customerPhone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={18} className="text-brand-500" />
                <span className="text-sm font-bold">{invoice.customerEmail || 'No email provided'}</span>
              </div>
              <div className="flex items-start gap-3 text-slate-600">
                <Clock size={18} className="text-brand-500 mt-1" />
                <div>
                  <span className="text-sm font-bold block">Invoice {invoice.invoiceNumber}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Ref: {invoice.id.slice(-6)}</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className={`text-4xl font-black mb-1 ${isOverdue ? 'text-rose-600' : 'text-brand-600'}`}>
                {Math.abs(diffDays)}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {isOverdue ? 'Days Overdue' : 'Days Until Due'}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-200">
                <Calendar size={14} className="text-brand-500" />
                Due {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</div>
              <div className="text-sm font-black text-slate-900">{formatCurrency(invoice.total)}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paid</div>
              <div className="text-sm font-black text-emerald-600">{formatCurrency(invoice.amountPaid)}</div>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl text-center shadow-lg shadow-slate-900/20">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance</div>
              <div className="text-sm font-black text-brand-400">{formatCurrency(invoice.balanceDue)}</div>
            </div>
          </div>

          {/* Product List */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Package size={14} /> Ordered Products
            </h3>
            <div className="space-y-2">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-xs font-black text-slate-900">{item.description}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{item.productId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-700">{item.quantity} units</div>
                    <div className="text-[10px] font-bold text-slate-400">{formatCurrency(item.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {invoice.notes && (
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
              <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Project Notes</h4>
              <p className="text-xs text-amber-800 italic leading-relaxed">"{invoice.notes}"</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all"
          >
            Close Details
          </button>
          <button
            onClick={() => onSendReminder(invoice)}
            disabled={isReminding}
            className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-700 shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isReminding ? <Activity size={18} className="animate-spin" /> : <Send size={18} />}
            Send AI Payment Reminder
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { invoices, user, databaseError, updateInvoice, companyLogo } = useApp();
  const [aiInsights, setAiInsights] = useState<string>('Analyzing business health...');
  const [automationLog, setAutomationLog] = useState<string[]>([]);
  const [manualRemindingId, setManualRemindingId] = useState<string | null>(null);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isRunningAutomation = useRef(false);

  const localReminderTracker = useRef<Record<string, string>>({});
  const [useLocalReminderMode, setUseLocalReminderMode] = useState(false);
  const localModeRef = useRef(false);

  const totalRevenue = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (Number(inv.balanceDue) || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === PaymentStatus.PAID).length;

  const reminderCandidates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    return invoices.filter(inv => {
      if (inv.status === PaymentStatus.PAID) return false;
      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= threeDaysFromNow;
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [invoices]);

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return invoices.filter(inv => inv.status !== PaymentStatus.PAID && new Date(inv.dueDate) < today).length;
  }, [invoices]);

  useEffect(() => {
    const runAutomation = async () => {
      if (isRunningAutomation.current || invoices.length === 0 || databaseError) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const dueForAutoReminder = invoices.filter(inv => {
        if (inv.status === PaymentStatus.PAID) return false;
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const twoDaysBefore = new Date(dueDate);
        twoDaysBefore.setDate(dueDate.getDate() - 2);

        const isOverdue = dueDate.getTime() < today.getTime();
        const isExactlyTwoDaysBefore = twoDaysBefore.getTime() === today.getTime();

        const lastSent = localModeRef.current ? localReminderTracker.current[inv.id] : inv.lastReminderSent;
        const needsReminding = lastSent !== todayStr;

        return (isOverdue || isExactlyTwoDaysBefore) && needsReminding;
      });

      if (dueForAutoReminder.length > 0) {
        isRunningAutomation.current = true;
        const logs: string[] = [];

        for (const inv of dueForAutoReminder) {
          try {
            if (!inv.id) continue;

            if (localModeRef.current) {
              localReminderTracker.current[inv.id] = todayStr;
              logs.push(`[Auto-Mail] Proactive reminder triggered for ${safeRender(inv.customerName)}`);
            } else {
              try {
                await updateInvoice({
                  ...inv,
                  lastReminderSent: todayStr
                });
                logs.push(`[Auto-Mail] Reminder queued for ${safeRender(inv.customerName)} (Inv: ${safeRender(inv.invoiceNumber)})`);
              } catch (innerError: any) {
                if (innerError.message === 'COLUMN_MISSING_REMINDER') {
                  localModeRef.current = true;
                  setUseLocalReminderMode(true);
                  localReminderTracker.current[inv.id] = todayStr;
                  logs.push(`⚠️ Switch: Tracking auto-reminders locally.`);
                } else {
                  throw innerError;
                }
              }
            }
          } catch (e: any) {
            logs.push(`Failed for ${safeRender(inv.invoiceNumber)}: ${e?.message || 'Error'}`);
          }
        }

        if (logs.length > 0) {
          setAutomationLog(prev => [...logs, ...prev].slice(0, 10));
        }
        isRunningAutomation.current = false;
      }
    };

    runAutomation();
  }, [invoices.length, databaseError, updateInvoice]);

  const handleManualReminder = async (inv: Invoice) => {
    setManualRemindingId(inv.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    try {
      const message = await generateReminderMessage(
        inv.customerName,
        inv.invoiceNumber,
        inv.balanceDue,
        diffDays
      );

      const todayStr = today.toISOString().split('T')[0];
      if (!localModeRef.current) {
        try {
          await updateInvoice({ ...inv, lastReminderSent: todayStr });
        } catch (e: any) {
          if (e.message === 'COLUMN_MISSING_REMINDER') {
            localModeRef.current = true;
            setUseLocalReminderMode(true);
            localReminderTracker.current[inv.id] = todayStr;
          }
        }
      } else {
        localReminderTracker.current[inv.id] = todayStr;
      }

      setAutomationLog(prev => [`[Manual-AI] Sent to ${inv.customerEmail || inv.customerName}: "${message.slice(0, 30)}..."`, ...prev]);
      alert(`AI Reminder Generated & "Sent" to ${inv.customerName}:\n\n${message}`);
    } catch (e) {
      alert("Failed to generate AI reminder.");
    } finally {
      setManualRemindingId(null);
    }
  };

  const handlePreview = async (inv: Invoice) => {
    try {
      const url = await generatePreviewUrl(inv, companyLogo);
      setPreviewUrl(url);
    } catch (e) {
      alert("Preview failed.");
    }
  };

  useEffect(() => {
    const fetchInsights = async () => {
      if (!process.env.API_KEY || invoices.length === 0) {
        setAiInsights("Collect more data to generate AI insights.");
        return;
      }
      try {
        const summary = `Revenue: ${formatCurrency(totalRevenue)}, Outstanding: ${formatCurrency(totalOutstanding)}, Paid: ${paidInvoices}, Total: ${invoices.length}, Overdue: ${overdueCount}.`;
        const insights = await analyzeInvoiceTrends(summary);
        setAiInsights(typeof insights === 'string' ? insights : "Insights generated.");
      } catch (e) {
        setAiInsights("Insights analysis paused.");
      }
    };
    fetchInsights();
  }, [invoices.length, totalRevenue, totalOutstanding, paidInvoices, overdueCount]);

  const chartData = invoices.map(inv => ({
    name: safeRender(inv.invoiceNumber).slice(-4),
    amount: Number(inv.total)
  })).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Client Detail Modal */}
      {selectedInvoiceForDetail && (
        <ClientDetailModal
          invoice={selectedInvoiceForDetail}
          onClose={() => setSelectedInvoiceForDetail(null)}
          onSendReminder={handleManualReminder}
          isReminding={manualRemindingId === selectedInvoiceForDetail.id}
        />
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            <span className="text-brand-500 font-black">Dashboard</span>
          </h2>
          <p className="text-slate-500 font-medium">Operations Dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`text-sm ${useLocalReminderMode ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} px-4 py-2 rounded-full font-black border flex items-center gap-2 shadow-sm transition-all`}>
            <Activity size={14} className={useLocalReminderMode ? '' : 'animate-pulse'} />
            {useLocalReminderMode ? 'Reminder Engine (Local)' : 'Reminder Engine Active'}
          </div>
          <div className="text-sm bg-brand-50 text-brand-700 px-4 py-2 rounded-full font-bold border border-brand-100">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={Euro} color="bg-emerald-500" />
        <StatCard label="Total Outstanding" value={formatCurrency(totalOutstanding)} icon={AlertCircle} color="bg-rose-500" />
        <StatCard label="Active Invoices" value={invoices.length} icon={FileText} color="bg-slate-800" />
        <StatCard label="Overdue Now" value={overdueCount} icon={BellRing} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Action Center */}
          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-brand-500" />
                Payment Action Center
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                {reminderCandidates.length} Candidates
              </span>
            </div>
            <div className="p-6 max-h-[440px] overflow-y-auto custom-scrollbar">
              {reminderCandidates.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <AlertCircle size={40} className="mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-medium">All collections are up to date.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reminderCandidates.map(inv => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(inv.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = dueDate < today;
                    const isDueToday = dueDate.getTime() === today.getTime();
                    const lastSent = useLocalReminderMode ? localReminderTracker.current[inv.id] : inv.lastReminderSent;

                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoiceForDetail(inv)}
                        className={`group p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer ${isOverdue ? 'border-rose-100 bg-rose-50/30' : 'border-slate-100 bg-white'}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-3 rounded-lg ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                              <User size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 leading-none mb-1">{safeRender(inv.customerName)}</h4>
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <FileText size={12} /> {safeRender(inv.invoiceNumber)}
                                <span className="mx-1">•</span>
                                <Phone size={12} /> {inv.customerPhone || 'No Phone'}
                              </p>
                              {inv.customerAddress && (
                                <p className="text-[10px] text-slate-400 mt-1 truncate max-w-xs">{inv.customerAddress}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right">
                              <div className="text-xs font-black text-slate-900">{formatCurrency(inv.balanceDue)}</div>
                              <div className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-rose-600' : isDueToday ? 'text-brand-600' : 'text-slate-400'}`}>
                                {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : `Due in ${Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24))} days`}
                              </div>
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); handlePreview(inv); }}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-sm"
                              title="View Invoice PDF"
                            >
                              <Eye size={14} />
                              View PDF
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleManualReminder(inv); }}
                              disabled={manualRemindingId === inv.id || lastSent === today.toISOString().split('T')[0]}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${lastSent === today.toISOString().split('T')[0]
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 opacity-50 cursor-default'
                                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20'
                                }`}
                            >
                              {manualRemindingId === inv.id ? (
                                <RefreshCcw size={14} className="animate-spin" />
                              ) : lastSent === today.toISOString().split('T')[0] ? (
                                <CheckCircle size={14} />
                              ) : (
                                <Send size={14} />
                              )}
                              {lastSent === today.toISOString().split('T')[0] ? 'Sent Today' : 'AI Remind'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-500" />
                Revenue Trends
              </h3>
            </div>
            <div className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-brand-500" />
              AI Insights
            </h3>
            <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
              "{safeRender(aiInsights)}"
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white overflow-hidden relative">
            <History className="absolute -right-4 -bottom-4 text-white/5" size={100} />
            <h3 className="text-xs font-black text-brand-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Activity size={14} />
              Automation Log
            </h3>
            <div className="space-y-3 relative z-10 h-64 overflow-y-auto custom-scrollbar pr-2">
              {automationLog.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">Awaiting automated triggers...</p>
              ) : (
                automationLog.map((log, i) => (
                  <div key={i} className="text-[10px] font-mono bg-white/5 p-2 rounded border border-white/10 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="text-brand-400 mr-2">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                    {safeRender(log)}
                  </div>
                ))
              )}
            </div>
          </div>

          {useLocalReminderMode && (
            <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-2 text-amber-700">
                <AlertTriangle size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Notice</span>
              </div>
              <p className="text-[10px] font-medium text-amber-800 leading-relaxed">
                Database schema missing <code className="bg-white px-1">last_reminder_sent</code>.
                Proactive reminders are being tracked locally for this session.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-8 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-10 py-6 border-b-2 border-slate-50 bg-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Invoice Preview</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PDF Document Viewer</p>
                </div>
              </div>
              <button onClick={() => setPreviewUrl(null)} className="text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-full p-3 transition-all">
                <X size={28} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-10 overflow-hidden relative">
              <iframe src={previewUrl} className="w-full h-full rounded-3xl shadow-2xl border-8 border-white bg-white" title="PDF Preview" />
            </div>
            <div className="p-8 border-t-2 border-slate-50 bg-white flex justify-end">
              <button onClick={() => setPreviewUrl(null)} className="px-12 py-4 bg-slate-900 text-white font-black hover:bg-slate-800 rounded-2xl transition-all text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20">
                Exit Preview Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RefreshCcw = ({ size, className }: { size: number, className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const CheckCircle = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default Dashboard;

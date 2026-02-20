import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Job } from '../types';

const CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchJobs = async () => {
            const data = await dataService.getJobs();
            setJobs(data);
        };
        fetchJobs();
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToday = () => setCurrentDate(new Date());

    const getJobsForDate = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return jobs.filter(j => j.date_scheduled?.startsWith(dateStr));
    };

    const statusColors: Record<string, string> = {
        scheduled: 'bg-blue-500',
        in_progress: 'bg-orange-500',
        completed: 'bg-green-500',
        cancelled: 'bg-slate-400'
    };

    const statusTextColors: Record<string, string> = {
        scheduled: 'text-blue-700 bg-blue-50',
        in_progress: 'text-orange-700 bg-orange-50',
        completed: 'text-green-700 bg-green-50',
        cancelled: 'text-slate-500 bg-slate-50'
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const selectedDateJobs = useMemo(() => {
        if (!selectedDate) return [];
        return jobs.filter(j => j.date_scheduled?.startsWith(selectedDate));
    }, [selectedDate, jobs]);

    // Build calendar grid
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold font-display text-slate-900">Calendar</h1>
                <p className="text-slate-500">View scheduled jobs and service appointments</p>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-6">
                {/* Calendar Grid */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center gap-3">
                            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <ChevronLeft size={20} className="text-slate-600" />
                            </button>
                            <h2 className="text-xl font-bold text-slate-900 min-w-[200px] text-center">
                                {monthNames[month]} {year}
                            </h2>
                            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <ChevronRight size={20} className="text-slate-600" />
                            </button>
                        </div>
                        <button onClick={goToday} className="px-4 py-2 text-sm font-semibold text-delaval-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                            Today
                        </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 border-b border-slate-100">
                        {dayNames.map(day => (
                            <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((day, i) => {
                            if (day === null) {
                                return <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 border-b border-r border-slate-100" />;
                            }

                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayJobs = getJobsForDate(day);
                            const isToday = dateStr === todayStr;
                            const isSelected = dateStr === selectedDate;

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`min-h-[100px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors
                                        ${isToday ? 'bg-blue-50/60' : 'hover:bg-slate-50'}
                                        ${isSelected ? 'ring-2 ring-delaval-blue ring-inset bg-blue-50/40' : ''}
                                    `}
                                >
                                    <div className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-delaval-blue text-white' : 'text-slate-700'}
                                    `}>
                                        {day}
                                    </div>
                                    <div className="space-y-1">
                                        {dayJobs.slice(0, 3).map(job => (
                                            <div
                                                key={job.id}
                                                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[11px] font-medium truncate ${statusTextColors[job.status] || 'bg-slate-50 text-slate-600'}`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColors[job.status] || 'bg-slate-400'}`} />
                                                <span className="truncate">{job.customers?.name || job.service_type}</span>
                                            </div>
                                        ))}
                                        {dayJobs.length > 3 && (
                                            <div className="text-[10px] text-slate-400 font-medium pl-1">+{dayJobs.length - 3} more</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar: Selected Day Details */}
                <div className="space-y-4">
                    {/* Legend */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Legend</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(statusColors).map(([status, color]) => (
                                <div key={status} className="flex items-center gap-2 text-xs">
                                    <div className={`w-3 h-3 rounded-full ${color}`} />
                                    <span className="text-slate-600 capitalize">{status.replace('_', ' ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Day Details */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">
                            {selectedDate
                                ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })
                                : 'Select a day'}
                        </h3>
                        {selectedDate ? (
                            selectedDateJobs.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedDateJobs.map(job => (
                                        <div key={job.id} className="p-3 rounded-lg border border-slate-100 hover:border-delaval-blue/30 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-sm text-slate-900">#{job.job_number}</span>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusTextColors[job.status]}`}>
                                                    {job.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-700 font-medium">{job.customers?.name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{job.service_type}</div>
                                            {job.engineer_name && (
                                                <div className="text-xs text-slate-400 mt-1">🔧 {job.engineer_name}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No jobs scheduled for this day.</p>
                            )
                        ) : (
                            <p className="text-sm text-slate-400 italic">Click a day on the calendar to view details.</p>
                        )}
                    </div>

                    {/* Upcoming Jobs */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Upcoming This Month</h3>
                        <div className="space-y-2">
                            {jobs
                                .filter(j => {
                                    if (!j.date_scheduled) return false;
                                    const jDate = new Date(j.date_scheduled);
                                    return jDate >= new Date() && jDate.getMonth() === month && jDate.getFullYear() === year && j.status !== 'cancelled';
                                })
                                .slice(0, 5)
                                .map(job => (
                                    <div key={job.id} className="flex items-center gap-3 py-2">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[job.status]}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-700 truncate">{job.customers?.name}</div>
                                            <div className="text-xs text-slate-400">{job.date_scheduled}</div>
                                        </div>
                                    </div>
                                ))}
                            {jobs.filter(j => j.date_scheduled && new Date(j.date_scheduled) >= new Date() && new Date(j.date_scheduled).getMonth() === month).length === 0 && (
                                <p className="text-xs text-slate-400 italic">No upcoming jobs this month.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;

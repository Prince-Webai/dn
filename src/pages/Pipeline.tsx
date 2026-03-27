import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { dataService } from "../services/dataService";
import { Job } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Filter,
  PackageSearch,
  ArrowRight,
  GitBranch
} from "lucide-react";
import SearchableSelect from "../components/SearchableSelect";

const COLUMNS = [
  {
    id: "scheduled",
    title: "Scheduled",
    icon: Calendar,
    color: "text-slate-500",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: Clock,
    color: "text-delaval-blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "awaiting_parts",
    title: "Awaiting Parts",
    icon: PackageSearch,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    id: "cancelled",
    title: "Cancelled",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
  },
];

const JobCard = ({ job, index }: { job: Job; index: number }) => {
  const navigate = useNavigate();
  return (
    <Draggable key={job.id} draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => navigate(`/jobs/${job.id}`)}
          className={`bg-white p-4 rounded-xl border shadow-sm transition-all duration-200 cursor-pointer ${
            snapshot.isDragging
              ? "shadow-xl ring-2 ring-delaval-blue/20 border-delaval-blue scale-105 opacity-90"
              : "border-slate-200 hover:border-slate-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-400">
              #{job.job_number.toString().padStart(4, "0")}
            </span>
            {job.date_scheduled && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                {new Date(job.date_scheduled).toLocaleDateString("en-GB")}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-800 mb-1.5 leading-snug">
            {job.customers?.name || "Unknown Customer"}
          </h3>
          {job.service_type && (
            <p className="text-sm text-slate-500 flex items-start gap-1.5 line-clamp-2 mt-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
              <span className="leading-tight">{job.service_type}</span>
            </p>
          )}
          {job.engineer_name && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-delaval-blue/10 flex items-center justify-center text-delaval-blue font-bold text-[10px]">
                {job.engineer_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-600">
                {job.engineer_name}
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

const Pipeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showSlider, setShowSlider] = useState(false);

  const checkScrollable = () => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowSlider(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [jobs]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollProgress((scrollLeft / maxScroll) * 100);
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollProgress(val);
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      scrollContainerRef.current.scrollLeft = (val / 100) * maxScroll;
    }
  };

  const isAdmin = user?.user_metadata?.role !== "Engineer";

  useEffect(() => {
    const loadEngineers = async () => {
      if (isAdmin) {
        const data = await dataService.getEngineers();
        setEngineers(data);
      }
    };
    loadEngineers();
  }, [isAdmin]);

  const loadJobs = async () => {
    try {
      setLoading(true);

      let engineerToFetch = undefined;
      if (!isAdmin) {
        engineerToFetch = user?.user_metadata?.name || user?.email?.split("@")[0];
      } else if (selectedEngineer !== 'all') {
        engineerToFetch = selectedEngineer;
      }

      const data = await dataService.getJobs(undefined, engineerToFetch);
      setJobs(data);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [user, selectedEngineer]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as Job["status"];

    // Optimistically update UI
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === draggableId ? { ...job, status: newStatus } : job,
      ),
    );

    // Update in backend
    const { error } = await dataService.updateJob(draggableId, {
      status: newStatus,
    });
    if (error) {
      console.error("Failed to update job status:", error);
      // Revert on failure
      loadJobs();
    }
  };

  const getJobsByStatus = (status: string) => {
    return (
      jobs
        .filter((job) => job.status === status)
        // Sort by date inside the column conceptually, or just preserve array order
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-delaval-blue" />
          <span>Loading pipeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-8 flex items-center justify-between gap-4 px-4 md:px-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-delaval-blue text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0">
            <GitBranch size={22} className="md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black font-display text-slate-900 leading-tight">Job Pipeline</h1>
            <p className="text-[11px] md:text-sm text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] md:max-w-none">Drag & drop jobs to update status</p>
          </div>
        </div>
        {isAdmin && (
          <div className="shrink-0">
            <div className="hidden md:block w-64">
              <SearchableSelect
                label="Filter by Engineer"
                options={[
                  { value: 'all', label: 'All Engineers' },
                  ...engineers.map(eng => ({ value: eng.name, label: eng.name }))
                ]}
                value={selectedEngineer}
                onChange={(val) => setSelectedEngineer(val)}
                searchable={false}
                icon={<Filter size={16} />}
              />
            </div>
            <div className="md:hidden">
               <button 
                onClick={() => {
                  const nextIndex = (engineers.findIndex(e => e.name === selectedEngineer) + 2) % (engineers.length + 1);
                  const nextVal = nextIndex === 0 ? 'all' : engineers[nextIndex - 1].name;
                  setSelectedEngineer(nextVal);
                }}
                className="w-10 h-10 bg-white text-slate-600 rounded-full flex items-center justify-center border border-slate-200 active:scale-95 transition-all shadow-sm"
                title="Cycle Engineer Filter"
               >
                 <Filter size={18} />
               </button>
            </div>
          </div>
        )}
      </div>

      {showSlider && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs font-bold text-delaval-blue uppercase tracking-widest">Scroll Pipeline</span>
          <input
            type="range"
            min="0"
            max="100"
            value={scrollProgress}
            onChange={handleSliderChange}
            className="flex-1 w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-delaval-blue hover:accent-blue-700 transition-all"
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          {/* Desktop View: Horizontal Kanban */}
          <div
            className="hidden md:flex flex-1 gap-6 overflow-x-auto pb-4 h-full custom-scrollbar-hide"
            ref={scrollContainerRef}
            onScroll={handleScroll}
          >
            {COLUMNS.map((column) => {
              const columnJobs = getJobsByStatus(column.id);
              const Icon = column.icon;
              return (
                <div key={column.id} className="flex-shrink-0 w-80 flex flex-col h-full">
                  <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl border ${column.border} ${column.bg}`}>
                    <Icon className={`w-5 h-5 ${column.color}`} />
                    <h2 className="font-semibold text-slate-700">{column.title}</h2>
                    <div className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-medium text-slate-500 shadow-sm">
                      {columnJobs.length}
                    </div>
                  </div>
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-2xl p-3 border-2 border-dashed transition-colors duration-200 overflow-y-auto ${snapshot.isDraggingOver ? "border-delaval-blue bg-blue-50/50" : "border-transparent bg-slate-50"}`}
                      >
                        <div className="flex flex-col gap-3 min-h-[150px]">
                          {columnJobs.map((job, index) => (
                            <JobCard key={job.id} job={job} index={index} />
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>

          {/* Mobile View: Vertical List grouped by Status */}
          <div className="md:hidden flex-1 overflow-y-auto pb-24 space-y-8 px-1">
            {COLUMNS.map((column) => {
              const columnJobs = getJobsByStatus(column.id);
              if (columnJobs.length === 0) return null;
              const Icon = column.icon;

              return (
                <div key={column.id} className="space-y-4">
                  <div className={`flex items-center gap-3 px-1`}>
                    <div className={`p-2 rounded-lg ${column.bg} ${column.color}`}>
                      <Icon size={18} />
                    </div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{column.title}</h2>
                    <span className="text-xs font-bold text-slate-400 ml-auto bg-slate-100 px-2 py-0.5 rounded-full">{columnJobs.length}</span>
                  </div>

                  <div className="space-y-4">
                    {columnJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="bg-white rounded-[1.5rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100/50 flex flex-col gap-4 active:scale-[0.98] transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none block mb-1">
                              #{job.job_number.toString().padStart(4, "0")}
                            </span>
                            <h3 className="text-[17px] font-black text-slate-900 leading-tight">
                              {job.customers?.name || "Unknown Customer"}
                            </h3>
                          </div>
                          {job.date_scheduled && (
                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                              {new Date(job.date_scheduled).toLocaleDateString("en-GB")}
                            </span>
                          )}
                        </div>

                        {job.service_type && (
                          <div className="flex items-start gap-2 text-slate-500">
                             <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-300" />
                             <p className="text-[13px] font-medium leading-relaxed line-clamp-2">{job.service_type}</p>
                          </div>
                        )}

                        {job.engineer_name && (
                          <div className="mt-1 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-delaval-blue/10 flex items-center justify-center text-delaval-blue font-black text-[10px]">
                                {job.engineer_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                {job.engineer_name}
                              </span>
                            </div>
                            <div className="text-[11px] font-black text-delaval-blue uppercase tracking-widest flex items-center gap-1">
                              View Details <ArrowRight size={12} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default Pipeline;

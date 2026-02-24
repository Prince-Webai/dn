import { useState, useEffect } from "react";
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
} from "lucide-react";

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

const Pipeline = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');

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
    <div className="p-8 max-w-[1400px] mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Pipeline</h1>
          <p className="text-slate-500 mt-1">
            Drag and drop jobs to update their status
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
            >
              <option value="all">All Engineers</option>
              {engineers.map(eng => (
                <option key={eng.id} value={eng.name}>{eng.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6">
          {COLUMNS.map((column) => {
            const columnJobs = getJobsByStatus(column.id);
            const Icon = column.icon;

            return (
              <div key={column.id} className="flex-shrink-0 w-80 flex flex-col">
                <div
                  className={`flex items-center gap-2 mb-4 p-3 rounded-xl border ${column.border} ${column.bg}`}
                >
                  <Icon className={`w-5 h-5 ${column.color}`} />
                  <h2 className="font-semibold text-slate-700">
                    {column.title}
                  </h2>
                  <div className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-medium text-slate-500 shadow-sm">
                    {columnJobs.length}
                  </div>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-2xl p-3 border-2 border-dashed transition-colors duration-200 flex flex-col ${snapshot.isDraggingOver
                          ? "border-delaval-blue bg-blue-50/50"
                          : "border-transparent bg-slate-50"
                        }`}
                    >
                      <div className="flex flex-col gap-3 min-h-[150px] h-full flex-grow">
                        {columnJobs.map((job, index) => (
                          <Draggable
                            key={job.id}
                            draggableId={job.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-4 rounded-xl border shadow-sm transition-all duration-200 ${snapshot.isDragging
                                    ? "shadow-xl ring-2 ring-delaval-blue/20 border-delaval-blue scale-105 opacity-90"
                                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                  }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-xs font-bold text-slate-400">
                                    #
                                    {job.job_number.toString().padStart(4, "0")}
                                  </span>
                                  {job.date_scheduled && (
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                      {new Date(
                                        job.date_scheduled,
                                      ).toLocaleDateString("en-GB")}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-semibold text-slate-800 mb-1.5 leading-snug">
                                  {job.customers?.name || "Unknown Customer"}
                                </h3>
                                {job.service_type && (
                                  <p className="text-sm text-slate-500 flex items-start gap-1.5 line-clamp-2 mt-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                                    <span className="leading-tight">
                                      {job.service_type}
                                    </span>
                                  </p>
                                )}
                                {job.engineer_name && (
                                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-delaval-blue/10 flex items-center justify-center text-delaval-blue font-bold text-[10px]">
                                      {job.engineer_name
                                        .charAt(0)
                                        .toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">
                                      {job.engineer_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
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
      </DragDropContext>
    </div>
  );
};

export default Pipeline;

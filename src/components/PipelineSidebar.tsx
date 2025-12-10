
import {
  Database,
  Search,
  ShieldCheck,
  RefreshCcw,
  Settings,
  Receipt,
  Network,
  ClipboardList,
  Clock,
  CheckCircle,
  Loader,
  XCircle,
} from "lucide-react";

interface Stage {
  name: string;
  status: "Completed" | "In Progress" | "Pending" | "Failed";
}

interface PipelineSidebarProps {
  stages: Stage[];
}

const stageIcons: Record<string, React.ReactNode> = {
  "Data Discovery": <Search className="w-5 h-5 text-gray-700" />,
  "Schema Check": <Receipt className="w-5 h-5 text-gray-700" />,
  "Data Ingestion": <Database className="w-5 h-5 text-gray-700" />,
  "Data Quality Checks": <ShieldCheck className="w-5 h-5 text-gray-700" />,
  "Metadata Updates": <Settings className="w-5 h-5 text-gray-700" />,
  "Reconciliation Checks": <RefreshCcw className="w-5 h-5 text-gray-700" />,
};

const getStatusIcon = (status: Stage["status"]) => {
  switch (status) {
    case "Completed":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "In Progress":
      return <Loader className="w-4 h-4 text-yellow-500 animate-spin" />;
    case "Failed":
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Clock className="w-4 h-4 text-yellow-500" />;
  }
};

const getStatusBg = (status: Stage["status"]) => {
  switch (status) {
    case "Completed":
      return "bg-green-100";
    case "In Progress":
      return "bg-yellow-100";
    case "Failed":
      return "bg-red-100";
    default:
      return "bg-gray-50";
  }
};

export const PipelineSidebar: React.FC<PipelineSidebarProps> = ({ stages }) => {
  // ✅ Remove "Ingestion Plan" from stages before calculations
  const filteredStages = stages.filter((stage) => stage.name !== "Ingestion Plan");

  const totalStages = filteredStages.length;
  const completedStages = filteredStages.filter((s) => s.status === "Completed").length;
  const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="p-4 fixed left-0 top-[112px] w-64 overflow-y-auto border-gray-200 bg-white border-r">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="text-gray-700 w-5 h-5" />
          <h2 className="text-sm font-semibold text-gray-800">Pipeline Progress</h2>
        </div>
        <ClipboardList className="w-5 h-5 text-gray-500" />
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="text-xs text-gray-600 mb-1">{progress}%</div>
        <div className="w-full bg-gray-200 rounded h-2">
          <div
            className="h-2 rounded transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: "#1E5A8C" }}
          ></div>
        </div>
      </div>

      {/* Stage List */}
      <ul className="space-y-4">
        {filteredStages.map((stage, idx) => (
          <li
            key={idx}
            className={`flex items-center justify-between py-3 my-4 px-2 rounded cursor-default ${getStatusBg(stage.status)} transition-colors`}
          >
            <div className="flex items-center gap-3">
              {stageIcons[stage.name] || <Settings className="w-5 h-5 text-gray-400" />}
              <span className="text-sm text-gray-700">{stage.name}</span>
            </div>
            {getStatusIcon(stage.status)}
          </li>
        ))}
      </ul>
    </div>
  );
};

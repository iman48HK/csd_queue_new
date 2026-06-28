import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";

const dashboardSubs = [
  { key: "dashboard-overview", label: "Overview" },
  { key: "dashboard-tickets", label: "Tickets Served" },
  { key: "dashboard-api-log", label: "API Call Log" },
  { key: "dashboard-activity", label: "Queue Activity Log" },
];

export default function Sidebar({ activeSection, onNavigate, collapsed, onToggleCollapse }) {
  const [dashOpen, setDashOpen] = useState(true);

  const handleExit = () => {
    window.location.href = "/";
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-primary text-white transition-all duration-300 ease-in-out flex-shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 min-h-[64px]">
        {!collapsed && (
          <span className="font-bold text-sm leading-tight">Big Screen Module</span>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto p-1 rounded hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">

        {/* Dashboard (expandable) */}
        <div>
          <button
            onClick={() => collapsed ? onNavigate("dashboard-overview") : setDashOpen((v) => !v)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors",
              activeSection?.startsWith("dashboard") && "bg-white/15"
            )}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Dashboard</span>
                {dashOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </>
            )}
          </button>
          {!collapsed && dashOpen && (
            <div className="bg-white/5">
              {dashboardSubs.map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => onNavigate(sub.key)}
                  className={cn(
                    "w-full text-left pl-12 pr-4 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors",
                    activeSection === sub.key && "bg-white/20 text-white font-medium"
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Queue Functions (no sub-items) */}
        <button
          onClick={() => onNavigate("queue")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors",
            activeSection === "queue" || activeSection?.startsWith("queue-") ? "bg-white/15" : ""
          )}
        >
          <Zap className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="flex-1 text-left">API Functions</span>}
        </button>

      </nav>

      {/* Exit */}
      <div className="border-t border-white/10 p-2">
        <button
          onClick={handleExit}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white rounded transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Exit</span>}
        </button>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LiveMonitoring from "./LiveMonitoring";
import RealTimeAlerts from "./RealTimeAlerts";
import TicketsServed from "./TicketsServed";
import ApiCallLog from "./ApiCallLog";
import UserActivityLog from "./UserActivityLog";

const periods = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Selected Period" },
];

export default function DashboardSection({ subSection }) {
  const [period, setPeriod] = useState("today");
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  return (
    <div className="p-6 space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={period === p.key ? "default" : "outline"}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-sm w-36"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
        )}
      </div>

      {/* Live Monitoring Charts */}
      {(!subSection || subSection === "dashboard-overview") && (
        <LiveMonitoring />
      )}

      {/* Real-Time Alerts */}
      {(!subSection || subSection === "dashboard-overview") && (
        <RealTimeAlerts />
      )}

      {subSection === "dashboard-tickets" && <TicketsServed />}
      {subSection === "dashboard-api-log" && <ApiCallLog />}
      {subSection === "dashboard-activity" && <UserActivityLog />}
    </div>
  );
}
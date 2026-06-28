import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import DashboardSection from "@/components/admin/DashboardSection";
import QueueFunctions from "@/components/admin/QueueFunctions";
import { queueApi } from "@/api/queueApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

const sectionTitles = {
  "dashboard-overview": "Dashboard › Overview",
  "dashboard-tickets": "Dashboard › Tickets Served",
  "dashboard-api-log": "Dashboard › API Call Log",
  "dashboard-activity": "Dashboard › Queue Activity Log",
  "queue-call": "API Functions › Create Ticket",
  "queue-tv-announcement": "Queue Functions › Set TV Announcement",
  "queue-clear": "Queue Functions › Clear Queuing Tickets",
  "queue-voice": "Queue Functions › Set Voice Announcement",
  "queue-mode": "Queue Functions › Set Mode",
};

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard-overview");
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);

  useEffect(() => {
    queueApi
      .listInstitutions()
      .then((data) => {
        setInstitutions(data || []);
        if (data?.length && !selectedInstitution) {
          setSelectedInstitution(data[0].id);
        }
      })
      .catch(() => {
        setInstitutions([]);
      });
  }, []);

  const isQueue = activeSection === "queue" || activeSection?.startsWith("queue-");
  const isDashboard = activeSection?.startsWith("dashboard");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-border flex-shrink-0">
          <h1 className="text-base font-semibold text-foreground">
            {sectionTitles[activeSection] || "Admin Module"}
          </h1>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedInstitution || ""} onValueChange={setSelectedInstitution}>
              <SelectTrigger className="w-40 h-9 text-sm border-none shadow-none bg-transparent hover:bg-muted/50 focus:ring-0">
                <SelectValue placeholder="Select institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30">
          {isDashboard && <DashboardSection subSection={activeSection} />}
          {(isQueue || activeSection === "queue") && <QueueFunctions subSection={activeSection} />}
        </main>
      </div>
    </div>
  );
}

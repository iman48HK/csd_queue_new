import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueApi } from "@/api/queueApi";
import { mapApiLogToActivity } from "@/lib/adminFormat";

const catStyle = {
  Queue: "bg-blue-100 text-blue-700",
  TV: "bg-purple-100 text-purple-700",
  Announcement: "bg-amber-100 text-amber-700",
  Speech: "bg-emerald-100 text-emerald-700",
  API: "bg-slate-100 text-slate-700",
};

export default function UserActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      queueApi
        .listApiLogs()
        .then((rows) => setLogs((rows || []).map(mapApiLogToActivity)))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 flex-row items-center gap-2">
        <Activity className="w-4 h-4 text-purple-500" />
        <CardTitle className="text-sm">Activity Log</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">{logs.length} records</span>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-8">Loading activity...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Time", "Category", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
                      {log.time}
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", catStyle[log.category] || catStyle.API)}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{log.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No activity recorded.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

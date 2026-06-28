import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueApi } from "@/api/queueApi";
import { formatTime } from "@/lib/adminFormat";

const statusStyle = (code) => {
  const normalized = String(code || "").toUpperCase();
  if (normalized === "SUCCESS" || normalized === "200") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("404")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-red-100 text-red-600";
};

export default function ApiCallLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueApi
      .listApiLogs()
      .then((rows) => setLogs(rows || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 flex-row items-center gap-2">
        <FileText className="w-4 h-4 text-emerald-500" />
        <CardTitle className="text-sm">API Call Log</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">{logs.length} records</span>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-8">Loading API logs...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Time", "Endpoint", "Result", "Request", "Response"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground font-mono text-xs">
                      {formatTime(log.requestTime)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground">{log.apiName}</td>
                    <td className="px-4 py-2">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", statusStyle(log.resultCode))}>
                        {log.resultCode}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-xs truncate">
                      {log.requestJson}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-xs truncate">
                      {log.responseJson}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No API logs found.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

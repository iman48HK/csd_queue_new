import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, AlertTriangle, Info, CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { queueApi } from "@/api/queueApi";
import { mapApiLogToAlert } from "@/lib/adminFormat";

const alertConfig = {
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  error:   { icon: XCircle,       color: "text-red-500",   bg: "bg-red-50 border-red-200",     badge: "bg-red-100 text-red-700" },
  info:    { icon: Info,          color: "text-blue-500",  bg: "bg-blue-50 border-blue-200",   badge: "bg-blue-100 text-blue-700" },
  success: { icon: CheckCircle,   color: "text-emerald-500", bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
};

export default function RealTimeAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      if (paused) return;
      queueApi
        .listApiLogs()
        .then((rows) => setAlerts((rows || []).map(mapApiLogToAlert)))
        .catch(() => setAlerts([]))
        .finally(() => setLoading(false));
    };
    load();
    const interval = window.setInterval(load, 10000);
    return () => window.clearInterval(interval);
  }, [paused]);

  const dismiss = (id) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  const clearAll = () => setAlerts([]);

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.type === filter);
  const counts = alerts.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {});

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Real-Time Alerts</CardTitle>
            <span className={cn("inline-block w-2 h-2 rounded-full", paused ? "bg-gray-400" : "bg-emerald-500 animate-pulse")} />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setPaused((v) => !v)} className="h-7 text-xs gap-1">
              {paused ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs text-muted-foreground">
              Clear All
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {["all", "error", "warning", "info", "success"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
                filter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== "all" && counts[f] ? (
                <span className="ml-1 opacity-70">({counts[f]})</span>
              ) : f === "all" ? (
                <span className="ml-1 opacity-70">({alerts.length})</span>
              ) : null}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-72 overflow-y-auto divide-y divide-border">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Loading alerts...</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No alerts</p>
          )}
          {filtered.map((alert) => {
            const cfg = alertConfig[alert.type];
            const Icon = cfg.icon;
            return (
              <div key={alert.id} className={cn("flex items-start gap-3 px-4 py-3 border-l-2 transition-all", cfg.bg)}>
                <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5", cfg.badge)}>{alert.type}</Badge>
                    <span className="text-xs text-muted-foreground">{alert.source}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{alert.time}</span>
                  </div>
                </div>
                <button onClick={() => dismiss(alert.id)} className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

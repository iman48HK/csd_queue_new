import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { queueApi } from "@/api/queueApi";
import { HONG_KONG_TIME_ZONE } from "@/lib/adminFormat";

const QUEUE_LABELS = {
  handin: "Hand-In",
  security: "Security",
  waiting: "Waiting",
};

export default function LiveMonitoring() {
  const [queueData, setQueueData] = useState([]);
  const [inProgress, setInProgress] = useState(0);
  const [servedToday, setServedToday] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [display, served] = await Promise.all([
          queueApi.getDisplay(),
          queueApi.listServedTickets(),
        ]);
        const queues = display?.queues || {};
        setQueueData(
          Object.entries(queues).map(([key, codes]) => ({
            queue: QUEUE_LABELS[key] || key,
            inProgress: Array.isArray(codes) ? codes.length : 0,
          })),
        );
        setInProgress(display?.activeCount || 0);
        setServedToday(Array.isArray(served) ? served.length : 0);
        setLastUpdated(new Date());
      } catch {
        setQueueData([]);
        setInProgress(0);
        setServedToday(0);
      }
    };
    load();
    const interval = window.setInterval(load, 10000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Live Monitoring</h2>
        <span className="text-xs text-muted-foreground">
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString("en-HK", { timeZone: HONG_KONG_TIME_ZONE })}`
            : "Loading..."}
          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-primary">{inProgress}</p>
            <p className="text-xs text-muted-foreground mt-1">Tickets created today, not completed or cancelled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Served Today</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-emerald-600">{servedToday}</p>
            <p className="text-xs text-muted-foreground mt-1">Checked out today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm">In Progress by Queue</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={queueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="queue" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="inProgress" fill="hsl(var(--primary))" name="In Progress" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {queueData.every((row) => row.inProgress === 0) && (
            <p className="text-center text-muted-foreground text-xs pb-2">No in-progress tickets in any queue.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket } from "lucide-react";
import { queueApi } from "@/api/queueApi";
import { mapServedTicket, queueTypeBadgeClass, formatTime } from "@/lib/adminFormat";

export default function TicketsServed() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      queueApi
        .listServedTickets()
        .then((rows) => setTickets((rows || []).map(mapServedTicket)))
        .catch(() => setTickets([]))
        .finally(() => setLoading(false));
    };
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4 flex-row items-center gap-2">
        <Ticket className="w-4 h-4 text-primary" />
        <CardTitle className="text-sm">Tickets Served Today</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">{tickets.length} records</span>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-8">Loading served tickets...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Ticket", "Counter", "Type", "Served At", "Wait Time", "Status"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 font-mono font-semibold text-primary">{t.code}</td>
                    <td className="px-4 py-2 font-medium">{t.counter}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${queueTypeBadgeClass(t.queueType)}`}>
                        {t.ticketType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatTime(t.servedAt)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t.waitTime}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No tickets served today.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

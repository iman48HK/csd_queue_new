import React, { useCallback, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import {
  counterLabelFromQueueType,
  queueApi,
  queueTypeFromUi,
  toApiLanguage,
} from "@/api/queueApi";
import VoiceLanguageSelect from "@/components/admin/VoiceLanguageSelect";
import { formatTime, formatWaitMinutes } from "@/lib/adminFormat";

const STATUS_STYLES = {
  CALLED: "bg-amber-100 text-amber-600 border border-amber-300",
  WAITING: "bg-blue-100 text-blue-600 border border-blue-200",
  CHECKED_IN: "bg-green-100 text-green-600 border border-green-200",
  CHECKED_OUT: "bg-gray-100 text-gray-500 border border-gray-200",
  COMPLETED: "bg-slate-100 text-slate-600 border border-slate-200",
  CANCELLED: "bg-red-100 text-red-600 border border-red-200",
};

function formatStatus(status) {
  if (status === "CHECKED_OUT") return "CHECKED-OUT";
  return status;
}

const COUNTER_LABEL = {
  Waiting: "A - Waiting",
  "Hand-In": "B - Hand-In",
  Security: "C - Security",
};

const COUNTER_ACTIONS = {
  Waiting: [
    { value: "move-b", label: "Move to B - Hand-In" },
    { value: "move-c", label: "Move to C - Security" },
    { value: "checkin", label: "Check-In Now" },
    { value: "checkout", label: "Check-Out Now" },
    { value: "complete", label: "Complete" },
    { value: "cancel", label: "Cancel" },
  ],
  "Hand-In": [
    { value: "move-a", label: "Move to A - Waiting" },
    { value: "move-c", label: "Move to C - Security" },
    { value: "checkin", label: "Check-In Now" },
    { value: "checkout", label: "Check-Out Now" },
    { value: "complete", label: "Complete" },
    { value: "cancel", label: "Cancel" },
  ],
  Security: [
    { value: "move-a", label: "Move to A - Waiting" },
    { value: "move-b", label: "Move to B - Hand-In" },
    { value: "checkin", label: "Check-In Now" },
    { value: "checkout", label: "Check-Out Now" },
    { value: "complete", label: "Complete" },
    { value: "cancel", label: "Cancel" },
  ],
};

export default function ManageTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [voiceLang, setVoiceLang] = useState("cantonese");
  const [selectedActions, setSelectedActions] = useState({});

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await queueApi.listTickets("MANAGE");
      setTickets(
        rows.map((row) => ({
          id: row.id,
          code: row.code,
          counter: counterLabelFromQueueType(row.queueType),
          createdAt: row.createdAt,
          servedAt: row.callTime,
          checkInAt: row.inTime,
          checkOutAt: row.outTime,
          waitTime: formatWaitMinutes(row.createdAt, row.callTime || row.inTime),
          status: row.status,
        })),
      );
    } catch (error) {
      setDialog({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const timer = window.setInterval(loadTickets, 5000);
    const onTicketsChanged = () => loadTickets();
    window.addEventListener("queue-tickets-changed", onTicketsChanged);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("queue-tickets-changed", onTicketsChanged);
    };
  }, [loadTickets]);

  const handleAction = async (ticketId, counter, action) => {
    const allActions = Object.values(COUNTER_ACTIONS).flat();
    const actionLabel = allActions.find((a) => a.value === action)?.label || action;
    try {
      if (action.startsWith("move-")) {
        await queueApi.moveTicket(ticketId, {
          queueCode: queueTypeFromUi(action),
          language: toApiLanguage(voiceLang),
        });
      } else if (action === "checkin") {
        await queueApi.checkIn(ticketId);
      } else if (action === "checkout") {
        await queueApi.checkOut(ticketId);
      } else if (action === "complete") {
        await queueApi.completeTicket(ticketId);
      } else if (action === "cancel") {
        await queueApi.cancelTicket(ticketId);
      }
      setDialog({
        success: true,
        message: `"${actionLabel}" applied to ticket ${ticketId} successfully.`,
      });
      await loadTickets();
    } catch (error) {
      setDialog({
        success: false,
        message: `Failed to apply "${actionLabel}": ${error.message}`,
      });
    } finally {
      setSelectedActions((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
    }
  };

  return (
    <div>
      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${dialog?.success ? "text-green-600" : "text-red-600"}`}>
              {dialog?.success ? (
                <>
                  <CheckCircle className="w-5 h-5" /> Success
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5" /> Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-foreground pt-1">
              {dialog?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" onClick={() => setDialog(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="px-4 pb-4">
        <VoiceLanguageSelect
          value={voiceLang}
          onChange={setVoiceLang}
          className="max-w-xs"
        />
      </div>

      {loading && tickets.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-8">Loading tickets...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-3">Ticket</th>
                <th className="text-left px-4 py-3">Counter</th>
                <th className="text-left px-4 py-3">Created At</th>
                <th className="text-left px-4 py-3">Served At</th>
                <th className="text-left px-4 py-3">Check-In</th>
                <th className="text-left px-4 py-3">Check-Out</th>
                <th className="text-left px-4 py-3">Wait Time</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary text-base">{ticket.code}</td>
                  <td className="px-4 py-3 text-foreground">
                    {COUNTER_LABEL[ticket.counter] || ticket.counter}
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground">{formatTime(ticket.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{formatTime(ticket.servedAt)}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{formatTime(ticket.checkInAt)}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{formatTime(ticket.checkOutAt)}</td>
                  <td className="px-4 py-3 text-foreground">{ticket.waitTime}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLES[ticket.status] || STATUS_STYLES.WAITING}`}
                    >
                      {formatStatus(ticket.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={selectedActions[ticket.id]}
                      onValueChange={(val) => {
                        setSelectedActions((prev) => ({ ...prev, [ticket.id]: val }));
                        handleAction(ticket.id, ticket.counter, val);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs w-44">
                        <SelectValue placeholder="Select action..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(COUNTER_ACTIONS[ticket.counter] || []).map((action) => (
                          <SelectItem key={action.value} value={action.value} className="text-xs">
                            {action.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No tickets for today.</p>
          )}
        </div>
      )}
    </div>
  );
}

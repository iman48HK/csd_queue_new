import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Play, CheckCircle, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import ManageTickets from "@/components/admin/ManageTickets";
import VoiceLanguageSelect from "@/components/admin/VoiceLanguageSelect";
import { queueApi, queueTypeFromUi, toApiLanguage } from "@/api/queueApi";

function QueueCard({
  id,
  title,
  description,
  children,
  activeKey,
  onActivate,
  createMode,
  queueValue,
  onQueueChange,
  typeValue,
  onTypeChange,
  voiceLangValue,
  onVoiceLangChange,
  onAction,
  actionDisabled,
  secondaryLabel,
  onSecondaryAction,
  secondaryDisabled,
}) {
  const isActive = activeKey === id;
  const canCreate = createMode ? queueValue && typeValue : true;

  return (
    <Card
      className="cursor-pointer border-2 transition-colors"
      style={{ borderColor: isActive ? "hsl(var(--primary))" : "hsl(var(--border))" }}
      onClick={() => onActivate(id)}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      {isActive && (
        <CardContent className="px-4 pb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          {createMode ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Queue</Label>
                <Select value={queueValue} onValueChange={onQueueChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select queue..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="hand-in">Hand-In</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                <Select value={typeValue} onValueChange={onTypeChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="W">W – Start Visit</SelectItem>
                    <SelectItem value="M">M – Hand-In Articles</SelectItem>
                    <SelectItem value="DA">DA – Document Administration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <VoiceLanguageSelect value={voiceLangValue} onChange={onVoiceLangChange} />
              <Button
                size="sm"
                className="gap-1.5"
                disabled={!canCreate || actionDisabled}
                onClick={() => onAction(id)}
              >
                <Play className="w-3.5 h-3.5" /> Create
              </Button>
            </>
          ) : (
            <>
              {children}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={actionDisabled}
                  onClick={() => onAction(id)}
                >
                  <Play className="w-3.5 h-3.5" /> Execute
                </Button>
                {onSecondaryAction && secondaryLabel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={secondaryDisabled}
                    onClick={onSecondaryAction}
                  >
                    {secondaryLabel}
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function LangSelect({ value, onChange, disabled }) {
  return <VoiceLanguageSelect value={value} onChange={onChange} disabled={disabled} />;
}

export default function QueueFunctions({ subSection }) {
  const [activeCard, setActiveCard] = useState(subSection || null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const [createQueue, setCreateQueue] = useState("");
  const [createType, setCreateType] = useState("");
  const [createVoiceLang, setCreateVoiceLang] = useState("cantonese");
  const [tvText, setTvText] = useState("");
  const [clearType, setClearType] = useState("1");
  const [voiceText, setVoiceText] = useState("");
  const [voiceLang, setVoiceLang] = useState("all");
  const [sendVoice, setSendVoice] = useState(false);

  useEffect(() => {
    if (subSection) setActiveCard(subSection);
  }, [subSection]);

  useEffect(() => {
    queueApi
      .getFooter()
      .then((data) => {
        if (!data) return;
        const text = data.messageEn || data.messageText || "";
        if (text) setTvText(text);
      })
      .catch(() => {});

    queueApi
      .getPopup()
      .then((data) => {
        if (!data) return;
        const text = data.bodyEn || data.bodyZh || "";
        if (text) setVoiceText(text);
      })
      .catch(() => {});
  }, []);

  const showResult = (success, message) => setDialog({ success, message });

  const handleCreateTicket = async () => {
    setBusy(true);
    try {
      const ticket = await queueApi.createTicket({
        ticketTypeCode: createType,
        queueCode: queueTypeFromUi(createQueue),
        language: toApiLanguage(createVoiceLang),
      });
      showResult(true, `Ticket ${ticket.code} created successfully.`);
    } catch (error) {
      showResult(false, error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSetFooter = async () => {
    setBusy(true);
    try {
      await queueApi.setFooter({ messageText: tvText, active: true });
      showResult(true, "TV announcement updated successfully.");
    } catch (error) {
      showResult(false, error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleClearTickets = async () => {
    setBusy(true);
    try {
      const result = await queueApi.clearTickets(clearType);
      const count = result?.cleared ?? result?.clearedCount ?? 0;
      window.dispatchEvent(new CustomEvent("queue-tickets-changed"));
      showResult(true, `Cleared ${count} ticket(s).`);
    } catch (error) {
      showResult(false, error.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePublicAnnouncement = async () => {
    setBusy(true);
    try {
      await queueApi.createPopup({
        bodyEn: voiceText,
        bodyZh: voiceText,
        active: true,
        speak: sendVoice,
        language: sendVoice ? toApiLanguage(voiceLang) : undefined,
      });
      showResult(
        true,
        sendVoice
          ? "Public announcement published and queued for speech."
          : "Public announcement published successfully.",
      );
    } catch (error) {
      showResult(false, error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleStopPublicAnnouncement = async () => {
    setBusy(true);
    try {
      await queueApi.clearPopup();
      showResult(true, "Public announcement stopped. The big screen will return to the queue view.");
    } catch (error) {
      showResult(false, error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAction = (cardId) => {
    if (cardId === "queue-call") return handleCreateTicket();
    if (cardId === "queue-tv-announcement") return handleSetFooter();
    if (cardId === "queue-clear") return handleClearTickets();
    if (cardId === "queue-voice") return handlePublicAnnouncement();
  };

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <Card className="md:col-span-2 border-2 border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Manage Tickets</CardTitle>
          <p className="text-xs text-muted-foreground">View and manage today's queuing tickets, including checked-out.</p>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          <ManageTickets />
        </CardContent>
      </Card>

      <QueueCard
        id="queue-call"
        title="Create a Ticket"
        description="Select a queue and ticket type, then create a new ticket."
        activeKey={activeCard}
        onActivate={setActiveCard}
        createMode
        queueValue={createQueue}
        onQueueChange={setCreateQueue}
        typeValue={createType}
        onTypeChange={setCreateType}
        voiceLangValue={createVoiceLang}
        onVoiceLangChange={setCreateVoiceLang}
        onAction={handleAction}
        actionDisabled={busy}
      />

      <QueueCard
        id="queue-tv-announcement"
        title="Set TV Announcement"
        description="Displays on TV footer as scrolling text"
        activeKey={activeCard}
        onActivate={setActiveCard}
        onAction={handleAction}
        actionDisabled={busy || !tvText.trim()}
      >
        <Textarea
          placeholder="Enter scrolling announcement text..."
          value={tvText}
          onChange={(e) => setTvText(e.target.value)}
          className="text-sm min-h-[80px]"
        />
      </QueueCard>

      <QueueCard
        id="queue-clear"
        title="Clear Queuing Tickets by Type"
        description="1=Waiting, 2=Hand-In, 3=Security Check, 4=All"
        activeKey={activeCard}
        onActivate={setActiveCard}
        onAction={handleAction}
        actionDisabled={busy}
      >
        <Select value={clearType} onValueChange={setClearType}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 – Waiting</SelectItem>
            <SelectItem value="2">2 – Hand-In</SelectItem>
            <SelectItem value="3">3 – Security Check</SelectItem>
            <SelectItem value="4">4 – All</SelectItem>
          </SelectContent>
        </Select>
      </QueueCard>

      <QueueCard
        id="queue-voice"
        title="Set Public Announcement"
        description="Send text to the full-screen public announcement overlay"
        activeKey={activeCard}
        onActivate={setActiveCard}
        onAction={handleAction}
        actionDisabled={busy || !voiceText.trim()}
        secondaryLabel="Stop Public Announcement"
        onSecondaryAction={handleStopPublicAnnouncement}
        secondaryDisabled={busy}
      >
        <Textarea
          placeholder="Enter announcement text..."
          value={voiceText}
          onChange={(e) => setVoiceText(e.target.value)}
          className="text-sm min-h-[80px]"
        />
        <div className="flex items-center gap-2">
          <Checkbox id="send-voice" checked={sendVoice} onCheckedChange={setSendVoice} />
          <Label htmlFor="send-voice" className="text-xs font-medium cursor-pointer">
            Play announcement on speakers
          </Label>
        </div>
        <LangSelect value={voiceLang} onChange={setVoiceLang} disabled={!sendVoice} />
      </QueueCard>
    </div>
  );
}

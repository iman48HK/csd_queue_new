import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VOICE_LANGUAGE_OPTIONS } from "@/api/queueApi";

export default function VoiceLanguageSelect({ value, onChange, disabled = false, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground">Speech language</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {VOICE_LANGUAGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

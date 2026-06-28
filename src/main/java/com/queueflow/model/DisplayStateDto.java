package com.queueflow.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DisplayStateDto(
        int activeCount,
        Map<String, List<String>> queues,
        Map<String, Long> highlightedUntilEpochMs,
        AnnouncementDto announcement,
        String footerText,
        List<SpeechEventDto> speechEvents) {}

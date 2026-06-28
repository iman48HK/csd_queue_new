package com.queueflow.model;

public record SpeechEventDto(
        long id,
        String ticketCode,
        String queueCode,
        String languageCode,
        String speechText,
        String audioUrl,
        java.util.List<SpeechSegmentDto> segments) {}

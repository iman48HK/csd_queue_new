package com.queueflow.model;

public record SpeechPreviewDto(
        String ticketCode, String queueCode, String language, String speechText, String audioUrl) {}

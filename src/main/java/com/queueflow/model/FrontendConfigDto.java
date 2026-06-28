package com.queueflow.model;

public record FrontendConfigDto(
        String apiBaseUrl,
        long pollIntervalMs,
        long highlightDurationMs,
        String defaultLanguage,
        boolean speechEnabled) {}

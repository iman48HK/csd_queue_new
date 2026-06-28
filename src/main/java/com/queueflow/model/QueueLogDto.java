package com.queueflow.model;

import java.time.Instant;

public record QueueLogDto(
        long id,
        String ticketCode,
        String queueType,
        String eventType,
        Instant eventTime,
        String remarks) {}

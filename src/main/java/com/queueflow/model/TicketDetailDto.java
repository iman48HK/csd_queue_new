package com.queueflow.model;

import java.time.Instant;

public record TicketDetailDto(
        long id,
        String code,
        String queueType,
        String status,
        String ticketTypeCode,
        Instant createdAt,
        Instant callTime,
        Instant inTime,
        Instant outTime,
        Instant lastUpdateTime) {}

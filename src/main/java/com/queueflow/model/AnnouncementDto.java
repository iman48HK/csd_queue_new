package com.queueflow.model;

import java.time.Instant;

public record AnnouncementDto(
        long id,
        String titleEn,
        String titleZh,
        String bodyEn,
        String bodyZh,
        boolean active,
        Instant updatedAt) {}

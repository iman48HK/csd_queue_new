package com.queueflow.model.request;

public record AnnouncementUpdateRequest(
        String titleEn, String titleZh, String bodyEn, String bodyZh, Boolean active) {}

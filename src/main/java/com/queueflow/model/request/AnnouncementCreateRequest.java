package com.queueflow.model.request;

public record AnnouncementCreateRequest(
        String titleEn,
        String titleZh,
        String bodyEn,
        String bodyZh,
        Boolean active,
        Boolean speak,
        String language) {

    public AnnouncementCreateRequest {
        if (titleEn == null) {
            titleEn = "";
        }
        if (titleZh == null) {
            titleZh = "";
        }
        if (bodyEn == null) {
            bodyEn = "";
        }
        if (bodyZh == null) {
            bodyZh = "";
        }
    }

    public AnnouncementCreateRequest(
            String titleEn, String titleZh, String bodyEn, String bodyZh, Boolean active) {
        this(titleEn, titleZh, bodyEn, bodyZh, active, false, null);
    }

    public boolean activeOrDefault() {
        return active == null || active;
    }

    public boolean speakOrDefault() {
        return speak != null && speak;
    }
}

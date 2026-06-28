package com.queueflow.model.request;

public record FooterMessageRequest(String messageText, Integer sortOrder, Boolean active) {

    public boolean activeOrDefault() {
        return active == null || active;
    }
}

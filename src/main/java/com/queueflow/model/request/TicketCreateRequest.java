package com.queueflow.model.request;

public record TicketCreateRequest(
        String code, String ticketTypeCode, String queueCode, String language) {}

package com.queueflow.repository;

public final class TicketQuerySupport {

    /** Tickets created today that are not cancelled or completed. */
    public static final String IN_PROGRESS_FILTER =
            """
            AND TRUNC(q.CREATED_TIME) = TRUNC(SYSDATE)
            AND s.STATUS_CODE NOT IN ('CANCELLED', 'COMPLETED', 'CHECKED_OUT')
            """;

    private TicketQuerySupport() {}
}

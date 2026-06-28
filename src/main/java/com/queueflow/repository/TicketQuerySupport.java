package com.queueflow.repository;

public final class TicketQuerySupport {

    /** Tickets created today that are not cancelled or completed. */
    public static final String IN_PROGRESS_FILTER =
            """
            AND TRUNC(q.CREATED_TIME) = TRUNC(SYSDATE)
            AND s.STATUS_CODE NOT IN ('CANCELLED', 'COMPLETED', 'CHECKED_OUT')
            """;

    /** Admin manage-tickets view: includes checked-out tickets for today. */
    public static final String MANAGE_QUEUE_FILTER =
            """
            AND TRUNC(q.CREATED_TIME) = TRUNC(SYSDATE)
            AND s.STATUS_CODE NOT IN ('CANCELLED', 'COMPLETED')
            """;

    private TicketQuerySupport() {}
}

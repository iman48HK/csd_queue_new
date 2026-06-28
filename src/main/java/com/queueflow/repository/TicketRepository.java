package com.queueflow.repository;

import com.queueflow.config.QueueFlowProperties;
import com.queueflow.exception.BadRequestException;
import com.queueflow.exception.NotFoundException;
import com.queueflow.model.TicketDetailDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import com.queueflow.util.TimeSupport;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Repository
public class TicketRepository {

    private static final Map<String, Integer> STATUS = Map.of(
            "WAITING", 1,
            "CALLED", 2,
            "CHECKED_IN", 3,
            "CHECKED_OUT", 4,
            "CANCELLED", 5);

    private final JdbcTemplate jdbc;
    private final QueueFlowProperties properties;

    public TicketRepository(JdbcTemplate jdbc, QueueFlowProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    public List<TicketDetailDto> listInProgressTickets() {
        return jdbc.query(
                baseTicketQuery()
                        + TicketQuerySupport.IN_PROGRESS_FILTER
                        + " ORDER BY q.QUEUE_TYPE, q.CREATED_TIME, q.QUEUE_ID",
                this::mapTicket,
                properties.getInsCode());
    }

    public List<TicketDetailDto> listServedTodayTickets() {
        return jdbc.query(
                baseTicketQuery()
                        + """
                        AND TRUNC(q.CREATED_TIME) = TRUNC(SYSDATE)
                        AND s.STATUS_CODE = 'COMPLETED'
                        ORDER BY q.OUT_TIME NULLS LAST, q.LAST_UPDATE_TIME DESC, q.QUEUE_ID
                        """,
                this::mapTicket,
                properties.getInsCode());
    }

    public List<TicketDetailDto> listTickets(String status) {
        StringBuilder sql = new StringBuilder(baseTicketQuery());
        List<Object> params = new ArrayList<>();
        params.add(properties.getInsCode());
        if (status != null && !status.isBlank()) {
            sql.append(" AND s.STATUS_CODE = ?");
            params.add(status.toUpperCase());
        }
        sql.append(" ORDER BY q.QUEUE_TYPE, q.CREATED_TIME, q.QUEUE_ID");
        return jdbc.query(sql.toString(), this::mapTicket, params.toArray());
    }

    public TicketDetailDto findById(long queueId) {
        List<TicketDetailDto> rows =
                jdbc.query(
                        baseTicketQuery() + " AND q.QUEUE_ID = ?",
                        this::mapTicket,
                        properties.getInsCode(),
                        queueId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public TicketDetailDto createTicket(String code, String ticketTypeCode, String queueType, String language) {
        String ticketNo;
        int ticketTypeId;

        if (code != null && !code.isBlank()) {
            ticketNo = code.toUpperCase();
            ticketTypeId = resolveTicketTypeId(ticketNo);
        } else {
            if (ticketTypeCode == null || ticketTypeCode.isBlank()) {
                throw new BadRequestException("Either code or ticketTypeCode is required");
            }
            ticketTypeId = resolveTicketTypeId(ticketTypeCode.toUpperCase() + "001");
            TicketCounter counter = lockTicketCounter(ticketTypeId);
            int nextNo = counter.currentNo() + 1;
            ticketNo = counter.prefix() + String.format("%03d", nextNo);
            jdbc.update(
                    """
                    UPDATE T_TICKET_COUNTER
                    SET CURRENT_NO = ?, LAST_UPDATE_TIME = SYSDATE
                    WHERE INS_CODE = ? AND TICKET_TYPE_ID = ?
                    """,
                    nextNo,
                    properties.getInsCode(),
                    ticketTypeId);
        }

        List<Integer> exists =
                jdbc.query(
                        "SELECT 1 FROM T_QUEUE WHERE INS_CODE = ? AND TICKET_NO = ?",
                        (rs, rowNum) -> 1,
                        properties.getInsCode(),
                        ticketNo);
        if (!exists.isEmpty()) {
            throw new BadRequestException("Ticket already exists");
        }

        long queueId =
                insertQueueRow(
                        ticketTypeId,
                        ticketNo,
                        resolveQueueType(queueType),
                        STATUS.get("WAITING"));
        insertQueueLog(queueId, "CREATED", null, language);
        return requireTicket(queueId);
    }

    public TicketDetailDto moveTicket(long queueId, String queueType, String language) {
        TicketDetailDto ticket = requireTicket(queueId);
        if ("CANCELLED".equals(ticket.status()) || "COMPLETED".equals(ticket.status())) {
            throw new BadRequestException("Ticket cannot be moved");
        }

        String newType = queueType.toUpperCase();
        jdbc.update(
                """
                UPDATE T_QUEUE
                SET QUEUE_TYPE = ?,
                    LAST_UPDATE_TIME = SYSDATE,
                    STATUS_ID = CASE WHEN ? IN ('A', 'B') THEN ? ELSE STATUS_ID END,
                    CALL_TIME = CASE WHEN ? IN ('A', 'B') THEN SYSDATE ELSE CALL_TIME END
                WHERE QUEUE_ID = ?
                """,
                newType,
                newType,
                STATUS.get("CALLED"),
                newType,
                queueId);

        insertQueueLog(queueId, "MOVED", ticket.queueType() + "->" + newType, language);
        insertQueueLog(queueId, "CALLED", null, language);
        return requireTicket(queueId);
    }

    public TicketDetailDto recordCheckOut(long queueId) {
        TicketDetailDto ticket = requireTicket(queueId);
        if ("CANCELLED".equals(ticket.status()) || "COMPLETED".equals(ticket.status())) {
            throw new BadRequestException("Ticket cannot be checked out");
        }
        jdbc.update(
                """
                UPDATE T_QUEUE
                SET OUT_TIME = NVL(OUT_TIME, SYSDATE),
                    LAST_UPDATE_TIME = SYSDATE
                WHERE QUEUE_ID = ?
                """,
                queueId);
        insertQueueLog(queueId, "CHECKED_OUT", null, null);
        return requireTicket(queueId);
    }

    public TicketDetailDto completeTicket(long queueId) {
        return setStatus(queueId, "COMPLETED");
    }

    public TicketDetailDto setStatus(long queueId, String statusCode) {
        requireTicket(queueId);
        String status = statusCode.toUpperCase();
        int statusId = resolveStatusId(status);

        StringBuilder sql =
                new StringBuilder(
                        """
                        UPDATE T_QUEUE
                        SET STATUS_ID = ?,
                            LAST_UPDATE_TIME = SYSDATE
                        """);
        List<Object> params = new ArrayList<>();
        params.add(statusId);
        if ("CHECKED_IN".equals(status)) {
            sql.append(", IN_TIME = NVL(IN_TIME, SYSDATE)");
        }
        if ("COMPLETED".equals(status)) {
            sql.append(", OUT_TIME = NVL(OUT_TIME, SYSDATE)");
        }
        if ("CALLED".equals(status)) {
            sql.append(", CALL_TIME = SYSDATE");
        }
        sql.append(" WHERE QUEUE_ID = ?");
        params.add(queueId);
        jdbc.update(sql.toString(), params.toArray());
        insertQueueLog(queueId, status, null, null);
        return requireTicket(queueId);
    }

    private String resolveQueueType(String queueType) {
        if (queueType == null || queueType.isBlank()) {
            return properties.getDefaultCreateQueueType();
        }
        return switch (queueType.toLowerCase()) {
            case "waiting", "a", "1" -> "A";
            case "hand-in", "handin", "b", "2" -> "B";
            case "security", "c", "3" -> "C";
            default -> queueType.toUpperCase();
        };
    }

    private TicketDetailDto requireTicket(long queueId) {
        TicketDetailDto ticket = findById(queueId);
        if (ticket == null) {
            throw new NotFoundException("Ticket not found");
        }
        return ticket;
    }

    private long insertQueueRow(int ticketTypeId, String ticketNo, String queueType, int statusId) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(
                connection -> {
                    PreparedStatement ps =
                            connection.prepareStatement(
                                    """
                                    INSERT INTO T_QUEUE (
                                        INS_CODE, TICKET_TYPE_ID, TICKET_NO, QUEUE_TYPE, STATUS_ID,
                                        CREATED_TIME, LAST_UPDATE_TIME
                                    ) VALUES (?, ?, ?, ?, ?, SYSDATE, SYSDATE)
                                    """,
                                    new String[] {"QUEUE_ID"});
                    ps.setString(1, properties.getInsCode());
                    ps.setInt(2, ticketTypeId);
                    ps.setString(3, ticketNo);
                    ps.setString(4, queueType);
                    ps.setInt(5, statusId);
                    return ps;
                },
                keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to create ticket");
        }
        return key.longValue();
    }

    private void insertQueueLog(long queueId, String eventType, String remarks, String language) {
        String finalRemarks = remarks == null ? "" : remarks;
        if (language != null && !language.isBlank()) {
            String prefix = "lang=" + language;
            finalRemarks = finalRemarks.isBlank() ? prefix : prefix + ";" + finalRemarks;
        }
        jdbc.update(
                """
                INSERT INTO T_QUEUE_LOG (INS_CODE, QUEUE_ID, EVENT_TYPE, EVENT_TIME, REMARKS)
                VALUES (?, ?, ?, SYSDATE, ?)
                """,
                properties.getInsCode(),
                queueId,
                eventType,
                finalRemarks.isBlank() ? null : finalRemarks);
    }

    private int resolveTicketTypeId(String ticketCode) {
        String prefix = ticketCode.toUpperCase().replaceAll("[^A-Z]", "");
        List<Integer> rows =
                jdbc.query(
                        """
                        SELECT TICKET_TYPE_ID
                        FROM T_TICKET_TYPE
                        WHERE TICKET_CODE = ? AND IS_ACTIVE = 'Y'
                        """,
                        (rs, rowNum) -> rs.getInt(1),
                        prefix);
        if (rows.isEmpty()) {
            throw new BadRequestException("Unknown ticket type prefix: " + prefix);
        }
        return rows.get(0);
    }

    private TicketCounter lockTicketCounter(int ticketTypeId) {
        List<TicketCounter> rows =
                jdbc.query(
                        """
                        SELECT tt.TICKET_CODE, tc.CURRENT_NO
                        FROM T_TICKET_TYPE tt
                        JOIN T_TICKET_COUNTER tc
                          ON tc.TICKET_TYPE_ID = tt.TICKET_TYPE_ID
                         AND tc.INS_CODE = ?
                        WHERE tt.TICKET_TYPE_ID = ?
                        FOR UPDATE OF tc.CURRENT_NO
                        """,
                        (rs, rowNum) ->
                                new TicketCounter(rs.getString(1), rs.getInt(2)),
                        properties.getInsCode(),
                        ticketTypeId);
        if (rows.isEmpty()) {
            throw new BadRequestException("Ticket counter not configured for this ticket type");
        }
        return rows.get(0);
    }

    private String baseTicketQuery() {
        return """
                SELECT q.QUEUE_ID, q.TICKET_NO, q.QUEUE_TYPE, s.STATUS_CODE, tt.TICKET_CODE,
                       """
                + TimeSupport.toCharHongKong("q.CREATED_TIME")
                + " AS CREATED_TIME, "
                + TimeSupport.toCharHongKong("q.CALL_TIME")
                + " AS CALL_TIME, "
                + TimeSupport.toCharHongKong("q.IN_TIME")
                + " AS IN_TIME, "
                + TimeSupport.toCharHongKong("q.OUT_TIME")
                + " AS OUT_TIME, "
                + TimeSupport.toCharHongKong("q.LAST_UPDATE_TIME")
                + """
                 AS LAST_UPDATE_TIME
                FROM T_QUEUE q
                JOIN T_STATUS s ON q.STATUS_ID = s.STATUS_ID
                JOIN T_TICKET_TYPE tt ON q.TICKET_TYPE_ID = tt.TICKET_TYPE_ID
                WHERE q.INS_CODE = ?
                """;
    }

    private TicketDetailDto mapTicket(ResultSet rs, int rowNum) throws SQLException {
        return new TicketDetailDto(
                rs.getLong(1),
                rs.getString(2),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5),
                TimeSupport.fromOracleDateTimeColumn(rs, 6),
                TimeSupport.fromOracleDateTimeColumn(rs, 7),
                TimeSupport.fromOracleDateTimeColumn(rs, 8),
                TimeSupport.fromOracleDateTimeColumn(rs, 9),
                TimeSupport.fromOracleDateTimeColumn(rs, 10));
    }

    private int resolveStatusId(String statusCode) {
        Integer cached = STATUS.get(statusCode);
        if (cached != null) {
            return cached;
        }
        List<Integer> rows =
                jdbc.query(
                        "SELECT STATUS_ID FROM T_STATUS WHERE STATUS_CODE = ?",
                        (rs, rowNum) -> rs.getInt(1),
                        statusCode);
        if (rows.isEmpty()) {
            throw new BadRequestException("Unknown status: " + statusCode);
        }
        return rows.get(0);
    }

    private record TicketCounter(String prefix, int currentNo) {}
}

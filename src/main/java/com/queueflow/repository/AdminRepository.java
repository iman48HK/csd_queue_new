package com.queueflow.repository;

import com.queueflow.config.QueueFlowProperties;
import com.queueflow.model.ApiLogDto;
import com.queueflow.model.InstitutionDto;
import com.queueflow.model.QueueLogDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.queueflow.util.TimeSupport;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Repository
public class AdminRepository {

    private final JdbcTemplate jdbc;
    private final QueueFlowProperties properties;

    public AdminRepository(JdbcTemplate jdbc, QueueFlowProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    public List<InstitutionDto> findInstitutions() {
        try {
            return jdbc.query(
                    """
                    SELECT INS_CODE, INS_NAME, IS_ACTIVE
                    FROM T_INS_LOCATION
                    ORDER BY INS_NAME
                    """,
                    (rs, rowNum) ->
                            new InstitutionDto(
                                    rs.getString(1),
                                    rs.getString(2),
                                    isActive(rs.getString(3))));
        } catch (Exception ex) {
            return List.of(
                    new InstitutionDto(properties.getInsCode(), properties.getInsCode(), true));
        }
    }

    public List<ApiLogDto> findApiLogs(int limit) {
        return jdbc.query(
                """
                SELECT API_LOG_ID, API_NAME,
                       """
                        + TimeSupport.toCharHongKong("REQUEST_TIME")
                        + """
                         AS REQUEST_TIME,
                       RESULT_CODE, REQUEST_JSON, RESPONSE_JSON
                FROM T_API_LOG
                WHERE INS_CODE = ?
                ORDER BY REQUEST_TIME DESC
                FETCH FIRST ? ROWS ONLY
                """,
                this::mapApiLog,
                properties.getInsCode(),
                limit);
    }

    public void insertApiLog(
            String apiName, String requestJson, String responseJson, String resultCode) {
        jdbc.update(
                """
                INSERT INTO T_API_LOG (INS_CODE, API_NAME, REQUEST_TIME, REQUEST_JSON, RESPONSE_JSON, RESULT_CODE)
                VALUES (?, ?, SYSDATE, ?, ?, ?)
                """,
                properties.getInsCode(),
                apiName,
                requestJson == null ? "" : requestJson,
                responseJson == null ? "" : responseJson,
                resultCode == null ? "" : resultCode);
    }

    public List<QueueLogDto> findQueueLogs(int limit) {
        return jdbc.query(
                """
                SELECT l.LOG_ID, q.TICKET_NO, q.QUEUE_TYPE, l.EVENT_TYPE,
                       """
                        + TimeSupport.toCharHongKong("l.EVENT_TIME")
                        + """
                         AS EVENT_TIME,
                       l.REMARKS
                FROM T_QUEUE_LOG l
                JOIN T_QUEUE q ON q.QUEUE_ID = l.QUEUE_ID
                WHERE l.INS_CODE = ?
                ORDER BY l.EVENT_TIME DESC
                FETCH FIRST ? ROWS ONLY
                """,
                (rs, rowNum) ->
                        new QueueLogDto(
                                rs.getLong(1),
                                rs.getString(2),
                                rs.getString(3),
                                rs.getString(4),
                                TimeSupport.fromOracleDateTimeColumn(rs, 5),
                                rs.getString(6)),
                properties.getInsCode(),
                limit);
    }

    public int deleteAllTickets() {
        jdbc.update("DELETE FROM T_QUEUE_LOG");
        return jdbc.update("DELETE FROM T_QUEUE");
    }

    public int countAllTickets() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM T_QUEUE", Integer.class);
        return count == null ? 0 : count;
    }

    public int cancelTicketsByQueueType(String queueType) {
        StringBuilder selectSql =
                new StringBuilder(
                        """
                        SELECT q.QUEUE_ID
                        FROM T_QUEUE q
                        JOIN T_STATUS s ON q.STATUS_ID = s.STATUS_ID
                        WHERE q.INS_CODE = ?
                        """);
        selectSql.append(TicketQuerySupport.IN_PROGRESS_FILTER);
        List<Object> params = new ArrayList<>();
        params.add(properties.getInsCode());
        if (queueType != null && !queueType.isBlank() && !"ALL".equalsIgnoreCase(queueType)) {
            selectSql.append(" AND q.QUEUE_TYPE = ?");
            params.add(queueType.toUpperCase());
        }
        List<Long> queueIds =
                jdbc.query(selectSql.toString(), (rs, rowNum) -> rs.getLong(1), params.toArray());
        if (queueIds.isEmpty()) {
            return 0;
        }

        String placeholders = String.join(",", queueIds.stream().map(id -> "?").toList());
        List<Object> updateParams = new ArrayList<>();
        updateParams.add(properties.getInsCode());
        updateParams.addAll(queueIds);
        int updated =
                jdbc.update(
                        """
                        UPDATE T_QUEUE q
                        SET STATUS_ID = (
                                SELECT STATUS_ID FROM T_STATUS WHERE STATUS_CODE = 'CANCELLED'
                            ),
                            LAST_UPDATE_TIME = SYSDATE
                        WHERE q.INS_CODE = ?
                          AND q.QUEUE_ID IN ("""
                                + placeholders
                                + ")",
                        updateParams.toArray());

        String remark =
                queueType == null || queueType.isBlank() || "ALL".equalsIgnoreCase(queueType)
                        ? "bulk-clear:ALL"
                        : "bulk-clear:" + queueType.toUpperCase();
        for (long queueId : queueIds) {
            insertQueueLog(queueId, "CANCELLED", remark);
        }
        return updated;
    }

    private void insertQueueLog(long queueId, String eventType, String remarks) {
        jdbc.update(
                """
                INSERT INTO T_QUEUE_LOG (INS_CODE, QUEUE_ID, EVENT_TYPE, EVENT_TIME, REMARKS)
                VALUES (?, ?, ?, SYSDATE, ?)
                """,
                properties.getInsCode(),
                queueId,
                eventType,
                remarks);
    }

    private ApiLogDto mapApiLog(ResultSet rs, int rowNum) throws SQLException {
        return new ApiLogDto(
                rs.getLong(1),
                rs.getString(2),
                TimeSupport.fromOracleDateTimeColumn(rs, 3),
                rs.getString(4),
                readClob(rs, 5),
                readClob(rs, 6));
    }

    private static boolean isActive(String value) {
        if (value == null) {
            return true;
        }
        return "Y".equalsIgnoreCase(value) || "ACTIVE".equalsIgnoreCase(value) || "1".equals(value);
    }

    private static String readClob(ResultSet rs, int index) throws SQLException {
        var clob = rs.getClob(index);
        if (clob == null) {
            return "";
        }
        String value = clob.getSubString(1, (int) clob.length());
        clob.free();
        return value == null ? "" : value;
    }
}

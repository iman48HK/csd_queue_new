package com.queueflow.repository;

import com.queueflow.config.QueueFlowProperties;
import com.queueflow.model.AnnouncementDto;
import com.queueflow.model.SpeechEventDto;
import com.queueflow.model.SpeechSegmentDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Clob;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import com.queueflow.util.TimeSupport;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class QueueRepository {

    private final JdbcTemplate jdbc;
    private final QueueFlowProperties properties;

    public QueueRepository(JdbcTemplate jdbc, QueueFlowProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    public List<String> findInProgressTicketCodes(String queueType) {
        StringBuilder sql =
                new StringBuilder(
                        """
                        SELECT q.TICKET_NO
                        FROM T_QUEUE q
                        JOIN T_STATUS s ON q.STATUS_ID = s.STATUS_ID
                        WHERE q.INS_CODE = ?
                        """);
        sql.append(TicketQuerySupport.IN_PROGRESS_FILTER);
        List<Object> params = new ArrayList<>();
        params.add(properties.getInsCode());
        if (queueType != null && !queueType.isBlank()) {
            sql.append(" AND q.QUEUE_TYPE = ?");
            params.add(queueType);
        }
        sql.append(" ORDER BY q.CALL_TIME NULLS LAST, q.CREATED_TIME, q.QUEUE_ID");
        return jdbc.query(sql.toString(), (rs, rowNum) -> rs.getString(1), params.toArray());
    }

    public int countInProgressTickets() {
        Integer count =
                jdbc.queryForObject(
                        """
                        SELECT COUNT(*)
                        FROM T_QUEUE q
                        JOIN T_STATUS s ON q.STATUS_ID = s.STATUS_ID
                        WHERE q.INS_CODE = ?
                        """
                                + TicketQuerySupport.IN_PROGRESS_FILTER,
                        Integer.class,
                        properties.getInsCode());
        return count == null ? 0 : count;
    }

    public Map<String, Long> findHighlightedTickets() {
        double seconds = properties.getTicket().getHighlightDurationMs() / 1000.0;
        return jdbc.query(
                """
                SELECT q.TICKET_NO,
                       (CAST(SYS_EXTRACT_UTC(SYSTIMESTAMP) AS DATE) - q.LAST_UPDATE_TIME) * 86400000
                FROM T_QUEUE q
                JOIN T_STATUS s ON q.STATUS_ID = s.STATUS_ID
                WHERE q.INS_CODE = ?
                """
                                + TicketQuerySupport.IN_PROGRESS_FILTER
                                + """
                  AND q.LAST_UPDATE_TIME >= SYSDATE - (? / 86400)
                """,
                rs -> {
                    Map<String, Long> highlighted = new LinkedHashMap<>();
                    long nowMs = Instant.now().toEpochMilli();
                    while (rs.next()) {
                        highlighted.put(
                                rs.getString(1),
                                nowMs
                                        + Math.round(
                                                properties.getTicket().getHighlightDurationMs()
                                                        - rs.getDouble(2)));
                    }
                    return highlighted;
                },
                properties.getInsCode(),
                seconds);
    }

    public Optional<AnnouncementDto> findActiveAnnouncement() {
        List<AnnouncementDto> rows =
                jdbc.query(
                        """
                        SELECT ANNOUNCEMENT_ID, MESSAGE_EN, MESSAGE_TC, STATUS,
                               """
                                + TimeSupport.toCharHongKong("CREATED_TIME")
                                + """
                                 AS CREATED_TIME
                        FROM T_ANNOUNCEMENT
                        WHERE INS_CODE = ?
                          AND ANNOUNCEMENT_TYPE = 'POPUP'
                          AND STATUS = 'ACTIVE'
                        ORDER BY CREATED_TIME DESC
                        FETCH FIRST 1 ROW ONLY
                        """,
                        this::mapAnnouncement,
                        properties.getInsCode());
        return rows.stream().findFirst();
    }

    public String findFooterText() {
        List<String> rows =
                jdbc.query(
                        """
                        SELECT MESSAGE_EN, MESSAGE_TC
                        FROM T_ANNOUNCEMENT
                        WHERE INS_CODE = ?
                          AND ANNOUNCEMENT_TYPE = 'FOOTER'
                          AND STATUS = 'ACTIVE'
                        ORDER BY CREATED_TIME DESC
                        FETCH FIRST 1 ROW ONLY
                        """,
                        (rs, rowNum) -> {
                            String en = readClob(rs, 1).trim();
                            String tc = readClob(rs, 2).trim();
                            if (en.isBlank()) {
                                return tc;
                            }
                            if (tc.isBlank() || en.equals(tc)) {
                                return en;
                            }
                            return en + " · " + tc;
                        },
                        properties.getInsCode());
        return rows.isEmpty() ? "" : rows.get(0);
    }

    public List<SpeechEventDto> findUnplayedSpeechEvents(int limit) {
        return jdbc.query(
                """
                SELECT l.LOG_ID, q.TICKET_NO, q.QUEUE_TYPE, l.REMARKS
                FROM T_QUEUE_LOG l
                JOIN T_QUEUE q ON q.QUEUE_ID = l.QUEUE_ID
                WHERE l.INS_CODE = ?
                  AND l.EVENT_TYPE IN ('CREATED', 'CALLED')
                  AND l.EVENT_TIME >= SYSDATE - (30 / 86400)
                  AND NOT EXISTS (
                      SELECT 1 FROM T_API_LOG a
                      WHERE a.INS_CODE = l.INS_CODE
                        AND a.API_NAME = '/api/speech/ack'
                        AND DBMS_LOB.INSTR(a.REQUEST_JSON, TO_CHAR(l.LOG_ID)) > 0
                  )
                ORDER BY l.EVENT_TIME
                FETCH FIRST ? ROWS ONLY
                """,
                (rs, rowNum) -> mapSpeechEvent(
                        rs.getLong(1),
                        rs.getString(2),
                        rs.getString(3),
                        languageFromRemarks(rs.getString(4))),
                properties.getInsCode(),
                limit);
    }

    public List<SpeechEventDto> findUnplayedPublicSpeechEvents(int limit) {
        return jdbc.query(
                """
                SELECT VOICE_ID, MESSAGE_TEXT, LANGUAGE
                FROM T_VOICE_ANNOUNCEMENT
                WHERE INS_CODE = ?
                  AND VOICE_TYPE = 'PUBLIC'
                  AND CREATED_TIME >= SYSDATE - (30 / 86400)
                  AND NOT EXISTS (
                      SELECT 1 FROM T_API_LOG a
                      WHERE a.INS_CODE = ?
                        AND a.API_NAME = '/api/speech/ack'
                        AND DBMS_LOB.INSTR(a.REQUEST_JSON, '"logId":-' || TO_CHAR(VOICE_ID)) > 0
                  )
                ORDER BY CREATED_TIME
                FETCH FIRST ? ROWS ONLY
                """,
                (rs, rowNum) ->
                        mapPublicSpeechEvent(
                                rs.getLong(1),
                                readClob(rs, 2),
                                rs.getString(3)),
                properties.getInsCode(),
                properties.getInsCode(),
                limit);
    }

    public long insertPublicVoiceAnnouncement(String messageText, String language) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        String dbLanguage = normalizePublicSpeechLanguage(language);
        jdbc.update(
                connection -> {
                    PreparedStatement ps =
                            connection.prepareStatement(
                                    """
                                    INSERT INTO T_VOICE_ANNOUNCEMENT (
                                        INS_CODE, VOICE_TYPE, LANGUAGE, MESSAGE_TEXT, AUDIO_FILE, CREATED_TIME
                                    ) VALUES (?, 'PUBLIC', ?, ?, NULL, SYSDATE)
                                    """,
                                    new String[] {"VOICE_ID"});
                    ps.setString(1, properties.getInsCode());
                    ps.setString(2, dbLanguage);
                    ps.setString(3, messageText);
                    return ps;
                },
                keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to create public voice announcement");
        }
        return key.longValue();
    }

    public void acknowledgeSpeechEvent(long eventId) {
        markSpeechPlayed(eventId);
    }

    private SpeechEventDto mapPublicSpeechEvent(
            long voiceId, String messageText, String dbLanguage) {
        long eventId = -voiceId;
        String language = speechLanguageFromDb(dbLanguage);
        String text = messageText == null ? "" : messageText;
        if ("all".equalsIgnoreCase(language)) {
            List<SpeechSegmentDto> segments = new ArrayList<>();
            for (String lang : List.of("zh-HK", "zh-CN", "en-US")) {
                segments.add(new SpeechSegmentDto(lang, text, null));
            }
            return new SpeechEventDto(eventId, "", "", "all", null, null, segments);
        }
        return new SpeechEventDto(eventId, "", "", language, text, null, null);
    }

    private static String normalizePublicSpeechLanguage(String language) {
        if (language == null || language.isBlank() || "all".equalsIgnoreCase(language)) {
            return "ALL";
        }
        return normalizeLanguage(language);
    }

    private String speechLanguageFromDb(String dbLanguage) {
        if (dbLanguage == null || dbLanguage.isBlank()) {
            return properties.getSpeech().getDefaultLanguage();
        }
        if ("ALL".equalsIgnoreCase(dbLanguage)) {
            return "all";
        }
        return switch (dbLanguage.toUpperCase()) {
            case "EN" -> "en-US";
            case "SC" -> "zh-CN";
            case "TC" -> "zh-HK";
            default -> dbLanguage;
        };
    }

    private SpeechEventDto mapSpeechEvent(
            long logId, String ticketCode, String queueCode, String language) {
        if (language == null || language.isBlank()) {
            language = properties.getSpeech().getDefaultLanguage();
        }
        if ("all".equalsIgnoreCase(language)) {
            List<SpeechSegmentDto> segments = new ArrayList<>();
            for (String lang : List.of("zh-HK", "zh-CN", "en-US")) {
                segments.add(
                        new SpeechSegmentDto(
                                lang,
                                buildSpeechText(ticketCode, queueCode, lang),
                                findAudioFile(lang)));
            }
            return new SpeechEventDto(
                    logId, ticketCode, queueCode, "all", null, null, segments);
        }

        return new SpeechEventDto(
                logId,
                ticketCode,
                queueCode,
                language,
                buildSpeechText(ticketCode, queueCode, language),
                findAudioFile(language),
                null);
    }

    public void markSpeechPlayed(long eventId) {
        jdbc.update(
                """
                INSERT INTO T_API_LOG (INS_CODE, API_NAME, REQUEST_TIME, REQUEST_JSON, RESPONSE_JSON, RESULT_CODE)
                VALUES (?, '/api/speech/ack', SYSDATE, ?, ?, 'SUCCESS')
                """,
                properties.getInsCode(),
                "{\"logId\":" + eventId + "}",
                "{\"acknowledged\":true}");
    }

    public String getSpeechText(String ticketCode, String queueCode, String language) {
        return buildSpeechText(ticketCode, queueCode, language);
    }

    public String getAudioUrl(String language) {
        return findAudioFile(language);
    }

    private AnnouncementDto mapAnnouncement(ResultSet rs, int rowNum) throws SQLException {
        return new AnnouncementDto(
                rs.getLong(1),
                "",
                "",
                readClob(rs, 2),
                readClob(rs, 3),
                "ACTIVE".equals(rs.getString(4)),
                TimeSupport.fromOracleDateTimeColumn(rs, 5));
    }

    private String buildSpeechText(String ticketCode, String queueCode, String language) {
        String lang = (language == null ? properties.getSpeech().getDefaultLanguage() : language)
                .toLowerCase();
        String zh =
                switch (queueCode) {
                    case "A" -> "等候";
                    case "B" -> "交來物品窗口";
                    case "C" -> "開始探訪";
                    default -> queueCode;
                };
        String en =
                switch (queueCode) {
                    case "A" -> "Waiting";
                    case "B" -> "Hand-In Articles Counter";
                    case "C" -> "Start Visit";
                    default -> queueCode;
                };
        if (lang.startsWith("en")) {
            return "Ticket " + ticketCode + ", " + en;
        }
        if (lang.equals("zh-cn") || lang.contains("hans")) {
            return "号码 " + ticketCode + "，" + zh;
        }
        return "籌號 " + ticketCode + "，" + zh;
    }

    private static String languageFromRemarks(String remarks) {
        if (remarks == null || remarks.isBlank()) {
            return null;
        }
        for (String part : remarks.split(";")) {
            if (part.startsWith("lang=")) {
                return part.substring(5);
            }
        }
        return null;
    }

    private String findAudioFile(String language) {
        if (language == null || language.isBlank() || "all".equalsIgnoreCase(language)) {
            return null;
        }
        String dbLanguage = normalizeLanguage(language);
        List<String> rows =
                jdbc.query(
                        """
                        SELECT AUDIO_FILE
                        FROM T_VOICE_ANNOUNCEMENT
                        WHERE INS_CODE = ?
                          AND VOICE_TYPE = 'CALL'
                          AND LANGUAGE = ?
                          AND AUDIO_FILE IS NOT NULL
                        ORDER BY CREATED_TIME DESC
                        FETCH FIRST 1 ROW ONLY
                        """,
                        (rs, rowNum) -> "/assets/audio/" + rs.getString(1),
                        properties.getInsCode(),
                        dbLanguage);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private static String normalizeLanguage(String language) {
        String lang = language == null ? "en" : language.toLowerCase();
        if (lang.startsWith("en")) {
            return "EN";
        }
        if (lang.equals("zh-cn") || lang.contains("hans")) {
            return "SC";
        }
        if (lang.startsWith("zh") || lang.startsWith("yue")) {
            return "TC";
        }
        return "EN";
    }

    private static String readClob(ResultSet rs, int index) throws SQLException {
        Clob clob = rs.getClob(index);
        if (clob == null) {
            return "";
        }
        String value = clob.getSubString(1, (int) clob.length());
        clob.free();
        return value == null ? "" : value;
    }
}

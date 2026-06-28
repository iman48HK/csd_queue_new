package com.queueflow.repository;

import com.queueflow.config.QueueFlowProperties;
import com.queueflow.exception.NotFoundException;
import com.queueflow.model.AnnouncementDto;
import com.queueflow.model.FooterMessageDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import com.queueflow.util.TimeSupport;

import java.sql.Clob;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class AnnouncementRepository {

    private final JdbcTemplate jdbc;
    private final QueueFlowProperties properties;

    public AnnouncementRepository(JdbcTemplate jdbc, QueueFlowProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    public Optional<AnnouncementDto> findActivePopup() {
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
                        this::mapPopup,
                        properties.getInsCode());
        return rows.stream().findFirst();
    }

    public Optional<AnnouncementDto> findLatestPopup() {
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
                        ORDER BY CREATED_TIME DESC
                        FETCH FIRST 1 ROW ONLY
                        """,
                        this::mapPopup,
                        properties.getInsCode());
        return rows.stream().findFirst();
    }

    public Optional<FooterMessageDto> findLatestFooter() {
        List<FooterMessageDto> rows =
                jdbc.query(
                        """
                        SELECT ANNOUNCEMENT_ID, MESSAGE_EN, MESSAGE_TC, STATUS
                        FROM T_ANNOUNCEMENT
                        WHERE INS_CODE = ?
                          AND ANNOUNCEMENT_TYPE = 'FOOTER'
                        ORDER BY CREATED_TIME DESC
                        FETCH FIRST 1 ROW ONLY
                        """,
                        this::mapFooter,
                        properties.getInsCode());
        return rows.stream().findFirst();
    }

    public AnnouncementDto findPopupById(long announcementId) {
        List<AnnouncementDto> rows =
                jdbc.query(
                        """
                        SELECT ANNOUNCEMENT_ID, MESSAGE_EN, MESSAGE_TC, STATUS,
                               """
                                + TimeSupport.toCharHongKong("CREATED_TIME")
                                + """
                                 AS CREATED_TIME
                        FROM T_ANNOUNCEMENT
                        WHERE ANNOUNCEMENT_ID = ?
                          AND ANNOUNCEMENT_TYPE = 'POPUP'
                        """,
                        this::mapPopup,
                        announcementId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public AnnouncementDto createPopup(String bodyEn, String bodyZh, boolean active) {
        if (active) {
            deactivatePopups();
        }
        long id = insertAnnouncement("POPUP", bodyEn, bodyZh, active);
        return requirePopup(id);
    }

    public AnnouncementDto updatePopup(
            long announcementId, String bodyEn, String bodyZh, Boolean active) {
        AnnouncementDto existing = findPopupById(announcementId);
        if (existing == null) {
            throw new NotFoundException("Announcement not found");
        }
        if (Boolean.TRUE.equals(active)) {
            deactivatePopups();
        }

        String nextEn = bodyEn != null ? bodyEn : existing.bodyEn();
        String nextZh = bodyZh != null ? bodyZh : existing.bodyZh();
        String status;
        if (active == null) {
            status = existing.active() ? "ACTIVE" : "INACTIVE";
        } else {
            status = active ? "ACTIVE" : "INACTIVE";
        }

        jdbc.update(
                """
                UPDATE T_ANNOUNCEMENT
                SET MESSAGE_EN = ?,
                    MESSAGE_TC = ?,
                    MESSAGE_SC = ?,
                    STATUS = ?
                WHERE ANNOUNCEMENT_ID = ?
                """,
                nextEn,
                nextZh,
                nextZh,
                status,
                announcementId);
        return requirePopup(announcementId);
    }

    public int clearPopup() {
        return jdbc.update(
                """
                UPDATE T_ANNOUNCEMENT
                SET STATUS = 'INACTIVE'
                WHERE INS_CODE = ?
                  AND ANNOUNCEMENT_TYPE = 'POPUP'
                  AND STATUS = 'ACTIVE'
                """,
                properties.getInsCode());
    }

    public FooterMessageDto upsertFooter(String messageEn, String messageTc, boolean active) {
        List<Long> existing =
                jdbc.query(
                        """
                        SELECT ANNOUNCEMENT_ID
                        FROM T_ANNOUNCEMENT
                        WHERE INS_CODE = ?
                          AND ANNOUNCEMENT_TYPE = 'FOOTER'
                        ORDER BY CREATED_TIME DESC
                        FETCH FIRST 1 ROW ONLY
                        """,
                        (rs, rowNum) -> rs.getLong(1),
                        properties.getInsCode());

        long id;
        if (existing.isEmpty()) {
            id = insertAnnouncement("FOOTER", messageEn, messageTc, active);
        } else {
            id = existing.get(0);
            jdbc.update(
                    """
                    UPDATE T_ANNOUNCEMENT
                    SET MESSAGE_EN = ?,
                        MESSAGE_TC = ?,
                        MESSAGE_SC = ?,
                        STATUS = ?
                    WHERE ANNOUNCEMENT_ID = ?
                    """,
                    messageEn,
                    messageTc,
                    messageTc,
                    active ? "ACTIVE" : "INACTIVE",
                    id);
        }
        return new FooterMessageDto(id, messageEn, messageTc, active);
    }

    public int clearFooter() {
        return jdbc.update(
                """
                UPDATE T_ANNOUNCEMENT
                SET STATUS = 'INACTIVE'
                WHERE INS_CODE = ?
                  AND ANNOUNCEMENT_TYPE = 'FOOTER'
                  AND STATUS = 'ACTIVE'
                """,
                properties.getInsCode());
    }

    private AnnouncementDto requirePopup(long announcementId) {
        AnnouncementDto popup = findPopupById(announcementId);
        if (popup == null) {
            throw new NotFoundException("Announcement not found");
        }
        return popup;
    }

    private void deactivatePopups() {
        jdbc.update(
                """
                UPDATE T_ANNOUNCEMENT
                SET STATUS = 'INACTIVE'
                WHERE INS_CODE = ? AND ANNOUNCEMENT_TYPE = 'POPUP'
                """,
                properties.getInsCode());
    }

    private long insertAnnouncement(String type, String messageEn, String messageTc, boolean active) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(
                connection -> {
                    PreparedStatement ps =
                            connection.prepareStatement(
                                    """
                                    INSERT INTO T_ANNOUNCEMENT (
                                        INS_CODE, ANNOUNCEMENT_TYPE, MESSAGE_EN, MESSAGE_TC, MESSAGE_SC,
                                        STATUS, CREATED_TIME
                                    ) VALUES (?, ?, ?, ?, ?, ?, SYSDATE)
                                    """,
                                    new String[] {"ANNOUNCEMENT_ID"});
                    ps.setString(1, properties.getInsCode());
                    ps.setString(2, type);
                    ps.setString(3, messageEn);
                    ps.setString(4, messageTc);
                    ps.setString(5, messageTc);
                    ps.setString(6, active ? "ACTIVE" : "INACTIVE");
                    return ps;
                },
                keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Failed to create announcement");
        }
        return key.longValue();
    }

    private FooterMessageDto mapFooter(ResultSet rs, int rowNum) throws SQLException {
        return new FooterMessageDto(
                rs.getLong(1),
                readClob(rs, 2),
                readClob(rs, 3),
                "ACTIVE".equals(rs.getString(4)));
    }

    private AnnouncementDto mapPopup(ResultSet rs, int rowNum) throws SQLException {
        return new AnnouncementDto(
                rs.getLong(1),
                "",
                "",
                readClob(rs, 2),
                readClob(rs, 3),
                "ACTIVE".equals(rs.getString(4)),
                TimeSupport.fromOracleDateTimeColumn(rs, 5));
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

package com.queueflow.util;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class TimeSupport {

    public static final ZoneId HONG_KONG = ZoneId.of("Asia/Hong_Kong");
    public static final String HONG_KONG_ZONE_ID = "Asia/Hong_Kong";
    public static final String ORACLE_HK_DATETIME_FORMAT = "YYYY-MM-DD\"T\"HH24:MI:SS";
    private static final DateTimeFormatter HK_LOCAL_PARSER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private TimeSupport() {}

    public static String toCharHongKong(String columnExpression) {
        return "TO_CHAR(FROM_TZ(CAST("
                + columnExpression
                + " AS TIMESTAMP), 'UTC') AT TIME ZONE '"
                + HONG_KONG_ZONE_ID
                + "', '"
                + ORACLE_HK_DATETIME_FORMAT
                + "')";
    }

    public static Instant fromOracleDateTimeColumn(ResultSet resultSet, int columnIndex)
            throws SQLException {
        return parseHongKongLocalDateTime(resultSet.getString(columnIndex));
    }

    /** @deprecated use {@link #fromOracleDateTimeColumn} with TO_CHAR columns */
    @Deprecated
    public static Instant fromOracleTimestamp(ResultSet resultSet, int columnIndex)
            throws SQLException {
        return fromOracleDateTimeColumn(resultSet, columnIndex);
    }

    public static Instant parseHongKongLocalDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().replace(' ', 'T');
        try {
            LocalDateTime local = LocalDateTime.parse(normalized, HK_LOCAL_PARSER);
            return local.atZone(HONG_KONG).toInstant();
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    public static String formatHongKongTime(Instant instant) {
        if (instant == null) {
            return null;
        }
        return HK_LOCAL_PARSER.format(instant.atZone(HONG_KONG));
    }
}

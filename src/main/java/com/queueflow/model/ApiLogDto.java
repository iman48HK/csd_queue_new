package com.queueflow.model;

import java.time.Instant;

public record ApiLogDto(
        long id,
        String apiName,
        Instant requestTime,
        String resultCode,
        String requestJson,
        String responseJson) {}

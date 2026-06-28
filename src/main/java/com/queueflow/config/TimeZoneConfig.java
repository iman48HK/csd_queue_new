package com.queueflow.config;

import com.queueflow.util.TimeSupport;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

@Configuration
public class TimeZoneConfig {

    @PostConstruct
    void configureDefaultTimeZone() {
        TimeZone.setDefault(TimeZone.getTimeZone(TimeSupport.HONG_KONG_ZONE_ID));
    }
}

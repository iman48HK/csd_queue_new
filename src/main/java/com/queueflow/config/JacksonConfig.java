package com.queueflow.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.queueflow.util.TimeSupport;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.TimeZone;

@Configuration
public class JacksonConfig {

    @Bean
    Jackson2ObjectMapperBuilderCustomizer jacksonTimeZoneCustomizer() {
        return builder -> {
            builder.timeZone(TimeZone.getTimeZone(TimeSupport.HONG_KONG_ZONE_ID));
            builder.featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        };
    }
}

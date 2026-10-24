package com.example.hr_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * A single business clock so "today", check-in times and leave dates are
 * consistent no matter which time zone the server runs in (most cloud
 * hosts run in UTC). Tests can replace this bean with a fixed clock.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock(AppProperties properties) {
        return Clock.system(ZoneId.of(properties.timezone()));
    }
}

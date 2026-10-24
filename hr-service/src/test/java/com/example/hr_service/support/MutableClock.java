package com.example.hr_service.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** A clock tests can set and move forward, so date-based rules are deterministic. */
public class MutableClock extends Clock {

    private final ZoneId zone;
    private volatile Instant instant;

    public MutableClock(LocalDateTime start, ZoneId zone) {
        this.zone = zone;
        this.instant = start.atZone(zone).toInstant();
    }

    public void set(LocalDateTime dateTime) {
        this.instant = dateTime.atZone(zone).toInstant();
    }

    public void advance(Duration duration) {
        this.instant = instant.plus(duration);
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId newZone) {
        return Clock.fixed(instant, newZone);
    }

    @Override
    public Instant instant() {
        return instant;
    }
}

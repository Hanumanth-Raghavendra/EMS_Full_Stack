package com.example.hr_service.service;

import com.example.hr_service.config.AppProperties;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Counts chargeable leave days, skipping weekends when configured. */
@Component
public class LeaveCalendar {

    private final boolean excludeWeekends;

    public LeaveCalendar(AppProperties properties) {
        this.excludeWeekends = properties.leave().excludeWeekends();
    }

    public LeaveCalendar(boolean excludeWeekends) {
        this.excludeWeekends = excludeWeekends;
    }

    public boolean isWorkingDay(LocalDate date) {
        if (!excludeWeekends) {
            return true;
        }
        DayOfWeek day = date.getDayOfWeek();
        return day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY;
    }

    /** Working days in [start, end], inclusive. */
    public int countDays(LocalDate start, LocalDate end) {
        if (start == null || end == null || end.isBefore(start)) {
            return 0;
        }
        int days = 0;
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            if (isWorkingDay(date)) {
                days++;
            }
        }
        return days;
    }

    /** Working days of [start, end] that fall inside [windowStart, windowEnd]. */
    public int countDaysWithin(LocalDate start, LocalDate end, LocalDate windowStart, LocalDate windowEnd) {
        LocalDate from = start.isBefore(windowStart) ? windowStart : start;
        LocalDate to = end.isAfter(windowEnd) ? windowEnd : end;
        return countDays(from, to);
    }

    public List<LocalDate> workingDays(LocalDate start, LocalDate end) {
        List<LocalDate> dates = new ArrayList<>();
        for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
            if (isWorkingDay(date)) {
                dates.add(date);
            }
        }
        return dates;
    }
}

package com.example.hr_service.dto;

import com.example.hr_service.entity.LeaveType;

import java.util.List;

public record LeaveBalanceResponse(
        Long employeeId,
        int year,
        List<Item> balances) {

    /**
     * @param quota     annual entitlement, null when unlimited (UNPAID)
     * @param remaining quota - used - pending, null when unlimited
     */
    public record Item(LeaveType leaveType, Integer quota, int used, int pending, Integer remaining) {
    }
}

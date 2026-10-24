package com.example.hr_service.service;

import com.example.hr_service.dto.SetupStatusResponse;

import java.util.List;

/** Usernames created by the demo seeder (shown on the sign-in page in demo mode). */
public final class DemoAccounts {

    public static final String ADMIN = "admin";
    public static final String HR = "hr";
    public static final String EMPLOYEE = "employee";

    private DemoAccounts() {
    }

    public static List<SetupStatusResponse.DemoAccount> list(String password) {
        return List.of(
                new SetupStatusResponse.DemoAccount(ADMIN, password, "ADMIN"),
                new SetupStatusResponse.DemoAccount(HR, password, "HR"),
                new SetupStatusResponse.DemoAccount(EMPLOYEE, password, "EMPLOYEE"));
    }
}

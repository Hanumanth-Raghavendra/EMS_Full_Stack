package com.example.hr_service.dto;

import java.util.List;

public record SetupStatusResponse(
        boolean setupRequired,
        boolean setupTokenRequired,
        boolean demoMode,
        List<DemoAccount> demoAccounts) {

    /** Shown on the sign-in page only when the server runs in demo mode. */
    public record DemoAccount(String username, String password, String role) {
    }
}

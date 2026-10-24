package com.example.hr_service.controller;

import com.example.hr_service.dto.LeaveApplyRequest;
import com.example.hr_service.dto.LeaveBalanceResponse;
import com.example.hr_service.dto.LeaveResponse;
import com.example.hr_service.dto.LeaveReviewRequest;
import com.example.hr_service.dto.PageResponse;
import com.example.hr_service.entity.LeaveStatus;
import com.example.hr_service.entity.LeaveType;
import com.example.hr_service.service.LeaveService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/leave-requests")
@PreAuthorize(Access.AUTHENTICATED)
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    /**
     * Employees always receive their own requests. Managers receive everyone's
     * unless {@code mine=true}.
     */
    @GetMapping
    public PageResponse<LeaveResponse> search(
            @RequestParam(required = false) Long employeeId,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(required = false) LeaveStatus status,
            @RequestParam(required = false) LeaveType leaveType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {
        return leaveService.search(employeeId, mine, status, leaveType, from, to, page, size, sort);
    }

    @GetMapping("/balance")
    public LeaveBalanceResponse balance(@RequestParam(required = false) Long employeeId,
                                        @RequestParam(required = false) Integer year) {
        return leaveService.balance(employeeId, year);
    }

    @GetMapping("/{leaveId}")
    public LeaveResponse get(@PathVariable Long leaveId) {
        return leaveService.get(leaveId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveResponse apply(@Valid @RequestBody LeaveApplyRequest request) {
        return leaveService.apply(request);
    }

    @PutMapping("/{leaveId}")
    public LeaveResponse update(@PathVariable Long leaveId, @Valid @RequestBody LeaveApplyRequest request) {
        return leaveService.update(leaveId, request);
    }

    @PostMapping("/{leaveId}/approve")
    @PreAuthorize(Access.MANAGER)
    public LeaveResponse approve(@PathVariable Long leaveId,
                                 @Valid @RequestBody(required = false) LeaveReviewRequest request) {
        return leaveService.approve(leaveId, request);
    }

    @PostMapping("/{leaveId}/reject")
    @PreAuthorize(Access.MANAGER)
    public LeaveResponse reject(@PathVariable Long leaveId,
                                @Valid @RequestBody(required = false) LeaveReviewRequest request) {
        return leaveService.reject(leaveId, request);
    }

    @PostMapping("/{leaveId}/cancel")
    public LeaveResponse cancel(@PathVariable Long leaveId) {
        return leaveService.cancel(leaveId);
    }

    @DeleteMapping("/{leaveId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long leaveId) {
        leaveService.delete(leaveId);
    }
}

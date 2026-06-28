package com.queueflow.web;

import com.queueflow.model.ApiLogDto;
import com.queueflow.model.ClearedCountDto;
import com.queueflow.model.InstitutionDto;
import com.queueflow.model.QueueLogDto;
import com.queueflow.exception.BadRequestException;
import com.queueflow.model.request.ClearTicketsRequest;
import com.queueflow.service.AdminService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/institutions")
    public List<InstitutionDto> institutions() {
        return adminService.listInstitutions();
    }

    @GetMapping("/api-logs")
    public List<ApiLogDto> apiLogs() {
        return adminService.listApiLogs();
    }

    @GetMapping("/queue-logs")
    public List<QueueLogDto> queueLogs() {
        return adminService.listQueueLogs();
    }

    @PostMapping("/tickets/clear")
    public ClearedCountDto clearTickets(@RequestBody ClearTicketsRequest request) {
        if (request == null || request.queueType() == null || request.queueType().isBlank()) {
            throw new BadRequestException("queueType is required");
        }
        String queueType =
                switch (request.queueType()) {
                    case "1", "A", "waiting" -> "A";
                    case "2", "B", "hand-in" -> "B";
                    case "3", "C", "security" -> "C";
                    case "4", "ALL", "all" -> "ALL";
                    default -> request.queueType().toUpperCase();
                };
        return adminService.clearTickets(queueType);
    }

    @PostMapping("/tickets/purge")
    public ClearedCountDto purgeTickets() {
        return adminService.purgeTickets();
    }
}

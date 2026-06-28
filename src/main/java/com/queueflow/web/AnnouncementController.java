package com.queueflow.web;

import com.queueflow.model.AnnouncementDto;
import com.queueflow.model.ClearedCountDto;
import com.queueflow.model.request.AnnouncementCreateRequest;
import com.queueflow.model.request.AnnouncementUpdateRequest;
import com.queueflow.service.AnnouncementService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/announcements")
public class AnnouncementController {

    private final AnnouncementService announcementService;

    public AnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @GetMapping("/popup")
    public AnnouncementDto getPopup() {
        return announcementService.getLatestPopup();
    }

    @PostMapping("/popup")
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementDto createPopup(@RequestBody AnnouncementCreateRequest request) {
        return announcementService.createPopup(request);
    }

    @PutMapping("/popup/{announcementId}")
    public AnnouncementDto updatePopup(
            @PathVariable long announcementId, @RequestBody AnnouncementUpdateRequest request) {
        return announcementService.updatePopup(announcementId, request);
    }

    @DeleteMapping("/popup")
    public ClearedCountDto clearPopup() {
        return announcementService.clearPopup();
    }

    @DeleteMapping("/popup/active")
    public ClearedCountDto clearPopupAlias() {
        return announcementService.clearPopup();
    }
}

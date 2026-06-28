package com.queueflow.web;

import com.queueflow.model.ClearedCountDto;
import com.queueflow.model.FooterMessageDto;
import com.queueflow.model.request.FooterMessageRequest;
import com.queueflow.service.AnnouncementService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/announcements/footer")
public class FooterController {

    private final AnnouncementService announcementService;

    public FooterController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @GetMapping
    public FooterMessageDto getFooter() {
        return announcementService.getFooterForEdit();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FooterMessageDto createFooter(@RequestBody FooterMessageRequest request) {
        return announcementService.upsertFooter(request);
    }

    @PutMapping
    public FooterMessageDto updateFooter(@RequestBody FooterMessageRequest request) {
        return announcementService.upsertFooter(request);
    }

    @DeleteMapping
    public ClearedCountDto deleteFooter() {
        return announcementService.clearFooter();
    }
}

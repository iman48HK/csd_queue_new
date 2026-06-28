package com.queueflow.web;

import com.queueflow.model.AcknowledgedDto;
import com.queueflow.model.SpeechPreviewDto;
import com.queueflow.model.request.SpeechRequest;
import com.queueflow.service.SpeechService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/speech")
public class SpeechController {

    private final SpeechService speechService;

    public SpeechController(SpeechService speechService) {
        this.speechService = speechService;
    }

    @PostMapping
    public SpeechPreviewDto createSpeech(@RequestBody SpeechRequest request) {
        return speechService.preview(request);
    }

    @GetMapping("/text")
    public SpeechPreviewDto previewSpeech(
            @RequestParam String ticketCode,
            @RequestParam String queueCode,
            @RequestParam(required = false) String language) {
        return speechService.previewText(ticketCode, queueCode, language);
    }

    @PostMapping("/{logId}/ack")
    public AcknowledgedDto acknowledgeSpeech(@PathVariable long logId) {
        return speechService.acknowledge(logId);
    }
}

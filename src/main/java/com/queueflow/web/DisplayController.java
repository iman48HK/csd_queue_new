package com.queueflow.web;

import com.queueflow.model.DisplayStateDto;
import com.queueflow.model.FrontendConfigDto;
import com.queueflow.service.DisplayService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class DisplayController {

    private final DisplayService displayService;
    private final int serverPort;

    public DisplayController(
            DisplayService displayService, @Value("${server.port:8080}") int serverPort) {
        this.displayService = displayService;
        this.serverPort = serverPort;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "service", "queueflow", "port", serverPort);
    }

    @GetMapping("/display")
    public DisplayStateDto display() {
        return displayService.getDisplayState();
    }

    @GetMapping("/config")
    public FrontendConfigDto config() {
        return displayService.getFrontendConfig();
    }

    @PostMapping("/speech/{eventId}/ack")
    public ResponseEntity<Void> acknowledgeSpeech(@PathVariable long eventId) {
        displayService.acknowledgeSpeech(eventId);
        return ResponseEntity.noContent().build();
    }
}

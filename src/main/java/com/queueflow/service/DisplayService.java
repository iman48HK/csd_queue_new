package com.queueflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.queueflow.config.QueueFlowProperties;
import com.queueflow.model.AnnouncementDto;
import com.queueflow.model.DisplayStateDto;
import com.queueflow.model.FrontendConfigDto;
import com.queueflow.model.SpeechEventDto;
import com.queueflow.repository.QueueRepository;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class DisplayService {

    private final QueueRepository repository;
    private final QueueFlowProperties properties;
    private final ObjectMapper objectMapper;

    public DisplayService(
            QueueRepository repository,
            QueueFlowProperties properties,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public DisplayStateDto getDisplayState() {
        Map<String, List<String>> queues = new LinkedHashMap<>();
        queues.put(
                "handin",
                repository.findInProgressTicketCodes(
                        properties.getDisplay().getHandinQueueType()));
        queues.put(
                "security",
                repository.findInProgressTicketCodes(
                        properties.getDisplay().getSecurityQueueType()));
        queues.put(
                "waiting",
                repository.findInProgressTicketCodes(
                        properties.getDisplay().getWaitingQueueType()));

        AnnouncementDto announcement = repository.findActiveAnnouncement().orElse(null);
        String footer = repository.findFooterText();
        List<SpeechEventDto> speech = new ArrayList<>(repository.findUnplayedSpeechEvents(10));
        speech.addAll(repository.findUnplayedPublicSpeechEvents(10));

        return new DisplayStateDto(
                repository.countInProgressTickets(),
                queues,
                repository.findHighlightedTickets(),
                announcement,
                footer,
                speech);
    }

    public FrontendConfigDto getFrontendConfig() {
        long pollInterval = properties.getDisplay().getPollIntervalMs();
        long highlightDuration = properties.getTicket().getHighlightDurationMs();
        String defaultLanguage = properties.getSpeech().getDefaultLanguage();
        String apiBaseUrl = "";
        boolean speechEnabled = true;

        Path configPath = Path.of(properties.getFrontendConfigPath());
        if (Files.isRegularFile(configPath)) {
            try {
                var node = objectMapper.readTree(configPath.toFile());
                if (node.has("apiBaseUrl")) {
                    apiBaseUrl = node.get("apiBaseUrl").asText("");
                }
                if (node.has("speechEnabled")) {
                    speechEnabled = node.get("speechEnabled").asBoolean(true);
                }
                if (node.has("pollIntervalMs")) {
                    pollInterval = node.get("pollIntervalMs").asLong(pollInterval);
                }
                if (node.has("highlightDurationMs")) {
                    highlightDuration = node.get("highlightDurationMs").asLong(highlightDuration);
                }
                if (node.has("defaultLanguage")) {
                    defaultLanguage = node.get("defaultLanguage").asText(defaultLanguage);
                }
            } catch (Exception ignored) {
                // Use property defaults.
            }
        }

        return new FrontendConfigDto(
                apiBaseUrl,
                pollInterval,
                highlightDuration,
                defaultLanguage,
                speechEnabled);
    }

    public void acknowledgeSpeech(long eventId) {
        repository.acknowledgeSpeechEvent(eventId);
    }
}

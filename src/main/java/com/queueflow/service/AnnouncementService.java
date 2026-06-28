package com.queueflow.service;

import com.queueflow.config.QueueFlowProperties;
import com.queueflow.model.AnnouncementDto;
import com.queueflow.model.ClearedCountDto;
import com.queueflow.model.FooterMessageDto;
import com.queueflow.model.FooterTextDto;
import com.queueflow.model.request.AnnouncementCreateRequest;
import com.queueflow.model.request.AnnouncementUpdateRequest;
import com.queueflow.model.request.FooterMessageRequest;
import com.queueflow.repository.AnnouncementRepository;
import com.queueflow.repository.QueueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnnouncementService {

    private final AnnouncementRepository repository;
    private final QueueRepository queueRepository;
    private final QueueFlowProperties properties;

    public AnnouncementService(
            AnnouncementRepository repository,
            QueueRepository queueRepository,
            QueueFlowProperties properties) {
        this.repository = repository;
        this.queueRepository = queueRepository;
        this.properties = properties;
    }

    public AnnouncementDto getActivePopup() {
        return repository.findActivePopup().orElse(null);
    }

    public AnnouncementDto getLatestPopup() {
        return repository.findLatestPopup().orElse(null);
    }

    public FooterMessageDto getFooterForEdit() {
        return repository.findLatestFooter().orElse(null);
    }

    @Transactional
    public AnnouncementDto createPopup(AnnouncementCreateRequest request) {
        AnnouncementDto popup =
                repository.createPopup(
                        firstNonBlank(request.bodyEn(), request.titleEn()),
                        firstNonBlank(request.bodyZh(), request.titleZh()),
                        request.activeOrDefault());
        if (request.speakOrDefault()) {
            String message =
                    firstNonBlank(
                            request.bodyEn(),
                            request.titleEn(),
                            request.bodyZh(),
                            request.titleZh());
            String language = request.language();
            if (language == null || language.isBlank()) {
                language = properties.getSpeech().getDefaultLanguage();
            }
            queueRepository.insertPublicVoiceAnnouncement(message, language);
        }
        return popup;
    }

    @Transactional
    public AnnouncementDto updatePopup(long announcementId, AnnouncementUpdateRequest request) {
        return repository.updatePopup(
                announcementId,
                coalesce(request.bodyEn(), request.titleEn()),
                coalesce(request.bodyZh(), request.titleZh()),
                request.active());
    }

    @Transactional
    public ClearedCountDto clearPopup() {
        return new ClearedCountDto(repository.clearPopup());
    }

    public FooterTextDto getFooterText() {
        return new FooterTextDto(queueRepository.findFooterText());
    }

    @Transactional
    public FooterMessageDto upsertFooter(FooterMessageRequest request) {
        String[] parts = request.messageText().split(" · ", 2);
        String messageEn = parts[0];
        String messageTc = parts.length > 1 ? parts[1] : parts[0];
        return repository.upsertFooter(messageEn, messageTc, request.activeOrDefault());
    }

    @Transactional
    public ClearedCountDto clearFooter() {
        return new ClearedCountDto(repository.clearFooter());
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private static String coalesce(String primary, String fallback) {
        if (primary != null && !primary.isBlank()) {
            return primary;
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        return null;
    }
}

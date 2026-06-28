package com.queueflow.service;

import com.queueflow.config.QueueFlowProperties;
import com.queueflow.model.AcknowledgedDto;
import com.queueflow.model.SpeechPreviewDto;
import com.queueflow.model.request.SpeechRequest;
import com.queueflow.repository.QueueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpeechService {

    private final QueueRepository repository;
    private final QueueFlowProperties properties;

    public SpeechService(QueueRepository repository, QueueFlowProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    public SpeechPreviewDto preview(SpeechRequest request) {
        return buildPreview(request.ticketCode(), request.queueCode(), request.language());
    }

    public SpeechPreviewDto previewText(String ticketCode, String queueCode, String language) {
        return buildPreview(ticketCode, queueCode, language);
    }

    @Transactional
    public AcknowledgedDto acknowledge(long logId) {
        repository.acknowledgeSpeechEvent(logId);
        return new AcknowledgedDto(true);
    }

    private SpeechPreviewDto buildPreview(String ticketCode, String queueCode, String language) {
        String lang =
                language == null || language.isBlank()
                        ? properties.getSpeech().getDefaultLanguage()
                        : language;
        return new SpeechPreviewDto(
                ticketCode.toUpperCase(),
                queueCode.toUpperCase(),
                lang,
                repository.getSpeechText(ticketCode, queueCode, lang),
                repository.getAudioUrl(lang));
    }
}

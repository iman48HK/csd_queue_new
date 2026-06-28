package com.queueflow.service;

import com.queueflow.model.ApiLogDto;
import com.queueflow.model.ClearedCountDto;
import com.queueflow.model.InstitutionDto;
import com.queueflow.model.QueueLogDto;
import com.queueflow.repository.AdminRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminService {

    private final AdminRepository repository;

    public AdminService(AdminRepository repository) {
        this.repository = repository;
    }

    public List<InstitutionDto> listInstitutions() {
        return repository.findInstitutions();
    }

    public List<ApiLogDto> listApiLogs() {
        return repository.findApiLogs(100);
    }

    public List<QueueLogDto> listQueueLogs() {
        return repository.findQueueLogs(100);
    }

    @Transactional
    public ClearedCountDto purgeTickets() {
        return new ClearedCountDto(repository.deleteAllTickets());
    }

    @Transactional
    public ClearedCountDto clearTickets(String queueType) {
        return new ClearedCountDto(repository.cancelTicketsByQueueType(queueType));
    }
}

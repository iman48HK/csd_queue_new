package com.queueflow.service;

import com.queueflow.model.TicketDetailDto;
import com.queueflow.model.request.TicketCreateRequest;
import com.queueflow.model.request.TicketMoveRequest;
import com.queueflow.repository.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TicketService {

    private final TicketRepository repository;

    public TicketService(TicketRepository repository) {
        this.repository = repository;
    }

    public List<TicketDetailDto> listTickets(String status) {
        if (status != null
                && ("ACTIVE".equalsIgnoreCase(status) || "IN_PROGRESS".equalsIgnoreCase(status))) {
            return repository.listInProgressTickets();
        }
        if (status != null && "MANAGE".equalsIgnoreCase(status)) {
            return repository.listManageQueueTickets();
        }
        if (status != null && "SERVED".equalsIgnoreCase(status)) {
            return repository.listServedTodayTickets();
        }
        return repository.listTickets(status);
    }

    @Transactional
    public TicketDetailDto createTicket(TicketCreateRequest request) {
        return repository.createTicket(
                request.code(), request.ticketTypeCode(), request.queueCode(), request.language());
    }

    @Transactional
    public TicketDetailDto moveTicket(long ticketId, TicketMoveRequest request) {
        return repository.moveTicket(ticketId, request.queueCode(), request.language());
    }

    @Transactional
    public TicketDetailDto checkIn(long ticketId) {
        return repository.setStatus(ticketId, "CHECKED_IN");
    }

    @Transactional
    public TicketDetailDto checkOut(long ticketId) {
        return repository.recordCheckOut(ticketId);
    }

    @Transactional
    public TicketDetailDto complete(long ticketId) {
        return repository.completeTicket(ticketId);
    }

    @Transactional
    public TicketDetailDto call(long ticketId) {
        return repository.setStatus(ticketId, "CALLED");
    }

    @Transactional
    public TicketDetailDto cancel(long ticketId) {
        return repository.setStatus(ticketId, "CANCELLED");
    }
}

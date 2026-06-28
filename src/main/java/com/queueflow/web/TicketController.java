package com.queueflow.web;

import com.queueflow.model.TicketDetailDto;
import com.queueflow.model.request.TicketCreateRequest;
import com.queueflow.model.request.TicketMoveRequest;
import com.queueflow.service.TicketService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping
    public List<TicketDetailDto> listTickets(@RequestParam(defaultValue = "IN_PROGRESS") String status) {
        return ticketService.listTickets(status);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDetailDto createTicket(@RequestBody TicketCreateRequest request) {
        return ticketService.createTicket(request);
    }

    @PostMapping("/{ticketId}/move")
    public TicketDetailDto moveTicket(
            @PathVariable long ticketId, @RequestBody TicketMoveRequest request) {
        return ticketService.moveTicket(ticketId, request);
    }

    @PostMapping("/{ticketId}/check-in")
    public TicketDetailDto checkIn(@PathVariable long ticketId) {
        return ticketService.checkIn(ticketId);
    }

    @PostMapping("/{ticketId}/check-out")
    public TicketDetailDto checkOut(@PathVariable long ticketId) {
        return ticketService.checkOut(ticketId);
    }

    @PostMapping("/{ticketId}/complete")
    public TicketDetailDto complete(@PathVariable long ticketId) {
        return ticketService.complete(ticketId);
    }

    @PostMapping("/{ticketId}/call")
    public TicketDetailDto call(@PathVariable long ticketId) {
        return ticketService.call(ticketId);
    }

    @DeleteMapping("/{ticketId}")
    public TicketDetailDto cancel(@PathVariable long ticketId) {
        return ticketService.cancel(ticketId);
    }
}

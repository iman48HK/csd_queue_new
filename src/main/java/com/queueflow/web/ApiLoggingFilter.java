package com.queueflow.web;

import com.queueflow.repository.AdminRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class ApiLoggingFilter extends OncePerRequestFilter {

    private static final int MAX_LOG_CHARS = 4000;
    private static final Set<String> SKIP_PATHS = Set.of("/api/health", "/api/display", "/api/config");

    private final AdminRepository adminRepository;

    public ApiLoggingFilter(AdminRepository adminRepository) {
        this.adminRepository = adminRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String method = request.getMethod();
        if (!"POST".equals(method)
                && !"PUT".equals(method)
                && !"PATCH".equals(method)
                && !"DELETE".equals(method)) {
            return true;
        }
        String path = request.getRequestURI();
        if (!path.startsWith("/api/")) {
            return true;
        }
        if (SKIP_PATHS.contains(path)) {
            return true;
        }
        return path.matches(".*/speech/\\d+/ack");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);
        } finally {
            adminRepository.insertApiLog(
                    buildApiName(wrappedRequest),
                    buildRequestPayload(wrappedRequest),
                    truncate(new String(wrappedResponse.getContentAsByteArray(), StandardCharsets.UTF_8)),
                    String.valueOf(wrappedResponse.getStatus()));
            wrappedResponse.copyBodyToResponse();
        }
    }

    private static String buildApiName(HttpServletRequest request) {
        String query = request.getQueryString();
        if (query == null || query.isBlank()) {
            return request.getMethod() + " " + request.getRequestURI();
        }
        return request.getMethod() + " " + request.getRequestURI() + "?" + query;
    }

    private static String buildRequestPayload(ContentCachingRequestWrapper request) {
        String body = new String(request.getContentAsByteArray(), StandardCharsets.UTF_8).trim();
        if (!body.isBlank()) {
            return truncate(body);
        }
        String query = request.getQueryString();
        return query == null ? "" : truncate(query);
    }

    private static String truncate(String value) {
        if (value == null) {
            return "";
        }
        if (value.length() <= MAX_LOG_CHARS) {
            return value;
        }
        return value.substring(0, MAX_LOG_CHARS);
    }
}

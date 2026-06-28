package com.queueflow.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminSpaController {

    @GetMapping({"/admin", "/admin/", "/admin/dashboard"})
    public String adminRoot() {
        return "forward:/admin/index.html";
    }
}

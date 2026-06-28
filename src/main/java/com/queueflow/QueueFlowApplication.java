package com.queueflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class QueueFlowApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(QueueFlowApplication.class);
        app.addInitializers(new ExternalConfigInitializer());
        app.run(args);
    }
}

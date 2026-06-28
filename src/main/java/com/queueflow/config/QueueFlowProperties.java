package com.queueflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "queueflow")
public class QueueFlowProperties {

    private Display display = new Display();
    private Ticket ticket = new Ticket();
    private Speech speech = new Speech();
    private Oracle oracle = new Oracle();
    private String insCode = "LWH";
    private String defaultCreateQueueType = "C";
    private String frontendConfigPath = "config/frontend/config.json";

    public Display getDisplay() {
        return display;
    }

    public void setDisplay(Display display) {
        this.display = display;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public void setTicket(Ticket ticket) {
        this.ticket = ticket;
    }

    public Speech getSpeech() {
        return speech;
    }

    public void setSpeech(Speech speech) {
        this.speech = speech;
    }

    public Oracle getOracle() {
        return oracle;
    }

    public void setOracle(Oracle oracle) {
        this.oracle = oracle;
    }

    public String getFrontendConfigPath() {
        return frontendConfigPath;
    }

    public void setFrontendConfigPath(String frontendConfigPath) {
        this.frontendConfigPath = frontendConfigPath;
    }

    public String getInsCode() {
        return insCode;
    }

    public void setInsCode(String insCode) {
        this.insCode = insCode;
    }

    public String getDefaultCreateQueueType() {
        return defaultCreateQueueType;
    }

    public void setDefaultCreateQueueType(String defaultCreateQueueType) {
        this.defaultCreateQueueType = defaultCreateQueueType;
    }

    public static class Display {
        private long pollIntervalMs = 3000;
        private String handinQueueType = "B";
        private String handinStatus = "CALLED";
        private String securityQueueType = "C";
        private String securityStatus = "CALLED";
        private String waitingQueueType = "A";
        private String waitingStatus = "WAITING";

        public long getPollIntervalMs() {
            return pollIntervalMs;
        }

        public void setPollIntervalMs(long pollIntervalMs) {
            this.pollIntervalMs = pollIntervalMs;
        }

        public String getHandinQueueType() {
            return handinQueueType;
        }

        public void setHandinQueueType(String handinQueueType) {
            this.handinQueueType = handinQueueType;
        }

        public String getHandinStatus() {
            return handinStatus;
        }

        public void setHandinStatus(String handinStatus) {
            this.handinStatus = handinStatus;
        }

        public String getSecurityQueueType() {
            return securityQueueType;
        }

        public void setSecurityQueueType(String securityQueueType) {
            this.securityQueueType = securityQueueType;
        }

        public String getSecurityStatus() {
            return securityStatus;
        }

        public void setSecurityStatus(String securityStatus) {
            this.securityStatus = securityStatus;
        }

        public String getWaitingQueueType() {
            return waitingQueueType;
        }

        public void setWaitingQueueType(String waitingQueueType) {
            this.waitingQueueType = waitingQueueType;
        }

        public String getWaitingStatus() {
            return waitingStatus;
        }

        public void setWaitingStatus(String waitingStatus) {
            this.waitingStatus = waitingStatus;
        }
    }

    public static class Ticket {
        private long highlightDurationMs = 30000;

        public long getHighlightDurationMs() {
            return highlightDurationMs;
        }

        public void setHighlightDurationMs(long highlightDurationMs) {
            this.highlightDurationMs = highlightDurationMs;
        }
    }

    public static class Speech {
        private String defaultLanguage = "zh-HK";

        public String getDefaultLanguage() {
            return defaultLanguage;
        }

        public void setDefaultLanguage(String defaultLanguage) {
            this.defaultLanguage = defaultLanguage;
        }
    }

    public static class Oracle {
        private boolean sslVerify = false;

        public boolean isSslVerify() {
            return sslVerify;
        }

        public void setSslVerify(boolean sslVerify) {
            this.sslVerify = sslVerify;
        }
    }
}

package com.queueflow;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Loads {@code config/application.properties} from the working directory so
 * deployment settings can be changed without rebuilding the JAR.
 */
public final class ExternalConfigInitializer
        implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        Path external = Path.of(System.getProperty("user.dir"), "config", "application.properties");
        Map<String, Object> values = new LinkedHashMap<>();

        if (Files.isRegularFile(external)) {
            Properties props = new Properties();
            try (InputStream in = Files.newInputStream(external)) {
                props.load(in);
                for (String name : props.stringPropertyNames()) {
                    values.put(name, props.getProperty(name));
                }
            } catch (IOException ignored) {
                // Fall back to classpath / env defaults.
            }
        }

        if (!values.isEmpty()) {
            context.getEnvironment()
                    .getPropertySources()
                    .addFirst(new MapPropertySource("externalConfig", values));
        }
    }
}

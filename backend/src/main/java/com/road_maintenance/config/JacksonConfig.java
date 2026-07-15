package com.road_maintenance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.google.cloud.Timestamp;
import com.road_maintenance.model.TimestampDeserializer;
import com.road_maintenance.model.TimestampSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.databind.SerializationFeature;

@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();

        // Register your custom Timestamp serializer/deserializer module
        SimpleModule module = new SimpleModule();
        module.addSerializer(Timestamp.class, new TimestampSerializer());
        module.addDeserializer(Timestamp.class, new TimestampDeserializer());
        mapper.registerModule(module);

        // Register JavaTimeModule to support Instant and other Java 8 date/time types
        mapper.registerModule(new JavaTimeModule());

        // Disable WRITE_DATES_AS_TIMESTAMPS to serialize dates as ISO strings instead of timestamps
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return mapper;
    }
}

package com.road_maintenance.model;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.google.cloud.Timestamp;

import java.io.IOException;
import java.time.Instant;
import java.time.format.DateTimeParseException;

public class TimestampDeserializer extends JsonDeserializer<Timestamp> {

    @Override
    public Timestamp deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String isoDate = p.getText();
        try {
            Instant instant = Instant.parse(isoDate);
            return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
        } catch (DateTimeParseException e) {
            throw new IOException("Failed to parse timestamp: " + isoDate, e);
        }
    }
}

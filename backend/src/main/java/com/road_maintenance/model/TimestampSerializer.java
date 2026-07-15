package com.road_maintenance.model;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.google.cloud.Timestamp;

import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class TimestampSerializer extends StdSerializer<Timestamp> {
    private static final DateTimeFormatter formatter = DateTimeFormatter
            .ISO_DATE_TIME
            .withZone(ZoneId.of("UTC"));

    public TimestampSerializer() {
        this(null);
    }

    public TimestampSerializer(Class<Timestamp> t) {
        super(t);
    }

    @Override
    public void serialize(Timestamp value, JsonGenerator gen, SerializerProvider provider) throws IOException {
        Instant instant = Instant.ofEpochSecond(value.getSeconds(), value.getNanos());
        String isoString = formatter.format(instant);
        gen.writeString(isoString);
    }
}
package com.road_maintenance.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("*") // allow any origin
                .allowedMethods("*") // allow all HTTP methods
                .allowedHeaders("*") // allow all headers
                .allowCredentials(false) // must be false when using "*" for origins
                .maxAge(3600);
    }
}

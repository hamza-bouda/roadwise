//package com.road_maintenance.config;
//
//import org.springframework.context.annotation.Bean;
//import org.springframework.context.annotation.Configuration;
//import org.springframework.security.config.annotation.web.builders.HttpSecurity;
//import org.springframework.security.web.SecurityFilterChain;
//import org.springframework.web.cors.CorsConfiguration;
//import org.springframework.web.cors.CorsConfigurationSource;
//import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
//
//import java.util.List;
//
//@Configuration
//public class SecurityConfig {
//
//    @Bean
//    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
//        http
//                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // Use CORS configuration source
//                .csrf(csrf -> csrf.disable()) // Disable CSRF for simplicity
//                .authorizeHttpRequests(auth -> auth
//                        .requestMatchers("/api/**").permitAll() // Allow all API endpoints
//                        .requestMatchers("OPTIONS", "/**").permitAll() // Allow OPTIONS requests
//                        .anyRequest().authenticated()
//                );
//        return http.build();
//    }
//
//    @Bean
//    public CorsConfigurationSource corsConfigurationSource() {
//        CorsConfiguration configuration = new CorsConfiguration();
//        configuration.setAllowedOrigins(List.of("http://localhost:3000")); // Allow your frontend origin
//        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS")); // Allow necessary methods
//        configuration.setAllowedHeaders(List.of("*")); // Allow all headers
//        configuration.setAllowCredentials(true); // Allow credentials (e.g., Authorization header)
//
//        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
//        source.registerCorsConfiguration("/api/**", configuration); // Apply to all /api endpoints
//        return source;
//    }
//}
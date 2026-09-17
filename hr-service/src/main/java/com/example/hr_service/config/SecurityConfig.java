package com.example.hr_service.config;

import com.example.hr_service.security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        public SecurityConfig(
                        JwtAuthenticationFilter jwtAuthenticationFilter) {

                this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http) throws Exception {

                http
                                .csrf(csrf -> csrf.disable())

                                .cors(cors -> cors.configurationSource(
                                                corsConfigurationSource()))

                                .sessionManagement(session -> session.sessionCreationPolicy(
                                                SessionCreationPolicy.STATELESS))

                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/error").permitAll()

                                                // Authentication
                                                .requestMatchers("/api/auth/**")
                                                .permitAll()

                                                // Initial setup
                                                .requestMatchers("/api/setup/**")
                                                .permitAll()

                                                // User management remains restricted to ADMIN/HR.
                                                .requestMatchers("/api/users/**")
                                                .hasAnyRole("ADMIN", "HR")

                                                // Audit logs remain ADMIN-only.
                                                .requestMatchers("/api/audit-logs/**")
                                                .hasRole("ADMIN")

                                                // Master data remains ADMIN/HR-only.
                                                .requestMatchers(
                                                                "/api/departments/**",
                                                                "/api/designations/**",
                                                                "/api/roles/**")
                                                .hasAnyAuthority("ROLE_ADMIN", "ROLE_HR")

                                                // Employee master-data creation/deletion remains ADMIN/HR-only.
                                                .requestMatchers(HttpMethod.POST, "/api/employees/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.DELETE, "/api/employees/**")
                                                .hasAnyRole("ADMIN", "HR")

                                                // Attendance records are maintained by ADMIN/HR. Employees can only read
                                                // their own records (enforced in AttendanceServiceImpl).
                                                .requestMatchers(HttpMethod.POST, "/api/attendance/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.PUT, "/api/attendance/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.DELETE, "/api/attendance/**")
                                                .hasAnyRole("ADMIN", "HR")

                                                // Projects and employee/project assignments are ADMIN/HR managed.
                                                .requestMatchers(HttpMethod.POST, "/api/projects/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.PUT, "/api/projects/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.DELETE, "/api/projects/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.POST, "/api/employee-projects/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.PUT, "/api/employee-projects/**")
                                                .hasAnyRole("ADMIN", "HR")
                                                .requestMatchers(HttpMethod.DELETE, "/api/employee-projects/**")
                                                .hasAnyRole("ADMIN", "HR")

                                                // All remaining endpoints require authentication. Ownership/field-level
                                                // rules for EMPLOYEE are enforced in the service layer.
                                                .anyRequest()
                                                .authenticated())

                                .addFilterBefore(
                                                jwtAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {

                return new BCryptPasswordEncoder();
        }

        @Bean
        public AuthenticationManager authenticationManager(
                        AuthenticationConfiguration configuration)
                        throws Exception {

                return configuration.getAuthenticationManager();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration configuration = new CorsConfiguration();

                configuration.setAllowedOrigins(
                                List.of("http://localhost:5173"));

                configuration.setAllowedMethods(
                                List.of(
                                                "GET",
                                                "POST",
                                                "PUT",
                                                "DELETE",
                                                "OPTIONS"));

                configuration.setAllowedHeaders(
                                List.of("*"));

                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration(
                                "/**",
                                configuration);

                return source;
        }
}
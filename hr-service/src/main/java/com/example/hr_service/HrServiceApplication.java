package com.example.hr_service;

import com.example.hr_service.config.DatabaseUrlResolver;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class HrServiceApplication {

    public static void main(String[] args) {
        DatabaseUrlResolver.applyFromEnvironment(System.getenv());
        SpringApplication.run(HrServiceApplication.class, args);
    }
}

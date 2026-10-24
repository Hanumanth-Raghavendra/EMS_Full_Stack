package com.example.hr_service.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Interactive API documentation at /swagger-ui.html.
 * Click "Authorize" and paste a token from POST /api/auth/login.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI emsOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Employee Management System API")
                        .version("1.0.0")
                        .description("REST API for employees, attendance, leave, projects and administration. "
                                + "Authenticate with POST /api/auth/login and use the returned bearer token."))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }
}

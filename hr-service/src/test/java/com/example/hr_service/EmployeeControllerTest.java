package com.example.hr_service;

import com.example.hr_service.controller.EmployeeController;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.mapper.EmployeeMapper;
import com.example.hr_service.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.example.hr_service.security.JwtService;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private EmployeeService employeeService;

    @MockitoBean
    private EmployeeMapper employeeMapper;

    @Test
    void shouldGetEmployees() throws Exception {
        Employee employee = new Employee();
        employee.setEmployeeId(1L);
        employee.setFirstName("John");
        employee.setLastName("Doe");

        when(employeeService.searchEmployees(null))
                .thenReturn(List.of(employee));

        when(employeeMapper.toResponseDTO(employee))
                .thenReturn(null);

        mockMvc.perform(get("/api/employees"))
                .andExpect(status().isOk());

        verify(employeeService).searchEmployees(null);
    }

    @Test
    void shouldGetEmployeesWithSearchParameter() throws Exception {
        when(employeeService.searchEmployees("john"))
                .thenReturn(List.of());

        mockMvc.perform(
                get("/api/employees")
                        .param("search", "john"))
                .andExpect(status().isOk());

        verify(employeeService).searchEmployees("john");
    }

    @Test
    void shouldGetEmployeeById() throws Exception {
        Employee employee = new Employee();
        employee.setEmployeeId(1L);

        when(employeeService.getEmployeeById(1L))
                .thenReturn(employee);

        when(employeeMapper.toResponseDTO(employee))
                .thenReturn(null);

        mockMvc.perform(get("/api/employees/1"))
                .andExpect(status().isOk());

        verify(employeeService).getEmployeeById(1L);
    }

    @Test
    void shouldDeleteEmployee() throws Exception {
        doNothing()
                .when(employeeService)
                .deleteEmployee(1L);

        mockMvc.perform(delete("/api/employees/1"))
                .andExpect(status().isNoContent());

        verify(employeeService).deleteEmployee(1L);
    }

    @Test
    void shouldRejectInvalidEmployeeRequest() throws Exception {
        String invalidJson = """
                {
                  "firstName": "",
                  "lastName": "",
                  "email": "invalid-email"
                }
                """;

        mockMvc.perform(
                post("/api/employees")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());

        verify(employeeService, never())
                .createEmployee(any(Employee.class));
    }
}
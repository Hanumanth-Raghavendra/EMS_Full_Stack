package com.example.hr_service.service;

import com.example.hr_service.entity.Employee;

import java.util.List;

public interface EmployeeService {

    List<Employee> getAllEmployees();

    List<Employee> searchEmployees(String search);

    Employee getEmployeeById(Long employeeId);

    Employee createEmployee(Employee employee);

    Employee updateEmployee(Long employeeId, Employee employee);

    void deleteEmployee(Long employeeId);
}
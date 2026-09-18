# Employee Management System (EMS)

A full-stack Employee Management System built with **React** and **Spring Boot**, providing employee, user, project, attendance, leave, department, designation, role, and audit management through a secure web application.

## Overview

EMS is designed to manage core employee and HR-related operations through a centralized application.

The project consists of:

- **Frontend:** React + Vite
- **Backend:** Spring Boot REST API
- **Database:** PostgreSQL
- **Authentication:** JWT-based authentication
- **Authorization:** Role-based access control (RBAC)

## Features

### Authentication & Authorization
- Secure login using JWT authentication
- Role-based access control
- Protected frontend routes
- Backend authorization for protected API operations
- Automatic logout when authentication expires

### Employee Management
- Create, view, update, and delete employees
- Employee validation
- Department and designation assignment
- Employee ownership and authorization checks

### User Management
- Create and manage application users
- Assign users to employees
- Role assignment
- Enable/disable user accounts

### Department & Designation Management
- Full CRUD operations for departments
- Full CRUD operations for designations
- Validation for required fields

### Project Management
- Create, view, update, and delete projects
- Project status management
- Employee-project assignment
- Automatic cleanup of dependent project assignments during deletion

### Attendance Management
- Create and manage attendance records
- Employee-based attendance tracking

### Leave Management
- Create and manage leave requests
- Employee leave tracking
- Leave request approval relationships

### Audit Logging
- Records important system operations
- Tracks actions performed by users
- Audit records are preserved even when related users are removed

### Database
- PostgreSQL database integration
- JPA/Hibernate ORM
- Flyway database migrations
- Database indexes for frequently accessed data

## Technology Stack

### Frontend

- React
- Vite
- React Router
- Redux Toolkit
- Axios
- Material UI (MUI)
- JavaScript
- Vitest
- React Testing Library

### Backend

- Java 17
- Spring Boot
- Spring Web
- Spring Data JPA
- Hibernate
- Spring Security
- JWT
- MapStruct
- Flyway
- Maven

### Database

- PostgreSQL

## Project Structure

```text
EMS_Full_Stack/
│
├── hr-frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── test/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
│
├── hr-service/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/example/hr_service/
│   │   │   │       ├── config/
│   │   │   │       ├── controller/
│   │   │   │       ├── dto/
│   │   │   │       ├── entity/
│   │   │   │       ├── exception/
│   │   │   │       ├── mapper/
│   │   │   │       ├── repository/
│   │   │   │       ├── security/
│   │   │   │       ├── service/
│   │   │   │       └── HrServiceApplication.java
│   │   │   └── resources/
│   │   │       └── db/
│   │   │           └── migration/
│   │   └── test/
│   ├── pom.xml
│   ├── mvnw
│   └── mvnw.cmd
│
└── README.md

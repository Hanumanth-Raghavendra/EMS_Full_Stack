package com.example.hr_service.service;

import com.example.hr_service.config.AppProperties;
import com.example.hr_service.entity.Attendance;
import com.example.hr_service.entity.AttendanceStatus;
import com.example.hr_service.entity.Department;
import com.example.hr_service.entity.Designation;
import com.example.hr_service.entity.Employee;
import com.example.hr_service.entity.EmployeeProject;
import com.example.hr_service.entity.EmployeeProjectId;
import com.example.hr_service.entity.EmployeeStatus;
import com.example.hr_service.entity.LeaveRequest;
import com.example.hr_service.entity.LeaveStatus;
import com.example.hr_service.entity.LeaveType;
import com.example.hr_service.entity.Project;
import com.example.hr_service.entity.ProjectStatus;
import com.example.hr_service.entity.SystemRole;
import com.example.hr_service.entity.User;
import com.example.hr_service.repository.AttendanceRepository;
import com.example.hr_service.repository.DepartmentRepository;
import com.example.hr_service.repository.DesignationRepository;
import com.example.hr_service.repository.EmployeeProjectRepository;
import com.example.hr_service.repository.EmployeeRepository;
import com.example.hr_service.repository.LeaveRequestRepository;
import com.example.hr_service.repository.ProjectRepository;
import com.example.hr_service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Fills an EMPTY database with realistic sample data when DEMO_DATA=true,
 * so a freshly deployed portfolio demo is immediately explorable.
 *
 * It never runs against a database that already contains employees.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final String EMAIL_DOMAIN = "@ems-demo.com";

    private final AppProperties properties;
    private final DepartmentRepository departmentRepository;
    private final DesignationRepository designationRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleService roleService;
    private final ProjectRepository projectRepository;
    private final EmployeeProjectRepository assignmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRepository;
    private final PasswordEncoder passwordEncoder;
    private final LeaveCalendar calendar;
    private final Clock clock;

    public DemoDataSeeder(AppProperties properties,
                          DepartmentRepository departmentRepository,
                          DesignationRepository designationRepository,
                          EmployeeRepository employeeRepository,
                          UserRepository userRepository,
                          RoleService roleService,
                          ProjectRepository projectRepository,
                          EmployeeProjectRepository assignmentRepository,
                          AttendanceRepository attendanceRepository,
                          LeaveRequestRepository leaveRepository,
                          PasswordEncoder passwordEncoder,
                          LeaveCalendar calendar,
                          Clock clock) {
        this.properties = properties;
        this.departmentRepository = departmentRepository;
        this.designationRepository = designationRepository;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.roleService = roleService;
        this.projectRepository = projectRepository;
        this.assignmentRepository = assignmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.leaveRepository = leaveRepository;
        this.passwordEncoder = passwordEncoder;
        this.calendar = calendar;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.demo().enabled()) {
            return;
        }
        if (employeeRepository.count() > 0 || userRepository.count() > 0) {
            log.info("Demo data: database already contains data - skipping seeding.");
            return;
        }
        seed();
        log.info("Demo data: seeded sample organisation. Sign in as '{}', '{}' or '{}'.",
                DemoAccounts.ADMIN, DemoAccounts.HR, DemoAccounts.EMPLOYEE);
    }

    void seed() {
        LocalDate today = LocalDate.now(clock);
        Random random = new Random(42);

        // ---------------------------------------------------------- departments
        Map<String, Department> departments = new LinkedHashMap<>();
        department(departments, "Engineering", "Builds and runs our products.");
        department(departments, "Human Resources", "People operations, hiring and policies.");
        department(departments, "Finance", "Accounting, payroll and budgeting.");
        department(departments, "Sales & Marketing", "Customer acquisition and brand.");
        department(departments, "Operations", "Facilities, IT support and administration.");

        Map<String, Designation> designations = new HashMap<>();
        designation(designations, departments, "Engineering", "Software Engineer");
        designation(designations, departments, "Engineering", "Senior Software Engineer");
        designation(designations, departments, "Engineering", "Engineering Manager");
        designation(designations, departments, "Engineering", "QA Engineer");
        designation(designations, departments, "Human Resources", "HR Executive");
        designation(designations, departments, "Human Resources", "HR Manager");
        designation(designations, departments, "Finance", "Accountant");
        designation(designations, departments, "Finance", "Finance Manager");
        designation(designations, departments, "Sales & Marketing", "Sales Executive");
        designation(designations, departments, "Sales & Marketing", "Marketing Specialist");
        designation(designations, departments, "Operations", "Operations Analyst");
        designation(designations, departments, "Operations", "Office Administrator");

        // ---------------------------------------------------------- employees
        List<Employee> employees = new ArrayList<>();
        Object[][] people = {
                {"Aarav", "Sharma", "Engineering", "Engineering Manager", 1100},
                {"Priya", "Reddy", "Human Resources", "HR Manager", 950},
                {"Rahul", "Verma", "Engineering", "Senior Software Engineer", 820},
                {"Sneha", "Iyer", "Finance", "Finance Manager", 760},
                {"Karthik", "Rao", "Engineering", "Software Engineer", 400},
                {"Ananya", "Gupta", "Sales & Marketing", "Marketing Specialist", 610},
                {"Vikram", "Nair", "Operations", "Operations Analyst", 530},
                {"Divya", "Menon", "Engineering", "QA Engineer", 300},
                {"Arjun", "Patel", "Sales & Marketing", "Sales Executive", 240},
                {"Meera", "Joshi", "Finance", "Accountant", 180},
                {"Rohan", "Das", "Engineering", "Software Engineer", 120},
                {"Kavya", "Pillai", "Human Resources", "HR Executive", 90},
                {"Siddharth", "Kulkarni", "Operations", "Office Administrator", 45},
                {"Isha", "Banerjee", "Engineering", "Software Engineer", 12},
                {"Nikhil", "Chopra", "Sales & Marketing", "Sales Executive", 5},
                {"Pooja", "Singh", "Finance", "Accountant", 700},
        };
        for (int i = 0; i < people.length; i++) {
            Object[] person = people[i];
            Employee employee = new Employee();
            employee.setEmployeeCode(String.format("EMP%03d", i + 1));
            employee.setFirstName((String) person[0]);
            employee.setLastName((String) person[1]);
            employee.setEmail((person[0] + "." + person[1]).toLowerCase() + EMAIL_DOMAIN);
            employee.setPhone(String.valueOf(9_000_000_000L + 13_579L * (i + 1)));
            employee.setDateOfJoining(today.minusDays((Integer) person[4]));
            employee.setDepartment(departments.get((String) person[2]));
            employee.setDesignation(designations.get(person[2] + "|" + person[3]));
            employee.setStatus(i == people.length - 1 ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE);
            employees.add(employeeRepository.save(employee));
        }

        // ---------------------------------------------------------- accounts
        String password = passwordEncoder.encode(properties.demo().password());
        User admin = account(employees.get(0), DemoAccounts.ADMIN, SystemRole.ADMIN, password);
        account(employees.get(1), DemoAccounts.HR, SystemRole.HR, password);
        account(employees.get(4), DemoAccounts.EMPLOYEE, SystemRole.EMPLOYEE, password);
        account(employees.get(2), "rahul.verma", SystemRole.EMPLOYEE, password);
        account(employees.get(7), "divya.menon", SystemRole.EMPLOYEE, password);

        // ---------------------------------------------------------- projects
        Project payroll = project("Payroll Revamp", "Replace the legacy payroll spreadsheets with an integrated module.",
                today.minusMonths(4), today.plusMonths(2), ProjectStatus.ACTIVE);
        Project mobile = project("Mobile App Launch", "Customer-facing Android and iOS app.",
                today.minusMonths(2), today.plusMonths(5), ProjectStatus.ACTIVE);
        Project website = project("Website Redesign", "Refresh the marketing site and careers page.",
                today.plusDays(20), today.plusMonths(3), ProjectStatus.PLANNED);
        Project migration = project("Cloud Migration", "Move on-premise services to the cloud.",
                today.minusMonths(10), today.minusMonths(1), ProjectStatus.COMPLETED);
        project("Customer Portal", "Self-service portal for enterprise customers (on hold).",
                today.minusMonths(6), null, ProjectStatus.INACTIVE);

        assign(employees.get(0), mobile, "Project Lead", today.minusMonths(2));
        assign(employees.get(2), mobile, "Backend Lead", today.minusMonths(2));
        assign(employees.get(4), mobile, "Frontend Developer", today.minusMonths(1));
        assign(employees.get(7), mobile, "QA Engineer", today.minusDays(40));
        assign(employees.get(10), mobile, "Android Developer", today.minusDays(30));
        assign(employees.get(3), payroll, "Business Owner", today.minusMonths(4));
        assign(employees.get(9), payroll, "Finance Analyst", today.minusMonths(3));
        assign(employees.get(4), payroll, "Developer", today.minusMonths(3));
        assign(employees.get(5), website, "Content Lead", today.minusDays(3));
        assign(employees.get(8), website, "Sales Liaison", today.minusDays(3));
        assign(employees.get(2), migration, "Tech Lead", today.minusMonths(10));
        assign(employees.get(6), migration, "Infrastructure", today.minusMonths(9));

        // ---------------------------------------------------------- leave
        Employee demoEmployee = employees.get(4);
        LocalDate lastWeekMonday = today.minusWeeks(1).with(DayOfWeek.MONDAY);
        List<LeaveRequest> approved = new ArrayList<>();
        approved.add(leave(demoEmployee, LeaveType.SICK, lastWeekMonday.plusDays(1), lastWeekMonday.plusDays(2),
                "Fever and doctor's advice to rest.", LeaveStatus.APPROVED, admin, "Get well soon!"));
        leave(demoEmployee, LeaveType.CASUAL, nextWorkingDay(today.plusDays(10)), nextWorkingDay(today.plusDays(10)).plusDays(1),
                "Family function in Vijayawada.", LeaveStatus.PENDING, null, null);
        leave(employees.get(5), LeaveType.EARNED, nextWorkingDay(today.plusDays(14)), nextWorkingDay(today.plusDays(14)).plusDays(4),
                "Annual vacation.", LeaveStatus.PENDING, null, null);
        leave(employees.get(8), LeaveType.CASUAL, nextWorkingDay(today.plusDays(3)), nextWorkingDay(today.plusDays(3)),
                "Personal errand.", LeaveStatus.PENDING, null, null);
        leave(employees.get(10), LeaveType.SICK, today.minusDays(20), today.minusDays(20),
                "Dental appointment.", LeaveStatus.REJECTED, admin, "Please use half-day instead.");
        LocalDate onLeaveStart = nextWorkingDay(today.plusDays(1));
        approved.add(leave(employees.get(6), LeaveType.CASUAL, onLeaveStart, onLeaveStart.plusDays(1),
                "Moving to a new apartment.", LeaveStatus.APPROVED, admin, null));

        Set<String> leaveDays = new HashSet<>();
        for (LeaveRequest request : approved) {
            for (LocalDate date : calendar.workingDays(request.getStartDate(), request.getEndDate())) {
                leaveDays.add(request.getEmployee().getEmployeeId() + "|" + date);
                Attendance attendance = new Attendance();
                attendance.setEmployee(request.getEmployee());
                attendance.setAttendanceDate(date);
                attendance.setStatus(AttendanceStatus.LEAVE);
                attendanceRepository.save(attendance);
            }
        }

        // ---------------------------------------------------------- attendance (last two weeks)
        for (Employee employee : employees) {
            if (employee.getStatus() != EmployeeStatus.ACTIVE) {
                continue;
            }
            for (int back = 14; back >= 0; back--) {
                LocalDate date = today.minusDays(back);
                if (!calendar.isWorkingDay(date) || date.isBefore(employee.getDateOfJoining())) {
                    continue;
                }
                if (leaveDays.contains(employee.getEmployeeId() + "|" + date)) {
                    continue;
                }
                // Leave today open for the demo employee so they can try checking in.
                if (back == 0 && employee == demoEmployee) {
                    continue;
                }
                attendanceRepository.save(attendanceFor(employee, date, back == 0, random));
            }
        }
    }

    // ------------------------------------------------------------------ builders

    private void department(Map<String, Department> map, String name, String description) {
        Department department = new Department();
        department.setDepartmentName(name);
        department.setDescription(description);
        map.put(name, departmentRepository.save(department));
    }

    private void designation(Map<String, Designation> map, Map<String, Department> departments,
                             String departmentName, String name) {
        Designation designation = new Designation();
        designation.setDesignationName(name);
        designation.setDepartment(departments.get(departmentName));
        map.put(departmentName + "|" + name, designationRepository.save(designation));
    }

    private User account(Employee employee, String username, SystemRole role, String passwordHash) {
        User user = new User();
        user.setEmployee(employee);
        user.setUsername(username);
        user.setPasswordHash(passwordHash);
        user.setRole(roleService.getRoleEntity(role));
        user.setEnabled(true);
        return userRepository.save(user);
    }

    private Project project(String name, String description, LocalDate start, LocalDate end, ProjectStatus status) {
        Project project = new Project();
        project.setProjectName(name);
        project.setDescription(description);
        project.setStartDate(start);
        project.setEndDate(end);
        project.setStatus(status);
        return projectRepository.save(project);
    }

    private void assign(Employee employee, Project project, String role, LocalDate assigned) {
        EmployeeProject assignment = new EmployeeProject();
        assignment.setId(new EmployeeProjectId(employee.getEmployeeId(), project.getProjectId()));
        assignment.setEmployee(employee);
        assignment.setProject(project);
        assignment.setRoleInProject(role);
        assignment.setAssignedAt(assigned.atTime(10, 0));
        assignmentRepository.save(assignment);
    }

    private LeaveRequest leave(Employee employee, LeaveType type, LocalDate start, LocalDate end, String reason,
                               LeaveStatus status, User reviewer, String comment) {
        LeaveRequest leave = new LeaveRequest();
        leave.setEmployee(employee);
        leave.setLeaveType(type);
        leave.setStartDate(start);
        leave.setEndDate(end);
        leave.setReason(reason);
        leave.setStatus(status);
        leave.setAppliedAt(LocalDateTime.now(clock).minusDays(status == LeaveStatus.PENDING ? 1 : 12));
        if (reviewer != null) {
            leave.setReviewedBy(reviewer);
            leave.setReviewedAt(LocalDateTime.now(clock).minusDays(10));
            leave.setReviewComment(comment);
        }
        return leaveRepository.save(leave);
    }

    private Attendance attendanceFor(Employee employee, LocalDate date, boolean isToday, Random random) {
        Attendance attendance = new Attendance();
        attendance.setEmployee(employee);
        attendance.setAttendanceDate(date);

        int roll = random.nextInt(100);
        if (roll < 6 && !isToday) {
            attendance.setStatus(AttendanceStatus.ABSENT);
            return attendance;
        }
        LocalDateTime checkIn = date.atTime(LocalTime.of(9, 0)).plusMinutes(random.nextInt(75));
        attendance.setCheckIn(checkIn);
        if (isToday) {
            attendance.setStatus(AttendanceStatus.PRESENT);
            return attendance;
        }
        if (roll < 12) {
            attendance.setStatus(AttendanceStatus.HALF_DAY);
            attendance.setCheckOut(checkIn.plusHours(4).plusMinutes(random.nextInt(30)));
        } else {
            attendance.setStatus(AttendanceStatus.PRESENT);
            attendance.setCheckOut(checkIn.plusHours(8).plusMinutes(random.nextInt(90)));
        }
        return attendance;
    }

    private LocalDate nextWorkingDay(LocalDate date) {
        LocalDate candidate = date;
        while (!calendar.isWorkingDay(candidate)) {
            candidate = candidate.plusDays(1);
        }
        return candidate;
    }
}

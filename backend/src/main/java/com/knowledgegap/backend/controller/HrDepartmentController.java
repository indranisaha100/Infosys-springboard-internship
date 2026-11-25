package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.Department;
import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.DepartmentRepository;
import com.knowledgegap.backend.repository.UserRepository;
import com.knowledgegap.backend.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/** HR creates departments, picks the Department Head and assigns employees to that head. */
@RestController
@RequestMapping("/api/hr/departments")
public class HrDepartmentController {
    private final DepartmentRepository departments;
    private final UserRepository users;
    private final JwtTokenProvider tokens;

    public HrDepartmentController(DepartmentRepository departments, UserRepository users, JwtTokenProvider tokens) {
        this.departments = departments;
        this.users = users;
        this.tokens = tokens;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> overview(@RequestHeader(value = "Authorization", required = false) String auth) {
        if (!isHr(auth)) return unauthorized();
        return ResponseEntity.ok(payload());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, String> input) {
        if (!isHr(auth)) return unauthorized();
        String name = clean(input.get("name"));
        if (name.isBlank()) return bad("Department name is required.");
        if (departments.findByNameIgnoreCase(name).isPresent()) return bad("A department with this name already exists.");
        Department department = new Department();
        department.setName(name);
        department.setDescription(clean(input.get("description")));
        String headEmail = clean(input.get("headEmail"));
        if (!headEmail.isBlank()) {
            ResponseEntity<?> problem = applyHead(department, headEmail);
            if (problem != null) return problem;
        }
        departments.save(department);
        return ResponseEntity.status(HttpStatus.CREATED).body(payload());
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> update(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, String> input) {
        if (!isHr(auth)) return unauthorized();
        Optional<Department> optional = departments.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();
        Department department = optional.get();
        String oldName = department.getName();

        String name = input.containsKey("name") ? clean(input.get("name")) : oldName;
        if (name.isBlank()) return bad("Department name is required.");
        Optional<Department> clash = departments.findByNameIgnoreCase(name);
        if (clash.isPresent() && !clash.get().getId().equals(id)) return bad("A department with this name already exists.");
        if (input.containsKey("description")) department.setDescription(clean(input.get("description")));

        if (!name.equals(oldName)) {
            department.setName(name);
            for (User user : users.findAll()) {
                if (oldName.equalsIgnoreCase(clean(user.getDepartment()))) {
                    user.setDepartment(name);
                    users.save(user);
                }
            }
        }
        if (input.containsKey("headEmail")) {
            String headEmail = clean(input.get("headEmail"));
            String previousHead = clean(department.getHeadEmail());
            if (!headEmail.equalsIgnoreCase(previousHead)) {
                if (!previousHead.isBlank()) {
                    users.findByEmailIgnoreCase(previousHead).ifPresent(old -> {
                        if (name.equalsIgnoreCase(clean(old.getDepartment()))) {
                            old.setDepartment(null);
                            users.save(old);
                        }
                    });
                }
                if (headEmail.isBlank()) {
                    department.setHeadEmail(null);
                    reassignMembers(department);
                } else {
                    ResponseEntity<?> problem = applyHead(department, headEmail);
                    if (problem != null) return problem;
                    reassignMembers(department);
                }
            }
        }
        departments.save(department);
        return ResponseEntity.ok(payload());
    }

    @PostMapping("/{id}/employees")
    @Transactional
    public ResponseEntity<?> assignEmployees(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, List<String>> input) {
        if (!isHr(auth)) return unauthorized();
        Optional<Department> optional = departments.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();
        List<String> emails = input.get("emails");
        if (emails == null || emails.isEmpty()) return bad("Select at least one employee.");
        Department department = optional.get();
        for (String email : emails) {
            Optional<User> employee = users.findByEmailIgnoreCase(clean(email));
            if (employee.isEmpty() || !"ROLE_EMPLOYEE".equals(employee.get().getRole())) {
                return bad("Only approved employee accounts can be assigned: " + email);
            }
            User user = employee.get();
            user.setDepartment(department.getName());
            user.setDepartmentHeadEmail(blankToNull(department.getHeadEmail()));
            users.save(user);
        }
        return ResponseEntity.ok(payload());
    }

    @DeleteMapping("/{id}/employees/{email}")
    @Transactional
    public ResponseEntity<?> unassignEmployee(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @PathVariable String email) {
        if (!isHr(auth)) return unauthorized();
        Optional<Department> optional = departments.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();
        users.findByEmailIgnoreCase(clean(email)).ifPresent(user -> {
            if (optional.get().getName().equalsIgnoreCase(clean(user.getDepartment()))) {
                user.setDepartment(null);
                user.setDepartmentHeadEmail(null);
                users.save(user);
            }
        });
        return ResponseEntity.ok(payload());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id) {
        if (!isHr(auth)) return unauthorized();
        Optional<Department> optional = departments.findById(id);
        if (optional.isEmpty()) return ResponseEntity.notFound().build();
        Department department = optional.get();
        for (User user : users.findAll()) {
            if (department.getName().equalsIgnoreCase(clean(user.getDepartment()))
                    && ("ROLE_EMPLOYEE".equals(user.getRole()) || "ROLE_DEPARTMENT_HEAD".equals(user.getRole()))) {
                user.setDepartment(null);
                user.setDepartmentHeadEmail(null);
                users.save(user);
            }
        }
        departments.delete(department);
        return ResponseEntity.ok(payload());
    }

    // ---------------------------------------------------------------- helpers

    /** Validates the head and points the head's own department at this one. Null when fine. */
    private ResponseEntity<?> applyHead(Department department, String headEmail) {
        Optional<User> optional = users.findByEmailIgnoreCase(headEmail);
        if (optional.isEmpty() || !"ROLE_DEPARTMENT_HEAD".equals(optional.get().getRole())
                || !isApproved(optional.get())) {
            return bad("Choose an approved Department Head account.");
        }
        User head = optional.get();
        for (Department other : departments.findByHeadEmailIgnoreCase(head.getEmail())) {
            if (department.getId() == null || !other.getId().equals(department.getId())) {
                return bad(displayName(head) + " already leads the " + other.getName() + " department.");
            }
        }
        department.setHeadEmail(head.getEmail());
        head.setDepartment(department.getName());
        users.save(head);
        return null;
    }

    /** Keeps every employee of the department pointing at the department's current head. */
    private void reassignMembers(Department department) {
        for (User user : users.findByRole("ROLE_EMPLOYEE")) {
            if (department.getName().equalsIgnoreCase(clean(user.getDepartment()))) {
                user.setDepartmentHeadEmail(blankToNull(department.getHeadEmail()));
                users.save(user);
            }
        }
    }

    private Map<String, Object> payload() {
        List<User> approvedEmployees = users.findByRole("ROLE_EMPLOYEE").stream().filter(this::isApproved).toList();
        List<User> heads = users.findByRole("ROLE_DEPARTMENT_HEAD").stream().filter(this::isApproved).toList();
        List<Department> all = departments.findAllByOrderByNameAsc();

        List<Map<String, Object>> departmentRows = new ArrayList<>();
        for (Department department : all) {
            User head = clean(department.getHeadEmail()).isBlank() ? null
                    : users.findByEmailIgnoreCase(department.getHeadEmail()).orElse(null);
            List<Map<String, Object>> members = approvedEmployees.stream()
                    .filter(user -> department.getName().equalsIgnoreCase(clean(user.getDepartment())))
                    .map(this::person)
                    .toList();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", department.getId());
            row.put("name", department.getName());
            row.put("description", department.getDescription());
            row.put("headEmail", department.getHeadEmail());
            row.put("headName", head == null ? null : displayName(head));
            row.put("employeeCount", members.size());
            row.put("employees", members);
            departmentRows.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("departments", departmentRows);
        result.put("departmentHeads", heads.stream().map(this::person).toList());
        result.put("employees", approvedEmployees.stream().map(this::person).toList());
        return result;
    }

    private Map<String, Object> person(User user) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", user.getId());
        row.put("name", displayName(user));
        row.put("email", user.getEmail());
        row.put("department", user.getDepartment() == null ? "" : user.getDepartment());
        row.put("departmentHeadEmail", user.getDepartmentHeadEmail() == null ? "" : user.getDepartmentHeadEmail());
        return row;
    }

    private boolean isHr(String auth) {
        if (auth == null || !auth.startsWith("Bearer ")) return false;
        String token = auth.substring(7);
        if (!tokens.validateToken(token)) return false;
        try {
            return users.findByEmail(tokens.getEmailFromJWT(token))
                    .map(user -> isApproved(user)
                            && ("ROLE_HR".equals(user.getRole()) || "ROLE_ADMIN".equals(user.getRole())))
                    .orElse(false);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private boolean isApproved(User user) {
        return user.getStatus() == null || "APPROVED".equalsIgnoreCase(user.getStatus());
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "A valid HR session is required."));
    }

    private ResponseEntity<?> bad(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    private String displayName(User user) {
        String name = (clean(user.getFirstName()) + " " + clean(user.getLastName())).trim();
        return name.isBlank() ? user.getEmail() : name;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String blankToNull(String value) {
        return clean(value).isBlank() ? null : clean(value);
    }
}

package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.User;
import com.knowledgegap.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Single source of truth for "which people belong to a Department Head".
 *
 * An employee belongs to a head when HR assigned them to that head explicitly. Employees HR has not
 * assigned to anybody yet fall back to the department-name match, so existing data keeps working.
 */
@Service
public class DepartmentScopeService {
    private final UserRepository users;

    public DepartmentScopeService(UserRepository users) {
        this.users = users;
    }

    public List<User> employeesOf(User head) {
        return users.findByRole("ROLE_EMPLOYEE").stream()
                .filter(this::isApproved)
                .filter(user -> isEmployeeInScope(head, user))
                .sorted(byName())
                .toList();
    }

    public List<User> mentorsOf(User head) {
        return users.findByRole("ROLE_MENTOR").stream()
                .filter(this::isApproved)
                .filter(user -> sameDepartment(head.getDepartment(), user.getDepartment()))
                .sorted(byName())
                .toList();
    }

    /** Used by notifications: may this head contact this person? */
    public boolean isInScope(User head, User target) {
        if ("ROLE_EMPLOYEE".equals(target.getRole())) return isEmployeeInScope(head, target);
        if ("ROLE_MENTOR".equals(target.getRole())) return sameDepartment(head.getDepartment(), target.getDepartment());
        return false;
    }

    private boolean isEmployeeInScope(User head, User employee) {
        String assignedTo = clean(employee.getDepartmentHeadEmail());
        if (!assignedTo.isBlank()) return assignedTo.equalsIgnoreCase(clean(head.getEmail()));
        return sameDepartment(head.getDepartment(), employee.getDepartment());
    }

    private boolean isApproved(User user) {
        return user.getStatus() == null || "APPROVED".equalsIgnoreCase(user.getStatus());
    }

    private boolean sameDepartment(String first, String second) {
        return !clean(first).isBlank() && clean(first).equalsIgnoreCase(clean(second));
    }

    private Comparator<User> byName() {
        return Comparator.comparing(
                user -> (clean(user.getFirstName()) + " " + clean(user.getLastName())).toLowerCase(Locale.ROOT));
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}

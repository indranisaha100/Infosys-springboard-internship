package com.knowledgegap.backend.service;

import com.knowledgegap.backend.model.RoleRequirement;
import com.knowledgegap.backend.model.User;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/** Shared parsing and matching rules so the benchmark screen and the gap analysis always agree. */
public final class RoleBenchmarkRules {
    private RoleBenchmarkRules() {
    }

    /** Returns the canonical proficiency text (Beginner, Intermediate, Advanced, Expert or "NN%"), or empty if invalid. */
    public static Optional<String> normalizeProficiency(String raw) {
        if (raw == null) return Optional.empty();
        String value = raw.trim().toLowerCase(Locale.ROOT);
        if (value.isBlank()) return Optional.empty();
        if (value.equals("beginner") || value.equals("basic")) return Optional.of("Beginner");
        if (value.equals("intermediate")) return Optional.of("Intermediate");
        if (value.equals("advanced")) return Optional.of("Advanced");
        if (value.equals("expert")) return Optional.of("Expert");
        try {
            int numeric = Integer.parseInt(value.replace("%", "").trim());
            if (numeric < 1 || numeric > 100) return Optional.empty();
            return Optional.of(numeric + "%");
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    public static int toPercent(String proficiency) {
        if (proficiency == null) return 70;
        String value = proficiency.toLowerCase(Locale.ROOT);
        if (value.contains("beginner") || value.contains("basic")) return 50;
        if (value.contains("expert")) return 95;
        if (value.contains("advanced")) return 90;
        if (value.contains("intermediate")) return 70;
        try {
            return Math.max(0, Math.min(100, Integer.parseInt(value.replace("%", "").trim())));
        } catch (NumberFormatException ignored) {
            return 70;
        }
    }

    public static String key(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    /** Department first, then the role the person asked for, then their platform role. Null if nothing matches. */
    public static List<RoleRequirement> requirementsFor(User employee, Map<String, List<RoleRequirement>> byRole) {
        List<RoleRequirement> match = byRole.get(key(employee.getDepartment()));
        if (match != null) return match;
        match = byRole.get(roleKey(employee.getRequestedRole()));
        if (match != null) return match;
        return byRole.get(roleKey(employee.getRole()));
    }

    private static String roleKey(String role) {
        if (role == null) return "";
        return role.replaceFirst("(?i)^ROLE_", "").replace('_', ' ').trim().toLowerCase(Locale.ROOT);
    }
}

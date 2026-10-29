package com.knowledgegap.backend;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@SpringBootApplication
public class SpringProjectTeam2Application {

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(SpringProjectTeam2Application.class, args);
    }

    private static void loadDotenv() {
        Path currentDirectory = Path.of("").toAbsolutePath().normalize();
        List<Path> dotenvDirectories = new ArrayList<>(List.of(currentDirectory, currentDirectory.resolve("backend")));
        if (currentDirectory.getParent() != null) dotenvDirectories.add(currentDirectory.getParent().resolve("backend"));

        for (Path directory : dotenvDirectories.stream().distinct().toList()) {
            try {
                Dotenv.configure().directory(directory.toString()).ignoreIfMissing().load().entries().forEach(entry -> {
                    if (System.getenv(entry.getKey()) == null && System.getProperty(entry.getKey()) == null) {
                        System.setProperty(entry.getKey(), entry.getValue());
                    }
                });
            } catch (RuntimeException ignored) {
                // Continue checking supported project and backend working directories.
            }
        }
    }
}

# Organizational-platform

## Run the backend

The backend uses PostgreSQL. Set the password for the configured database before
starting Spring Boot; the password is intentionally not stored in the repository.

In PowerShell:

```powershell
cd C:\Users\HP\Downloads\SpringProjectTeam2\backend
$env:DB_PASSWORD = "your-neon-database-password"
.\mvnw.cmd spring-boot:run
```

You can override the other connection settings when using a different database:

```powershell
$env:DB_URL = "jdbc:postgresql://host:5432/database"
$env:DB_USERNAME = "database-user"
$env:DB_PASSWORD = "database-password"
```

The registration endpoint is available at
`http://localhost:8080/api/auth/register`.

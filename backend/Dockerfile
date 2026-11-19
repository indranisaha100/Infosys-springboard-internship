FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B package

FROM eclipse-temurin:17-jre

WORKDIR /app
RUN useradd --system --uid 10001 --create-home appuser
COPY --from=build --chown=10001:10001 /workspace/target/backend-*.jar /app/app.jar

USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]

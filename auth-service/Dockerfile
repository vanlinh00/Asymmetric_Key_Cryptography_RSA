# Multi-stage build for auth-service (Java 17, Spring Boot 3.4.0)
FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /workspace
COPY pom.xml pom.xml
COPY crypto-common crypto-common
COPY auth-service auth-service
COPY resource-service resource-service
RUN mvn clean package -pl auth-service -am -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /workspace/auth-service/target/auth-service-*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]

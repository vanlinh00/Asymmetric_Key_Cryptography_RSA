# Multi-stage build for resource-service (Java 17, Spring Boot 3.4.0)
FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /workspace
COPY pom.xml pom.xml
COPY crypto-common crypto-common
COPY auth-service auth-service
COPY resource-service resource-service
RUN mvn clean package -pl resource-service -am -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /workspace/resource-service/target/resource-service-*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]

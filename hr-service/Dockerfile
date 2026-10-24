# syntax=docker/dockerfile:1

# ---- build ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Cache dependencies in their own layer (tolerant: the full build below is authoritative).
RUN mvn -B -q -DskipTests dependency:go-offline || true
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- run ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S ems && adduser -S ems -G ems
COPY --from=build /app/target/hr-service.jar /app/app.jar
USER ems

# Tuned for small containers (e.g. 512 MB free tiers).
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Xss512k -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

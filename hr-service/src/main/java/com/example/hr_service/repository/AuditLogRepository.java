package com.example.hr_service.repository;

import com.example.hr_service.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:action = '' OR a.action = :action)
              AND (:entityName = '' OR a.entityName = :entityName)
              AND (:username = '' OR LOWER(a.username) LIKE :username)
              AND a.createdAt >= :from
              AND a.createdAt < :to
            """)
    Page<AuditLog> search(@Param("action") String action,
                          @Param("entityName") String entityName,
                          @Param("username") String username,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to,
                          Pageable pageable);

    @Query("SELECT DISTINCT a.entityName FROM AuditLog a WHERE a.entityName IS NOT NULL ORDER BY a.entityName")
    List<String> findDistinctEntityNames();

    @Query("SELECT DISTINCT a.action FROM AuditLog a WHERE a.action IS NOT NULL ORDER BY a.action")
    List<String> findDistinctActions();
}

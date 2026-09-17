package com.example.hr_service.service;

import com.example.hr_service.dto.AuditLogRequestDTO;
import com.example.hr_service.dto.AuditLogResponseDTO;
import com.example.hr_service.entity.AuditLog;
import com.example.hr_service.mapper.AuditLogMapper;
import com.example.hr_service.repository.AuditLogRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;

    public AuditLogServiceImpl(
            AuditLogRepository auditLogRepository,
            AuditLogMapper auditLogMapper) {

        this.auditLogRepository = auditLogRepository;
        this.auditLogMapper = auditLogMapper;
    }

    @Override
    public List<AuditLogResponseDTO> getAllAuditLogs() {

        return auditLogRepository.findAll()
                .stream()
                .map(auditLogMapper::toResponseDTO)
                .toList();
    }

    @Override
    public AuditLogResponseDTO getAuditLogById(Long auditId) {

        AuditLog auditLog = auditLogRepository.findById(auditId)
                .orElse(null);

        if (auditLog == null) {
            return null;
        }

        return auditLogMapper.toResponseDTO(auditLog);
    }

    @Override
    public AuditLogResponseDTO createAuditLog(
            AuditLogRequestDTO auditLogRequestDTO) {

        AuditLog auditLog = auditLogMapper.toEntity(auditLogRequestDTO);

        AuditLog savedAuditLog = auditLogRepository.save(auditLog);

        return auditLogMapper.toResponseDTO(savedAuditLog);
    }

    @Override
    public AuditLogResponseDTO updateAuditLog(
            Long auditId,
            AuditLogRequestDTO auditLogRequestDTO) {

        AuditLog auditLog = auditLogRepository.findById(auditId)
                .orElseThrow(() -> new RuntimeException("Audit log not found"));

        auditLog.setUserId(auditLogRequestDTO.getUserId());
        auditLog.setAction(auditLogRequestDTO.getAction());
        auditLog.setEntityName(auditLogRequestDTO.getEntityName());
        auditLog.setEntityId(auditLogRequestDTO.getEntityId());
        auditLog.setOldValue(auditLogRequestDTO.getOldValue());
        auditLog.setNewValue(auditLogRequestDTO.getNewValue());
        auditLog.setCreatedAt(auditLogRequestDTO.getCreatedAt());

        AuditLog updatedAuditLog = auditLogRepository.save(auditLog);

        return auditLogMapper.toResponseDTO(updatedAuditLog);
    }

    @Override
    public void deleteAuditLog(Long auditId) {

        auditLogRepository.deleteById(auditId);
    }
}
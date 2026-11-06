package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.ConversationReport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationReportRepository extends JpaRepository<ConversationReport, Long> {}
package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.MessageAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long> {
    @Query("select a.messageId, a.id, a.fileName, a.contentType, a.sizeBytes "
            + "from MessageAttachment a where a.messageId in :ids")
    List<Object[]> findMetaByMessageIds(@Param("ids") List<Long> ids);
}
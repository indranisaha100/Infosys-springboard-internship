package com.knowledgegap.backend.repository;

import com.knowledgegap.backend.model.Connection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<Connection, Long> {
    @Query("select c from Connection c where c.requesterEmail = :email or c.receiverEmail = :email")
    List<Connection> findAllFor(@Param("email") String email);

    @Query("select c from Connection c where (c.requesterEmail = :a and c.receiverEmail = :b) "
            + "or (c.requesterEmail = :b and c.receiverEmail = :a)")
    Optional<Connection> findBetween(@Param("a") String a, @Param("b") String b);
}
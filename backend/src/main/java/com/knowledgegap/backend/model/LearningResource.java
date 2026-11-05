package com.knowledgegap.backend.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "learning_resources")
@Getter
@Setter
@NoArgsConstructor
public class LearningResource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Column(length = 2000)
    private String description;

    private String url;
    private String difficulty;
    private Integer durationMinutes;
    private String competency;

    private String pdfFileName;
    private String pdfContentType;

    @Lob
    @JsonIgnore
    @Column(columnDefinition = "bytea")
    private byte[] pdfData;

    @Transient
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String pdfBase64;

    @Column(nullable = false)
    private boolean active = true;
}

package com.knowledgegap.backend.controller;

import com.knowledgegap.backend.model.*;
import com.knowledgegap.backend.repository.*;
import com.knowledgegap.backend.security.CurrentUser;
//import com.knowledgegap.backend.service.NotificationService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private static final long MAX_FILE_BYTES = 2L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "txt", "docx");

    private final CurrentUser currentUser;
    private final UserRepository users;
    private final ConversationRepository conversations;
    private final ConversationParticipantRepository participants;
    private final MessageRepository messages;
    private final MessageAttachmentRepository attachments;
    private final ConversationReportRepository reports;
    private final ConnectionRepository connections;
    private final MentorshipRequestRepository mentorship;
    //private final NotificationService notifications;

    public ChatController(CurrentUser currentUser, UserRepository users, ConversationRepository conversations,
            ConversationParticipantRepository participants, MessageRepository messages,
            MessageAttachmentRepository attachments, ConversationReportRepository reports,
            ConnectionRepository connections, MentorshipRequestRepository mentorship) {
        this.currentUser = currentUser;
        this.users = users;
        this.conversations = conversations;
        this.participants = participants;
        this.messages = messages;
        this.attachments = attachments;
        this.reports = reports;
        this.connections = connections;
        this.mentorship = mentorship;
        //this.notifications = notifications;
    }

    @GetMapping("/contacts")
    public ResponseEntity<?> contacts(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestParam(defaultValue = "") String q) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        String query = q.trim().toLowerCase();
        return ResponseEntity.ok(users.findAll().stream()
                .filter(u -> allowed(me.get(), u))
                .filter(u -> query.isEmpty() || currentUser.displayName(u).toLowerCase().contains(query))
                .map(this::person).toList());
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> list(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "false") boolean archived) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();
        String query = q.trim().toLowerCase();

        List<Map<String, Object>> result = new ArrayList<>();
        for (ConversationParticipant mine : participants.findByUserEmail(myEmail)) {
            if (Boolean.TRUE.equals(mine.getArchived()) != archived) continue;
            Long id = mine.getConversationId();
            Optional<User> peer = peerOf(id, myEmail);
            if (peer.isEmpty() || !allowed(me.get(), peer.get())) continue;
            if (!query.isEmpty() && !currentUser.displayName(peer.get()).toLowerCase().contains(query)) continue;
            Optional<Message> last = messages.findFirstByConversationIdOrderByIdDesc(id);
            if (last.isEmpty()) continue;
            Instant since = mine.getLastReadAt() == null ? Instant.EPOCH : mine.getLastReadAt();
            Map<String, Object> item = new LinkedHashMap<>(person(peer.get()));
            item.put("id", id);
            item.put("lastMessage", last.get().getText().isBlank() ? "Attachment" : last.get().getText());
            item.put("lastMessageAt", last.get().getSentAt().toString());
            item.put("unread", messages.countUnread(id, myEmail, since));
            item.put("muted", Boolean.TRUE.equals(mine.getMuted()));
            item.put("archived", Boolean.TRUE.equals(mine.getArchived()));
            result.add(item);
        }
        result.sort((a, b) -> ((String) b.get("lastMessageAt")).compareTo((String) a.get("lastMessageAt")));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/conversations")
    public ResponseEntity<?> start(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @RequestBody Map<String, String> body) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        Optional<User> peer = users.findByEmail(body.getOrDefault("with", ""));
        if (peer.isEmpty() || !allowed(me.get(), peer.get())) return forbidden();

        List<Long> shared = participants.findSharedConversationIds(me.get().getEmail(), peer.get().getEmail());
        Long id;
        if (shared.isEmpty()) {
            Conversation conversation = new Conversation();
            conversation.setCreatedAt(Instant.now());
            id = conversations.save(conversation).getId();
            addParticipant(id, me.get().getEmail());
            addParticipant(id, peer.get().getEmail());
        } else {
            id = shared.get(0);
        }
        return ResponseEntity.ok(Map.of("id", id));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<?> history(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestParam(required = false) Long before,
            @RequestParam(defaultValue = "30") int limit) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();
        if (participants.findByConversationIdAndUserEmail(id, myEmail).isEmpty()) return forbidden();

        int size = Math.max(1, Math.min(limit, 100));
        List<Message> page = messages.findPage(id, before == null ? Long.MAX_VALUE : before,
                PageRequest.of(0, size + 1));
        boolean hasMore = page.size() > size;
        List<Message> shown = new ArrayList<>(hasMore ? page.subList(0, size) : page);
        Collections.reverse(shown);

        Instant peerRead = participants.findByConversationId(id).stream()
                .filter(p -> !p.getUserEmail().equalsIgnoreCase(myEmail))
                .map(ConversationParticipant::getLastReadAt)
                .filter(Objects::nonNull).findFirst().orElse(null);

        Map<Long, Map<String, Object>> files = new HashMap<>();
        if (!shown.isEmpty()) {
            List<Long> ids = shown.stream().map(Message::getId).toList();
            for (Object[] row : attachments.findMetaByMessageIds(ids)) {
                files.put(((Number) row[0]).longValue(), Map.<String, Object>of(
                        "id", row[1], "fileName", row[2], "contentType", row[3], "size", row[4]));
            }
        }

        List<Map<String, Object>> list = shown.stream().map(m -> {
            boolean mine = m.getSenderEmail().equalsIgnoreCase(myEmail);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("mine", mine);
            item.put("text", m.getText());
            item.put("sentAt", m.getSentAt().toString());
            item.put("read", mine && peerRead != null && !peerRead.isBefore(m.getSentAt()));
            item.put("attachment", files.get(m.getId()));
            return item;
        }).toList();
        return ResponseEntity.ok(Map.of("messages", list, "hasMore", hasMore));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<?> send(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();
        Optional<ConversationParticipant> mine = participants.findByConversationIdAndUserEmail(id, myEmail);
        if (mine.isEmpty()) return forbidden();
        Optional<User> peer = peerOf(id, myEmail);
        if (peer.isEmpty() || !allowed(me.get(), peer.get())) return forbidden();

        String text = body.getOrDefault("text", "").trim();
        if (text.isEmpty() || text.length() > 2000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Enter a message up to 2000 characters."));
        }
        Message message = saveMessage(id, myEmail, text);
        mine.get().setLastReadAt(message.getSentAt());
        participants.save(mine.get());
        afterSend(id, me.get(), peer.get(), text.length() > 80 ? text.substring(0, 80) + "..." : text);
        return ResponseEntity.ok(Map.of("id", message.getId()));
    }

    @PostMapping(value = "/conversations/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", defaultValue = "") String caption) throws IOException {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();
        Optional<ConversationParticipant> mine = participants.findByConversationIdAndUserEmail(id, myEmail);
        if (mine.isEmpty()) return forbidden();
        Optional<User> peer = peerOf(id, myEmail);
        if (peer.isEmpty() || !allowed(me.get(), peer.get())) return forbidden();

        String name = file.getOriginalFilename() == null ? "file"
                : file.getOriginalFilename().replaceAll("[\\\\/]", "_");
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1).toLowerCase() : "";
        String text = caption.trim();
        if (file.isEmpty() || file.getSize() > MAX_FILE_BYTES || !ALLOWED_EXTENSIONS.contains(ext)
                || text.length() > 2000) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Allowed files: PDF, PNG, JPG, TXT, DOCX up to 2 MB."));
        }

        Message message = saveMessage(id, myEmail, text);
        MessageAttachment attachment = new MessageAttachment();
        attachment.setMessageId(message.getId());
        attachment.setFileName(name);
        attachment.setContentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        attachment.setSizeBytes(file.getSize());
        attachment.setData(file.getBytes());
        attachments.save(attachment);

        mine.get().setLastReadAt(message.getSentAt());
        participants.save(mine.get());
        afterSend(id, me.get(), peer.get(), text.isEmpty() ? "Sent an attachment: " + name : text);
        return ResponseEntity.ok(Map.of("id", message.getId()));
    }

    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<?> download(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long attachmentId) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        Optional<MessageAttachment> attachment = attachments.findById(attachmentId);
        if (attachment.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "File not found."));
        }
        Optional<Message> message = messages.findById(attachment.get().getMessageId());
        if (message.isEmpty() || participants
                .findByConversationIdAndUserEmail(message.get().getConversationId(), me.get().getEmail())
                .isEmpty()) {
            return forbidden();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(attachment.get().getFileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(attachment.get().getData());
    }

    @PostMapping("/conversations/{id}/read")
    public ResponseEntity<?> markRead(
            @RequestHeader(value = "Authorization", required = false) String auth, @PathVariable Long id) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        Optional<ConversationParticipant> mine =
                participants.findByConversationIdAndUserEmail(id, me.get().getEmail());
        if (mine.isEmpty()) return forbidden();
        mine.get().setLastReadAt(Instant.now());
        participants.save(mine.get());
        return ResponseEntity.ok(Map.of("message", "Read."));
    }

    @PostMapping("/conversations/{id}/mute")
    public ResponseEntity<?> mute(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return setFlag(auth, id, body.getOrDefault("value", true), true);
    }

    @PostMapping("/conversations/{id}/archive")
    public ResponseEntity<?> archive(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        return setFlag(auth, id, body.getOrDefault("value", true), false);
    }

    @PostMapping("/conversations/{id}/report")
    public ResponseEntity<?> report(
            @RequestHeader(value = "Authorization", required = false) String auth,
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();
        if (participants.findByConversationIdAndUserEmail(id, myEmail).isEmpty()) return forbidden();
        String reason = body.getOrDefault("reason", "").trim();
        if (reason.isEmpty() || reason.length() > 500) {
            return ResponseEntity.badRequest().body(Map.of("message", "Enter a reason up to 500 characters."));
        }
        ConversationReport report = new ConversationReport();
        report.setConversationId(id);
        report.setReporterEmail(myEmail);
        report.setReportedEmail(peerOf(id, myEmail).map(User::getEmail).orElse(""));
        report.setReason(reason);
        report.setStatus("OPEN");
        report.setCreatedAt(Instant.now());
        reports.save(report);
        return ResponseEntity.ok(Map.of("message", "Report submitted."));
    }
    // Mentors an employee can request. Status comes from the shared mentorship_requests table.
    @GetMapping("/mentors")
    public ResponseEntity<?> mentors(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> me = currentUser.from(auth).filter(u -> "ROLE_EMPLOYEE".equals(u.getRole()));
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();
        List<MentorshipRequest> mine =
                mentorship.findByEmployeeEmailOrMentorEmailOrderByCreatedAtDesc(myEmail, myEmail);
        List<Map<String, Object>> list = users.findByRole("ROLE_MENTOR").stream()
                .filter(mentor -> mentor.getStatus() == null || "APPROVED".equalsIgnoreCase(mentor.getStatus()))
                .map(m -> {
            String status = "NONE";
            for (MentorshipRequest r : mine) {
                if (!myEmail.equalsIgnoreCase(r.getEmployeeEmail())
                        || !m.getEmail().equalsIgnoreCase(r.getMentorEmail())) continue;
                if ("ACCEPTED".equals(r.getStatus())) { status = "ACCEPTED"; break; }
                if ("PENDING".equals(r.getStatus())) status = "PENDING";
            }
            return Map.<String, Object>of("name", currentUser.displayName(m), "email", m.getEmail(),
                    "status", status);
        }).toList();
        return ResponseEntity.ok(list);
    }

    // Pending mentorship requests for the logged-in mentor, with employee names.
    @GetMapping("/mentor-requests")
    public ResponseEntity<?> mentorRequests(
            @RequestHeader(value = "Authorization", required = false) String auth) {
        Optional<User> me = currentUser.from(auth).filter(u -> "ROLE_MENTOR".equals(u.getRole()));
        if (me.isEmpty()) return unauthorized();
        String myEmail = me.get().getEmail();
        List<Map<String, Object>> list =
                mentorship.findByEmployeeEmailOrMentorEmailOrderByCreatedAtDesc(myEmail, myEmail).stream()
                        .filter(r -> myEmail.equalsIgnoreCase(r.getMentorEmail()) && "PENDING".equals(r.getStatus()))
                        .map(r -> Map.<String, Object>of(
                                "id", r.getId(),
                                "name", users.findByEmail(r.getEmployeeEmail())
                                        .map(currentUser::displayName).orElse(r.getEmployeeEmail()),
                                "message", r.getMessage() == null ? "" : r.getMessage(),
                                "createdAt", r.getCreatedAt().toString()))
                        .toList();
        return ResponseEntity.ok(list);
    }

    private ResponseEntity<?> setFlag(String auth, Long id, boolean value, boolean mute) {
        Optional<User> me = currentUser.from(auth);
        if (me.isEmpty()) return unauthorized();
        Optional<ConversationParticipant> mine =
                participants.findByConversationIdAndUserEmail(id, me.get().getEmail());
        if (mine.isEmpty()) return forbidden();
        if (mute) mine.get().setMuted(value);
        else mine.get().setArchived(value);
        participants.save(mine.get());
        return ResponseEntity.ok(Map.of("message", "Updated."));
    }

    private Message saveMessage(Long conversationId, String senderEmail, String text) {
        Message message = new Message();
        message.setConversationId(conversationId);
        message.setSenderEmail(senderEmail);
        message.setText(text);
        message.setSentAt(Instant.now());
        return messages.save(message);
    }

    // New message: un-archive for the receiver, and notify unless the receiver muted the chat.
    private void afterSend(Long conversationId, User me, User peer, String preview) {
        participants.findByConversationIdAndUserEmail(conversationId, peer.getEmail()).ifPresent(p -> {
            if (Boolean.TRUE.equals(p.getArchived())) {
                p.setArchived(false);
                participants.save(p);
            }
           // if (!Boolean.TRUE.equals(p.getMuted())) {
             //   notifications.notifyUser(peer.getEmail(), "MESSAGE",
               //         "New message from " + currentUser.displayName(me), preview);
            //}
        });
    }

    // Employee-Employee: accepted connection. Employee-Mentor: accepted mentorship request.
    private boolean allowed(User a, User b) {
        if (a.getEmail().equalsIgnoreCase(b.getEmail())) return false;
        boolean aEmp = "ROLE_EMPLOYEE".equals(a.getRole()), bEmp = "ROLE_EMPLOYEE".equals(b.getRole());
        boolean aMen = "ROLE_MENTOR".equals(a.getRole()), bMen = "ROLE_MENTOR".equals(b.getRole());
        if (aEmp && bEmp) {
            return connections.findBetween(a.getEmail(), b.getEmail())
                    .map(c -> "ACCEPTED".equals(c.getStatus())).orElse(false);
        }
        if (aEmp && bMen) return mentored(a.getEmail(), b.getEmail());
        if (aMen && bEmp) return mentored(b.getEmail(), a.getEmail());
        return false;
    }

    private boolean mentored(String employeeEmail, String mentorEmail) {
        //return false;
        return mentorship.findByEmployeeEmailOrMentorEmailOrderByCreatedAtDesc(employeeEmail, employeeEmail)
                .stream()
                .anyMatch(r -> employeeEmail.equalsIgnoreCase(r.getEmployeeEmail())
                        && mentorEmail.equalsIgnoreCase(r.getMentorEmail())
                        && "ACCEPTED".equals(r.getStatus()));
    }

    private Optional<User> peerOf(Long conversationId, String myEmail) {
        return participants.findByConversationId(conversationId).stream()
                .filter(p -> !p.getUserEmail().equalsIgnoreCase(myEmail)).findFirst()
                .flatMap(p -> users.findByEmail(p.getUserEmail()));
    }

    private void addParticipant(Long conversationId, String email) {
        ConversationParticipant p = new ConversationParticipant();
        p.setConversationId(conversationId);
        p.setUserEmail(email);
        participants.save(p);
    }

    private Map<String, Object> person(User u) {
        return Map.of("name", currentUser.displayName(u), "email", u.getEmail(),
                "role", "ROLE_MENTOR".equals(u.getRole()) ? "Mentor" : "Employee");
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Please sign in again."));
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "You are not allowed to access this chat."));
    }
}
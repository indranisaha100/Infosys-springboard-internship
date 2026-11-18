import { Client } from "@stomp/stompjs";
import { API_BASE_URL } from "./api";

// http://localhost:8080/api  ->  ws://localhost:8080/ws   (https -> wss automatically)
// Set VITE_WS_URL in frontend/.env if your socket lives somewhere else.
const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/?$/, "")}/ws`;

/**
 * Opens an authenticated socket to the server and listens to THIS user's private queue.
 *
 * onEvent(event)   -> { type: "MESSAGE" | "READ" | "REFRESH", conversationId? }
 * onStatus(status) -> "connected" | "disconnected" | "error"
 *
 * Returns a function that closes the socket (use it as a React effect cleanup).
 * The socket only carries small signals; the page loads the real data from the REST API.
 */
export function connectChatSocket({ onEvent, onStatus }) {
  const client = new Client({
    brokerURL: WS_URL,
    reconnectDelay: 5000,
    // Runs before every (re)connect so a fresh login token is always used.
    beforeConnect: (stomp) => {
      const token = localStorage.getItem("kgipToken");
      stomp.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    onConnect: () => {
      onStatus("connected");
      client.subscribe("/user/queue/chat", (frame) => {
        try {
          onEvent(JSON.parse(frame.body));
        } catch {
          // Ignore anything that is not valid JSON.
        }
      });
    },
    onWebSocketClose: () => onStatus("disconnected"),
    // The server refused us (missing/expired token, wrong role). Stop retrying; the chat
    // keeps working through the REST fallback polling until the user signs in again.
    onStompError: () => {
      onStatus("error");
      client.deactivate();
    },
  });

  client.activate();
  return () => {
    client.deactivate();
  };
}

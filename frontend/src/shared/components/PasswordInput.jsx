import { useState } from "react";

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="auth-password-wrap">
      <input
        {...props}
        className={`auth-password-input ${props.className || ""}`.trim()}
        type={visible ? "text" : "password"}
      />
      <button
        className="auth-password-toggle"
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
          {!visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </span>
  );
}

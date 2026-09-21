import { useState } from "react";
import { supabase, phoneToEmail } from "../supabaseClient";

export default function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e) => {
    let numeric = e.target.value.replace(/\D/g, "");
    if (numeric.startsWith("20") && numeric.length > 11) {
      numeric = numeric.slice(2);
    }
    setPhone(numeric.slice(0, 11));
  };

  const validateEgyptianPhone = (num) => {
    let clean = num.trim().replace(/\D/g, "");
    if (clean.startsWith("20") && clean.length > 11) {
      clean = clean.slice(2);
    }
    if (clean.length === 10 && /^[1][0125]\d{8}$/.test(clean)) {
      clean = "0" + clean;
    }
    return /^01[0125]\d{8}$/.test(clean);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    let cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.startsWith("20") && cleanPhone.length > 11) {
      cleanPhone = cleanPhone.slice(2);
    }
    if (cleanPhone.length === 10 && /^[1][0125]\d{8}$/.test(cleanPhone)) {
      cleanPhone = "0" + cleanPhone;
    }

    if (!cleanPhone || !password || (mode === "signup" && !username.trim())) {
      setError("Please fill in every field.");
      return;
    }

    if (!validateEgyptianPhone(cleanPhone)) {
      setError(
        "Please enter a valid Egyptian phone number (010, 011, 012, or 015).",
      );
      return;
    }

    setLoading(true);
    const email = phoneToEmail(cleanPhone);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(
          signUpError.message.includes("already registered")
            ? "This phone number already has an account. Try logging in."
            : signUpError.message,
        );
        setLoading(false);
        return;
      }

      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          username: username.trim(),
          phone: cleanPhone,
        });
      }
      setLoading(false);
      onAuthed();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (signInError) {
        setError("Phone number or password is wrong.");
        return;
      }
      onAuthed();
    }
  }

  return (
    <div className="auth-card" id="auth">
      <div className="auth-card-header">
        <h2 className="auth-title">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Sign in with your phone to book or manage your appointments"
            : "Enter your details to book your chair"}
        </p>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "tab active" : "tab"}
          onClick={() => {
            setMode("login");
            setError("");
          }}
        >
          Log in
        </button>
        <button
          type="button"
          className={mode === "signup" ? "tab active" : "tab"}
          onClick={() => {
            setMode("signup");
            setError("");
          }}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className="field-group">
            <label className="field-label">Your name</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Ahmed Ali"
              autoComplete="name"
            />
          </div>
        )}

        <div className="field-group">
          <label className="field-label">Phone number</label>
          <div className="phone-input-wrapper">
            <span className="phone-prefix">+20</span>
            <input
              value={phone}
              onChange={handlePhoneChange}
              placeholder="01012345678"
              type="tel"
              maxLength={11}
              autoComplete="tel"
            />
          </div>
          <span className="field-hint">
            11 digits starting with 010, 011, 012, or 015
          </span>
        </div>

        <div className="field-group">
          <label className="field-label">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />
        </div>

        {error && <div className="msg error">{error}</div>}

        <button
          className="btn btn-primary auth-submit-btn"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Please wait…"
            : mode === "signup"
              ? "Create Account & Book"
              : "Log In to Book"}
        </button>
      </form>
    </div>
  );
}

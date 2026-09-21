import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const DEFAULT_ADMIN_HASH =
  "3f7c5f0a2ddea10c19901b22ed2207ea97b9cd1eb7d948c84943bb590981a51b";
const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 3 * 60 * 1000;

async function hashText(text) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getStoredAdminHash() {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "admin_hash")
      .single();
    if (data?.value) return data.value;
  } catch (err) {}

  const local = localStorage.getItem("fade_admin_hash");
  if (local) return local;

  return DEFAULT_ADMIN_HASH;
}

export default function AdminDashboard({ onClose }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showChangePass, setShowChangePass] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changeMsg, setChangeMsg] = useState({ text: "", type: "" });
  const [savingPass, setSavingPass] = useState(false);

  const [attempts, setAttempts] = useState(() => {
    return parseInt(sessionStorage.getItem("admin_fail_count") || "0", 10);
  });
  const [lockUntil, setLockUntil] = useState(() => {
    return parseInt(sessionStorage.getItem("admin_lock_until") || "0", 10);
  });

  useEffect(() => {
    const isAuthed = sessionStorage.getItem("fade_admin_auth") === "true";
    if (isAuthed) {
      setUnlocked(true);
      fetchBookings();
    }
  }, []);

  async function fetchBookings() {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("booking_date")
      .order("booking_time");
    setBookings(data || []);
    setLoading(false);
  }

  async function unlock() {
    const now = Date.now();
    if (lockUntil && now < lockUntil) {
      const waitSec = Math.ceil((lockUntil - now) / 1000);
      setError(`Too many failed attempts. Locked for ${waitSec}s.`);
      return;
    }

    if (!pass) {
      setError("Please enter the password.");
      return;
    }

    const targetHash = await getStoredAdminHash();
    const hashedInput = await hashText(pass);

    if (hashedInput !== targetHash) {
      const nextCount = attempts + 1;
      setAttempts(nextCount);
      sessionStorage.setItem("admin_fail_count", nextCount.toString());

      if (nextCount >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + LOCK_TIME_MS;
        setLockUntil(lockTime);
        sessionStorage.setItem("admin_lock_until", lockTime.toString());
        setError("Too many failed attempts. Dashboard locked for 3 minutes.");
      } else {
        setError(
          `Invalid credentials. ${MAX_ATTEMPTS - nextCount} attempt(s) remaining.`,
        );
      }
      return;
    }

    sessionStorage.removeItem("admin_fail_count");
    sessionStorage.removeItem("admin_lock_until");
    sessionStorage.setItem("fade_admin_auth", "true");
    setUnlocked(true);
    setError("");
    fetchBookings();
  }

  function handleLock() {
    sessionStorage.removeItem("fade_admin_auth");
    setUnlocked(false);
    setPass("");
    setShowChangePass(false);
  }

  async function handleSaveNewPassword(e) {
    e.preventDefault();
    setChangeMsg({ text: "", type: "" });

    if (!oldPass || !newPass || !confirmPass) {
      setChangeMsg({
        text: "Please fill in all password fields.",
        type: "error",
      });
      return;
    }

    if (newPass.length < 6) {
      setChangeMsg({
        text: "New password must be at least 6 characters.",
        type: "error",
      });
      return;
    }

    if (newPass !== confirmPass) {
      setChangeMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }

    setSavingPass(true);
    const currentHash = await getStoredAdminHash();
    const oldHashed = await hashText(oldPass);

    if (oldHashed !== currentHash) {
      setChangeMsg({ text: "Current password is incorrect.", type: "error" });
      setSavingPass(false);
      return;
    }

    const newHashed = await hashText(newPass);
    localStorage.setItem("fade_admin_hash", newHashed);

    try {
      await supabase
        .from("app_settings")
        .upsert({ key: "admin_hash", value: newHashed });
    } catch (err) {}

    setSavingPass(false);
    setChangeMsg({
      text: "Password changed successfully! Remember your new password.",
      type: "ok",
    });
    setOldPass("");
    setNewPass("");
    setConfirmPass("");
  }

  return (
    <div className="admin-overlay">
      <button
        className="close-admin"
        onClick={onClose}
        aria-label="Close dashboard"
      >
        ×
      </button>
      {!unlocked ? (
        <div className="admin-gate">
          <div className="admin-gate-card">
            <h2>Barber Access</h2>
            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: ".9rem",
                margin: "8px 0 20px",
              }}
            >
              Restricted area for schedule management
            </p>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Master Password"
              onKeyDown={(e) => {
                if (e.key === "Enter") unlock();
              }}
              disabled={lockUntil && Date.now() < lockUntil}
            />
            <button
              className="btn btn-primary"
              onClick={unlock}
              style={{ width: "100%", marginTop: 12 }}
              disabled={lockUntil && Date.now() < lockUntil}
            >
              Authenticate
            </button>
            {error && <div className="msg error">{error}</div>}
          </div>
        </div>
      ) : (
        <div className="admin-panel">
          <div className="wrap">
            <div className="admin-header-row">
              <div>
                <h2>All Bookings</h2>
                <p className="section-desc">
                  Live schedule feed from customers
                </p>
              </div>
              <div className="admin-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowChangePass(!showChangePass);
                    setChangeMsg({ text: "", type: "" });
                  }}
                >
                  {showChangePass ? "Back to Bookings" : "Change Password"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={fetchBookings}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleLock}
                >
                  Lock Session
                </button>
              </div>
            </div>

            {showChangePass ? (
              <div className="change-pass-card">
                <h3>Change Master Password</h3>
                <p
                  style={{
                    color: "var(--ink-soft)",
                    fontSize: ".9rem",
                    margin: "6px 0 20px",
                  }}
                >
                  The owner can update the access password at any time
                </p>
                <form onSubmit={handleSaveNewPassword}>
                  <div className="field-group">
                    <label className="field-label">Current Password</label>
                    <input
                      type="password"
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">New Password</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>

                  {changeMsg.text && (
                    <div
                      className={`msg ${changeMsg.type}`}
                      style={{ marginBottom: 16 }}
                    >
                      {changeMsg.text}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={savingPass}
                      style={{ flex: "1 1 auto" }}
                    >
                      {savingPass ? "Saving…" : "Update Password"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setShowChangePass(false)}
                      style={{ flex: "1 1 auto" }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {loading && (
                  <p style={{ color: "var(--accent)", marginTop: 24 }}>
                    Loading appointments…
                  </p>
                )}
                {!loading && bookings.length === 0 && (
                  <div className="empty-state" style={{ marginTop: 24 }}>
                    <p>No bookings found.</p>
                  </div>
                )}

                <div className="admin-bookings-list" style={{ marginTop: 24 }}>
                  {bookings.map((b) => (
                    <div className="booking-row admin-booking-row" key={b.id}>
                      <div className="info">
                        <div className="client-name">{b.name}</div>
                        <div className="client-details">
                          <span className="phone-tag">{b.phone}</span>
                          <span className="time-tag">
                            {b.booking_date} at {b.booking_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

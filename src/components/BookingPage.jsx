import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const HOURS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextDays(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function fmtLabel(d, i) {
  return i === 0
    ? "Today"
    : `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export default function BookingPage({ user, profile }) {
  const days = nextDays(7);
  const [selectedDay, setSelectedDay] = useState(fmtDate(days[0]));
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedTimes, setBookedTimes] = useState(new Set());
  const [myBookings, setMyBookings] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBookedTimes(selectedDay);
  }, [selectedDay]);

  useEffect(() => {
    loadMyBookings();
  }, []);

  async function loadBookedTimes(date) {
    const { data } = await supabase
      .from("bookings")
      .select("booking_time")
      .eq("booking_date", date);
    setBookedTimes(new Set((data || []).map((r) => r.booking_time)));
  }

  async function loadMyBookings() {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("booking_date")
      .order("booking_time");
    setMyBookings(data || []);
  }

  async function confirmBooking() {
    setMsg({ text: "", type: "" });
    if (!selectedTime) {
      setMsg({ text: "Pick a time first.", type: "error" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      user_id: user.id,
      name: profile?.username || "Guest",
      phone: profile?.phone || "",
      booking_date: selectedDay,
      booking_time: selectedTime,
      status: "confirmed",
    });
    setSubmitting(false);
    if (error) {
      setMsg({
        text:
          error.code === "23505"
            ? "That slot was just taken — pick another."
            : "Something went wrong, try again.",
        type: "error",
      });
      if (error.code === "23505") loadBookedTimes(selectedDay);
      return;
    }
    setSelectedTime(null);
    setMsg({ text: "Booked! See your appointment below.", type: "ok" });
    loadBookedTimes(selectedDay);
    loadMyBookings();
  }

  async function cancelBooking(id) {
    await supabase.from("bookings").delete().eq("id", id);
    loadMyBookings();
    loadBookedTimes(selectedDay);
  }

  return (
    <div className="wrap">
      <section id="booking">
        <div className="section-header">
          <h2>Reserve Your Slot</h2>
          <p className="section-desc">
            Select your preferred date and available hour below.
          </p>
        </div>

        <label className="field-label">Select Date</label>
        <div className="chip-row">
          {days.map((d, i) => {
            const val = fmtDate(d);
            return (
              <button
                key={val}
                type="button"
                className={selectedDay === val ? "chip active" : "chip"}
                onClick={() => {
                  setSelectedDay(val);
                  setSelectedTime(null);
                }}
              >
                {fmtLabel(d, i)}
              </button>
            );
          })}
        </div>

        <label className="field-label">Available Time</label>
        <div className="slot-grid">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              disabled={bookedTimes.has(h)}
              className={selectedTime === h ? "chip active" : "chip"}
              onClick={() => setSelectedTime(h)}
            >
              {h}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 28 }}
          onClick={confirmBooking}
          disabled={submitting}
        >
          {submitting ? "Booking…" : "Confirm Booking"}
        </button>
        {msg.text && <div className={`msg ${msg.type}`}>{msg.text}</div>}
      </section>

      <section>
        <div className="section-header">
          <h2>Upcoming Bookings</h2>
        </div>

        {myBookings.length === 0 && (
          <div className="empty-state">
            <p>You have no active appointments booked yet.</p>
          </div>
        )}

        {myBookings.map((b) => (
          <div className="booking-row booking-receipt" key={b.id}>
            <div className="info">
              <div className="receipt-header">
                <span className="booking-tag">Confirmed</span>
              </div>

              <div className="receipt-name">{b.name}</div>

              <div className="receipt-grid">
                <div>
                  <span className="receipt-label">Phone</span>
                  <span className="receipt-value">{b.phone}</span>
                </div>
                <div>
                  <span className="receipt-label">Date</span>
                  <span className="receipt-value">{b.booking_date}</span>
                </div>
                <div>
                  <span className="receipt-label">Time</span>
                  <span className="receipt-value">{b.booking_time}</span>
                </div>
              </div>
            </div>
            <button className="cancel-btn" onClick={() => cancelBooking(b.id)}>
              Cancel
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

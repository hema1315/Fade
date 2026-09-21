import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Hero from "./components/Hero";
import AuthForm from "./components/AuthForm";
import BookingPage from "./components/BookingPage";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => setProfile(data));
    } else {
      setProfile(null);
    }
  }, [session]);

  function logout() {
    supabase.auth.signOut();
  }

  if (checking) return null;

  return (
    <div className="app-container">
      <header className="top">
        <div className="wrap header-wrap">
          <div className="brand">Fade</div>

          <nav className="header-nav">
            {session ? (
              <div className="user-pill">
                <span className="greeting">
                  Hi, <strong>{profile?.username || "Client"}</strong>
                </span>
                <button
                  type="button"
                  className="nav-logout-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    logout();
                  }}
                >
                  Log out
                </button>
              </div>
            ) : (
              <a href="#auth" className="nav-login-link">
                Sign in / Register
              </a>
            )}
          </nav>
        </div>
      </header>

      <Hero session={session} />

      <main className="main-content">
        {session ? (
          <BookingPage user={session.user} profile={profile} />
        ) : (
          <div className="wrap auth-section-wrap">
            <AuthForm onAuthed={() => {}} />
          </div>
        )}
      </main>

      <footer>
        <div className="wrap footer-content">
          <div className="footer-brand">
            <div className="brand">Fade</div>
            <p className="footer-hours">
              Daily from 10:00 AM – 10:00 PM • Alexandria, Egypt
            </p>
          </div>
          <div className="footer-links">
            <a
              href="#"
              className="admin-link"
              onClick={(e) => {
                e.preventDefault();
                setShowAdmin(true);
              }}
            >
              Barber Control ↗
            </a>
          </div>
        </div>
      </footer>

      {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

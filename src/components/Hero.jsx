import { useState, useRef } from "react";
import heroVideo from "../../vid.mp4";

export default function Hero({ session }) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <section className="hero">
      <div className="hero-video-bg-container">
        <video
          ref={videoRef}
          className="hero-video-bg"
          src={heroVideo || "/vid.mp4"}
          autoPlay
          loop
          muted={isMuted}
          playsInline
        />
        <div className="hero-video-overlay" />
      </div>

      <div className="wrap hero-inner">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="line">SHARP CUTS.</span>
            <span className="line highlight">NO WAITING.</span>
          </h1>

          <p className="hero-sub">
            Pick a day, pick an hour, walk in ready. Your chair is waiting.
          </p>

          <div className="hero-actions">
            <a
              href={session ? "#booking" : "#auth"}
              className="btn btn-primary"
            >
              Book Your Chair
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

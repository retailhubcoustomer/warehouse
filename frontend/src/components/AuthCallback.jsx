import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, dashboardPath } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const session_id = params.get("session_id");
    if (!session_id) {
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await api.post(
          "/auth/google/session",
          { session_id },
          { headers: { "X-Session-ID": session_id } }
        );
        setUser(data.user);
        // clear hash from URL
        window.history.replaceState(null, "", window.location.pathname);
        navigate(dashboardPath(data.user.role), { replace: true, state: { user: data.user } });
      } catch (e) {
        console.error("Google auth failed", e);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-sm tracking-widest uppercase text-zinc-500">
        Finishing sign-in…
      </div>
    </div>
  );
}

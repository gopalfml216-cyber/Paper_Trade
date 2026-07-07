import { createClient as createBrowserClient } from "./client";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: string;
  virtual_cash_balance: number;
  is_active: boolean;
  created_at: string;
}

const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
const MOCK_COOKIE_NAME = "paper-trade-session";

export const authClient = {
  isMockAuth(): boolean {
    return isMock;
  },

  async signUp(email: string, password: string, displayName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    if (isMock) {
      try {
        const res = await fetch("/api/auth/mock-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName }),
        });

        if (!res.ok) {
          const errData = await res.json();
          return { user: null, error: errData.error || "Sign up failed." };
        }

        const profile: UserProfile = await res.json();
        return { user: profile, error: null };
      } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred." };
      }
    } else {
      try {
        const supabase = createBrowserClient();
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError || !signUpData.user) {
          return { user: null, error: signUpError?.message || "Sign up failed." };
        }

        const userUuid = signUpData.user.id;

        const res = await fetch("/api/auth/profile-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userUuid,
            email,
            displayName,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          return { user: null, error: errData.error || "Profile creation failed." };
        }

        const profile: UserProfile = await res.json();
        return { user: profile, error: null };
      } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred." };
      }
    }
  },

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error: string | null }> {
    if (isMock) {
      try {
        const res = await fetch("/api/auth/mock-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const errData = await res.json();
          return { user: null, error: errData.error || "Sign in failed." };
        }

        const profile: UserProfile = await res.json();
        return { user: profile, error: null };
      } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred." };
      }
    } else {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) {
          return { user: null, error: error?.message || "Invalid credentials." };
        }

        const res = await fetch(`/api/auth/profile?id=${data.user.id}`);
        if (!res.ok) {
          return { user: null, error: "Failed to load user profile." };
        }

        const profile: UserProfile = await res.json();
        return { user: profile, error: null };
      } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred." };
      }
    }
  },

  async signInWithGoogle(email: string, displayName: string): Promise<{ user: UserProfile | null; error: string | null }> {
    if (isMock) {
      try {
        const res = await fetch("/api/auth/mock-google-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, displayName }),
        });

        if (!res.ok) {
          const errData = await res.json();
          return { user: null, error: errData.error || "Google login failed." };
        }

        const profile: UserProfile = await res.json();
        return { user: profile, error: null };
      } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred." };
      }
    } else {
      try {
        const supabase = createBrowserClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        if (error) return { user: null, error: error.message };
        return { user: null, error: null }; // redirects automatically
      } catch (err: any) {
        return { user: null, error: err.message || "An unexpected error occurred." };
      }
    }
  },

  async signOut(): Promise<{ error: string | null }> {
    if (isMock) {
      if (typeof window !== "undefined") {
        document.cookie = `${MOCK_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
      return { error: null };
    } else {
      try {
        const supabase = createBrowserClient();
        const { error } = await supabase.auth.signOut();
        return { error: error?.message || null };
      } catch (err: any) {
        return { error: err.message || "An unexpected error occurred." };
      }
    }
  }
};

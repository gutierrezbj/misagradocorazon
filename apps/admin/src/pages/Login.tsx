import { useState, type FormEvent } from "react";

import { useAuth } from "../auth.tsx";
import { useI18n } from "../i18n.tsx";

export function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await login(email.trim(), password);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark" aria-hidden />
          <span className="muted">{t("appName")}</span>
        </div>
        <h1>{t("signInTitle")}</h1>
        <label className="field">
          {t("email")}
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          {t("password")}
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{t("badCredentials")}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {t("signIn")}
        </button>
      </form>
    </div>
  );
}

export function Forbidden() {
  const { logout } = useAuth();
  const { t } = useI18n();
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>{t("forbiddenTitle")}</h1>
        <p>{t("forbiddenBody")}</p>
        <button className="btn" type="button" onClick={() => void logout()}>
          {t("logout")}
        </button>
      </div>
    </div>
  );
}

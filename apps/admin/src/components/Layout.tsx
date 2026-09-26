import { NavLink, Outlet } from "react-router";

import { can, useAuth } from "../auth.tsx";
import { useI18n, type I18nKey } from "../i18n.tsx";

export function Layout() {
  const { me, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const links: { to: string; label: I18nKey; show: boolean }[] = [
    { to: "/", label: "navDashboard", show: true },
    { to: "/moderacion", label: "navModeration", show: can(me, "moderator") },
    { to: "/causas", label: "navCauses", show: can(me, "editor") },
    { to: "/misas", label: "navMasses", show: can(me, "editor") },
    { to: "/usuarios", label: "navUsers", show: can(me) },
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div>
            <div className="brand-name">{t("appName")}</div>
            <div className="brand-sub">{t("panel")}</div>
          </div>
        </div>
        <nav className="nav">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"}>
                {t(l.label)}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-foot">
          <div>
            {me?.name} · {me ? t(`role_${me.role}` as I18nKey) : ""}
          </div>
          <div className="segmented" role="group" aria-label={t("language")}>
            {(["es", "en"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void logout()}>
            {t("logout")}
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

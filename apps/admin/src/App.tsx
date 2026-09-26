import { Navigate, Route, Routes } from "react-router";

import { can, isStaff, useAuth } from "./auth.tsx";
import { Layout } from "./components/Layout.tsx";
import { useI18n } from "./i18n.tsx";
import { Causes } from "./pages/Causes.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { Forbidden, Login } from "./pages/Login.tsx";
import { Masses } from "./pages/Masses.tsx";
import { Moderation } from "./pages/Moderation.tsx";
import { Users } from "./pages/Users.tsx";

export function App() {
  const { status, me } = useAuth();
  const { t } = useI18n();
  if (status === "loading") return <p className="muted" style={{ padding: 32 }}>{t("loading")}</p>;
  if (status === "anonymous" || !me) return <Login />;
  if (!isStaff(me.role)) return <Forbidden />;
  // El backend vuelve a comprobar cada permiso: esto solo evita mostrar pantallas que darían 403.
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        {can(me, "moderator") && <Route path="moderacion" element={<Moderation />} />}
        {can(me, "editor") && <Route path="causas" element={<Causes />} />}
        {can(me, "editor") && <Route path="misas" element={<Masses />} />}
        {can(me) && <Route path="usuarios" element={<Users />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

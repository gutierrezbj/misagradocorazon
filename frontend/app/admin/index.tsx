import { View, Text, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { AdminShell } from "@/src/components/admin";
import { Icon } from "@/src/components/ui";

const TILES = [
  { route: "/admin/moderation", icon: "shield", label: "Moderación", roles: ["moderator", "superadmin"] },
  { route: "/admin/causes", icon: "heart", label: "Causas", roles: ["editor", "superadmin"] },
  { route: "/admin/masses", icon: "video", label: "Misas", roles: ["editor", "superadmin"] },
  { route: "/admin/content", icon: "book", label: "Santoral y contenido", roles: ["editor", "superadmin"] },
  { route: "/admin/transparency", icon: "bar-chart-2", label: "Transparencia", roles: ["editor", "superadmin"] },
  { route: "/admin/users", icon: "users", label: "Usuarios", roles: ["superadmin"] },
  { route: "/admin/push", icon: "bell", label: "Notificaciones", roles: ["editor", "moderator", "superadmin"] },
];

export default function AdminDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role ?? "user";

  const { data } = useQuery({ queryKey: ["admin", "metrics"], queryFn: () => api("/admin/metrics") });
  const m = data ?? {};

  const visible = TILES.filter((tt) => role === "superadmin" || tt.roles.includes(role));

  return (
    <AdminShell title="Panel de gestión">
      <Text style={styles.welcome}>Hola, {user?.name}</Text>

      <View style={styles.metricsGrid}>
        <Metric label="Usuarios" value={m.total_users ?? 0} icon="users" />
        <Metric label="Velas" value={m.total_candles ?? 0} icon="feather" />
        <Metric label="Ingresos (sim.)" value={`$${m.candle_revenue ?? 0}`} icon="dollar-sign" />
        <Metric label="Votos" value={m.votes_count ?? 0} icon="check-circle" />
        <Metric label="Intenciones" value={m.intentions_count ?? 0} icon="message-circle" />
        <Metric label="Por revisar" value={m.pending_intentions ?? 0} icon="alert-circle" highlight={(m.pending_intentions ?? 0) > 0} />
      </View>

      {m.candles_by_saint?.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Velas por santo</Text>
          {m.candles_by_saint.map((row: any) => {
            const max = m.candles_by_saint[0].count || 1;
            return (
              <View key={row.saint} style={styles.barRow}>
                <Text style={styles.barLabel} numberOfLines={1}>{row.saint}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(row.count / max) * 100}%` }]} />
                </View>
                <Text style={styles.barValue}>{row.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Gestión</Text>
      <View style={styles.tilesGrid}>
        {visible.map((tt) => (
          <Pressable key={tt.route} testID={`tile-${tt.icon}`} onPress={() => router.push(tt.route as any)} style={styles.tile}>
            <View style={styles.tileIcon}>
              <Icon name={tt.icon as any} size={24} color={colors.gold} />
            </View>
            <Text style={styles.tileLabel}>{tt.label}</Text>
          </Pressable>
        ))}
      </View>
    </AdminShell>
  );
}

function Metric({ label, value, icon, highlight }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, highlight && { borderColor: colors.brandSecondary, borderWidth: 2 }]}>
      <Icon name={icon} size={18} color={colors.brand} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  welcome: { fontFamily: fonts.displayBold, fontSize: 24, color: c.onSurface, marginBottom: spacing.md },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { width: "31.5%", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: c.border },
  metricValue: { fontFamily: fonts.displayBold, fontSize: 24, color: c.onSurface, marginTop: 4 },
  metricLabel: { fontFamily: fonts.body, fontSize: 12, color: c.muted },
  chartCard: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: c.border },
  chartTitle: { fontFamily: fonts.displaySemibold, fontSize: 18, color: c.onSurface, marginBottom: spacing.sm },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 6 },
  barLabel: { fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceSecondary, width: 110 },
  barTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: c.brandSecondary, borderRadius: 6 },
  barValue: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.onSurface, width: 30, textAlign: "right" },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  tilesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "31.5%", aspectRatio: 1, backgroundColor: c.altarBg, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.sm },
  tileIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.altarCard, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: c.onAltar, textAlign: "center" },
}));

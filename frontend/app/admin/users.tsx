import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { AdminShell, AdminCard } from "@/src/components/admin";
import { Icon, useToast } from "@/src/components/ui";

const ROLES = ["user", "moderator", "editor", "superadmin"];

export default function AdminUsers() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [search, setSearch] = useState("");

  const { data } = useQuery({ queryKey: ["admin", "users", search], queryFn: () => api(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`) });
  const users = data?.users ?? [];

  const roleMut = useMutation({
    mutationFn: ({ id, role }: any) => api(`/admin/users/${id}/role`, { method: "POST", body: { role } }),
    onSuccess: () => {
      toast("Rol actualizado", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
  const blockMut = useMutation({
    mutationFn: ({ id, blocked }: any) => api(`/admin/users/${id}/block`, { method: "POST", body: { blocked } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  return (
    <AdminShell title="Usuarios">
      <TextInput
        testID="user-search-input"
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por nombre o correo"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />
      {users.map((u: any) => (
        <AdminCard key={u.user_id}>
          <View style={styles.userTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{u.name}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
            </View>
            <Pressable
              testID={`block-${u.user_id}`}
              onPress={() => blockMut.mutate({ id: u.user_id, blocked: !u.blocked })}
              style={[styles.blockBtn, u.blocked && { backgroundColor: colors.error }]}
            >
              <Icon name={u.blocked ? "lock" : "unlock"} size={16} color={u.blocked ? colors.onError : colors.onSurfaceSecondary} />
            </Pressable>
          </View>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <Pressable key={r} onPress={() => roleMut.mutate({ id: u.user_id, role: r })} style={[styles.roleChip, u.role === r && { backgroundColor: colors.brandPrimary }]}>
                <Text style={[styles.roleText, u.role === r && { color: colors.onBrandPrimary }]}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const useStyles = makeStyles((c) => ({
  search: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.sm + 2, fontFamily: fonts.body, fontSize: 15, color: c.onSurface, backgroundColor: c.surfaceSecondary, marginBottom: spacing.md },
  userTop: { flexDirection: "row", alignItems: "center" },
  userName: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface },
  userEmail: { fontFamily: fonts.body, fontSize: 13, color: c.muted },
  blockBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  roleChip: { backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  roleText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: c.onSurfaceSecondary },
}));

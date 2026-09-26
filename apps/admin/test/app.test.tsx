import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { App } from "../src/App.tsx";
import { AuthProvider } from "../src/auth.tsx";
import { BarList, ColumnChart } from "../src/components/charts.tsx";
import { I18nProvider } from "../src/i18n.tsx";

function renderApp() {
  return render(
    <I18nProvider>
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <MemoryRouter>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
}

function mockMe(role: string) {
  sessionStorage.setItem("msc.admin.token", "t");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.endsWith("/api/me")) return new Response(JSON.stringify({ data: { id: "u1", name: "Ana", email: "a@x.com", role }, error: null }));
      return new Response(JSON.stringify({ data: null, error: { code: "x", message: "x" } }), { status: 500 });
    }),
  );
}

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("acceso al panel", () => {
  test("sin sesión muestra el acceso del equipo", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: "Acceso del equipo" })).toBeTruthy();
  });

  test("un fiel sin rol de gestión no entra", async () => {
    mockMe("user");
    renderApp();
    expect(await screen.findByRole("heading", { name: "Sin acceso al panel" })).toBeTruthy();
  });

  test("un moderador ve Resumen y Moderación, pero no Causas ni Usuarios", async () => {
    mockMe("moderator");
    renderApp();
    expect(await screen.findByRole("link", { name: "Moderación" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Causas" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Usuarios" })).toBeNull();
  });

  test("un superadmin ve todas las secciones", async () => {
    mockMe("superadmin");
    renderApp();
    for (const name of ["Resumen", "Moderación", "Causas", "Misas", "Usuarios"]) {
      expect(await screen.findByRole("link", { name })).toBeTruthy();
    }
  });
});

describe("gráficos", () => {
  test("columnas sin datos no rompen y dibujan el eje", () => {
    const { container } = render(<ColumnChart ariaLabel="Velas" data={[{ label: "1", value: 0 }]} />);
    expect(container.querySelectorAll("path.bar")).toHaveLength(0);
    expect(container.querySelectorAll("line.grid-line").length).toBeGreaterThan(0);
  });

  test("lista de barras sin datos muestra el mensaje vacío", () => {
    render(
      <I18nProvider>
        <BarList ariaLabel="x" data={[{ label: "a", value: 0 }]} />
      </I18nProvider>,
    );
    expect(screen.getByText("Sin datos todavía")).toBeTruthy();
  });
});

import { assertEquals } from "jsr:@std/assert";
import {
  canSendDemoRecovery,
  demoDaysRemaining,
  hasPaidPlan,
  isDemoAccessActive,
  recoveryEmailIsCoolingDown,
} from "./demoEngagement.ts";

const NOW = new Date("2026-08-15T12:00:00Z").getTime();

Deno.test("permite recuperar demos sin ingreso o con más de diez días", () => {
  assertEquals(canSendDemoRecovery(null, NOW), true);
  assertEquals(canSendDemoRecovery("2026-08-04T11:59:59Z", NOW), true);
  assertEquals(canSendDemoRecovery("2026-08-05T12:00:00Z", NOW), false);
});

Deno.test("considera activo sólo un demo vigente y habilitado", () => {
  assertEquals(isDemoAccessActive({ pago_activo: true, subscription_status: "activo", fecha_vencimiento_suscripcion: "2026-08-20T00:00:00Z" }, NOW), true);
  assertEquals(isDemoAccessActive({ pago_activo: true, subscription_status: "activo", fecha_vencimiento_suscripcion: "2026-08-10T00:00:00Z" }, NOW), false);
});

Deno.test("calcula días restantes redondeando cualquier fracción como día disponible", () => {
  assertEquals(demoDaysRemaining("2026-08-16T12:00:00Z", NOW), 1);
  assertEquals(demoDaysRemaining("2026-08-20T00:00:00Z", NOW), 5);
  assertEquals(demoDaysRemaining("2026-08-15T11:59:59Z", NOW), 0);
  assertEquals(demoDaysRemaining(null, NOW), 0);
});

Deno.test("impide repetir el correo durante veinticuatro horas", () => {
  assertEquals(recoveryEmailIsCoolingDown("2026-08-15T00:00:01Z", NOW), true);
  assertEquals(recoveryEmailIsCoolingDown("2026-08-14T11:59:59Z", NOW), false);
});

Deno.test("distingue planes pagados de demos y cuentas sin plan", () => {
  assertEquals(hasPaidPlan("mensual"), true);
  assertEquals(hasPaidPlan("anual"), true);
  assertEquals(hasPaidPlan("demo"), false);
  assertEquals(hasPaidPlan("inactivo"), false);
  assertEquals(hasPaidPlan(null), false);
});

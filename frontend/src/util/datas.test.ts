import { expect, test } from "vitest";
import { tempoDesde } from "./datas";

const agora = new Date("2026-10-04T15:00:00-03:00");

test.each([
  ["2026-10-04T14:59:40-03:00", "agora"],
  ["2026-10-04T14:35:00-03:00", "há 25 min"],
  ["2026-10-04T10:00:00-03:00", "há 5 h"],
  ["2026-10-03T09:00:00-03:00", "ontem"],
  ["2026-10-01T12:00:00-03:00", "há 3 dias"],
  ["2026-09-20T21:00:00-03:00", "20 de set. de 2026"],
])("%s → %s", (iso, esperado) => {
  expect(tempoDesde(iso, agora)).toBe(esperado);
});

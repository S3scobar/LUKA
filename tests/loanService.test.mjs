// Cálculo de préstamos: cuota (sistema francés), saldo, progreso y próxima fecha.
// Ejecutar: node --import ./tests/helpers/register.mjs --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { loanService, isMissingLoansTable } from "../js/services/loanService.js";

const calc = (loan) => loanService.calculateSummary({ payments: [], ...loan });

test("sin interés, la cuota es el capital dividido entre las cuotas", () => {
  const s = calc({ principal: 1_200_000, installments: 12, interest_rate_ea: 0 });
  assert.equal(s.installmentAmount, 100_000);
  assert.equal(s.totalToPay, 1_200_000);
  assert.equal(s.progress, 0);
});

test("con interés, la cuota sigue la fórmula del sistema francés", () => {
  // 1,01^12 - 1 = 12,6825 % E.A. equivale a 1 % mensual exacto
  const ea = (Math.pow(1.01, 12) - 1) * 100;
  const s = calc({ principal: 1_000_000, installments: 12, interest_rate_ea: ea });
  assert.equal(s.installmentAmount, 88_849); // 88.848,79 redondeado
  assert.equal(s.monthlyRatePercentage, "1.00");
});

test("un pago parcial avanza cuotas y calcula lo que falta de la cuota en curso", () => {
  const s = calc({
    principal: 1_200_000, installments: 12, interest_rate_ea: 0,
    payments: [{ amount: 250_000 }]
  });
  assert.equal(s.installmentsPaid, 2);
  assert.equal(s.remaining, 950_000);
  assert.equal(s.nextPaymentAmount, 50_000);
  assert.equal(s.progress, 21);
});

test("un préstamo pagado por completo no tiene próxima fecha ni saldo", () => {
  const s = calc({
    principal: 1_200_000, installments: 12, interest_rate_ea: 0, first_due_date: "2026-01-15",
    payments: [{ amount: 1_200_000 }]
  });
  assert.equal(s.isPaid, true);
  assert.equal(s.remaining, 0);
  assert.equal(s.nextDueDate, null);
});

test("la próxima fecha respeta el fin de mes (31 ene + 1 mes = 28 feb)", () => {
  const s = calc({
    principal: 1_200_000, installments: 12, interest_rate_ea: 0, first_due_date: "2026-01-31",
    payments: [{ amount: 100_000 }]
  });
  assert.equal(s.nextDueDate, "2026-02-28");
});

test("sin cuotas se paga el capital completo y la fecha no se mueve", () => {
  const s = calc({ principal: 500_000, installments: null, first_due_date: "2099-06-10" });
  assert.equal(s.installmentAmount, 0);
  assert.equal(s.totalToPay, 500_000);
  assert.equal(s.nextDueDate, "2099-06-10");
});

test("detecta préstamos vencidos y no vencidos", () => {
  assert.equal(calc({ principal: 100_000, first_due_date: "2020-01-15" }).isOverdue, true);
  assert.equal(calc({ principal: 100_000, first_due_date: "2099-01-15" }).isOverdue, false);
});

test("reconoce el error de tabla de préstamos inexistente", () => {
  assert.equal(isMissingLoansTable({ code: "42P01", message: "" }), true);
  assert.equal(isMissingLoansTable({ code: "PGRST205", message: "" }), true);
  assert.equal(isMissingLoansTable({ code: "23505", message: "duplicate key" }), false);
});

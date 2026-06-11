const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

function loadApp() {
  const code = fs.readFileSync("app.js", "utf8");
  const sandbox = {
    console,
    document: {
      addEventListener() {},
      getElementById() {
        return { value: "150" };
      },
      querySelectorAll() {
        return [];
      },
      documentElement: { dataset: {} },
    },
    navigator: {},
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    window: {
      addEventListener() {},
      confirm() {
        return true;
      },
      crypto: { randomUUID: () => "test-id" },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

const app = loadApp();

function forecast(events, options = {}) {
  return app.generateForecast(
    {
      currentBalance: options.balance ?? 1000,
      forecastYears: 1,
      events,
    },
    {
      startDate: options.start ?? "2026-01-01",
      days: options.days ?? 90,
      scenario: options.scenario,
    }
  );
}

{
  const result = forecast(
    [
      { name: "Prior income", amount: 500, type: "income", startDate: "2025-12-31", recurrence: "none" },
      { name: "Today bill", amount: 200, type: "expense", startDate: "2026-01-01", recurrence: "none" },
    ],
    { balance: 1000, days: 1 }
  );

  assert.equal(result.openingBalance, 1500);
  assert.equal(result.daily[0].endingBalance, 1300);
}

{
  const result = forecast(
    [{ name: "Old paycheck", amount: 1000, type: "income", startDate: "2025-12-01", recurrence: "weekly" }],
    { balance: 1000, days: 1 }
  );

  assert.equal(result.openingBalance, 1000);
  assert.equal(result.daily[0].income, 0);
}

{
  const result = forecast(
    [{ name: "Month end", amount: 100, type: "expense", startDate: "2026-01-31", recurrence: "monthly" }],
    { start: "2026-01-31", days: 62 }
  );

  assert.equal(result.daily.find((day) => day.date === "2026-01-31").expenses, 100);
  assert.equal(result.daily.find((day) => day.date === "2026-02-28").expenses, 100);
  assert.equal(result.daily.find((day) => day.date === "2026-03-31").expenses, 100);
}

{
  const result = forecast(
    [{ name: "Leap", amount: 100, type: "expense", startDate: "2024-02-29", recurrence: "yearly" }],
    { start: "2027-02-27", days: 3 }
  );

  assert.equal(result.daily.find((day) => day.date === "2027-02-28").expenses, 100);
}

{
  const result = forecast(
    [{ name: "Ends", amount: 100, type: "expense", startDate: "2026-01-01", recurrence: "weekly", endDate: "2026-01-08" }],
    { days: 15 }
  );

  assert.equal(result.daily.find((day) => day.date === "2026-01-08").expenses, 100);
  assert.equal(result.daily.find((day) => day.date === "2026-01-15").expenses, 0);
}

{
  const result = forecast(
    [{ name: "Pay", amount: 1000, type: "income", startDate: "2026-01-01", recurrence: "weekly" }],
    { balance: 0, days: 14, scenario: { jobLossDuration: 1 } }
  );

  assert.equal(result.daily.find((day) => day.date === "2026-01-01").income, 0);
}

assert.equal(app.moneyValue("-25"), 0);
assert.equal(app.signedMoneyValue("-25"), -25);

{
  const schedule = app.buildSnowballSchedule(
    [
      { name: "Card A", balance: 1800, min: 60 },
      { name: "Card B", balance: 4200, min: 120 },
    ],
    150
  );

  assert.equal(schedule.length, 19);
  assert.equal(schedule[0].amount, 330);
  assert.equal(schedule[schedule.length - 1].amount, 60);
}

{
  const result = forecast(
    [
      { name: "Paycheck", amount: 2500, type: "income", startDate: "2026-01-02", recurrence: "none" },
      { name: "Rent", amount: 1200, type: "expense", startDate: "2026-01-03", recurrence: "none" },
    ],
    { balance: 1000, days: 31 }
  );
  const report = app.buildReportModel(result);

  assert.equal(report.openingBalance, 1000);
  assert.equal(report.upcomingEvents.length, 2);
  assert.equal(report.nextIncome.date, "2026-01-02");
  assert.equal(report.totalIncome, 2500);
  assert.equal(report.totalExpenses, 1200);
  assert.ok(app.renderReportHtml(report).includes("<th>Ending</th>"));
}

console.log("forecast-engine tests passed");

const STORAGE_KEY = "cash-runway-v1";
const FORECAST_DAYS = 365;
const DEFAULT_SCENARIO = {
  jobLossDuration: 0,
  emergencyExpense: 0,
  spendingReduction: 0,
  extraDebtPayment: 0,
  incomeIncrease: 0,
  newCarPayment: 0,
  insuranceIncrease: 0,
};

const state = {
  currentBalance: 0,
  events: [],
  scenario: { ...DEFAULT_SCENARIO },
  editingEventId: "",
};

const scenarioControls = [
  ["jobLossDuration", "Job Loss Duration", 0, 6, 1, "months"],
  ["emergencyExpense", "Emergency Expense", 0, 10000, 100, "currency"],
  ["spendingReduction", "Monthly Spending Reduction", 0, 50, 1, "percent"],
  ["extraDebtPayment", "Extra Debt Payment", 0, 2000, 25, "currency"],
  ["incomeIncrease", "Income Increase", 0, 50, 1, "percent"],
  ["newCarPayment", "New Car Payment", 0, 1500, 25, "currency"],
  ["insuranceIncrease", "Insurance Increase", 0, 500, 10, "currency"],
];

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  loadState();
  seedDebtRows();
  renderScenarioSliders();
  bindEvents();
  setDefaultDates();
  renderAll();
  registerServiceWorker();
});

function bindElements() {
  [
    "balanceForm",
    "currentBalance",
    "eventForm",
    "eventName",
    "eventAmount",
    "eventType",
    "eventStart",
    "eventRecurrence",
    "eventEnd",
    "eventNotes",
    "eventFormTitle",
    "eventSubmit",
    "cancelEdit",
    "eventList",
    "eventCount",
    "eventEmpty",
    "dailyRows",
    "dailyMeta",
    "monthlyCards",
    "monthlyGraph",
    "yearlyCards",
    "yearlyGraph",
    "yearlyMeta",
    "yearEndBalance",
    "runwayScore",
    "runwayStatus",
    "scoreExplanation",
    "scenarioSliders",
    "scenarioYearEnd",
    "scenarioSummary",
    "stressRows",
    "toast",
    "loadDemo",
    "exportJson",
    "importJson",
    "copySummary",
    "resetData",
    "applyScenario",
    "stressTest",
    "installButton",
    "btOutput",
    "snowballOutput",
    "carOutput",
    "efOutput",
    "debtRows",
    "addDebtRow",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.balanceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.currentBalance = moneyValue(els.currentBalance.value);
    saveState();
    renderAll();
    toast("Balance updated.");
  });

  els.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const forecastEvent = readEventForm();
    if (state.editingEventId) {
      state.events = state.events.map((item) =>
        item.id === state.editingEventId ? { ...forecastEvent, id: state.editingEventId } : item
      );
      toast("Forecast event updated.");
    } else {
      state.events.push({ ...forecastEvent, id: createId() });
      toast("Forecast event added.");
    }
    resetEventForm();
    saveState();
    renderAll();
  });

  els.cancelEdit.addEventListener("click", resetEventForm);
  els.eventList.addEventListener("click", handleEventListAction);

  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.nav));
  });

  els.loadDemo.addEventListener("click", loadDemoPlan);
  els.exportJson.addEventListener("click", exportJson);
  els.importJson.addEventListener("change", importJson);
  els.copySummary.addEventListener("click", copySummary);
  els.resetData.addEventListener("click", resetData);
  els.applyScenario.addEventListener("click", applyScenario);
  els.stressTest.addEventListener("click", runStressTests);
  els.addDebtRow.addEventListener("click", () => addDebtRow({}));

  document.querySelectorAll(".calculator-card input").forEach((input) => {
    input.addEventListener("input", renderCalculators);
  });

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addCalculatorEvents(button.dataset.add));
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!window.deferredInstallPrompt) return;
    window.deferredInstallPrompt.prompt();
    await window.deferredInstallPrompt.userChoice;
    window.deferredInstallPrompt = null;
    els.installButton.hidden = true;
  });
}

function setDefaultDates() {
  const today = todayIso();
  if (!els.eventStart.value) els.eventStart.value = today;
}

function readEventForm() {
  return {
    name: els.eventName.value.trim(),
    amount: moneyValue(els.eventAmount.value),
    type: els.eventType.value,
    startDate: els.eventStart.value,
    recurrence: els.eventRecurrence.value,
    endDate: els.eventEnd.value || "",
    notes: els.eventNotes.value.trim(),
  };
}

function resetEventForm() {
  state.editingEventId = "";
  els.eventForm.reset();
  setDefaultDates();
  els.eventFormTitle.textContent = "Add forecast event";
  els.eventSubmit.textContent = "Add Forecast Event";
  els.cancelEdit.hidden = true;
}

function startEditingEvent(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  state.editingEventId = id;
  els.eventName.value = event.name;
  els.eventAmount.value = event.amount;
  els.eventType.value = event.type;
  els.eventStart.value = event.startDate;
  els.eventRecurrence.value = event.recurrence;
  els.eventEnd.value = event.endDate || "";
  els.eventNotes.value = event.notes || "";
  els.eventFormTitle.textContent = `Editing ${event.name}`;
  els.eventSubmit.textContent = "Save Event";
  els.cancelEdit.hidden = false;
  els.eventName.focus();
}

function deleteEvent(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  state.events = state.events.filter((item) => item.id !== id);
  if (state.editingEventId === id) resetEventForm();
  saveState();
  renderAll();
  toast(`${event.name} deleted.`);
}

function handleEventListAction(event) {
  const button = event.target.closest("[data-event-action]");
  if (!button) return;
  const id = button.dataset.eventId;
  if (button.dataset.eventAction === "edit") startEditingEvent(id);
  if (button.dataset.eventAction === "delete") deleteEvent(id);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.events)) {
      state.currentBalance = Number(saved.currentBalance) || 0;
      state.events = saved.events.map(normalizeEvent);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  els.currentBalance.value = state.currentBalance || "";
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentBalance: state.currentBalance,
      events: state.events,
    })
  );
}

function normalizeEvent(event) {
  return {
    id: event.id || createId(),
    name: String(event.name || "Untitled event"),
    amount: Math.abs(Number(event.amount) || 0),
    type: event.type === "income" ? "income" : "expense",
    startDate: event.startDate || todayIso(),
    recurrence: ["none", "weekly", "biweekly", "monthly", "yearly"].includes(event.recurrence)
      ? event.recurrence
      : "none",
    endDate: event.endDate || "",
    notes: event.notes || "",
  };
}

// Forecasting is deliberately data-first: every view, stress test, and calculator
// reads the same daily projection output so the product has one source of truth.
function generateForecast(plan, options = {}) {
  const scenario = { ...DEFAULT_SCENARIO, ...(options.scenario || {}) };
  const startDate = options.startDate ? parseDate(options.startDate) : parseDate(todayIso());
  const days = options.days || FORECAST_DAYS;
  const scenarioEvents = buildScenarioEvents(plan, scenario, startDate);
  const allEvents = [...plan.events.map(normalizeEvent), ...scenarioEvents];
  let balance = Number(plan.currentBalance) || 0;
  const daily = [];

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(startDate, offset);
    const dayIso = isoDate(date);
    const events = allEvents
      .filter((event) => eventOccursOn(event, date))
      .map((event) => {
        const adjusted = applyScenarioToOccurrence(event, scenario, date, startDate);
        return adjusted ? { ...event, amount: adjusted.amount, signedAmount: adjusted.signedAmount } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    let income = 0;
    let expenses = 0;
    for (const event of events) {
      // Income increases the running balance; expenses decrease it. Same-day
      // ordering does not change the ending balance, which is the daily product surface.
      balance += event.signedAmount;
      if (event.signedAmount >= 0) income += event.signedAmount;
      else expenses += Math.abs(event.signedAmount);
    }

    daily.push({
      date: dayIso,
      events,
      income,
      expenses,
      endingBalance: roundMoney(balance),
      status: balance < 0 ? "Danger" : balance < 500 ? "Caution" : "Safe",
    });
  }

  const monthly = summarizeMonthly(daily, plan.currentBalance);
  const yearly = summarizeYearly(monthly, daily);
  const score = calculateRunwayScore(daily, monthly, plan.currentBalance);
  return { daily, monthly, yearly, score };
}

function applyScenarioToOccurrence(event, scenario, date, startDate) {
  let amount = Math.abs(Number(event.amount) || 0);
  if (!amount) return null;

  const jobLossEnd = addMonths(startDate, scenario.jobLossDuration || 0);
  if (
    scenario.jobLossDuration > 0 &&
    event.type === "income" &&
    date >= startDate &&
    date < jobLossEnd &&
    !event.scenarioEvent
  ) {
    return null;
  }

  if (event.type === "income" && scenario.incomeIncrease && !event.scenarioEvent) {
    amount *= 1 + scenario.incomeIncrease / 100;
  }

  if (
    event.type === "expense" &&
    scenario.spendingReduction &&
    !event.scenarioEvent &&
    isFlexibleExpense(event)
  ) {
    amount *= 1 - scenario.spendingReduction / 100;
  }

  amount = roundMoney(amount);
  return {
    amount,
    signedAmount: event.type === "income" ? amount : -amount,
  };
}

function buildScenarioEvents(plan, scenario, startDate) {
  const events = [];
  const start = isoDate(startDate);
  const yearEnd = isoDate(addDays(startDate, FORECAST_DAYS - 1));

  if (scenario.emergencyExpense > 0) {
    events.push(scenarioEvent("Scenario: Emergency expense", scenario.emergencyExpense, "expense", start, "none"));
  }
  if (scenario.extraDebtPayment > 0) {
    events.push(
      scenarioEvent("Scenario: Extra debt payment", scenario.extraDebtPayment, "expense", start, "monthly", yearEnd)
    );
  }
  if (scenario.newCarPayment > 0) {
    events.push(scenarioEvent("Scenario: New car payment", scenario.newCarPayment, "expense", start, "monthly", yearEnd));
  }
  if (scenario.insuranceIncrease > 0) {
    events.push(
      scenarioEvent("Scenario: Insurance increase", scenario.insuranceIncrease, "expense", start, "monthly", yearEnd)
    );
  }

  return events;
}

function scenarioEvent(name, amount, type, startDate, recurrence, endDate = "") {
  return {
    id: `scenario-${name}-${startDate}`,
    name,
    amount: roundMoney(amount),
    type,
    startDate,
    recurrence,
    endDate,
    notes: "Scenario simulation",
    scenarioEvent: true,
  };
}

function isFlexibleExpense(event) {
  const lockedTerms = ["rent", "mortgage", "loan", "debt", "insurance", "car payment", "child support"];
  const name = event.name.toLowerCase();
  return !lockedTerms.some((term) => name.includes(term));
}

function eventOccursOn(event, date) {
  const start = parseDate(event.startDate);
  const end = event.endDate ? parseDate(event.endDate) : null;
  if (date < start || (end && date > end)) return false;

  const diff = daysBetween(start, date);
  if (event.recurrence === "none") return diff === 0;
  if (event.recurrence === "weekly") return diff % 7 === 0;
  if (event.recurrence === "biweekly") return diff % 14 === 0;
  if (event.recurrence === "monthly") {
    const monthDiff = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
    if (monthDiff < 0) return false;
    return date.getDate() === Math.min(start.getDate(), daysInMonth(date.getFullYear(), date.getMonth()));
  }
  if (event.recurrence === "yearly") {
    return (
      date.getMonth() === start.getMonth() &&
      date.getDate() === Math.min(start.getDate(), daysInMonth(date.getFullYear(), start.getMonth()))
    );
  }
  return false;
}

function summarizeMonthly(daily, startingBalance) {
  const groups = new Map();
  daily.forEach((day) => {
    const key = day.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(day);
  });

  let carryStart = Number(startingBalance) || 0;
  return [...groups.entries()].map(([month, days]) => {
    const income = sum(days, "income");
    const expenses = sum(days, "expenses");
    const balances = days.map((day) => day.endingBalance);
    const ending = days[days.length - 1].endingBalance;
    const summary = {
      month,
      startingBalance: roundMoney(carryStart),
      income: roundMoney(income),
      expenses: roundMoney(expenses),
      endingBalance: roundMoney(ending),
      lowestBalance: roundMoney(Math.min(...balances)),
      highestBalance: roundMoney(Math.max(...balances)),
      netChange: roundMoney(ending - carryStart),
    };
    carryStart = ending;
    return summary;
  });
}

function summarizeYearly(monthly, daily) {
  const projectionMonths = monthly.slice(0, 12);
  const endings = projectionMonths.map((month) => month.endingBalance);
  const lowestMonth = projectionMonths.reduce((best, month) => (month.lowestBalance < best.lowestBalance ? month : best), projectionMonths[0]);
  const highestMonth = projectionMonths.reduce(
    (best, month) => (month.highestBalance > best.highestBalance ? month : best),
    projectionMonths[0]
  );
  const bestMonth = projectionMonths.reduce((best, month) => (month.netChange > best.netChange ? month : best), projectionMonths[0]);
  const worstMonth = projectionMonths.reduce((worst, month) => (month.netChange < worst.netChange ? month : worst), projectionMonths[0]);

  return {
    months: projectionMonths,
    monthlyEndingBalances: endings,
    lowestMonthlyBalance: lowestMonth?.lowestBalance ?? 0,
    highestMonthlyBalance: highestMonth?.highestBalance ?? 0,
    bestMonth: bestMonth?.month ?? "",
    worstMonth: worstMonth?.month ?? "",
    yearEndBalance: daily[daily.length - 1]?.endingBalance ?? 0,
    trend: endings.length > 1 ? endings[endings.length - 1] - endings[0] : 0,
  };
}

function calculateRunwayScore(daily, monthly, startingBalance) {
  const balances = daily.map((day) => day.endingBalance);
  const lowest = Math.min(...balances);
  const negativeDays = daily.filter((day) => day.endingBalance < 0).length;
  const yearEnd = daily[daily.length - 1]?.endingBalance ?? startingBalance;
  const avgMonthlyExpenses = monthly.length ? sum(monthly, "expenses") / monthly.length : 0;
  const emergencyBuffer = avgMonthlyExpenses ? Math.max(0, lowest / avgMonthlyExpenses) : 0;
  const firstNegativeIndex = daily.findIndex((day) => day.endingBalance < 0);
  const recoveryIndex =
    firstNegativeIndex === -1
      ? -1
      : daily.findIndex((day, index) => index > firstNegativeIndex && day.endingBalance >= 0);
  const recoveryDays = recoveryIndex === -1 ? FORECAST_DAYS : recoveryIndex - firstNegativeIndex;

  let score = 100;
  score -= Math.min(35, negativeDays * 1.4);
  if (lowest < 0) score -= Math.min(25, Math.abs(lowest) / 200);
  if (emergencyBuffer < 1) score -= 12;
  if (recoveryDays > 45 && firstNegativeIndex !== -1) score -= 12;
  if (yearEnd < startingBalance) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const status = score >= 75 ? "Safe" : score >= 45 ? "Caution" : "Danger";
  let explanation = "Your plan remains positive in all tested days.";
  if (firstNegativeIndex !== -1) {
    explanation = `You become negative within ${firstNegativeIndex + 1} days if this plan plays out.`;
  } else if (lowest < avgMonthlyExpenses) {
    explanation = "Your plan stays positive, but your lowest balance is below one month of typical expenses.";
  } else if (yearEnd > startingBalance) {
    explanation = "Your plan remains positive and grows over the forecast year.";
  }

  return {
    score,
    status,
    explanation,
    lowestBalance: roundMoney(lowest),
    negativeDays,
    emergencyBuffer: roundMoney(emergencyBuffer),
    firstNegativeDate: firstNegativeIndex === -1 ? "" : daily[firstNegativeIndex].date,
    recoveryDays,
  };
}

function renderAll() {
  const forecast = generateForecast(state);
  renderHeader(forecast);
  renderEvents();
  renderDaily(forecast);
  renderMonthly(forecast);
  renderYearly(forecast);
  renderScenario();
  renderCalculators();
}

function renderEvents() {
  const sortedEvents = [...state.events].sort((a, b) => {
    const byDate = a.startDate.localeCompare(b.startDate);
    return byDate || a.name.localeCompare(b.name);
  });
  els.eventCount.textContent = `${state.events.length} ${state.events.length === 1 ? "event" : "events"}`;
  els.eventEmpty.hidden = sortedEvents.length > 0;
  els.eventList.innerHTML = sortedEvents
    .map((event) => {
      const recurrence = event.recurrence === "none" ? "One-time" : titleCase(event.recurrence);
      const notes = event.notes ? `<p>${escapeHtml(event.notes)}</p>` : "";
      return `<article class="saved-event ${event.type}">
        <div>
          <header>
            <span class="event-type ${event.type}">${event.type}</span>
            <strong>${escapeHtml(event.name)}</strong>
          </header>
          <div class="event-meta">
            <span>${formatMoney(event.type === "income" ? event.amount : -event.amount)}</span>
            <span>${recurrence}</span>
            <span>Starts ${formatDate(event.startDate)}</span>
            ${event.endDate ? `<span>Ends ${formatDate(event.endDate)}</span>` : ""}
          </div>
          ${notes}
        </div>
        <div class="event-actions">
          <button class="ghost-button" type="button" data-event-action="edit" data-event-id="${escapeAttribute(event.id)}">Edit</button>
          <button class="delete-button" type="button" data-event-action="delete" data-event-id="${escapeAttribute(event.id)}">Delete</button>
        </div>
      </article>`;
    })
    .join("");
}

function renderHeader(forecast) {
  els.yearEndBalance.textContent = formatMoney(forecast.yearly.yearEndBalance);
  els.runwayScore.textContent = forecast.score.score;
  els.runwayStatus.textContent = forecast.score.status;
  els.runwayStatus.className = `status-pill ${forecast.score.status.toLowerCase()}`;
  els.scoreExplanation.textContent = forecast.score.explanation;
}

function renderDaily(forecast) {
  const lowest = forecast.daily.reduce((min, day) => (day.endingBalance < min.endingBalance ? day : min), forecast.daily[0]);
  const nextPaycheck = forecast.daily.find((day) => day.events.some((event) => event.type === "income"));
  const eventDays = forecast.daily.filter((day) => day.events.length > 0);
  els.dailyMeta.textContent = `Showing ${eventDays.length} event days. Lowest: ${formatMoney(lowest.endingBalance)} on ${formatDate(lowest.date)}`;
  els.dailyRows.innerHTML = eventDays.length
    ? eventDays
    .map((day) => {
      const classes = [
        day.endingBalance < 0 ? "negative-row" : "",
        day.date === lowest.date ? "lowest-row" : "",
        nextPaycheck && day.date === nextPaycheck.date ? "paycheck-row" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const eventHtml = day.events.length
        ? day.events
            .map(
              (event) =>
                `<span class="event-chip ${event.type}">${escapeHtml(event.name)} ${formatMoney(
                  event.signedAmount
                )}</span>`
            )
            .join("")
        : "<span class=\"event-chip\">No events</span>";
      return `<tr class="${classes}">
        <td>${formatDate(day.date)}</td>
        <td>${eventHtml}</td>
        <td>${formatMoney(day.endingBalance)}</td>
        <td><span class="status-pill ${day.status.toLowerCase()}">${day.status}</span></td>
      </tr>`;
    })
    .join("")
    : `<tr class="empty-table-row">
        <td colspan="4">No forecast events yet. Add income, bills, transfers, or expenses to build the timeline.</td>
      </tr>`;
}

function renderMonthly(forecast) {
  els.monthlyGraph.innerHTML = renderBars(forecast.monthly, "endingBalance", "month");
  els.monthlyCards.innerHTML = forecast.monthly
    .map(
      (month) => `<article class="metric-card">
        <h3>${formatMonth(month.month)}</h3>
        <div class="metric-list">
          <div><span>Starting balance</span><strong>${formatMoney(month.startingBalance)}</strong></div>
          <div><span>Total income</span><strong>${formatMoney(month.income)}</strong></div>
          <div><span>Total expenses</span><strong>${formatMoney(month.expenses)}</strong></div>
          <div><span>Ending balance</span><strong>${formatMoney(month.endingBalance)}</strong></div>
          <div><span>Lowest balance</span><strong>${formatMoney(month.lowestBalance)}</strong></div>
          <div><span>Highest balance</span><strong>${formatMoney(month.highestBalance)}</strong></div>
          <div><span>Net change</span><strong>${formatMoney(month.netChange)}</strong></div>
        </div>
      </article>`
    )
    .join("");
}

function renderYearly(forecast) {
  els.yearlyMeta.textContent = `Year-end projection: ${formatMoney(forecast.yearly.yearEndBalance)}`;
  els.yearlyGraph.innerHTML = renderBars(forecast.yearly.months, "endingBalance", "month");
  els.yearlyCards.innerHTML = `<article class="metric-card">
      <h3>12-month projection</h3>
      <div class="metric-list">
        <div><span>Lowest monthly balance</span><strong>${formatMoney(forecast.yearly.lowestMonthlyBalance)}</strong></div>
        <div><span>Highest monthly balance</span><strong>${formatMoney(forecast.yearly.highestMonthlyBalance)}</strong></div>
        <div><span>Best month</span><strong>${formatMonth(forecast.yearly.bestMonth)}</strong></div>
        <div><span>Worst month</span><strong>${formatMonth(forecast.yearly.worstMonth)}</strong></div>
        <div><span>Year-end projection</span><strong>${formatMoney(forecast.yearly.yearEndBalance)}</strong></div>
        <div><span>Cash growth trend</span><strong>${formatMoney(forecast.yearly.trend)}</strong></div>
      </div>
    </article>
    ${forecast.yearly.months
      .map(
        (month) => `<article class="metric-card">
          <h3>${formatMonth(month.month)}</h3>
          <div class="metric-list">
            <div><span>Monthly ending balance</span><strong>${formatMoney(month.endingBalance)}</strong></div>
            <div><span>Net change</span><strong>${formatMoney(month.netChange)}</strong></div>
          </div>
        </article>`
      )
      .join("")}`;
}

function renderBars(items, valueKey, labelKey) {
  const values = items.map((item) => Math.abs(item[valueKey]));
  const max = Math.max(1, ...values);
  return items
    .map((item) => {
      const value = Number(item[valueKey]) || 0;
      const height = Math.max(4, Math.round((Math.abs(value) / max) * 126));
      return `<div class="bar" title="${formatMoney(value)}">
        <div class="bar-fill ${value < 0 ? "negative" : ""}" style="height:${height}px"></div>
        <label>${formatShortMonth(item[labelKey])}</label>
      </div>`;
    })
    .join("");
}

function renderScenarioSliders() {
  els.scenarioSliders.innerHTML = scenarioControls
    .map(
      ([key, label, min, max, step, kind]) => `<article class="slider-card">
        <header>
          <span>${label}</span>
          <strong id="${key}Value">${formatSliderValue(state.scenario[key], kind)}</strong>
        </header>
        <input data-scenario="${key}" data-kind="${kind}" type="range" min="${min}" max="${max}" step="${step}" value="${state.scenario[key]}" />
      </article>`
    )
    .join("");

  document.querySelectorAll("[data-scenario]").forEach((input) => {
    input.addEventListener("input", () => {
      state.scenario[input.dataset.scenario] = Number(input.value);
      document.getElementById(`${input.dataset.scenario}Value`).textContent = formatSliderValue(
        Number(input.value),
        input.dataset.kind
      );
      renderScenario();
    });
  });
}

function renderScenario() {
  const forecast = generateForecast(state, { scenario: state.scenario });
  els.scenarioYearEnd.textContent = formatMoney(forecast.yearly.yearEndBalance);
  els.scenarioSummary.textContent = `${forecast.score.status}: ${forecast.score.explanation}`;
}

function runStressTests() {
  const scenarios = [
    ["Normal Plan", {}],
    ["Lose Job 1 Month", { jobLossDuration: 1 }],
    ["Lose Job 3 Months", { jobLossDuration: 3 }],
    ["Lose Job 6 Months", { jobLossDuration: 6 }],
    ["Car Repair $2,500", { emergencyExpense: 2500 }],
    ["Medical Emergency $5,000", { emergencyExpense: 5000 }],
    ["Insurance Increase $250", { insuranceIncrease: 250 }],
    ["New Car Payment $650", { newCarPayment: 650 }],
  ];

  els.stressRows.innerHTML = scenarios
    .map(([name, scenario]) => {
      const forecast = generateForecast(state, { scenario });
      const score = forecast.score;
      const firstNegative = score.firstNegativeDate ? formatDate(score.firstNegativeDate) : "Never";
      const recoveryMonth =
        score.firstNegativeDate && score.recoveryDays < FORECAST_DAYS
          ? formatMonth(forecast.daily.find((day) => day.date >= score.firstNegativeDate && day.endingBalance >= 0)?.date.slice(0, 7))
          : score.firstNegativeDate
            ? "Not recovered"
            : "Not needed";
      const survivalDays = score.firstNegativeDate
        ? daysBetween(parseDate(todayIso()), parseDate(score.firstNegativeDate))
        : FORECAST_DAYS;
      return `<tr>
        <td>${name}</td>
        <td>${formatMoney(score.lowestBalance)}</td>
        <td>${firstNegative}</td>
        <td>${survivalDays}</td>
        <td>${recoveryMonth}</td>
        <td>${formatMoney(forecast.yearly.yearEndBalance)}</td>
        <td><span class="status-pill ${score.status.toLowerCase()}">${score.status}</span></td>
      </tr>`;
    })
    .join("");
  toast("Stress test complete.");
}

function applyScenario() {
  const scenario = { ...state.scenario };
  const start = todayIso();
  const end = isoDate(addDays(parseDate(start), FORECAST_DAYS - 1));

  if (scenario.emergencyExpense > 0) {
    state.events.push(scenarioEvent("Emergency expense", scenario.emergencyExpense, "expense", start, "none"));
  }
  if (scenario.extraDebtPayment > 0) {
    state.events.push(scenarioEvent("Extra debt payment", scenario.extraDebtPayment, "expense", start, "monthly", end));
  }
  if (scenario.newCarPayment > 0) {
    state.events.push(scenarioEvent("New car payment", scenario.newCarPayment, "expense", start, "monthly", end));
  }
  if (scenario.insuranceIncrease > 0) {
    state.events.push(scenarioEvent("Insurance increase", scenario.insuranceIncrease, "expense", start, "monthly", end));
  }
  if (scenario.incomeIncrease > 0) {
    state.events = state.events.map((event) =>
      event.type === "income" ? { ...event, amount: roundMoney(event.amount * (1 + scenario.incomeIncrease / 100)) } : event
    );
  }
  if (scenario.spendingReduction > 0) {
    state.events = state.events.map((event) =>
      event.type === "expense" && isFlexibleExpense(event)
        ? { ...event, amount: roundMoney(event.amount * (1 - scenario.spendingReduction / 100)) }
        : event
    );
  }
  if (scenario.jobLossDuration > 0) {
    const lossEnd = addMonths(parseDate(start), scenario.jobLossDuration);
    state.events
      .filter((event) => event.type === "income")
      .forEach((event) => {
        for (let offset = 0; offset < FORECAST_DAYS; offset += 1) {
          const date = addDays(parseDate(start), offset);
          if (date >= lossEnd) break;
          if (eventOccursOn(event, date)) {
            state.events.push(
              scenarioEvent(`Job loss offset: ${event.name}`, event.amount, "expense", isoDate(date), "none")
            );
          }
        }
      });
  }

  scenarioControls.forEach(([key]) => {
    state.scenario[key] = 0;
  });
  saveState();
  renderScenarioSliders();
  renderAll();
  toast("Scenario applied to the forecast calendar.");
}

function renderCalculators() {
  renderBalanceTransfer();
  renderSnowball();
  renderCarPayment();
  renderEmergencyFund();
}

function renderBalanceTransfer() {
  const amount = getCalcValue("bt", "amount");
  const feeRate = getCalcValue("bt", "fee") / 100;
  const months = Math.max(1, Math.round(getCalcValue("bt", "months")));
  const minRate = getCalcValue("bt", "min") / 100;
  const apr = getCalcValue("bt", "apr") / 100;
  const fee = amount * feeRate;
  const promoPayment = (amount + fee) / months;
  const interestAvoided = (amount * apr) / 12 * months;
  const minPayment = amount * minRate;
  els.btOutput.innerHTML = `
    <strong>Effective cost:</strong> ${formatMoney(fee)} transfer fee.<br>
    <strong>Promo payoff:</strong> ${formatMoney(promoPayment)} per month for ${months} months.<br>
    <strong>Minimum payment estimate:</strong> ${formatMoney(minPayment)} per month.<br>
    <strong>Interest avoided estimate:</strong> ${formatMoney(Math.max(0, interestAvoided - fee))}.`;
}

function renderSnowball() {
  const debts = readDebts().sort((a, b) => a.balance - b.balance);
  const extra = moneyValue(document.getElementById("snowballExtra").value);
  let month = 0;
  let totalPaid = 0;
  const schedule = [];
  debts.forEach((debt, index) => {
    const payment = debt.min + (index === 0 ? extra : 0);
    const months = payment > 0 ? Math.ceil(debt.balance / payment) : 0;
    for (let i = 0; i < months; i += 1) {
      schedule.push({ name: `Debt snowball: ${debt.name}`, amount: Math.min(payment, debt.balance - i * payment) });
    }
    month += months;
    totalPaid += debt.balance;
  });
  els.snowballOutput.innerHTML = `
    <strong>Payoff order:</strong> ${debts.map((debt) => escapeHtml(debt.name)).join(", ") || "Add debts"}.<br>
    <strong>Estimated payoff:</strong> ${month || 0} months.<br>
    <strong>Principal scheduled:</strong> ${formatMoney(totalPaid)}.`;
  els.snowballOutput.dataset.schedule = JSON.stringify(schedule);
}

function renderCarPayment() {
  const amount = getCalcValue("car", "amount");
  const down = getCalcValue("car", "down");
  const apr = getCalcValue("car", "apr") / 100;
  const months = Math.max(1, Math.round(getCalcValue("car", "months")));
  const principal = Math.max(0, amount - down);
  const monthlyRate = apr / 12;
  const payment =
    monthlyRate === 0 ? principal / months : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  els.carOutput.innerHTML = `
    <strong>Estimated payment:</strong> ${formatMoney(payment)} per month.<br>
    <strong>Total paid:</strong> ${formatMoney(payment * months)}.<br>
    <strong>Forecast impact:</strong> monthly expense for ${months} months.`;
}

function renderEmergencyFund() {
  const expenses = getCalcValue("ef", "expenses");
  const months = Math.max(1, Math.round(getCalcValue("ef", "months")));
  const current = getCalcValue("ef", "current");
  const contribution = getCalcValue("ef", "contribution");
  const target = expenses * months;
  const gap = Math.max(0, target - current);
  const monthsToTarget = contribution > 0 ? Math.ceil(gap / contribution) : 0;
  els.efOutput.innerHTML = `
    <strong>Recommended target:</strong> ${formatMoney(target)}.<br>
    <strong>Remaining gap:</strong> ${formatMoney(gap)}.<br>
    <strong>Time to target:</strong> ${monthsToTarget || "Set a contribution"} months.`;
}

function addCalculatorEvents(kind) {
  const start = todayIso();
  if (kind === "balanceTransfer") {
    const months = Math.max(1, Math.round(getCalcValue("bt", "months")));
    const amount = getCalcValue("bt", "amount");
    const fee = amount * (getCalcValue("bt", "fee") / 100);
    const payment = roundMoney((amount + fee) / months);
    addMonthlySeries("Balance transfer payoff", payment, months, start);
  }
  if (kind === "snowball") {
    const schedule = JSON.parse(els.snowballOutput.dataset.schedule || "[]");
    schedule.slice(0, 120).forEach((item, index) => {
      state.events.push({
        id: createId(),
        name: item.name,
        amount: roundMoney(item.amount),
        type: "expense",
        startDate: isoDate(addMonths(parseDate(start), index)),
        recurrence: "none",
        endDate: "",
        notes: "Added from Debt Snowball Planner",
      });
    });
  }
  if (kind === "car") {
    const months = Math.max(1, Math.round(getCalcValue("car", "months")));
    const output = els.carOutput.textContent.match(/\$[\d,]+(?:\.\d{2})?/);
    const payment = output ? Number(output[0].replace(/[$,]/g, "")) : 0;
    addMonthlySeries("Car payment", payment, months, start);
  }
  if (kind === "emergency") {
    const contribution = getCalcValue("ef", "contribution");
    const expenses = getCalcValue("ef", "expenses");
    const months = Math.max(1, Math.round(getCalcValue("ef", "months")));
    const current = getCalcValue("ef", "current");
    const gap = Math.max(0, expenses * months - current);
    const count = contribution > 0 ? Math.ceil(gap / contribution) : 0;
    addMonthlySeries("Emergency fund contribution", contribution, count, start);
  }
  saveState();
  renderAll();
  toast("Calculator schedule added to calendar.");
}

function addMonthlySeries(name, amount, months, start) {
  if (!amount || !months) return;
  state.events.push({
    id: createId(),
    name,
    amount: roundMoney(amount),
    type: "expense",
    startDate: start,
    recurrence: "monthly",
    endDate: isoDate(addMonths(parseDate(start), months - 1)),
    notes: "Added from calculator",
  });
}

function getCalcValue(group, key) {
  return moneyValue(document.querySelector(`[data-${group}="${key}"]`)?.value);
}

function seedDebtRows() {
  if (els.debtRows.children.length) return;
  [
    { name: "Card A", balance: 1800, min: 60, apr: 22.9 },
    { name: "Card B", balance: 4200, min: 120, apr: 19.9 },
  ].forEach(addDebtRow);
}

function addDebtRow(debt) {
  const row = document.createElement("div");
  row.className = "debt-row";
  row.innerHTML = `
    <input aria-label="Debt name" value="${escapeAttribute(debt.name || "Debt")}" />
    <input aria-label="Debt balance" type="number" min="0" value="${debt.balance || 1000}" />
    <input aria-label="Minimum payment" type="number" min="0" value="${debt.min || 50}" />
    <input aria-label="APR" type="number" min="0" step="0.1" value="${debt.apr || 20}" />
  `;
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", renderSnowball));
  els.debtRows.appendChild(row);
  renderSnowball();
}

function readDebts() {
  return [...els.debtRows.querySelectorAll(".debt-row")]
    .map((row) => {
      const [name, balance, min, apr] = row.querySelectorAll("input");
      return {
        name: name.value.trim() || "Debt",
        balance: moneyValue(balance.value),
        min: moneyValue(min.value),
        apr: Number(apr.value) || 0,
      };
    })
    .filter((debt) => debt.balance > 0);
}

function loadDemoPlan() {
  const today = parseDate(todayIso());
  const nextFriday = addDays(today, (5 - today.getDay() + 7) % 7 || 14);
  state.currentBalance = 1850;
  state.events = [
    event("Biweekly paycheck", 2450, "income", isoDate(nextFriday), "biweekly", "", "Primary job income"),
    event("Mortgage", 1725, "expense", firstOfNextMonth(1), "monthly", "", "Housing"),
    event("Utilities", 265, "expense", firstOfNextMonth(5), "monthly", "", "Power, water, trash"),
    event("Car insurance", 188, "expense", firstOfNextMonth(12), "monthly", "", "Auto insurance"),
    event("Internet", 79, "expense", firstOfNextMonth(18), "monthly", "", "Home internet"),
    event("Subscriptions", 64, "expense", firstOfNextMonth(20), "monthly", "", "Streaming and software"),
    event("Credit card payment", 220, "expense", firstOfNextMonth(22), "monthly", "", "Debt payment"),
    event("Student loan", 165, "expense", firstOfNextMonth(8), "monthly", "", "Debt payment"),
    event("Emergency fund contribution", 250, "expense", firstOfNextMonth(15), "monthly", "", "Savings transfer"),
    event("Groceries and gas", 240, "expense", isoDate(addDays(today, 3)), "weekly", "", "Recurring essentials"),
    event("School supplies", 325, "expense", isoDate(addDays(today, 43)), "none", "", "One-time expense"),
  ];
  els.currentBalance.value = state.currentBalance;
  resetEventForm();
  saveState();
  renderAll();
  toast("Demo plan loaded.");
}

function event(name, amount, type, startDate, recurrence, endDate = "", notes = "") {
  return { id: createId(), name, amount, type, startDate, recurrence, endDate, notes };
}

function firstOfNextMonth(day) {
  const date = parseDate(todayIso());
  date.setMonth(date.getMonth() + 1);
  date.setDate(Math.min(day, daysInMonth(date.getFullYear(), date.getMonth())));
  return isoDate(date);
}

function exportJson() {
  const blob = new Blob([JSON.stringify({ currentBalance: state.currentBalance, events: state.events }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cash-runway-plan.json";
  link.click();
  URL.revokeObjectURL(url);
  toast("Export created.");
}

async function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.events)) throw new Error("Missing events");
    state.currentBalance = Number(imported.currentBalance) || 0;
    state.events = imported.events.map(normalizeEvent);
    els.currentBalance.value = state.currentBalance;
    resetEventForm();
    saveState();
    renderAll();
    toast("Plan imported.");
  } catch {
    toast("Import failed. Use a Cash Runway JSON export.");
  } finally {
    event.target.value = "";
  }
}

function resetData() {
  state.currentBalance = 0;
  state.events = [];
  resetEventForm();
  els.currentBalance.value = "";
  saveState();
  renderAll();
  toast("Plan reset.");
}

async function copySummary() {
  const forecast = generateForecast(state);
  const text = [
    "Cash Runway Summary",
    `Current balance: ${formatMoney(state.currentBalance)}`,
    `Year-end projection: ${formatMoney(forecast.yearly.yearEndBalance)}`,
    `Lowest balance: ${formatMoney(forecast.score.lowestBalance)}`,
    `Negative days: ${forecast.score.negativeDays}`,
    `Cash Runway Score: ${forecast.score.score} (${forecast.score.status})`,
    forecast.score.explanation,
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    toast("Summary copied.");
  } catch {
    toast(text);
  }
}

function switchView(view) {
  document.querySelectorAll(".content-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.view === view);
  });
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === view);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => undefined);
  }
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIso() {
  return isoDate(new Date());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())));
  return next;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function daysBetween(start, end) {
  const ms = parseDate(isoDate(end)).getTime() - parseDate(isoDate(start)).getTime();
  return Math.round(ms / 86400000);
}

function sum(items, key) {
  return items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function moneyValue(value) {
  return Math.max(0, Number(value) || 0);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatMonth(value) {
  if (!value) return "N/A";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatShortMonth(value) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

function formatSliderValue(value, kind) {
  if (kind === "currency") return formatMoney(value);
  if (kind === "percent") return `${value}%`;
  if (kind === "months") return `${value} mo`;
  return String(value);
}

function titleCase(value) {
  return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2800);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

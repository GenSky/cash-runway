const STORAGE_KEY = "cash-runway-v1";
const DAYS_PER_YEAR = 365;
const DEFAULT_FORECAST_YEARS = 1;
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
  forecastYears: DEFAULT_FORECAST_YEARS,
  events: [],
  scenario: { ...DEFAULT_SCENARIO },
  editingEventId: "",
  calendarMonth: todayIso().slice(0, 7),
  theme: "light",
  collapsedSections: {
    planSetup: false,
    savedEvents: false,
  },
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
    "forecastYears",
    "themeToggle",
    "themeColor",
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
    "planSetupToggle",
    "planSetupContent",
    "savedEventsToggle",
    "savedEventsContent",
    "eventList",
    "eventCount",
    "eventEmpty",
    "dailyTitle",
    "dailyRows",
    "dailyMeta",
    "calendarGrid",
    "calendarTitle",
    "calendarMeta",
    "calendarPrev",
    "calendarNext",
    "calendarToday",
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
    "stressTipJar",
    "toast",
    "loadDemo",
    "exportJson",
    "importJson",
    "copySummary",
    "printReport",
    "printReportOutput",
    "reportTipJar",
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
    state.currentBalance = signedMoneyValue(els.currentBalance.value);
    state.forecastYears = forecastYearsValue(els.forecastYears.value);
    saveState();
    renderAll();
    toast("Plan settings updated.");
  });

  els.forecastYears.addEventListener("change", () => {
    state.forecastYears = forecastYearsValue(els.forecastYears.value);
    saveState();
    renderAll();
    toast(`Forecast window set to ${state.forecastYears} ${state.forecastYears === 1 ? "year" : "years"}.`);
  });

  els.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveState();
    toast(`${state.theme === "dark" ? "Dark" : "Light"} mode enabled.`);
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
  els.planSetupToggle.addEventListener("click", () => toggleSection("planSetup"));
  els.savedEventsToggle.addEventListener("click", () => toggleSection("savedEvents"));
  els.eventList.addEventListener("click", handleEventListAction);
  els.calendarPrev.addEventListener("click", () => shiftCalendarMonth(-1));
  els.calendarNext.addEventListener("click", () => shiftCalendarMonth(1));
  els.calendarToday.addEventListener("click", () => {
    state.calendarMonth = todayIso().slice(0, 7);
    renderAll();
  });

  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.nav));
  });

  els.loadDemo.addEventListener("click", loadDemoPlan);
  els.exportJson.addEventListener("click", exportJson);
  els.importJson.addEventListener("change", importJson);
  els.copySummary.addEventListener("click", copySummary);
  els.printReport.addEventListener("click", printPdfReport);
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
  setSectionCollapsed("planSetup", false);
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

function shiftCalendarMonth(offset) {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const next = new Date(year, month - 1, 1);
  next.setMonth(next.getMonth() + offset);
  state.calendarMonth = isoDate(next).slice(0, 7);
  renderAll();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.events)) {
      state.currentBalance = Number(saved.currentBalance) || 0;
      state.forecastYears = forecastYearsValue(saved.forecastYears);
      state.theme = themeValue(saved.theme);
      state.collapsedSections = collapsedSectionsValue(saved.collapsedSections);
      state.events = saved.events.map(normalizeEvent);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  els.currentBalance.value = state.currentBalance || "";
  els.forecastYears.value = String(state.forecastYears);
  applyTheme();
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      currentBalance: state.currentBalance,
      forecastYears: state.forecastYears,
      theme: state.theme,
      collapsedSections: state.collapsedSections,
      events: state.events,
    })
  );
}

function collapsedSectionsValue(value) {
  return {
    planSetup: Boolean(value?.planSetup),
    savedEvents: Boolean(value?.savedEvents),
  };
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

function applyTheme() {
  const isDark = state.theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  els.themeToggle.textContent = isDark ? "Light" : "Dark";
  els.themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
  els.themeToggle.setAttribute("aria-pressed", String(isDark));
  els.themeColor.content = isDark ? "#171717" : "#23a094";
}

function toggleSection(section) {
  setSectionCollapsed(section, !state.collapsedSections[section]);
}

function setSectionCollapsed(section, collapsed, shouldSave = true) {
  state.collapsedSections = {
    ...state.collapsedSections,
    [section]: Boolean(collapsed),
  };
  renderCollapsibleSections();
  if (shouldSave) saveState();
}

function renderCollapsibleSections() {
  setCollapsibleUi("planSetup", els.planSetupToggle, els.planSetupContent);
  setCollapsibleUi("savedEvents", els.savedEventsToggle, els.savedEventsContent);
}

function setCollapsibleUi(section, button, content) {
  const collapsed = Boolean(state.collapsedSections[section]);
  content.hidden = collapsed;
  button.textContent = collapsed ? "Show" : "Hide";
  button.setAttribute("aria-expanded", String(!collapsed));
}

// Forecasting is deliberately data-first: every view, stress test, and calculator
// reads the same daily projection output so the product has one source of truth.
function generateForecast(plan, options = {}) {
  const scenario = { ...DEFAULT_SCENARIO, ...(options.scenario || {}) };
  const startDate = options.startDate ? parseDate(options.startDate) : parseDate(todayIso());
  const days = options.days || getForecastDays(plan);
  const scenarioEvents = buildScenarioEvents(plan, scenario, startDate, days);
  const allEvents = [...plan.events.map(normalizeEvent), ...scenarioEvents];
  const openingBalance = calculateOpeningBalance(plan.currentBalance, allEvents, startDate);
  let balance = openingBalance;
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

  const monthly = summarizeMonthly(daily, openingBalance);
  const yearly = summarizeYearly(monthly, daily);
  const score = calculateRunwayScore(daily, monthly, openingBalance);
  return { daily, monthly, yearly, score, openingBalance };
}

function calculateOpeningBalance(currentBalance, events, startDate) {
  return roundMoney(
    events.reduce((balance, event) => {
      if (event.recurrence !== "none" || event.scenarioEvent) return balance;
      if (parseDate(event.startDate) >= startDate) return balance;

      const amount = Math.abs(Number(event.amount) || 0);
      return balance + (event.type === "income" ? amount : -amount);
    }, Number(currentBalance) || 0)
  );
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

function buildScenarioEvents(plan, scenario, startDate, days) {
  const events = [];
  const start = isoDate(startDate);
  const yearEnd = isoDate(addDays(startDate, days - 1));

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
  const recoveryDays = recoveryIndex === -1 ? daily.length : recoveryIndex - firstNegativeIndex;

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
  renderCollapsibleSections();
  renderDaily(forecast);
  renderCalendar(forecast);
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
  els.dailyTitle.textContent = `Next ${state.forecastYears === 1 ? "year" : `${state.forecastYears} years`}`;
  els.dailyMeta.textContent = `Showing ${eventDays.length} event days across ${state.forecastYears} ${state.forecastYears === 1 ? "year" : "years"}. Lowest: ${formatMoney(lowest.endingBalance)} on ${formatDate(lowest.date)}`;
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

function renderCalendar(forecast) {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const dailyByDate = new Map(forecast.daily.map((day) => [day.date, day]));
  const savedEventsByDate = mapSavedEventsToDates(days);
  const calendarMonthDays = days
    .filter((date) => date.getMonth() === monthStart.getMonth())
    .map((date) => {
      const dateIso = isoDate(date);
      const projectedDay = dailyByDate.get(dateIso);
      return {
        date: dateIso,
        events: projectedDay?.events || savedEventsByDate.get(dateIso) || [],
      };
    });
  const monthDays = forecast.daily.filter((day) => day.date.startsWith(state.calendarMonth));
  const eventDays = calendarMonthDays.filter((day) => day.events.length > 0);
  const eventCount = calendarMonthDays.reduce((total, day) => total + day.events.length, 0);
  const lowest = monthDays.length
    ? monthDays.reduce((min, day) => (day.endingBalance < min.endingBalance ? day : min), monthDays[0])
    : null;

  els.calendarTitle.textContent = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  els.calendarMeta.textContent = monthDays.length
    ? `${eventDays.length} event days · ${eventCount} total events · Lowest ${formatMoney(lowest.endingBalance)} on ${formatDate(lowest.date)}`
    : `This month is outside the current ${state.forecastYears}-${state.forecastYears === 1 ? "year" : "year"} forecast window.`;

  els.calendarMeta.textContent = monthDays.length
    ? `${eventDays.length} event days · ${eventCount} total events · Lowest ${formatMoney(lowest.endingBalance)} on ${formatDate(lowest.date)}`
    : `${eventDays.length} event days · ${eventCount} total events · This month is outside the current ${state.forecastYears}-${state.forecastYears === 1 ? "year" : "year"} forecast window.`;

  els.calendarMeta.textContent = monthDays.length
    ? `${eventDays.length} event days - ${eventCount} total events - Lowest ${formatMoney(lowest.endingBalance)} on ${formatDate(lowest.date)}`
    : `${eventDays.length} event days - ${eventCount} total events - This month is outside the current ${state.forecastYears}-${state.forecastYears === 1 ? "year" : "year"} forecast window.`;

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((label) => `<div class="calendar-weekday">${label}</div>`)
    .join("");

  const dayCells = days
    .map((date) => {
      const dateIso = isoDate(date);
      const day = dailyByDate.get(dateIso);
      const isCurrentMonth = date.getMonth() === monthStart.getMonth();
      const isToday = dateIso === todayIso();
      const events = day?.events || savedEventsByDate.get(dateIso) || [];
      const visibleEvents = events.slice(0, 3);
      const classes = [
        "calendar-day",
        isCurrentMonth ? "" : "outside-month",
        isToday ? "today" : "",
        events.length ? "has-events" : "",
        day?.status ? day.status.toLowerCase() : "",
      ]
        .filter(Boolean)
        .join(" ");
      const eventsHtml = visibleEvents
        .map(
          (event) =>
            `<span class="calendar-event ${event.type}">${escapeHtml(event.name)} ${formatMoney(event.signedAmount)}</span>`
        )
        .join("");
      const overflow = events.length > visibleEvents.length ? `<span class="calendar-more">+${events.length - visibleEvents.length} more</span>` : "";
      const balance = day ? `<span class="calendar-balance">${formatMoney(day.endingBalance)}</span>` : "";
      return `<div class="${classes}">
        <div class="calendar-day-header">
          <span>${date.getDate()}</span>
          ${balance}
        </div>
        <div class="calendar-events">${eventsHtml}${overflow}</div>
      </div>`;
    })
    .join("");

  els.calendarGrid.innerHTML = `${weekdayLabels}${dayCells}`;
}

function mapSavedEventsToDates(dates) {
  const savedEventsByDate = new Map();
  const savedEvents = state.events.map(normalizeEvent);

  dates.forEach((date) => {
    const events = savedEvents
      .filter((event) => eventOccursOn(event, date))
      .map((event) => ({
        ...event,
        signedAmount: event.type === "income" ? event.amount : -event.amount,
      }));

    if (events.length) savedEventsByDate.set(isoDate(date), events);
  });

  return savedEventsByDate;
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
        score.firstNegativeDate && score.recoveryDays < forecast.daily.length
          ? formatMonth(forecast.daily.find((day) => day.date >= score.firstNegativeDate && day.endingBalance >= 0)?.date.slice(0, 7))
          : score.firstNegativeDate
            ? "Not recovered"
            : "Not needed";
      const survivalDays = score.firstNegativeDate
        ? daysBetween(parseDate(todayIso()), parseDate(score.firstNegativeDate))
        : forecast.daily.length;
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
  showStressTipJar();
  toast("Stress test complete.");
}

function showStressTipJar() {
  if (!els.stressTipJar) return;
  els.stressTipJar.hidden = false;
}

function applyScenario() {
  const scenario = { ...state.scenario };
  const start = todayIso();
  const forecastDays = getForecastDays(state);
  const end = isoDate(addDays(parseDate(start), forecastDays - 1));

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
        for (let offset = 0; offset < forecastDays; offset += 1) {
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
  const schedule = buildSnowballSchedule(debts, extra);
  const totalPaid = sum(debts, "balance");
  els.snowballOutput.innerHTML = `
    <strong>Payoff order:</strong> ${debts.map((debt) => escapeHtml(debt.name)).join(", ") || "Add debts"}.<br>
    <strong>Estimated payoff:</strong> ${schedule.length || 0} months.<br>
    <strong>Principal scheduled:</strong> ${formatMoney(totalPaid)}.`;
  els.snowballOutput.dataset.schedule = JSON.stringify(schedule);
}

function buildSnowballSchedule(debts, extra) {
  const balances = debts.map((debt) => ({
    name: debt.name,
    balance: roundMoney(debt.balance),
    min: roundMoney(debt.min),
  }));
  const schedule = [];

  while (balances.some((debt) => debt.balance > 0) && schedule.length < 600) {
    const activeAtStart = balances.filter((debt) => debt.balance > 0);
    const freedMinimums = balances
      .filter((debt) => debt.balance <= 0)
      .reduce((total, debt) => total + debt.min, 0);
    let additionalPayment = extra + freedMinimums;
    let monthlyPayment = 0;

    activeAtStart.forEach((debt) => {
      const payment = Math.min(debt.min, debt.balance);
      debt.balance = roundMoney(debt.balance - payment);
      monthlyPayment += payment;
    });

    while (additionalPayment > 0) {
      const target = balances.find((debt) => debt.balance > 0);
      if (!target) break;
      const payment = Math.min(additionalPayment, target.balance);
      target.balance = roundMoney(target.balance - payment);
      monthlyPayment += payment;
      additionalPayment = roundMoney(additionalPayment - payment);
    }

    if (monthlyPayment <= 0) break;
    schedule.push({ name: "Debt snowball payment", amount: roundMoney(monthlyPayment) });
  }

  return schedule;
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
  state.forecastYears = DEFAULT_FORECAST_YEARS;
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
  els.forecastYears.value = String(state.forecastYears);
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
  const blob = new Blob([JSON.stringify({ currentBalance: state.currentBalance, forecastYears: state.forecastYears, theme: state.theme, events: state.events }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bumi-plan.json";
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
    state.forecastYears = forecastYearsValue(imported.forecastYears);
    state.theme = themeValue(imported.theme || state.theme);
    state.events = imported.events.map(normalizeEvent);
    els.currentBalance.value = state.currentBalance;
    els.forecastYears.value = String(state.forecastYears);
    applyTheme();
    resetEventForm();
    saveState();
    renderAll();
    toast("Plan imported.");
  } catch {
    toast("Import failed. Use a Bumi JSON export.");
  } finally {
    event.target.value = "";
  }
}

function resetData() {
  const hasPlan = state.currentBalance || state.events.length;
  if (hasPlan && !window.confirm("Reset your balance and all saved forecast events?")) return;
  state.currentBalance = 0;
  state.forecastYears = DEFAULT_FORECAST_YEARS;
  state.events = [];
  resetEventForm();
  els.currentBalance.value = "";
  els.forecastYears.value = String(state.forecastYears);
  saveState();
  renderAll();
  toast("Plan reset.");
}

async function copySummary() {
  const forecast = generateForecast(state);
  const text = [
    "Bumi Money Summary",
    `Current balance: ${formatMoney(state.currentBalance)}`,
    `Forecast window: ${state.forecastYears} ${state.forecastYears === 1 ? "year" : "years"}`,
    `Year-end projection: ${formatMoney(forecast.yearly.yearEndBalance)}`,
    `Lowest balance: ${formatMoney(forecast.score.lowestBalance)}`,
    `Negative days: ${forecast.score.negativeDays}`,
    `Bumi Score: ${forecast.score.score} (${forecast.score.status})`,
    forecast.score.explanation,
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    toast("Summary copied.");
  } catch {
    toast(text);
  }
}

function printPdfReport() {
  const forecast = generateForecast(state);
  const report = buildReportModel(forecast);
  const filename = reportFilename(report.createdAt);
  const reportHtml = renderReportHtml(report);
  const reportDocument = renderReportDocument(filename, reportHtml);
  const reportWindow = window.open("", filename);

  if (reportWindow) {
    reportWindow.document.open();
    reportWindow.document.write(reportDocument);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.setTimeout(() => reportWindow.print(), 250);
    toast("PDF report opened. Choose Save as PDF in the print dialog.");
    showReportTipJar();
    return;
  }

  const originalTitle = document.title;
  document.title = filename;
  els.printReportOutput.innerHTML = reportHtml;
  els.printReportOutput.setAttribute("aria-hidden", "false");
  window.print();
  scheduleReportCleanup(originalTitle);
  showReportTipJar();
  toast("PDF report ready. Choose Save as PDF in the print dialog.");
}

function showReportTipJar() {
  if (!els.reportTipJar) return;
  els.reportTipJar.hidden = false;
  window.clearTimeout(window.reportTipTimer);
  window.reportTipTimer = window.setTimeout(() => {
    els.reportTipJar.hidden = true;
  }, 18000);
}

function scheduleReportCleanup(originalTitle) {
  window.clearTimeout(window.reportCleanupTimer);

  const cleanup = () => {
    els.printReportOutput.setAttribute("aria-hidden", "true");
    document.title = originalTitle;
    window.reportCleanupTimer = null;
  };

  window.reportCleanupTimer = window.setTimeout(cleanup, 120000);
}

function reportFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `Bumi-Report-${year}-${month}-${day}-${hour}${minute}`;
}

function renderReportDocument(filename, reportHtml) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(filename)}</title>
    <style>${reportDocumentStyles()}</style>
  </head>
  <body>
    <section class="print-report">${reportHtml}</section>
  </body>
</html>`;
}

function reportDocumentStyles() {
  return `
    @page { margin: 0.5in; }
    * { box-sizing: border-box; }
    body {
      background: #fff;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0.5in;
    }
    .print-report {
      color: #111827;
      font-size: 10px;
      line-height: 1.35;
    }
    .print-report article { display: grid; gap: 12px; }
    .print-report h1,
    .print-report h2,
    .print-report p { margin: 0; }
    .print-report h1 { font-size: 22px; }
    .print-report h2 { font-size: 14px; margin-bottom: 8px; }
    .report-header { border-bottom: 2px solid #111111; padding-bottom: 12px; }
    .eyebrow {
      color: #111111;
      background: #b8ec51;
      border: 1px solid #111111;
      border-radius: 999px;
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0;
      padding: 2px 6px;
      text-transform: uppercase;
    }
    .report-callout {
      border: 1px solid #111111;
      border-left: 5px solid #23a094;
      display: grid;
      grid-template-columns: 125px minmax(0, 1fr);
      gap: 10px;
      padding: 10px;
      page-break-inside: avoid;
    }
    .report-callout.caution { border-left-color: #ca8a04; }
    .report-callout.danger { border-left-color: #dc2626; }
    .report-callout span,
    .report-grid span {
      color: #4b5563;
      display: block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .report-callout strong { display: block; font-size: 18px; margin-top: 4px; }
    .report-callout p { overflow-wrap: anywhere; }
    .report-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    .report-grid div {
      border: 1px solid #d1d5db;
      min-width: 0;
      padding: 7px;
      page-break-inside: avoid;
    }
    .report-grid strong {
      display: block;
      font-size: 13px;
      margin-top: 4px;
      overflow-wrap: anywhere;
    }
    .report-grid small { color: #4b5563; display: block; margin-top: 3px; }
    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
    }
    thead { display: table-row-group; }
    th,
    td {
      border: 1px solid #d1d5db;
      overflow-wrap: anywhere;
      padding: 5px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f3f4f6;
      font-size: 8px;
      text-transform: uppercase;
    }
    tr,
    section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    th:nth-child(1),
    td:nth-child(1) { width: 20%; }
    th:nth-child(2),
    td:nth-child(2) { width: 28%; }
    th:nth-child(3),
    td:nth-child(3) { width: 15%; }
    th:nth-child(4),
    td:nth-child(4),
    th:nth-child(5),
    td:nth-child(5) { width: 18.5%; }
    footer {
      border-top: 1px solid #d1d5db;
      color: #4b5563;
      padding-top: 10px;
    }
    @media print {
      body { margin: 0; }
    }
  `;
}

function buildReportModel(forecast) {
  const eventDays = forecast.daily.filter((day) => day.events.length > 0);
  const lowest = forecast.daily.reduce((min, day) => (day.endingBalance < min.endingBalance ? day : min), forecast.daily[0]);
  const nextIncome = forecast.daily.find((day) => day.events.some((event) => event.type === "income"));
  const nextNegative = forecast.daily.find((day) => day.endingBalance < 0);
  const totalIncome = sum(forecast.monthly, "income");
  const totalExpenses = sum(forecast.monthly, "expenses");
  const monthly = forecast.monthly.slice(0, 12);

  return {
    createdAt: new Date(),
    openingBalance: forecast.openingBalance,
    yearEndBalance: forecast.yearly.yearEndBalance,
    netChange: forecast.yearly.yearEndBalance - forecast.openingBalance,
    lowest,
    score: forecast.score,
    eventDays,
    nextIncome,
    nextNegative,
    totalIncome,
    totalExpenses,
    monthly,
    upcomingEvents: eventDays
      .flatMap((day) =>
        day.events.map((event) => ({
          date: day.date,
          name: event.name,
          type: event.type,
          signedAmount: event.signedAmount,
          endingBalance: day.endingBalance,
        }))
      )
      .slice(0, 12),
  };
}

function renderReportHtml(report) {
  const riskLine = report.nextNegative
    ? `First projected negative day is ${formatDate(report.nextNegative.date)}.`
    : "No negative-balance day appears in the current forecast window.";
  const nextIncomeLine = report.nextIncome
    ? `${formatDate(report.nextIncome.date)}<small>${formatMoney(sum(report.nextIncome.events.filter((event) => event.type === "income"), "signedAmount"))}</small>`
    : "No upcoming income event in this forecast window.";
  const upcomingEvents = report.upcomingEvents.length
    ? report.upcomingEvents
        .map(
          (event) => `<tr>
            <td>${formatDate(event.date)}</td>
            <td>${escapeHtml(event.name)}</td>
            <td>${titleCase(event.type)}</td>
            <td>${formatMoney(event.signedAmount)}</td>
            <td>${formatMoney(event.endingBalance)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td colspan="5">No forecast events added yet.</td></tr>`;
  const monthlyRows = report.monthly
    .map(
      (month) => `<tr>
        <td>${formatMonth(month.month)}</td>
        <td>${formatMoney(month.income)}</td>
        <td>${formatMoney(month.expenses)}</td>
        <td>${formatMoney(month.lowestBalance)}</td>
        <td>${formatMoney(month.endingBalance)}</td>
      </tr>`
    )
    .join("");

  return `<article>
    <header class="report-header">
      <p class="eyebrow">Bumi Report</p>
      <h1>Cash-flow forecast summary</h1>
      <p>Created ${report.createdAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
    </header>

    <section class="report-callout ${report.score.status.toLowerCase()}">
      <div>
        <span>Runway status</span>
        <strong>${report.score.status}</strong>
      </div>
      <p>${escapeHtml(report.score.explanation)} ${riskLine}</p>
    </section>

    <section class="report-grid">
      <div><span>Opening balance</span><strong>${formatMoney(report.openingBalance)}</strong></div>
      <div><span>Year-end projection</span><strong>${formatMoney(report.yearEndBalance)}</strong></div>
      <div><span>Net change</span><strong>${formatMoney(report.netChange)}</strong></div>
      <div><span>Lowest balance</span><strong>${formatMoney(report.lowest.endingBalance)}</strong><small>${formatDate(report.lowest.date)}</small></div>
      <div><span>Forecast income</span><strong>${formatMoney(report.totalIncome)}</strong></div>
      <div><span>Forecast expenses</span><strong>${formatMoney(report.totalExpenses)}</strong></div>
      <div><span>Negative days</span><strong>${report.score.negativeDays}</strong></div>
      <div><span>Next income</span><strong>${nextIncomeLine}</strong></div>
    </section>

    <section>
      <h2>Upcoming events</h2>
      <table>
        <thead><tr><th>Date</th><th>Event</th><th>Type</th><th>Amount</th><th>Ending</th></tr></thead>
        <tbody>${upcomingEvents}</tbody>
      </table>
    </section>

    <section>
      <h2>Monthly outlook</h2>
      <table>
        <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Lowest</th><th>Ending</th></tr></thead>
        <tbody>${monthlyRows}</tbody>
      </table>
    </section>

    <footer>
      <p>Bumi Money is a planning tool, not financial advice. Forecasts are estimates based on the information entered in this browser.</p>
    </footer>
  </article>`;
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

function signedMoneyValue(value) {
  return Number(value) || 0;
}

function forecastYearsValue(value) {
  const years = Number(value) || DEFAULT_FORECAST_YEARS;
  return [1, 2, 3, 5].includes(years) ? years : DEFAULT_FORECAST_YEARS;
}

function themeValue(value) {
  return value === "dark" ? "dark" : "light";
}

function getForecastDays(plan = state) {
  return forecastYearsValue(plan.forecastYears) * DAYS_PER_YEAR;
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

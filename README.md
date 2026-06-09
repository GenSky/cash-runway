# Cash Runway

See your future bank balance before your bills hit.

Cash Runway is a static, offline-capable PWA for forecasting account balances across the next 365 days. It is not a budgeting app, spending category app, or pie chart app. The core product is the forecast engine: "What will my account balance be on any future day if life happens?"

## Features

- Daily projected ending balances for the next 365 days
- Weekly, biweekly, monthly, yearly, and one-time forecast events
- Income, bills, debt payments, savings contributions, transfers, and irregular expenses
- Safe, Caution, and Danger status indicators
- Lowest balance day, negative balance highlighting, and next paycheck highlighting
- Monthly summaries with income, expenses, low, high, ending balance, and net change
- Yearly 12-month projection with best/worst month and year-end balance
- Scenario Center with live sliders and no-save simulation by default
- Stress Test My Life comparison table
- Cash Runway Score with plain-English explanation
- Balance transfer, debt snowball, car payment, and emergency fund calculators
- Add To Calendar buttons that create forecast events
- Demo data, JSON export/import, reset, and copy summary
- LocalStorage persistence only
- Installable PWA with offline support after first load

## Architecture

The app is intentionally dependency-free:

- `index.html` defines the static application shell.
- `styles.css` provides mobile-first responsive UI.
- `app.js` contains state management, the forecast engine, scenario logic, calculators, rendering, import/export, and PWA registration.
- `manifest.json` enables installable app behavior.
- `sw.js` caches the application shell for offline use.

All user data is stored in the browser through LocalStorage under `cash-runway-v1`. There is no backend, database, authentication layer, or paid API.

## Forecast Engine

The forecast engine is centered on `generateForecast(plan, options)` in `app.js`.

It:

1. Starts with the current account balance.
2. Expands one-time and recurring events across a daily 365-day timeline.
3. Applies scenario-only adjustments without mutating saved data.
4. Applies each day's income and expenses to the running balance.
5. Produces daily rows, monthly summaries, yearly summaries, and Cash Runway Score inputs.

Supported recurrence values are:

- `none`
- `weekly`
- `biweekly`
- `monthly`
- `yearly`

Monthly and yearly dates are clamped to the last valid day of the target month, so an event that starts on the 31st still appears in shorter months.

## Local Development

Open the folder and run any static server:

```bash
python -m http.server 4173
```

Then visit:

```text
http://localhost:4173
```

No install step is required.

## GitHub Pages Deployment

This project is GitHub Pages compatible because it is static HTML/CSS/JavaScript.

Recommended deployment:

1. Push the repository to GitHub.
2. Open repository settings.
3. Go to Pages.
4. Select the deployment source as `Deploy from a branch`.
5. Choose the `main` branch and `/root`.

The site will be available at:

```text
https://<github-username>.github.io/cash-runway/
```

## Future Roadmap

- Editable forecast events
- Event search and filters
- Multiple account support
- Account transfer linking
- Richer scenario templates
- CSV export
- More calculator depth for APR and amortization
- Optional encrypted backup file
- Accessibility audit with screen reader testing
- Automated unit tests for recurrence and score calculations

## License

MIT

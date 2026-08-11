# GENEVIEVE Budget Compass V2

A lightweight privacy-first monthly budget app built with React + Vite and ready for GitHub + Vercel.

## Improvements in V2

- Month-by-month budget history instead of a single rolling ledger.
- Separate income, planned category amounts, recorded spending and cash remaining.
- Per-month category overrides while keeping reusable default category plans.
- Editable categories and transaction dates.
- Clear green / amber / red early-warning signals.
- Starter categories for fast setup.
- Copy a previous month's plan forward.
- JSON export/import backup.
- Automatic migration from the original `genevieve-budget-data` localStorage format.
- Mobile-first, accessible interface and reduced-motion support.
- No account or backend required; budget data remains in the current browser/device.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Vercel

Import the GitHub repository into Vercel. Vercel will detect Vite automatically.

- Build command: `npm run build`
- Output directory: `dist`

No environment variables are required for this local-only version.

## Important data note

Budget data is stored in browser localStorage. Clearing browser/site data or changing devices will remove it unless the user first exports a JSON backup.

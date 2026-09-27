<p align="center"><img src="public/logo.png" width="96" alt="Cukai." /></p>

# Cukai.

A desktop app for tracking Malaysian personal income tax: log relief claims and receipts by year of assessment, keep your EA and BE forms, and see an estimate of tax payable or refund.

- Relief limits and tax brackets per year, capped the way LHDN caps them (including shared limits)
- Rates can be loaded from a Google Sheet published as CSV; see `docs/tax-rates-template.csv` (YA 2021 to 2025, taken from hasil.gov.my)
- Data stays on your computer in SQLite; receipts and forms are saved to a folder you choose

## Run

```sh
npm install
npx tauri dev
```

Build an installable app with `npx tauri build`. Rust must be installed.

## Stack

Tauri 2, React, TypeScript, Vite, Tailwind, shadcn/ui.

## Tests

```sh
npm test
```

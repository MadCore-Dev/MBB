# Mangala Body Builders - ERP System (MBB)

A modern, lightweight ERP system designed for managing work entries, invoices, quotations, payments, and client records. Refactored for maintainability with a modular JavaScript architecture and a responsive, premium UI.

## Features

- **Work Entries**: Track vehicle service and work items with a clean mobile-card layout.
- **Invoices & Quotes**: Generate professional documents. Draft invoices support sequential numbering upon locking.
- **Payment Tracking**: Record and manage client payments.
- **Client Management**: Maintain a central database of client details and GSTINs.
- **Print Engine**: Built-in support for multiple layouts:
  - **A4 Layout**: For official records and mailing.
  - **Thermal Layout**: For quick receipts.
- **Business Logic**: 
  - Protection for billed work entries.
  - Locking mechanism for invoices to prevent accidental deletion.
- **Responsive Design**: Mobile-first approach using Vanilla CSS and modern UI patterns.

## Tech Stack

- **HTML5**: Semantic structure.
- **Vanilla CSS**: Custom styling with dark mode support.
- **JavaScript (ES6+)**: Modular logic separated into:
  - `db.js`: Local storage and data management.
  - `ui.js`: UI components and theme toggling.
  - `print.js`: Print rendering engine.
  - `main.js`: Main application logic and CRUD.

## Getting Started

1. Clone the repository.
2. Open `index.html` in any modern web browser.
3. (Optional) Use a local server (like Live Server) for the best experience.

## Usage

- **Test Data**: Click the "Test Data" button in the sidebar to populate the app with demonstration data.
- **Dark Mode**: Toggle the sun/moon icon in the sidebar to switch themes.
- **Mobile View**: Accessible via the hamburger menu on smaller screens.

---
*Developed with focus on speed, clarity, and business integrity.*

# Mangala Body Builders - ERP System - Development Roadmap & TODOs

## 🐛 High-Priority Bug Fixes & Edge Cases
- [ ] **Floating-Point Math Standardization:** Create a global utility function for money formatting. Enforce a strict 2-decimal rounding (`.toFixed(2)` converted back to float) *before* adding line items and tax to prevent fractional penny mismatches.
- [ ] **Dynamic Company Settings:** Move `COMPANY_DETAILS` out of hardcoded `js/print.js` and into `appDB`. Create a "Settings" UI tab so the business owner can update phone numbers, GSTIN, and addresses dynamically.
- [ ] **Payment Over-Logging Guardrail:** Add validation in the Payments tab. If a logged payment exceeds the client's outstanding balance, trigger a warning: *"This payment exceeds the outstanding balance. Log as Advance Payment?"*
- [ ] **Mobile Kebab Menu Clipping:** Refactor the mobile 3-dot (kebab) menu. Replace the absolute-positioned dropdown (which clips inside `overflow: hidden` cards) with a fixed "Bottom Sheet" modal for guaranteed visibility.

## 🚀 Core Feature Roadmap
- [ ] **Dashboard / Home Screen:** Build a landing page to replace the abrupt "Work Entries" default view. Include key metrics:
  - Total Unpaid / Outstanding Invoices
  - Monthly Revenue (Sum of locked invoices for the current month)
  - Pending Quotations (Follow-up reminders)
- [ ] **Advanced Tax Configuration:** Replace the hardcoded 18% tax toggle. Add a dropdown for different GST slabs (e.g., 5%, 12%, 18%, 28%) and an option for IGST (Flat rate for out-of-state clients) vs. CGST/SGST split.
- [ ] **Export to Excel / CSV:** Add a data export feature specifically formatted for Chartered Accountants (CAs). Allow downloading the Invoice Ledger as a `.csv` or `.xlsx` for easy import into Tally or Zoho Books.
- [ ] **Pagination / Virtualization:** Update list rendering functions (like `renderWorkEntriesList`). Instead of rendering the entire database at once (which will cause UI freezing at 5,000+ entries), implement 50-item pagination or a "Load More" button.

## 🔒 Security & Architecture (Local-First to Cloud)
- [ ] **App Authentication (PIN Code):** Implement a simple 4-digit PIN overlay on app startup to secure financial data from unauthorized viewers on the local device.
- [ ] **Microsoft OneDrive Integration:** Replace the local-storage database engine with Microsoft Graph API authentication. Allow the app to read/write `mangala_db.json` directly to the user's personal OneDrive account for free, secure, cross-device cloud sync.
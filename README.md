# Mangala ERP (MBB)

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

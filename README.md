# sparee-commerce

A Django-based spare parts marketplace prototype with buyer/seller onboarding, HTMX-enhanced auth flows, and a vendor dashboard UI.

## Overview

This project is a web application for spare-parts commerce. It includes:
- Public storefront landing page
- Account signup/login flows for buyers and sellers
- Seller license upload during registration
- Vendor dashboard pages (dashboard, orders, products, analytics)
- HTMX partial rendering for smoother auth interactions

## Tech Stack

- Python 3.12+
- Django 6.0.2
- django-htmx
- SQLite (default, development)
- HTML/CSS/JS static assets

## Features

- Buyer and seller account registration
- Seller onboarding with license file validation
  - Allowed extensions: `.pdf`, `.png`, `.jpg`, `.jpeg`
  - Max file size: 5MB
- Login with optional "remember me"
- Forgot-password request form UX (safe generic success message)
- Vendor-facing templates for key operations pages

## Project Structure

```text
WebApp/
  App/                # Django app (views, forms, models, migrations)
  WebApp/             # Django project settings and URL config
  templates/          # Shared, auth, and vendor templates
  static/             # CSS, JS, vendor assets
  media/              # Uploaded files (e.g., seller licenses)
  manage.py
  db.sqlite3
```

## Getting Started

### 1. Clone repository

```bash
git clone git@github.com:BlackCobra29-bit/sparee-commerce.git
cd sparee-commerce/WebApp
```

### 2. Create and activate virtual environment

Windows PowerShell:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install django==6.0.2 django-htmx
```

### 4. Apply migrations

```bash
python manage.py migrate
```

### 5. Run the development server

```bash
python manage.py runserver
```

Open: `http://127.0.0.1:8000/`

## Main Routes

- `/` - Home / storefront
- `/login/` - Login
- `/signup/` - Signup
- `/forgot-password/` - Forgot password
- `/vendor/` - Vendor dashboard
- `/vendor/orders/` - Vendor orders
- `/vendor/products/` - Vendor products
- `/vendor/analytics/` - Vendor analytics
- `/admin/` - Django admin

## Development Notes

- `DEBUG=True` and a development `SECRET_KEY` are currently in settings.
- `ALLOWED_HOSTS` is empty for local development.
- `db.sqlite3` is included in the repository.
- Consider adding a `.gitignore` for environment files, caches, and local DB if you move beyond prototype use.

## Future Improvements

- Add `requirements.txt` or `pyproject.toml` for reproducible installs
- Implement real password reset email flow
- Add tests for forms and auth workflows
- Add role-based access controls for vendor-only pages
- Prepare production settings and deployment pipeline

## License

No license file is currently defined. Add a `LICENSE` file if you want to specify usage terms.

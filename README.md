# Stride — Running Pace Calculator

A free running toolkit for iPhone, with a companion web app. Calculate pace, predict race times, generate training zones, view per-mile splits, and track every result. No account. No subscription.

**Live site:** [runyourstride.com](https://runyourstride.com)

---

## Features

- **Pace Calculator** — Enter any two of distance, time, or pace and solve for the third
- **Pace Chart** — Full reference table across 15-second intervals for all standard race distances
- **Race Predictor** — Predict finish times across distances using the Riegel formula
- **Training Zones** — Five calibrated zones (Recovery → Rep/Speed) based on goal race and time
- **Run History & Splits** — Every calculation saved locally with full per-mile/km splits on tap
- **Light & Dark Mode** — Single-tap theme toggle, preference saved automatically

---

## Tech Stack

**Web App**
- Vanilla HTML, CSS, JavaScript — no frameworks, no dependencies
- Custom scroll-picker inputs built from scratch
- localStorage for run history and user preferences
- Responsive layout with mobile-first design

**Landing Page**
- Semantic HTML5 with self-contained CSS
- League Spartan + Lato via Google Fonts
- Scroll-triggered fade-in animations via IntersectionObserver
- Fully responsive with hamburger nav for mobile
- SEO: meta description, Open Graph, Twitter Card, canonical URL

**Deployment**
- Hosted on Netlify with continuous deployment from GitHub
- Custom domain via Porkbun with ALIAS DNS record
- Free SSL via Netlify

**Analytics**
- Google Analytics 4
- Google Search Console

---

## Project Structure

```
├── index.html          # Landing page
├── calculator.html     # Web calculator app
├── privacy.html        # Privacy policy
├── support.html        # Support page
├── style.css           # Web app styles
├── script.js           # Web app logic
└── images/             # Logo, app screenshots, hero images
```

---

## Local Development

No build step required. Open any `.html` file directly in a browser, or use a local server:

```bash
npx serve .
```

---

## iOS App

The native iPhone app is built with Swift and SwiftUI — coming soon to the App Store.

---

## Author

Built by [Mark Winn](https://www.markwinndesigns.com)

# 🧹 Chore Points Tracker

> An iOS-optimized, family-friendly web application designed for self-hosting on **Unraid**, **Docker**, or any Linux container server. Track daily chore routines, points, task streaks, allowance, family rewards, and deliver scheduled push notifications directly to children's devices via Pushover.

![Version](https://img.shields.io/badge/version-v2.6.0-indigo.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![Platform](https://img.shields.io/badge/platform-Unraid%20%7C%20Linux%20%7C%20Docker-orange.svg)

---

## ✨ Features

### 📋 Chore & Task Management
- **Compact & Detailed Views**: Toggle between a high-density, single-line **Compact View** (perfect for phones and tablets) and an expanded **Detailed View** with task descriptions and schedules.
- **Custom Icon & Emoji Picker**: Choose from curated chore icons or paste/type **any emoji** (e.g. 🐶, 🪥, 🧹, 📚, ⚽) with live preview.
- **Flexible Scheduling**: Set tasks as *Daily*, *Specific Days of the Week* (Mon–Sun), *Anytime (Flexible)*, or *One-Time Chores* with customizable target due dates that remain active until completed.
- **Points & Monthly Allowance**: Categorize chores as point-earning, monthly allowance tasks, or hybrid bounties.
- **Interactive Completion**: Satisfying check-off animations with celebratory confetti and one-click undo support.

### 💰 Monthly Allowance Reset & Automated 1st-of-Month Email
- **End-of-Month Auto-Reset**: At the end of each month, each child's monthly chore completion rate and earned cash payout are automatically finalized and archived into persistent settlement records.
- **Fresh Start on the 1st**: On the 1st of every month, active allowance trackers reset to $0.00 so children start fresh to build their new month's streaks.
- **Automated Statement Email on the 1st**: Every month on the 1st at 8:00 AM PST, an email summary is sent to parents via Gmail with the previous month's final details:
  - Total family allowance payout owed
  - Per-child completion percentage, target allowance, and earned cash payout
  - Full breakdown of completed chore counts vs missed duties
  - Direct link to open the Allowance Dashboard
- **Preview & On-Demand Send**: Parents can preview the monthly email report or send it on-demand anytime from the Allowance tab or Settings.

### 👨‍👩‍👧‍👦 Multi-Child Profiles & Parent Controls
- **Individual Child Profiles**: Switch between siblings seamlessly, each with their own points balance, active streaks, avatars, and visual theme preference.
- **PIN-Protected Parent Mode**: Keep administrative features secure. Easily add, edit, or delete chores, approve rewards, adjust balances, and configure server settings.
- **Visual Themes**: Choose between **Classic Warm** or the modern dark-mode **Fintech Hustle** theme.

### 🎁 Reward Store & Redemption Workflow
- **Custom Reward Catalog**: Define real-world privileges (e.g. screen time, ice cream outing, special privileges) with point costs.
- **Approval Workflow**: Support instant redemptions or require Parent approval before points are deducted.
- **Redemption Logs**: Complete history of requested and approved rewards.

### 📲 Push Notifications via Pushover (iOS & Android)
- **Direct Device Push Notifications**: Keep kids reminded of their daily chores via Pushover.
- **Per-Child Delivery**: Each child can have their own Pushover User Key.
- **Target Specific Devices**: Route alerts to a child's specific phone or tablet using Pushover's `device` parameter (e.g. `Liam-iPhone`), or leave blank to alert all registered devices.
- **Customizable Delivery Time**: Schedule automated daily reminder alerts per child.
- **Test Push Tool**: Built-in test button to verify notification delivery with zero guesswork.

### 📧 Daily Parent Email Digests
- Automated end-of-day summary reports sent via SMTP (Gmail) detailing which chores were finished and which were missed.

### 💾 Unraid & Docker Ready
- **Single Container**: Runs Express backend and Vite/React frontend together on port `3000`.
- **Persistent Data Volume**: Mount `/app/data` to persist all chores, child accounts, logs, and backups across container updates.
- **Automated Midnight Rollover**: Handled cleanly in the Pacific Time (America/Los_Angeles) timezone.
- **Backup & Restore**: Export full JSON backups or restore data directly from the settings interface.

---

## 🚀 Quick Start with Docker

### 1. Standalone Docker Run
```bash
docker run -d \
  --name=chore-tracker \
  -p 3000:3000 \
  -v /mnt/user/appdata/chore-tracker:/app/data \
  -e TZ="America/Los_Angeles" \
  -e PUSHOVER_APP_TOKEN="your_pushover_app_token" \
  --restart unless-stopped \
  chore-tracker:latest
```

### 2. Docker Compose
Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  chore-tracker:
    container_name: chore-tracker
    image: chore-tracker:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /mnt/user/appdata/chore-tracker:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - TZ=America/Los_Angeles
      # Pushover App Token from https://pushover.net/apps/build
      - PUSHOVER_APP_TOKEN=your_pushover_app_token
      # Optional: Parent email digests via Gmail
      # - PARENT_EMAIL=parent@example.com
      # - GMAIL_USER=your_email@gmail.com
      # - GMAIL_APP_PASSWORD=your_16_char_app_password
      # - DAILY_REPORT_TIME=20:00
```

Run:
```bash
docker compose up -d
```

Access the app in your browser at `http://<your-server-ip>:3000`.

---

## 🗄️ Unraid Installation Guide

1. In the Unraid WebUI, navigate to the **Docker** tab and click **Add Container**.
2. Configure the container fields:
   - **Name:** `chore-tracker`
   - **Repository:** `chore-tracker:latest` (or your local build)
   - **Network Type:** `bridge`
   - **WebUI Port:** `3000` -> Host Port `3000`
   - **Host Path:** `/mnt/user/appdata/chore-tracker` -> Container Path: `/app/data` (Mode: `RW`)
3. Add Optional Environment Variables:
   - `PUSHOVER_APP_TOKEN`: Your 30-character application token from [pushover.net](https://pushover.net/apps/build).
   - `TZ`: `America/Los_Angeles` (or your local timezone).
4. Click **Apply**.

> **Tip:** You can also download the pre-formatted XML template directly from the **Unraid & Server** tab inside the app's Parent Settings modal.

---

## 📱 Pushover Setup & Specific Device Targeting

1. Create a free account at [pushover.net](https://pushover.net).
2. Install the Pushover app on your child's iOS or Android device.
3. On pushover.net, click **Create an Application / API Token**:
   - Name: *Chore Tracker*
   - Copy the generated 30-character **API Token** and enter it into the app's Parent Settings (or pass via `PUSHOVER_APP_TOKEN`).
4. In Chore Tracker, enter Parent Mode (default PIN: `1234`), click **Child Profiles → Alerts**:
   - **Pushover User Key:** Paste the 30-character User Key shown on the child's Pushover dashboard.
   - **Device Name (Optional):** To send alerts **only** to their specific phone/tablet (and avoid buzzing shared family devices or computers), enter the exact device name from Pushover (e.g., `Liam-iPhone`). Leave blank to alert all devices.
   - **Daily Delivery Time:** Set when the automated chore reminder should fire.
   - Tap **Send Test Push** to confirm instant delivery!

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port the server listens on | `3000` |
| `NODE_ENV` | Application environment (`production` / `development`) | `production` |
| `TZ` | Server timezone for scheduled cron jobs and midnight resets | `America/Los_Angeles` |
| `PUSHOVER_APP_TOKEN` | 30-character Pushover Application API Token | *None* |
| `PARENT_EMAIL` | Optional parent email recipient for daily chore summaries | *None* |
| `GMAIL_USER` | Gmail address used to send daily digest emails | *None* |
| `GMAIL_APP_PASSWORD`| 16-character Google App Password (requires Google 2FA) | *None* |
| `DAILY_REPORT_TIME` | 24-hour time (`HH:MM`) when the daily email is sent | `20:00` |

---

## 🛠️ Local Development & Building

### Prerequisites
- Node.js 20+
- npm

### Installation & Run
```bash
# Clone the repository
git clone https://github.com/your-repo/chore-tracker.git
cd chore-tracker

# Install dependencies
npm install

# Start development server with HMR and Express API backend
npm run dev
```

### Build for Production
```bash
# Compiles Vite frontend and bundles server.ts into dist/server.cjs
npm run build

# Start the compiled production server
npm start
```

### Build Docker Image
```bash
docker build -t chore-tracker:latest .
```

---

## 🔒 Security & Data Persistence

- **Local-First & Offline Capable**: All data is stored locally in the persistent volume directory (`/app/data/chore_data.json`).
- **No Third-Party Cloud Lock-In**: Your family's chore data stays on your local server.
- **PIN Protection**: Administrative actions and balances require the parent PIN.

---

## 📄 License
This project is open-source and available under the MIT License.

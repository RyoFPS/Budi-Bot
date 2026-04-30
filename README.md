<div align="center">

# 🤖 Budi Bot

**A feature-rich Discord bot for server management, verification, and community engagement.**

![Discord.js](https://img.shields.io/badge/discord.js-v14.26.3-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-v16.9.0+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)
![PM2](https://img.shields.io/badge/PM2-Production-2B037A?style=for-the-badge&logo=pm2&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

<br/>

<img src="https://img.shields.io/badge/Status-Online-brightgreen?style=flat-square" alt="Status"/>
<img src="https://img.shields.io/badge/Features-8-blueviolet?style=flat-square" alt="Features"/>
<img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="Language"/>

---

_Budi Assistant — Your all-in-one Discord server companion._

</div>

<br/>

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [File Structure](#-file-structure)
- [Environment Variables](#-environment-variables)
- [Setup Instructions](#-setup-instructions)
- [Production Deployment](#-production-deployment-pm2-on-ubuntu)
- [Update Workflow](#-update-workflow)
- [GitHub Actions Setup](#-github-actions-setup)
- [Role Hierarchy](#-role-hierarchy)
- [Bot Permissions & Intents](#-bot-permissions--intents)
- [Tech Stack](#-tech-stack)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

Budi Bot comes packed with **8 powerful features** designed to automate and enhance your Discord server experience.

|  #  | Feature                                               | Description                            |
| :-: | ----------------------------------------------------- | -------------------------------------- |
|  1  | [✅ Emoji Verification](#1--emoji-verification)       | Reaction-based role assignment         |
|  2  | [🎉 Welcome Messages](#2--welcome-messages)           | Greet new members with rich embeds     |
|  3  | [😢 Goodbye Messages](#3--goodbye-messages)           | Farewell departing members             |
|  4  | [📊 Server Statistics](#4--server-statistics)         | Auto-updating server stats dashboard   |
|  5  | [📜 Server Rules](#5--server-rules-bilingual)         | Bilingual rules (EN + ID)              |
|  6  | [📝 /update Command](#6--update-slash-command)        | Manual changelog posting               |
|  7  | [🔗 GitHub Auto Changelog](#7--github-auto-changelog) | Automated changelog via GitHub Actions |
|  8  | [📨 Invite Tracker](#8--invite-tracker)               | Track who invited whom                 |

---

### 1. ✅ Emoji Verification

> Secure your server with reaction-based verification.

- Users react with ✅ on a verification embed in the `#verification` channel
- Bot automatically assigns the **"Verified"** role upon reaction
- Removing the reaction removes the role instantly
- Sends a **DM confirmation** to the user upon successful verification

### 2. 🎉 Welcome Messages

> Make every new member feel at home.

- Sends a beautiful **green-themed embed** to `#welcome` when a member joins
- Displays:
  - 🖼️ User avatar
  - 👤 Username
  - 🆔 User ID
  - 📊 Member count (`#N`)
  - 📅 Account creation date

### 3. 😢 Goodbye Messages

> Acknowledge departing members gracefully.

- Sends a **red-themed embed** to `#goodbye` when a member leaves
- Displays:
  - 🖼️ User avatar
  - 👤 Username
  - 🆔 User ID
  - ⏱️ Time spent in the server
  - 📊 Remaining member count

### 4. 📊 Server Statistics

> A live dashboard that keeps your server info up to date.

- Sends a **purple-themed embed** to a dedicated `#stats` channel
- Displays:
  - 👥 Total members, online members, humans, bots
  - 📁 Channel count & role count
  - 📅 Server creation date
  - 🚀 Boost level
  - 👑 Server owner
- ⏰ **Auto-updates every 30 minutes**
- ⚡ **Instantly updates** on member join/leave
- ✏️ Edits the same message — no spam!

### 5. 📜 Server Rules (Bilingual)

> Professional rules in both English and Bahasa Indonesia.

- Sends **4 beautifully formatted embeds** to `#rules` on first boot
- Contains **10 comprehensive rules** in both 🇬🇧 English and 🇮🇩 Bahasa Indonesia
- Includes an **enforcement section**:
  - ⚠️ Warning → ⏸️ Timeout → 👢 Kick → 🔨 Ban
- Smart duplicate detection — won't re-send if already posted

### 6. 📝 /update Slash Command

> Post manual changelogs with style.

- 🔒 **Restricted** to Owner and Admin roles only
- Slash command options:
  | Option | Description |
  |--------|-------------|
  | `version` | Version number (e.g., `1.2.0`) |
  | `title` | Update title |
  | `changes` | Change entries separated by `\|` |
  | `type` | `Feature` / `Bug Fix` / `Maintenance` / `Announcement` |
- 🎨 **Color-coded embeds** based on update type
- Posts to `#changelog` channel
- Registered via `deploy-commands.js`

### 7. 🔗 GitHub Auto Changelog

> Automated changelogs powered by GitHub Actions.

- On every `git push` to `main`, sends a formatted embed to Discord via **webhook**
- 🔍 Auto-detects update type from commit messages:
  | Prefix | Type |
  |--------|------|
  | `fix:` | 🐛 Bug Fix |
  | `feat:` | ✨ Feature |
  | `docs:` | 📚 Documentation |
  | `chore:` | 🔧 Maintenance |
  | Other | 📦 General Update |
- 📝 Shows all commits as bullet points with short SHA
- 🔗 Links to full diff and repository

### 8. 📨 Invite Tracker

> Know exactly who invited each new member.

- Tracks which invite link was used when a member joins
- Shows **who invited whom** with invite code and total invite count
- Displays:
  - 👤 New member info
  - 📨 Who invited them (with mention)
  - 🔗 Invite code used
  - 📊 Inviter's total invite count
- Handles edge cases: Vanity URLs, Server Discovery, expired invites
- Posts to a dedicated `#invite-tracker` channel
- Requires **Manage Server** permission

---

## 🚀 Quick Start

Get Budi Bot up and running in under 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/budi-bot.git
cd budi-bot

# 2. Install dependencies
npm install

# 3. Create your .env file (see Environment Variables section)
cp .env.example .env
# Edit .env with your values

# 4. Register slash commands (one-time)
node deploy-commands.js

# 5. Start the bot
node index.js
```

> 💡 **Tip:** For production deployment, see the [PM2 section](#-production-deployment-pm2-on-ubuntu) below.

---

## 📁 File Structure

```
budi-bot/
├── .env                          # Environment variables (secret)
├── .gitignore                    # Ignores node_modules/ and .env
├── .github/
│   └── workflows/
│       └── discord-changelog.yml # GitHub Actions workflow
├── deploy-commands.js            # One-time slash command registration
├── index.js                      # Main bot file (628 lines)
├── package.json                  # Project metadata & dependencies
├── package-lock.json             # Dependency lock file
└── README.md                     # You are here!
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable                    | Description                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`             | Your bot token from the [Discord Developer Portal](https://discord.com/developers/applications) |
| `GUILD_ID`                  | Your Discord server (guild) ID                                                                  |
| `APPLICATION_ID`            | Your bot's application ID                                                                       |
| `VERIFICATION_CHANNEL_ID`   | Channel ID for `#verification`                                                                  |
| `WELCOME_CHANNEL_ID`        | Channel ID for `#welcome`                                                                       |
| `GOODBYE_CHANNEL_ID`        | Channel ID for `#goodbye`                                                                       |
| `STATS_CHANNEL_ID`          | Channel ID for `#stats`                                                                         |
| `CHANGELOG_CHANNEL_ID`      | Channel ID for `#changelog`                                                                     |
| `RULES_CHANNEL_ID`          | Channel ID for `#rules`                                                                         |
| `INVITE_TRACKER_CHANNEL_ID` | Channel ID for `#invite-tracker`                                                                |
| `VERIFIED_ROLE_ID`          | Role ID for the "Verified" role                                                                 |
| `OWNER_ROLE_ID`             | Role ID for the "Owner" role                                                                    |
| `ADMIN_ROLE_ID`             | Role ID for the "Admin" role                                                                    |

```env
DISCORD_TOKEN=your_bot_token
GUILD_ID=your_server_id
APPLICATION_ID=your_app_id
VERIFICATION_CHANNEL_ID=channel_id
WELCOME_CHANNEL_ID=channel_id
GOODBYE_CHANNEL_ID=channel_id
STATS_CHANNEL_ID=channel_id
CHANGELOG_CHANNEL_ID=channel_id
RULES_CHANNEL_ID=channel_id
INVITE_TRACKER_CHANNEL_ID=channel_id
VERIFIED_ROLE_ID=role_id
OWNER_ROLE_ID=role_id
ADMIN_ROLE_ID=role_id
```

> ⚠️ **Never commit your `.env` file to version control!** It is already included in `.gitignore`.

---

## 🛠️ Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) v16.9.0 or higher
- A [Discord Bot Application](https://discord.com/developers/applications) with a bot token
- A Discord server where you have admin permissions

### Step-by-Step

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/budi-bot.git
   cd budi-bot
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Create a `.env` file in the project root
   - Fill in all required variables (see [Environment Variables](#-environment-variables))

4. **Register slash commands** _(one-time setup)_

   ```bash
   node deploy-commands.js
   ```

5. **Start the bot**

   ```bash
   node index.js
   ```

6. **Verify** — The bot should come online and log a ready message in the console. 🎉

---

## 🖥️ Production Deployment (PM2 on Ubuntu)

For 24/7 uptime, deploy Budi Bot using [PM2](https://pm2.keymetrics.io/) — a production process manager for Node.js.

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start index.js --name "budi-bot"

# Enable auto-start on system boot
pm2 startup
pm2 save

# Useful PM2 commands
pm2 restart budi-bot    # Restart the bot
pm2 stop budi-bot       # Stop the bot
pm2 logs budi-bot       # View real-time logs
pm2 status              # Check process status
pm2 monit               # Monitor CPU/Memory usage
```

---

## 🔄 Update Workflow

When you make changes locally and want to deploy to your server:

```bash
# On your Windows PC — push changes
git add .
git commit -m "feat: your changes"
git push

# On your Ubuntu server — pull and restart
cd ~/Budi-Bot
git pull
pm2 restart budi-bot
```

> ⚠️ **Important:** Never run `node index.js` directly while PM2 is running — this creates duplicate bot instances and messages will be sent twice!

---

## ⚙️ GitHub Actions Setup

Automate changelog posts to Discord on every push to `main`:

1. **Create a Discord Webhook**
   - Go to your `#changelog` channel → Edit Channel → Integrations → Webhooks
   - Create a new webhook and copy the URL

2. **Add the Webhook as a GitHub Secret**
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add a new secret: `DISCORD_WEBHOOK_URL` with the webhook URL

3. **Push to `main`**
   - Every push to the `main` branch will automatically send a formatted changelog embed to your Discord channel

> The workflow file is located at `.github/workflows/discord-changelog.yml`.

---

## 👑 Role Hierarchy

Budi Bot recognizes the following role structure:

| Role       | Emoji |   Access Level    | Permissions                      |
| ---------- | :---: | :---------------: | -------------------------------- |
| **Owner**  |  👑   |    Full Access    | All features + `/update` command |
| **Admin**  |  🛡️   | Full Access (2nd) | All features + `/update` command |
| **Member** |  👤   |      Limited      | Basic server access              |

> 📌 The `/update` slash command is restricted to users with the **Owner** or **Admin** role.

---

## 🔑 Bot Permissions & Intents

### Required Bot Permissions

Ensure your bot has the following permissions in your Discord server:

| Permission             | Purpose                        |
| ---------------------- | ------------------------------ |
| `Manage Roles`         | Assign/remove Verified role    |
| `Send Messages`        | Send embeds and messages       |
| `Embed Links`          | Display rich embeds            |
| `Manage Messages`      | Edit stats message             |
| `Read Message History` | Read existing messages         |
| `Add Reactions`        | Add verification reaction      |
| `Use External Emojis`  | Support custom emojis          |
| `View Channels`        | Access required channels       |
| `Manage Server`        | Fetch invite data for tracking |

### Required Gateway Intents

Enable these intents in the [Discord Developer Portal](https://discord.com/developers/applications) under **Bot → Privileged Gateway Intents**:

| Intent                  | Purpose                                |
| ----------------------- | -------------------------------------- |
| `Guilds`                | Access guild data                      |
| `GuildMembers`          | Track member join/leave _(privileged)_ |
| `GuildMessages`         | Read messages in channels              |
| `GuildMessageReactions` | Detect verification reactions          |
| `MessageContent`        | Read message content _(privileged)_    |
| `GuildPresences`        | Track online status _(privileged)_     |
| `GuildInvites`          | Track invite create/delete/use         |

> ⚠️ **Privileged intents** must be manually enabled in the Developer Portal.

---

## 🧰 Tech Stack

| Technology                                            | Version  | Purpose                         |
| ----------------------------------------------------- | -------- | ------------------------------- |
| [Node.js](https://nodejs.org/)                        | v16.9.0+ | JavaScript runtime              |
| [discord.js](https://discord.js.org/)                 | v14.26.3 | Discord API library             |
| [dotenv](https://www.npmjs.com/package/dotenv)        | v17.4.2  | Environment variable management |
| [PM2](https://pm2.keymetrics.io/)                     | Latest   | Production process manager      |
| [GitHub Actions](https://github.com/features/actions) | —        | CI/CD pipeline                  |

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | Description           |
| ----------- | --------------------- |
| `feat:`     | New feature           |
| `fix:`      | Bug fix               |
| `docs:`     | Documentation changes |
| `chore:`    | Maintenance tasks     |
| `refactor:` | Code refactoring      |
| `style:`    | Code style changes    |

---

## 📄 License

This project is licensed under the **ISC License**.

```
ISC License

Copyright (c) 2025

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

<div align="center">

**Made with ❤️ for the Discord community**

⭐ Star this repo if you find it useful!

</div>

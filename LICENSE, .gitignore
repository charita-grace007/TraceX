# TRACE-X

**AI-powered forensic investigation platform for automated evidence analysis, digital investigation, and cybercrime detection.**

Built for Smart India Hackathon 2026 — Problem Statement SIH26106 (AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform) — Theme: Blockchain & Cybersecurity.

## Problem Statement

Traditional email threat detection stops at "phishing / not phishing." Investigators are left without the context needed to trace a campaign back to its source, connect related incidents, or build a case. TRACE-X treats email threats as evidence, not just alerts.

## Solution

TRACE-X is an evidence-driven email investigation and campaign-intelligence platform — not a phishing classifier. It reconstructs attack paths, tracks how campaigns evolve, flags contradictions in evidence, and gives investigators an AI copilot grounded in the actual evidence graph rather than free-floating guesses.

## Features

- **Evidence Graph** — links related emails, senders, and infrastructure into a connected investigation view
- **Campaign DNA & Evolution** — tracks how a phishing/attack campaign mutates over time
- **Attack-Path Reconstruction** — rebuilds the likely sequence of an attack from available evidence
- **Contradiction Detection** — flags inconsistencies across evidence sources
- **AI SOC Copilot** — evidence-grounded assistant powered by the Gemini API, answering investigator questions using only the in-graph evidence
- **Phishing Classification** — custom TF-IDF + Logistic Regression model (scikit-learn) for email threat scoring
- **Threat Intelligence Enrichment** — integrates external sources such as urlscan.io and PhishTank where configured

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express — orchestrates the full forensic/ML pipeline
- **ML Layer:** Python (scikit-learn) — TF-IDF + Logistic Regression phishing classifier, invoked from the Node backend
- **Database:** PostgreSQL, hosted on Supabase
- **AI:** Gemini API (AI SOC Copilot)
- **Threat Intel:** urlscan.io, PhishTank (configurable integrations)

> **Note on architecture:** the original proposal specified a FastAPI backend. During implementation this was adapted to a Node/Express backend for a more cohesive, deployment-friendly full-stack prototype, with Python used specifically for the ML classifier component.

## Architecture

[diagram coming soon]

## Setup Instructions

```bash
git clone https://github.com/[your-username]/trace-x.git
cd trace-x
cp .env.example .env   # fill in required keys
npm install
npm run dev
```

## Environment Variables

See `.env.example` for the full list of required variables.

## Screenshots

[add after this]

## Team

Hassaan Mohiuddin
M. Mohana
M. Charita Grace
Ahmedi
Sheema Fatima
J. Srishanth

## Future Scope

- Real-time continuous email monitoring and automated threat detection
- Expanded threat-intelligence and campaign correlation using larger external datasets
- Advanced forensic capabilities such as deeper malware/attachment analysis and broader infrastructure attribution

## License

MIT — see [LICENSE](./LICENSE)

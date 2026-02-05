# findclass.nz

Course Search Platform - New Zealand (Mono Repo)

[![GitHub](https://img.shields.io/badge/GitHub-wangdianwen%2Ffindclass.nz-blue)](https://github.com/wangdianwen/findclass.nz)

## Overview

A comprehensive course search and management platform built with TypeScript, featuring:

- **Backend**: Express.js + TypeScript + AWS SDK (DynamoDB, Lambda, S3, SES, SQS)
- **Frontend**: React 19 + TypeScript + Ant Design 6 + React Query
- **Documentation**: Architecture and product documentation

## Quick Start

### Docker (Recommended)

```bash
# Start all services
docker-compose up -d
```

### Manual Setup

```bash
# Backend (port 3000)
cd backend && npm install && npm run dev

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```

## Project Structure

```
findclass.nz/
├── backend/           # Backend API service
├── frontend/          # React frontend application
├── docs-architecture/ # Technical architecture documentation
└── docker-compose.yml # Development environment
```

## Documentation

| Guide | Description |
|-------|------------|
| [Backend Guide](backend/README.md) | Express.js, DynamoDB, JWT Auth |
| [Frontend Guide](frontend/README.md) | React 19, Vite, Storybook |
| [CLAUDE.md](CLAUDE.md) | Claude Code development guidelines |

## Tech Stack

### Frontend (`frontend/`)

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| UI Library | Ant Design 6 + Ant Design Mobile |
| State | Zustand (global) + TanStack Query (server) |
| Routing | React Router 7 |
| Testing | Storybook + Playwright |
| i18n | react-i18next |

### Backend (`backend/`)

| Category | Technology |
|----------|------------|
| Framework | Express.js 5 + TypeScript |
| Database | DynamoDB (single-table design) |
| Auth | JWT + bcrypt |
| Cloud | AWS SDK (Lambda, S3, SES, SQS) |

## Commands

### Frontend

```bash
npm run dev       # Development server (port 5173)
npm run storybook # Storybook UI (port 6006)
npm run build     # Production build
npm run test      # Run tests
npm run lint      # ESLint check
npm run format    # Prettier format
```

### Backend

```bash
npm run dev       # Development server (port 3000)
npm run build     # TypeScript build + OpenAPI docs
npm run test      # Run tests
npm run lint      # ESLint check
npm run format    # Prettier format
```

## License

MIT

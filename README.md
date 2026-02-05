# findclass.nz

Course Search Platform - New Zealand (Mono Repo)

## Overview

A comprehensive course search and management platform built with TypeScript, featuring:

- **Backend**: Express.js + TypeScript + AWS SDK (DynamoDB, Lambda, S3, SES, SQS)
- **Frontend**: React 19 + TypeScript + Ant Design 6 + React Query
- **Documentation**: Architecture and product documentation

## Project Structure

```
findclass.nz/
├── backend/           # Backend API service
├── frontend/          # React frontend application
├── docs-architecture/ # Technical architecture documentation
├── docs-product/      # Product documentation
└── docker-compose.yml # Development environment
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or pnpm

### Installation

```bash
# Install dependencies for all workspaces
npm install

# Or with pnpm
pnpm install
```

### Development

```bash
# Run backend development server (port 3000)
npm run dev:backend

# Run frontend development server (port 5173)
npm run dev:frontend

# Run both concurrently (requires concurrently or similar)
npm run dev:backend & npm run dev:frontend
```

### Testing

```bash
# Run backend tests
cd backend && npm run test:unit

# Run frontend tests
cd frontend && npm run test:unit

# Run all tests
npm run test:backend && npm run test:frontend
```

### Building

```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:frontend
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Tech Stack

### Backend
- Runtime: Node.js 18+
- Framework: Express.js 5
- Language: TypeScript 5
- Database: DynamoDB (local with Docker)
- Testing: Vitest
- AWS Services: DynamoDB, Lambda, S3, SES, SQS

### Frontend
- Framework: React 19
- Language: TypeScript
- UI Library: Ant Design 6
- State Management: Zustand, React Query
- Internationalization: i18next (EN/ZH)
- Testing: Vitest, Playwright
- Build Tool: Vite

## License

UNLICENSED

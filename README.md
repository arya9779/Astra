# 🌟 Astra Platform

A revolutionary decentralized social media platform that combines truth verification, karma-based rewards, and blockchain technology to create a more authentic and trustworthy social experience.

## ✨ Key Features

- **🔍 Truth Verification**: AI-powered content validation with community consensus
- **⚡ Karma System**: Blockchain-based reward system for quality contributions  
- **🛡️ League System**: Progressive user advancement (Chandrika → Vajra → Agneyastra → Varunastra → Pashupatastra → Brahmastra)
- **🔐 Anonymous Whistleblowing**: Zero-knowledge proof system for secure anonymous reporting
- **💬 Encrypted Messaging**: Matrix protocol integration for secure communications
- **🏛️ Decentralized Governance**: Community-driven decision making through proposals and voting
- **🎯 Professional Boards**: League-gated collaboration spaces with video conferencing

## Project Structure

```
astra-platform/
├── backend/          # NestJS backend API
├── frontend/         # Next.js frontend application
├── contracts/        # Smart contracts (to be added)
└── docker-compose.yml
```

## Tech Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT with Passport
- **Blockchain**: ethers.js for Polygon integration

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios with interceptors

## Getting Started

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd astra-platform
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Backend:
```bash
cp backend/.env.example backend/.env
```

Frontend:
```bash
cp frontend/.env.example frontend/.env
```

4. Start development environment with Docker
```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend API on port 3001
- Frontend on port 3000

5. Run database migrations
```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
```

### Development

Run backend:
```bash
npm run backend
```

Run frontend:
```bash
npm run frontend
```

Run both:
```bash
npm run backend & npm run frontend
```

### Testing

Run backend tests:
```bash
npm run test --workspace=backend
```

### Linting and Formatting

Check formatting:
```bash
npm run format:check
```

Fix formatting:
```bash
npm run format
```

Lint code:
```bash
npm run lint
```

## Module Structure

### Backend Modules
- **Auth**: User authentication and JWT management
- **User**: User profile and statistics
- **Karma**: Karma system and transactions
- **Content**: Post creation and management
- **Validation**: Content validation system
- **Social**: Follow system and messaging
- **Marketplace**: Rewards and redemptions
- **Governance**: Proposals and voting

## API Documentation

Once the backend is running, API documentation will be available at:
- Health check: `http://localhost:3001/api/health`

## Database Schema

The database schema includes:
- Users and profiles
- Karma transactions
- Posts and validations
- Social relationships
- Marketplace and campaigns
- Governance proposals

See `backend/prisma/schema.prisma` for full schema.

## CI/CD

GitHub Actions workflows:
- **CI Pipeline**: Runs on every push/PR
  - Linting and formatting checks
  - Backend tests
  - Build verification
- **Deploy Pipeline**: Runs on main branch
  - Automated deployment to production

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🌐 Community

- **GitHub**: [Astra Platform](https://github.com/arya9779/Astra)
- **Issues**: Report bugs and request features
- **Discussions**: Join community discussions

## 🚀 Roadmap

- [ ] Mobile application (React Native)
- [ ] Advanced AI moderation
- [ ] Cross-chain integration
- [ ] NFT marketplace integration
- [ ] Advanced analytics dashboard
- [ ] Plugin ecosystem

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. The karma and blockchain features are for demonstration purposes.

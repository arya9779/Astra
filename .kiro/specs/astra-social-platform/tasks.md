# Implementation Plan

- [x] 1. Project Setup and Infrastructure





  - Initialize monorepo structure with frontend, backend, and smart contracts directories
  - Configure TypeScript, ESLint, and Prettier for code consistency
  - Set up Docker Compose for local development (PostgreSQL, Redis)
  - Configure environment variables and secrets management
  - _Requirements: All requirements depend on proper project setup_

- [x] 1.1 Initialize backend NestJS project


  - Create NestJS application with modular architecture
  - Install core dependencies (Prisma, ethers.js, class-validator, passport-jwt)
  - Configure module structure for Auth, User, Karma, Content, Validation, Social, Marketplace, Governance services
  - _Requirements: All requirements_

- [x] 1.2 Initialize frontend Next.js project


  - Create Next.js 14+ application with App Router
  - Install and configure Tailwind CSS with custom design tokens
  - Set up Zustand for state management
  - Configure API client with axios and interceptors
  - _Requirements: All requirements_

- [x] 1.3 Set up database with Prisma


  - Initialize Prisma with PostgreSQL connection
  - Create initial schema for users, user_profiles, karma_transactions tables
  - Generate Prisma client and configure in NestJS
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.4 Configure Docker development environment


  - Write Dockerfile for backend service
  - Write Dockerfile for frontend service
  - Create docker-compose.yml with PostgreSQL, Redis, backend, frontend services
  - _Requirements: All requirements_

- [x] 1.5 Set up CI/CD pipeline


  - Create GitHub Actions workflow for linting and testing
  - Configure automated deployment to Render/Fly.io on main branch
  - _Requirements: All requirements_

- [x] 2. Authentication and User Management




  - Implement user registration, login, and JWT token management
  - Create user profile management endpoints
  - Integrate wallet connection (MetaMask) for blockchain authentication
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.1 Implement Auth Service and JWT strategy


  - Create AuthModule with register, login, and token refresh endpoints
  - Implement JWT strategy with Passport
  - Create authentication guards and decorators
  - Implement password hashing with bcrypt
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_



- [ ] 2.2 Implement wallet connection authentication
  - Create endpoint for wallet challenge generation
  - Implement signature verification using ethers.js
  - Link wallet address to user account


  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2.3 Create User Service for profile management
  - Implement getUserProfile, updateProfile endpoints


  - Create user statistics tracking
  - Implement profile visibility settings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 2.4 Build authentication UI components


  - Create registration form with validation
  - Create login form with email/password and wallet options
  - Implement JWT token storage and refresh logic
  - Create protected route wrapper component
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.5 Write authentication tests




  - Unit tests for JWT token generation and validation
  - Integration tests for register and login flows
  - E2E tests for wallet connection
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Karma System Implementation




  - Build core Karma earning and deduction logic
  - Implement League progression system
  - Create Astra unlocking mechanism
  - Integrate blockchain recording for Karma transactions
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.1 Create Karma Service with transaction logic


  - Implement awardKarma and deductKarma methods
  - Create Karma transaction recording in database
  - Implement Karma balance validation (prevent negative)
  - Create getKarmaHistory endpoint with pagination
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.2 Implement League progression system


  - Create checkLeagueProgression method with threshold logic
  - Implement automatic League promotion on Karma milestones
  - Create getLeagueStatus endpoint
  - Update user_profiles table with new League on promotion
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.3 Implement Astra unlocking mechanism


  - Create user_astras table and Prisma model
  - Implement unlockAstra method triggered by League progression
  - Create getUnlockedAstras endpoint
  - Define Astra power mappings for each League
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.4 Integrate blockchain recording for Karma


  - Create smart contract interaction utilities with ethers.js
  - Implement syncToBlockchain method for Karma transactions
  - Handle transaction confirmation and update database with tx hash
  - Implement retry mechanism for failed blockchain transactions
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 3.5 Build Karma UI components


  - Create Karma balance display widget
  - Create League status card with progress bar
  - Create Karma transaction history list
  - Create Astra showcase component
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 19.1, 19.2, 19.3, 19.4_

- [x] 3.6 Write Karma system tests


  - Unit tests for Karma calculation and League progression logic
  - Integration tests for awardKarma and deductKarma flows
  - Mock blockchain interactions for testing
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. Smart Contract Development




  - Write and deploy Karma token smart contract
  - Write and deploy Validation registry smart contract
  - Write and deploy Truth Campaign smart contract template
  - Create backend utilities for smart contract interactions
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 4.1 Set up Hardhat project for smart contracts


  - Initialize Hardhat in contracts directory
  - Configure Polygon Mumbai testnet connection
  - Install OpenZeppelin contracts library
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 4.2 Write KarmaToken smart contract


  - Implement ERC-20 compatible token with mint and burn functions
  - Add access control for minter role
  - Implement transfer and balance tracking
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 4.3 Write ValidationRegistry smart contract


  - Implement recordValidation function with content hash and validator address
  - Create getValidations view function
  - Emit ValidationRecorded event
  - _Requirements: 7.2, 7.3, 14.1, 14.2, 14.3_

- [x] 4.4 Write TruthCampaign smart contract


  - Implement participate and claimReward functions
  - Add budget management and participation tracking
  - Create campaign factory pattern for brand deployments
  - _Requirements: 13.2, 13.3, 13.4, 14.1, 14.2, 14.3, 14.4_

- [x] 4.5 Deploy contracts and create interaction utilities


  - Deploy contracts to Polygon Mumbai testnet
  - Create TypeScript utilities for contract interactions using ethers.js
  - Store contract addresses in environment variables
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 4.6 Write smart contract tests


  - Unit tests for KarmaToken minting and burning
  - Unit tests for ValidationRegistry recording
  - Unit tests for TruthCampaign participation
  - Gas optimization analysis
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 5. Content Creation and Management





  - Implement content posting (text, image, video, audio)
  - Integrate IPFS for decentralized content storage
  - Build feed and discovery endpoints
  - Implement content engagement (likes, comments, shares)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 5.1 Create Content Service with post creation


  - Implement createPost endpoint with multi-format support
  - Integrate file upload handling for media
  - Store post metadata in database
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5.2 Integrate IPFS for content storage


  - Set up Pinata or Web3.Storage client
  - Implement uploadToIPFS utility function
  - Store IPFS hash in posts table
  - Implement fallback to S3 for backup
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5.3 Implement feed and discovery endpoints


  - Create getFeed endpoint with pagination and filtering
  - Implement getReels endpoint for short-form video
  - Add sorting by validation status and Karma
  - Implement basic recommendation algorithm
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 5.4 Implement post engagement system


  - Create post_engagements table and Prisma model
  - Implement like, comment, share endpoints
  - Track engagement counts on posts
  - Award Karma for positive engagement
  - _Requirements: 2.3, 16.1_

- [x] 5.5 Build content creation and feed UI


  - Create post composer with media upload
  - Build feed component with infinite scroll
  - Create post card component with validation badges
  - Implement Reels viewer
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 5.6 Write content service tests


  - Integration tests for post creation flow
  - Mock IPFS uploads for testing
  - Tests for feed pagination and filtering
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 6. AI-Powered Content Moderation








  - Integrate OpenAI Moderation API for text content
  - Integrate Hugging Face models for deepfake detection
  - Implement moderation pipeline triggered on content submission
  - Create manual review queue for flagged content
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6.1 Create AI Service module


  - Set up OpenAI API client with credentials
  - Set up Hugging Face Inference API client
  - Create moderateText method
  - Create detectDeepfake method
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6.2 Implement content moderation pipeline


  - Add moderation check before post publication
  - Flag content based on AI confidence thresholds
  - Queue flagged content for Validator review
  - Auto-reject content with >95% confidence of violation
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6.3 Create moderation review queue


  - Build endpoint for Validators to view flagged content
  - Implement approve/reject actions
  - Award Karma for confirmed moderation reports
  - _Requirements: 8.3, 8.4, 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 6.4 Build moderation UI for Validators


  - Create moderation dashboard (League-gated)
  - Display flagged content with AI reasoning
  - Implement approve/reject buttons
  - _Requirements: 8.3, 8.4, 17.4, 17.5_

- [x] 6.5 Write AI moderation tests


  - Mock OpenAI and Hugging Face API responses
  - Test moderation pipeline with various content types
  - Test auto-rejection logic
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7. Content Validation System





  - Implement validation submission by Validators
  - Build consensus mechanism (3+ validations)
  - Record validations on blockchain
  - Award Karma for validation activities
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 2.1_

- [x] 7.1 Create Validation Service


  - Implement submitValidation endpoint (League-gated to Vajra+)
  - Store validations in database
  - Create getValidations endpoint for post
  - _Requirements: 7.1, 7.2_

- [x] 7.2 Implement consensus mechanism


  - Create checkConsensus method
  - Calculate consensus based on 3+ validator agreement
  - Update post validation_status based on consensus
  - Award Karma to validators on consensus
  - _Requirements: 7.3, 7.4, 7.5, 2.1_

- [x] 7.3 Integrate blockchain recording for validations


  - Call ValidationRegistry smart contract on validation
  - Store blockchain tx hash in validations table
  - Handle transaction confirmation
  - _Requirements: 7.2, 14.2, 14.3_

- [x] 7.4 Build validation UI components


  - Add "Validate" button on posts (League-gated)
  - Create validation modal with verdict options
  - Display validation badges on verified posts
  - Show validator count and consensus status
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 7.5 Write validation system tests


  - Unit tests for consensus algorithm
  - Integration tests for validation submission flow
  - Mock blockchain interactions
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Social Features and Encrypted Communication





  - Implement follow/unfollow functionality
  - Integrate Matrix protocol for encrypted messaging
  - Create Professional Boards with video conferencing
  - Implement anonymous whistleblower boards
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 8.1 Create Social Service with follow system


  - Implement followUser and unfollowUser endpoints
  - Create follows table and Prisma model
  - Implement getFollowers and getFollowing endpoints
  - _Requirements: 16.1_

- [x] 8.2 Integrate Matrix protocol for messaging


  - Set up Matrix homeserver or use matrix.org
  - Create Matrix client wrapper in backend
  - Implement createDirectMessage endpoint
  - Implement createGroupChat endpoint
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 8.3 Implement Professional Boards


  - Create boards table and Prisma model
  - Implement createBoard endpoint (League-gated to Varunastra+)
  - Create Matrix room for each board
  - Implement inviteToBoard endpoint
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8.4 Implement anonymous whistleblower boards


  - Create anonymous posting mechanism with ZK-proofs
  - Implement League verification without identity reveal
  - Create encrypted whistleblower board type
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 8.5 Build social and messaging UI


  - Create follow/unfollow buttons
  - Build chat interface with Matrix integration
  - Create board creation and management UI
  - Implement video conferencing UI (WebRTC)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8.6 Write social features tests


  - Integration tests for follow system
  - Mock Matrix protocol for messaging tests
  - Tests for board creation and access control
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 9. Live Streaming and Events
  - Implement live stream initiation (League-gated)
  - Build real-time chat for streams
  - Create event scheduling system
  - Implement special event types (Fact-Fight, Truth League)
  - Award Karma based on stream engagement
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 9.1 Set up WebRTC infrastructure for streaming
  - Integrate streaming service (Agora, Twilio, or self-hosted)
  - Create stream initiation endpoint (League-gated to Agneyastra+)
  - Implement stream viewer endpoint
  - _Requirements: 11.1, 11.2_

- [ ] 9.2 Implement event scheduling system
  - Create events table and Prisma model
  - Implement createEvent endpoint with calendar integration
  - Create getUpcomingEvents endpoint
  - Send notifications to followers on event creation
  - _Requirements: 11.3_

- [ ] 9.3 Build live stream UI
  - Create stream broadcaster interface
  - Build stream viewer with real-time chat
  - Implement event calendar view
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 9.4 Implement Karma rewards for streaming
  - Calculate engagement metrics (viewers, duration, interactions)
  - Award Karma to host on stream completion
  - _Requirements: 11.4_

- [ ] 9.5 Write streaming tests
  - Mock WebRTC for testing
  - Integration tests for event creation
  - Tests for Karma calculation on stream end
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 10. Marketplace and Karma Redemption
  - Create reward catalog management
  - Implement Karma redemption processing
  - Build brand campaign creation system
  - Integrate smart contracts for campaigns
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 10.1 Create Marketplace Service
  - Implement listRewards endpoint with pagination
  - Create rewards table and Prisma model
  - Implement admin endpoints for reward management
  - _Requirements: 12.1_

- [ ] 10.2 Implement Karma redemption system
  - Create redeemReward endpoint
  - Validate user Karma balance before redemption
  - Deduct Karma and record transaction
  - Create redemptions table and Prisma model
  - _Requirements: 12.2, 12.3, 12.4, 12.5_

- [ ] 10.3 Implement brand campaign system
  - Create campaigns table and Prisma model
  - Implement createCampaign endpoint (Brand Partner role)
  - Deploy TruthCampaign smart contract on campaign creation
  - Store smart contract address in campaigns table
  - _Requirements: 13.1, 13.2, 13.3_

- [ ] 10.4 Implement campaign participation
  - Create participateInCampaign endpoint
  - Call smart contract participate function
  - Award Karma on successful participation
  - Track participation in campaign_participations table
  - _Requirements: 13.4, 13.5_

- [ ] 10.5 Build marketplace UI
  - Create reward catalog grid view
  - Build redemption modal with confirmation
  - Create campaign listing page
  - Implement campaign participation UI
  - Display user's redemption history
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 10.6 Write marketplace tests
  - Integration tests for redemption flow
  - Mock smart contract interactions for campaigns
  - Tests for Karma balance validation
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 11. Governance and Truth Council
  - Implement proposal creation (League-gated)
  - Build voting mechanism with Karma weighting
  - Create Astral Nexus DAO access (Brahmastra only)
  - Implement proposal execution logic
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 11.1 Create Governance Service
  - Create proposals and votes tables with Prisma models
  - Implement createProposal endpoint (League-gated to Pashupatastra+)
  - Implement getProposal and listProposals endpoints
  - _Requirements: 15.1, 15.2_

- [ ] 11.2 Implement voting mechanism
  - Create vote endpoint (League-gated to Pashupatastra+)
  - Weight votes by voter's Karma balance
  - Prevent duplicate voting
  - Calculate vote results on proposal end
  - _Requirements: 15.3, 15.4_

- [ ] 11.3 Implement proposal execution
  - Create executeProposal endpoint (admin or automated)
  - Update proposal status based on vote results
  - Trigger policy changes based on proposal type
  - _Requirements: 15.4, 15.5_

- [ ] 11.4 Build governance UI
  - Create proposal creation form (League-gated)
  - Build proposal listing with status filters
  - Create proposal detail page with voting interface
  - Display vote results and execution status
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 11.5 Write governance tests
  - Unit tests for vote weighting calculation
  - Integration tests for proposal lifecycle
  - Tests for League-based access control
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 12. Notification System
  - Implement notification creation for key events
  - Build notification delivery (in-app, email, push)
  - Create notification preferences management
  - Implement real-time notifications via WebSockets
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 12.1 Create Notification Service
  - Create notifications table and Prisma model
  - Implement createNotification method
  - Create getNotifications endpoint with pagination
  - Implement markAsRead endpoint
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [ ] 12.2 Integrate notification triggers
  - Trigger notifications on post engagement
  - Trigger notifications on Karma changes
  - Trigger notifications on League progression
  - Trigger notifications on governance proposals (for eligible users)
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [ ] 12.3 Implement WebSocket for real-time notifications
  - Set up Socket.io in NestJS
  - Create WebSocket gateway for notifications
  - Emit notifications to connected clients
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [ ] 12.4 Implement notification preferences
  - Create user_notification_preferences table
  - Implement updatePreferences endpoint
  - Respect user preferences when sending notifications
  - _Requirements: 20.5_

- [ ] 12.5 Build notification UI
  - Create notification bell icon with unread count
  - Build notification dropdown/panel
  - Implement notification preference settings page
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 12.6 Write notification tests
  - Unit tests for notification creation logic
  - Integration tests for WebSocket delivery
  - Tests for preference filtering
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [ ] 13. Reporting and Moderation Tools
  - Implement content reporting system
  - Create moderation dashboard for Validators
  - Build report review and action workflow
  - Award Karma for confirmed reports
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 13.1 Create Reporting Service
  - Create reports table and Prisma model
  - Implement reportContent endpoint
  - Queue reported content for AI and Validator review
  - _Requirements: 17.1, 17.2, 17.3_

- [ ] 13.2 Build moderation dashboard
  - Create getModerationQueue endpoint (League-gated to Vajra+)
  - Implement reviewReport endpoint with approve/reject actions
  - Award Karma for confirmed reports
  - Deduct Karma from content author if report confirmed
  - _Requirements: 17.4, 17.5, 2.4_

- [ ] 13.3 Build reporting UI
  - Add "Report" button on all content
  - Create report modal with reason selection
  - Build moderation dashboard for Validators
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 13.4 Write reporting tests
  - Integration tests for report submission
  - Tests for moderation queue access control
  - Tests for Karma award/deduction on report resolution
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 14. Security and Performance Optimization
  - Implement rate limiting on all endpoints
  - Add input validation and sanitization
  - Set up Redis caching for frequently accessed data
  - Implement database query optimization
  - Configure security headers and CORS
  - _Requirements: All requirements_

- [ ] 14.1 Implement rate limiting
  - Install and configure @nestjs/throttler
  - Apply rate limits to all endpoints
  - Use Redis for distributed rate limiting
  - _Requirements: All requirements_

- [ ] 14.2 Set up Redis caching
  - Install cache-manager and cache-manager-redis-store
  - Cache user profiles, League info, feed data
  - Implement cache invalidation on data updates
  - _Requirements: All requirements_

- [ ] 14.3 Optimize database queries
  - Add indexes to frequently queried columns
  - Implement pagination on all list endpoints
  - Use Prisma select to fetch only needed fields
  - _Requirements: All requirements_

- [ ] 14.4 Configure security middleware
  - Install helmet for security headers
  - Configure CORS with whitelist
  - Implement CSRF protection
  - Add request logging and monitoring
  - _Requirements: All requirements_

- [ ] 14.5 Perform security audit
  - Run OWASP ZAP scan
  - Review authentication and authorization logic
  - Check for SQL injection vulnerabilities
  - Test rate limiting effectiveness
  - _Requirements: All requirements_

- [ ] 15. Monitoring and Observability
  - Set up Grafana and Loki for log aggregation
  - Integrate Sentry for error tracking
  - Create health check endpoints
  - Implement metrics collection (API latency, error rates)
  - _Requirements: All requirements_

- [ ] 15.1 Set up logging infrastructure
  - Configure Winston logger in NestJS
  - Set up Loki for log aggregation
  - Create Grafana dashboards for log visualization
  - _Requirements: All requirements_

- [ ] 15.2 Integrate Sentry for error tracking
  - Install and configure Sentry SDK
  - Add Sentry error handler to NestJS
  - Set up source maps for stack traces
  - _Requirements: All requirements_

- [ ] 15.3 Implement health checks and metrics
  - Create /health endpoint with database and Redis checks
  - Implement Prometheus metrics exporter
  - Track API response times, error rates, active users
  - _Requirements: All requirements_

- [ ] 15.4 Create monitoring dashboards
  - Build Grafana dashboard for system metrics
  - Set up alerting rules for critical issues
  - Create uptime monitoring
  - _Requirements: All requirements_

- [ ] 16. Final Integration and Polish
  - Integrate all services and test end-to-end flows
  - Implement responsive design across all pages
  - Add loading states and error handling in UI
  - Create user onboarding flow
  - Write deployment documentation
  - _Requirements: All requirements_

- [ ] 16.1 End-to-end integration testing
  - Test complete user journey: register → post → validate → earn Karma → progress League
  - Test brand campaign flow: create → participate → redeem
  - Test governance flow: propose → vote → execute
  - _Requirements: All requirements_

- [ ] 16.2 UI polish and responsive design
  - Ensure all pages are mobile-responsive
  - Add loading skeletons for async data
  - Implement error boundaries and fallback UI
  - Add animations and transitions
  - _Requirements: All requirements_

- [ ] 16.3 Create user onboarding
  - Build welcome wizard for new users
  - Create interactive tutorial for Karma and Leagues
  - Add tooltips for Astra powers
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 16.4 Write deployment documentation
  - Document environment variables and configuration
  - Create deployment guide for Render/Fly.io
  - Write API documentation with Swagger
  - Create user guide and FAQ
  - _Requirements: All requirements_

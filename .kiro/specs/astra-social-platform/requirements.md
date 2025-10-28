# Requirements Document

## Introduction

Astra is a next-generation decentralized social media and communication ecosystem that combines blockchain technology, gamification, and AI-powered truth verification. The platform empowers users through a Karma-based reputation system, where authentic contributions and truth validation earn users progression through mythologically-inspired Leagues and unlock powerful Astras (feature upgrades). The system aims to create a self-governing, ethical global social network that rewards truth, creativity, and positive social impact while penalizing manipulation and falsehood.

## Glossary

- **Astra Platform**: The complete decentralized social media ecosystem
- **Karma System**: The quantifiable reputation and reward mechanism that measures user authenticity, contribution, and trustworthiness
- **League**: A tier-based progression system representing user trust level and platform access (Chandrika, Vajra, Agneyastra, Varunastra, Pashupatastra, Brahmastra)
- **Astra (Weapon)**: A feature module or privilege unlocked through Karma progression, named after mythological weapons
- **Citizen**: A basic user role with standard posting and engagement capabilities
- **Validator**: A user role with authority to verify content authenticity and flag misinformation
- **Creator**: A user role focused on producing original verified content
- **Guardian**: A high-level user role with DAO governance participation rights
- **Truth Campaign**: A blockchain-verified brand marketing initiative where users earn Karma through authentic engagement
- **Truth Council**: A governance body composed of high-Karma users who make platform policy decisions
- **Astral Nexus**: The founder's DAO accessible only to Brahmastra-level users
- **Truth Guardian**: The ultimate user archetype achieved by wielding Brahmastra
- **Content Validation**: The process of verifying content authenticity through user consensus and AI analysis
- **Karma Token**: The digital currency earned through positive platform actions and redeemable for rewards

## Requirements

### Requirement 1: User Registration and Identity Management

**User Story:** As a new user, I want to create an account and establish my initial identity on the platform, so that I can begin participating in the Astra ecosystem.

#### Acceptance Criteria

1. WHEN a user completes the registration form with valid credentials, THE Astra Platform SHALL create a new Citizen account with zero Karma points
2. THE Astra Platform SHALL assign the Chandrika League status to every newly registered user
3. WHEN a user registers, THE Astra Platform SHALL generate a unique blockchain wallet address linked to their account
4. THE Astra Platform SHALL store user credentials using industry-standard encryption methods
5. WHEN a user attempts to register with an existing email or username, THE Astra Platform SHALL reject the registration and display an error message

### Requirement 2: Karma Earning Mechanism

**User Story:** As a Citizen, I want to earn Karma points through positive actions, so that I can progress through Leagues and unlock new features.

#### Acceptance Criteria

1. WHEN a user successfully validates content as authentic, THE Karma System SHALL award the user 10 Karma points
2. WHEN a user posts original verified content, THE Karma System SHALL award the user 15 Karma points
3. WHEN a user receives positive engagement on their constructive comment, THE Karma System SHALL award the user 5 Karma points
4. WHEN a user helps moderate a board or reports fake content that is confirmed, THE Karma System SHALL award the user 20 Karma points
5. WHEN a user participates in a verified Truth Campaign, THE Karma System SHALL award the user the campaign-specific Karma amount defined in the smart contract

### Requirement 3: Karma Deduction Mechanism

**User Story:** As a platform moderator, I want the system to automatically deduct Karma from users who engage in harmful behavior, so that the platform maintains integrity and trustworthiness.

#### Acceptance Criteria

1. WHEN AI detection identifies a user's post as misinformation, THE Karma System SHALL deduct 50 Karma points from the user's account
2. WHEN a Validator flags a user's content as fake engagement or spam and the flag is confirmed, THE Karma System SHALL deduct 30 Karma points from the user's account
3. WHEN a verified moderator downvotes a user's content for deception, THE Karma System SHALL deduct 25 Karma points from the user's account
4. THE Karma System SHALL prevent a user's Karma balance from falling below zero
5. WHEN a user's Karma is deducted, THE Astra Platform SHALL send a notification explaining the reason for the deduction

### Requirement 4: League Progression System

**User Story:** As a Citizen, I want to progress through different Leagues as I earn Karma, so that I can access advanced features and gain more influence on the platform.

#### Acceptance Criteria

1. WHEN a user's Karma reaches 500 points, THE Astra Platform SHALL promote the user to Vajra League
2. WHEN a user's Karma reaches 1500 points, THE Astra Platform SHALL promote the user to Agneyastra League
3. WHEN a user's Karma reaches 3500 points, THE Astra Platform SHALL promote the user to Varunastra League
4. WHEN a user's Karma reaches 8000 points, THE Astra Platform SHALL promote the user to Pashupatastra League
5. WHEN a user's Karma reaches 15000 points, THE Astra Platform SHALL promote the user to Brahmastra League and grant Truth Guardian status

### Requirement 5: Astra Power Unlocking

**User Story:** As a user progressing through Leagues, I want to unlock specific Astra powers, so that I can access enhanced platform capabilities.

#### Acceptance Criteria

1. WHEN a user reaches Vajra League, THE Astra Platform SHALL unlock the ability to validate content and downvote fake posts
2. WHEN a user reaches Agneyastra League, THE Astra Platform SHALL unlock Agneyastra power to detect and flag fake or manipulated media
3. WHEN a user reaches Varunastra League, THE Astra Platform SHALL unlock Varunastra power to create and access encrypted community boards
4. WHEN a user reaches Pashupatastra League, THE Astra Platform SHALL unlock Indrastra power to participate in Truth Council voting and moderator privileges
5. WHEN a user reaches Brahmastra League, THE Astra Platform SHALL unlock all Astra powers and grant access to the Astral Nexus DAO

### Requirement 6: Content Creation and Posting

**User Story:** As a Creator, I want to post multi-format content to the platform, so that I can share my ideas and earn Karma through authentic contributions.

#### Acceptance Criteria

1. THE Astra Platform SHALL support content uploads in text, image, audio, and video formats
2. WHEN a user submits content for posting, THE Astra Platform SHALL analyze the content using AI moderation before publication
3. WHEN content passes AI moderation, THE Astra Platform SHALL publish the content to the user's feed with a timestamp
4. THE Astra Platform SHALL display a validation badge on posts that have been verified by Validators
5. THE Astra Platform SHALL display the author's current Karma score and League status beside their username on every post

### Requirement 7: Content Validation System

**User Story:** As a Validator, I want to review and validate content authenticity, so that I can help maintain platform integrity and earn Karma.

#### Acceptance Criteria

1. WHERE a user has Vajra League status or higher, THE Astra Platform SHALL display a "Validate" option on unverified content
2. WHEN a Validator marks content as authentic, THE Astra Platform SHALL record the validation on the blockchain ledger
3. WHEN content receives validations from three or more independent Validators, THE Astra Platform SHALL mark the content as verified and display a verification badge
4. WHEN a Validator marks content as fake or manipulated, THE Astra Platform SHALL flag the content for AI review
5. IF AI review confirms the Validator's assessment, THEN THE Astra Platform SHALL remove the content and deduct Karma from the original poster

### Requirement 8: AI-Powered Content Moderation

**User Story:** As a platform administrator, I want AI to automatically detect and moderate harmful content, so that the platform maintains quality and safety at scale.

#### Acceptance Criteria

1. WHEN content is submitted, THE Astra Platform SHALL analyze the content for misinformation using AI detection algorithms
2. WHEN content is submitted, THE Astra Platform SHALL analyze the content for deepfakes and manipulated media using AI detection algorithms
3. WHEN AI detects potential misinformation or manipulation, THE Astra Platform SHALL flag the content for Validator review before publication
4. THE Astra Platform SHALL analyze sentiment and bias in content to provide context to users
5. WHEN AI detection confidence exceeds 95 percent, THE Astra Platform SHALL automatically reject the content and notify the user with an explanation

### Requirement 9: Encrypted Communication

**User Story:** As a user concerned about privacy, I want to communicate securely with other users, so that my conversations remain private and protected.

#### Acceptance Criteria

1. THE Astra Platform SHALL implement Signal Protocol for all one-to-one chat communications
2. THE Astra Platform SHALL implement Signal Protocol for all group chat communications
3. WHEN a user sends a message, THE Astra Platform SHALL encrypt the message end-to-end before transmission
4. THE Astra Platform SHALL ensure that only the intended recipients can decrypt and read messages
5. WHERE a user has Varunastra League status or higher, THE Astra Platform SHALL provide access to encrypted community boards with persistent encryption

### Requirement 10: Professional Boards and Collaboration

**User Story:** As a professional user, I want to create team spaces with video conferencing and document sharing, so that I can collaborate with colleagues on the platform.

#### Acceptance Criteria

1. WHERE a user has Varunastra League status or higher, THE Astra Platform SHALL allow the user to create Professional Boards
2. THE Astra Platform SHALL provide video conferencing capabilities within Professional Boards
3. THE Astra Platform SHALL provide screen sharing capabilities within Professional Boards
4. THE Astra Platform SHALL provide document upload and sharing capabilities within Professional Boards
5. WHEN a board owner invites users to a Professional Board, THE Astra Platform SHALL send invitations and grant access upon acceptance

### Requirement 11: Live Streaming and Events

**User Story:** As a Creator, I want to host live streams and events, so that I can engage with my audience in real-time and earn Karma through authentic interactions.

#### Acceptance Criteria

1. WHERE a user has Agneyastra League status or higher, THE Astra Platform SHALL allow the user to initiate live streams
2. THE Astra Platform SHALL support live video streaming with real-time chat functionality
3. THE Astra Platform SHALL allow event hosts to schedule events in advance with calendar integration
4. WHEN a live event concludes, THE Astra Platform SHALL calculate and award Karma to the host based on engagement metrics
5. THE Astra Platform SHALL support special event types including Fact-Fight, Truth League, and Debate Duels with custom rule sets

### Requirement 12: Marketplace and Karma Redemption

**User Story:** As a user with accumulated Karma, I want to redeem my Karma for rewards and digital goods, so that I can benefit tangibly from my platform contributions.

#### Acceptance Criteria

1. THE Astra Platform SHALL provide a Marketplace interface where users can browse available rewards
2. WHEN a user selects a reward and has sufficient Karma balance, THE Astra Platform SHALL process the redemption and deduct the required Karma
3. THE Astra Platform SHALL support redemption for digital goods, NFTs, and brand-specific rewards
4. WHEN a redemption is completed, THE Astra Platform SHALL record the transaction on the blockchain ledger
5. THE Astra Platform SHALL display the user's available Karma balance and redemption history in their profile

### Requirement 13: Brand Integration and Truth Campaigns

**User Story:** As a brand partner, I want to create verified marketing campaigns where users earn Karma through authentic engagement, so that I can reach audiences transparently and ethically.

#### Acceptance Criteria

1. WHERE a user has Brand Partner role, THE Astra Platform SHALL allow the user to create Truth Campaigns
2. WHEN a brand creates a Truth Campaign, THE Astra Platform SHALL deploy a smart contract defining campaign terms and Karma rewards
3. THE Astra Platform SHALL verify all Truth Campaign content on the blockchain before publication
4. WHEN a user engages with a Truth Campaign according to campaign rules, THE Karma System SHALL award the user the specified Karma amount
5. THE Astra Platform SHALL provide transparent analytics to brands showing engagement metrics and Karma distribution

### Requirement 14: Blockchain Integration

**User Story:** As a platform architect, I want all validations and Karma transactions recorded on blockchain, so that the system maintains transparency and immutability.

#### Acceptance Criteria

1. THE Astra Platform SHALL integrate with Polygon or Avalanche subnet for blockchain operations
2. WHEN a content validation occurs, THE Astra Platform SHALL record the validation transaction on the blockchain within 30 seconds
3. WHEN Karma is awarded or deducted, THE Astra Platform SHALL record the transaction on the blockchain within 30 seconds
4. THE Astra Platform SHALL use smart contracts to manage Astra unlocks and League progressions
5. THE Astra Platform SHALL implement zero-knowledge proofs to enable private validations without revealing user identity

### Requirement 15: Truth Council Governance

**User Story:** As a Guardian with high Karma, I want to participate in platform governance decisions, so that I can help shape policies and maintain platform integrity.

#### Acceptance Criteria

1. WHERE a user has Pashupatastra League status or higher, THE Astra Platform SHALL grant the user voting rights in Truth Council decisions
2. WHEN a governance proposal is submitted, THE Astra Platform SHALL notify all eligible Truth Council members
3. THE Astra Platform SHALL allow Truth Council members to cast votes on proposals within a defined voting period
4. WHEN the voting period ends, THE Astra Platform SHALL tally votes weighted by each member's Karma balance
5. WHERE a user has Brahmastra League status, THE Astra Platform SHALL grant the user access to submit governance proposals to the Astral Nexus DAO

### Requirement 16: Multi-Format Feed and Discovery

**User Story:** As a Citizen, I want to browse a personalized feed of content from users I follow and discover new content, so that I can stay engaged with the community.

#### Acceptance Criteria

1. THE Astra Platform SHALL display a chronological feed of posts from users the current user follows
2. THE Astra Platform SHALL provide a Reels section for short-form video content discovery
3. THE Astra Platform SHALL display verification badges and Karma indicators on all feed content
4. THE Astra Platform SHALL provide filtering options to view content by League level or verification status
5. WHEN a user interacts with content, THE Astra Platform SHALL update the feed algorithm to show similar verified content

### Requirement 17: Reporting and Moderation Tools

**User Story:** As a Validator, I want to report suspicious content and access moderation tools, so that I can help maintain platform quality and safety.

#### Acceptance Criteria

1. THE Astra Platform SHALL provide a "Report" option on all content visible to users
2. WHEN a user reports content, THE Astra Platform SHALL prompt the user to select a reason from predefined categories
3. WHEN a report is submitted, THE Astra Platform SHALL queue the content for AI analysis and Validator review
4. WHERE a user has Vajra League status or higher, THE Astra Platform SHALL provide access to a moderation dashboard showing flagged content
5. WHEN a Validator reviews flagged content, THE Astra Platform SHALL allow the Validator to confirm or dismiss the report with justification

### Requirement 18: Anonymous Whistleblower Boards

**User Story:** As a user who wants to report unethical behavior, I want to post anonymously to whistleblower boards, so that I can disclose information safely without fear of retaliation.

#### Acceptance Criteria

1. WHERE a user has Varunastra League status or higher, THE Astra Platform SHALL allow the user to create anonymous whistleblower boards
2. WHEN a user posts to a whistleblower board, THE Astra Platform SHALL strip all identifying information from the post
3. THE Astra Platform SHALL implement zero-knowledge proofs to verify the poster has sufficient League status without revealing identity
4. THE Astra Platform SHALL encrypt all whistleblower board content using Signal Protocol
5. WHEN whistleblower content is validated by Truth Council members, THE Astra Platform SHALL award Karma to the anonymous poster through a privacy-preserving mechanism

### Requirement 19: User Profile and Statistics

**User Story:** As a user, I want to view my profile showing my Karma, League status, and achievements, so that I can track my progress and showcase my reputation.

#### Acceptance Criteria

1. THE Astra Platform SHALL display the user's current Karma balance on their profile page
2. THE Astra Platform SHALL display the user's current League status and progress to the next League on their profile page
3. THE Astra Platform SHALL display all unlocked Astras and their associated powers on the user's profile page
4. THE Astra Platform SHALL display statistics including total validations performed, content created, and Karma earned over time
5. THE Astra Platform SHALL allow users to set profile visibility to public, followers-only, or private

### Requirement 20: Notification System

**User Story:** As a user, I want to receive notifications about important platform events, so that I stay informed about interactions, League progressions, and governance matters.

#### Acceptance Criteria

1. WHEN a user receives a like, comment, or validation on their content, THE Astra Platform SHALL send a notification to the user
2. WHEN a user's Karma changes due to earning or deduction, THE Astra Platform SHALL send a notification explaining the change
3. WHEN a user progresses to a new League, THE Astra Platform SHALL send a notification celebrating the achievement and listing newly unlocked powers
4. WHERE a user has Truth Council voting rights, WHEN a new governance proposal is submitted, THE Astra Platform SHALL send a notification with proposal details
5. THE Astra Platform SHALL allow users to configure notification preferences for different event types

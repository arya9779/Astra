// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TruthCampaign
 * @dev Smart contract for brand Truth Campaigns on the Astra platform
 * @notice Manages campaign participation, budget, and reward distribution
 */
contract TruthCampaign is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant BRAND_ROLE = keccak256("BRAND_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct Campaign {
        string name;
        string description;
        address brand;
        uint256 karmaReward;
        uint256 totalBudget;
        uint256 remainingBudget;
        uint256 maxParticipants;
        uint256 currentParticipants;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool requiresValidation;
    }

    struct Participation {
        address participant;
        uint256 timestamp;
        string contentHash;
        bool isValidated;
        bool hasClaimedReward;
        uint256 karmaEarned;
    }

    Campaign public campaign;
    
    // Mapping from participant address to their participation
    mapping(address => Participation) public participations;
    
    // Array to track all participants
    address[] public participants;
    
    // Mapping to track validation votes for participants
    mapping(address => mapping(address => bool)) public validationVotes;
    mapping(address => uint256) public validationCount;

    // Events
    event CampaignCreated(
        string name,
        address indexed brand,
        uint256 karmaReward,
        uint256 totalBudget,
        uint256 startTime,
        uint256 endTime
    );
    
    event ParticipationRecorded(
        address indexed participant,
        uint256 timestamp,
        string contentHash
    );
    
    event RewardClaimed(
        address indexed participant,
        uint256 karmaAmount
    );
    
    event ParticipationValidated(
        address indexed participant,
        address indexed validator,
        bool isValid
    );
    
    event CampaignEnded(uint256 totalParticipants, uint256 totalRewardsDistributed);

    /**
     * @dev Constructor to create a new Truth Campaign
     */
    constructor(
        string memory _name,
        string memory _description,
        address _brand,
        uint256 _karmaReward,
        uint256 _totalBudget,
        uint256 _maxParticipants,
        uint256 _startTime,
        uint256 _endTime,
        bool _requiresValidation,
        address _admin
    ) {
        require(_brand != address(0), "TruthCampaign: invalid brand address");
        require(_karmaReward > 0, "TruthCampaign: karma reward must be positive");
        require(_totalBudget >= _karmaReward, "TruthCampaign: insufficient budget");
        require(_maxParticipants > 0, "TruthCampaign: max participants must be positive");
        require(_endTime > _startTime, "TruthCampaign: invalid time range");
        require(_startTime > block.timestamp, "TruthCampaign: start time must be in future");

        campaign = Campaign({
            name: _name,
            description: _description,
            brand: _brand,
            karmaReward: _karmaReward,
            totalBudget: _totalBudget,
            remainingBudget: _totalBudget,
            maxParticipants: _maxParticipants,
            currentParticipants: 0,
            startTime: _startTime,
            endTime: _endTime,
            isActive: true,
            requiresValidation: _requiresValidation
        });

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(BRAND_ROLE, _brand);
        _grantRole(PAUSER_ROLE, _admin);

        emit CampaignCreated(_name, _brand, _karmaReward, _totalBudget, _startTime, _endTime);
    }

    /**
     * @dev Allows users to participate in the campaign
     * @param contentHash Hash of the content created for the campaign
     */
    function participate(string memory contentHash) 
        public 
        whenNotPaused 
        nonReentrant 
    {
        require(campaign.isActive, "TruthCampaign: campaign not active");
        require(block.timestamp >= campaign.startTime, "TruthCampaign: campaign not started");
        require(block.timestamp <= campaign.endTime, "TruthCampaign: campaign ended");
        require(campaign.currentParticipants < campaign.maxParticipants, "TruthCampaign: max participants reached");
        require(participations[msg.sender].participant == address(0), "TruthCampaign: already participated");
        require(bytes(contentHash).length > 0, "TruthCampaign: content hash required");
        require(campaign.remainingBudget >= campaign.karmaReward, "TruthCampaign: insufficient budget");

        participations[msg.sender] = Participation({
            participant: msg.sender,
            timestamp: block.timestamp,
            contentHash: contentHash,
            isValidated: !campaign.requiresValidation, // Auto-validate if validation not required
            hasClaimedReward: false,
            karmaEarned: 0
        });

        participants.push(msg.sender);
        campaign.currentParticipants++;

        emit ParticipationRecorded(msg.sender, block.timestamp, contentHash);

        // If validation is not required, allow immediate reward claiming
        if (!campaign.requiresValidation) {
            _processRewardClaim(msg.sender);
        }
    }

    /**
     * @dev Validates a participant's contribution (only for validators)
     * @param participant The participant to validate
     * @param isValid Whether the participation is valid
     */
    function validateParticipation(address participant, bool isValid) 
        public 
        onlyRole(VALIDATOR_ROLE) 
        whenNotPaused 
    {
        require(campaign.requiresValidation, "TruthCampaign: validation not required");
        require(participations[participant].participant != address(0), "TruthCampaign: participant not found");
        require(!validationVotes[participant][msg.sender], "TruthCampaign: already validated by this validator");

        validationVotes[participant][msg.sender] = true;
        
        if (isValid) {
            validationCount[participant]++;
        }

        emit ParticipationValidated(participant, msg.sender, isValid);

        // Check if participant has enough validations (e.g., 3 positive validations)
        if (validationCount[participant] >= 3 && !participations[participant].isValidated) {
            participations[participant].isValidated = true;
        }
    }

    /**
     * @dev Claims reward for validated participation
     */
    function claimReward() 
        public 
        whenNotPaused 
        nonReentrant 
    {
        Participation storage participation = participations[msg.sender];
        
        require(participation.participant != address(0), "TruthCampaign: not a participant");
        require(participation.isValidated, "TruthCampaign: participation not validated");
        require(!participation.hasClaimedReward, "TruthCampaign: reward already claimed");
        require(campaign.remainingBudget >= campaign.karmaReward, "TruthCampaign: insufficient budget");

        _processRewardClaim(msg.sender);
    }

    /**
     * @dev Internal function to process reward claiming
     */
    function _processRewardClaim(address participant) internal {
        Participation storage participation = participations[participant];
        
        participation.hasClaimedReward = true;
        participation.karmaEarned = campaign.karmaReward;
        campaign.remainingBudget -= campaign.karmaReward;

        emit RewardClaimed(participant, campaign.karmaReward);
    }

    /**
     * @dev Ends the campaign (only brand or admin)
     */
    function endCampaign() 
        public 
        whenNotPaused 
    {
        require(
            hasRole(BRAND_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "TruthCampaign: unauthorized"
        );
        require(campaign.isActive, "TruthCampaign: campaign already ended");

        campaign.isActive = false;
        
        uint256 totalRewardsDistributed = campaign.totalBudget - campaign.remainingBudget;
        emit CampaignEnded(campaign.currentParticipants, totalRewardsDistributed);
    }

    /**
     * @dev Withdraws remaining budget (only brand)
     */
    function withdrawRemainingBudget() 
        public 
        onlyRole(BRAND_ROLE) 
        nonReentrant 
    {
        require(!campaign.isActive || block.timestamp > campaign.endTime, "TruthCampaign: campaign still active");
        require(campaign.remainingBudget > 0, "TruthCampaign: no remaining budget");

        uint256 amount = campaign.remainingBudget;
        campaign.remainingBudget = 0;

        // Note: In a real implementation, this would transfer tokens back to the brand
        // For now, we just emit an event
        emit RewardClaimed(campaign.brand, amount);
    }

    /**
     * @dev Gets campaign information
     */
    function getCampaignInfo() 
        public 
        view 
        returns (
            string memory name,
            string memory description,
            address brand,
            uint256 karmaReward,
            uint256 totalBudget,
            uint256 remainingBudget,
            uint256 maxParticipants,
            uint256 currentParticipants,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            bool requiresValidation
        ) 
    {
        return (
            campaign.name,
            campaign.description,
            campaign.brand,
            campaign.karmaReward,
            campaign.totalBudget,
            campaign.remainingBudget,
            campaign.maxParticipants,
            campaign.currentParticipants,
            campaign.startTime,
            campaign.endTime,
            campaign.isActive,
            campaign.requiresValidation
        );
    }

    /**
     * @dev Gets participant information
     */
    function getParticipation(address participant) 
        public 
        view 
        returns (
            address participantAddr,
            uint256 timestamp,
            string memory contentHash,
            bool isValidated,
            bool hasClaimedReward,
            uint256 karmaEarned,
            uint256 validations
        ) 
    {
        Participation memory p = participations[participant];
        return (
            p.participant,
            p.timestamp,
            p.contentHash,
            p.isValidated,
            p.hasClaimedReward,
            p.karmaEarned,
            validationCount[participant]
        );
    }

    /**
     * @dev Gets all participants
     */
    function getAllParticipants() public view returns (address[] memory) {
        return participants;
    }

    /**
     * @dev Adds a validator to the campaign
     */
    function addValidator(address validator) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _grantRole(VALIDATOR_ROLE, validator);
    }

    /**
     * @dev Pauses the campaign
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the campaign
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Checks if campaign is currently active and accepting participants
     */
    function isAcceptingParticipants() public view returns (bool) {
        return campaign.isActive && 
               block.timestamp >= campaign.startTime && 
               block.timestamp <= campaign.endTime &&
               campaign.currentParticipants < campaign.maxParticipants &&
               campaign.remainingBudget >= campaign.karmaReward;
    }
}
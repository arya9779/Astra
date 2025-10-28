// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./TruthCampaign.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TruthCampaignFactory
 * @dev Factory contract for creating and managing Truth Campaigns
 * @notice Allows brands to deploy new campaign contracts with standardized parameters
 */
contract TruthCampaignFactory is AccessControl, Pausable {
    bytes32 public constant BRAND_ROLE = keccak256("BRAND_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct CampaignInfo {
        address campaignAddress;
        string name;
        address brand;
        uint256 createdAt;
        bool isActive;
    }

    // Array of all created campaigns
    CampaignInfo[] public campaigns;
    
    // Mapping from brand address to their campaign addresses
    mapping(address => address[]) public brandCampaigns;
    
    // Mapping from campaign address to campaign index
    mapping(address => uint256) public campaignIndex;

    // Campaign creation fee (in wei)
    uint256 public campaignCreationFee;
    
    // Minimum campaign duration (in seconds)
    uint256 public minCampaignDuration = 1 days;
    
    // Maximum campaign duration (in seconds)
    uint256 public maxCampaignDuration = 365 days;

    // Events
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed brand,
        string name,
        uint256 karmaReward,
        uint256 totalBudget
    );
    
    event BrandRegistered(address indexed brand);
    event CampaignCreationFeeUpdated(uint256 newFee);

    /**
     * @dev Constructor
     * @param initialOwner The address that will have admin role
     * @param _campaignCreationFee Fee required to create a campaign
     */
    constructor(address initialOwner, uint256 _campaignCreationFee) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        campaignCreationFee = _campaignCreationFee;
    }

    /**
     * @dev Creates a new Truth Campaign
     */
    function createCampaign(
        string memory _name,
        string memory _description,
        uint256 _karmaReward,
        uint256 _totalBudget,
        uint256 _maxParticipants,
        uint256 _startTime,
        uint256 _endTime,
        bool _requiresValidation
    ) 
        public 
        payable 
        onlyRole(BRAND_ROLE) 
        whenNotPaused 
        returns (address) 
    {
        require(msg.value >= campaignCreationFee, "TruthCampaignFactory: insufficient fee");
        require(bytes(_name).length > 0, "TruthCampaignFactory: name required");
        require(_karmaReward > 0, "TruthCampaignFactory: karma reward must be positive");
        require(_totalBudget >= _karmaReward, "TruthCampaignFactory: insufficient budget");
        require(_maxParticipants > 0, "TruthCampaignFactory: max participants must be positive");
        require(_endTime > _startTime, "TruthCampaignFactory: invalid time range");
        require(_startTime > block.timestamp, "TruthCampaignFactory: start time must be in future");
        
        uint256 duration = _endTime - _startTime;
        require(duration >= minCampaignDuration, "TruthCampaignFactory: campaign too short");
        require(duration <= maxCampaignDuration, "TruthCampaignFactory: campaign too long");

        // Deploy new TruthCampaign contract
        TruthCampaign newCampaign = new TruthCampaign(
            _name,
            _description,
            msg.sender, // brand
            _karmaReward,
            _totalBudget,
            _maxParticipants,
            _startTime,
            _endTime,
            _requiresValidation,
            address(this) // admin
        );

        address campaignAddress = address(newCampaign);

        // Store campaign info
        CampaignInfo memory campaignInfo = CampaignInfo({
            campaignAddress: campaignAddress,
            name: _name,
            brand: msg.sender,
            createdAt: block.timestamp,
            isActive: true
        });

        campaigns.push(campaignInfo);
        brandCampaigns[msg.sender].push(campaignAddress);
        campaignIndex[campaignAddress] = campaigns.length - 1;

        emit CampaignCreated(
            campaignAddress,
            msg.sender,
            _name,
            _karmaReward,
            _totalBudget
        );

        return campaignAddress;
    }

    /**
     * @dev Registers a new brand
     * @param brand The brand address to register
     */
    function registerBrand(address brand) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(brand != address(0), "TruthCampaignFactory: invalid brand address");
        _grantRole(BRAND_ROLE, brand);
        emit BrandRegistered(brand);
    }

    /**
     * @dev Batch register brands
     * @param brands Array of brand addresses to register
     */
    function batchRegisterBrands(address[] memory brands) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        for (uint256 i = 0; i < brands.length; i++) {
            require(brands[i] != address(0), "TruthCampaignFactory: invalid brand address");
            _grantRole(BRAND_ROLE, brands[i]);
            emit BrandRegistered(brands[i]);
        }
    }

    /**
     * @dev Removes a brand
     * @param brand The brand address to remove
     */
    function removeBrand(address brand) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _revokeRole(BRAND_ROLE, brand);
    }

    /**
     * @dev Updates campaign creation fee
     * @param newFee The new fee amount
     */
    function setCampaignCreationFee(uint256 newFee) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        campaignCreationFee = newFee;
        emit CampaignCreationFeeUpdated(newFee);
    }

    /**
     * @dev Sets minimum campaign duration
     * @param duration Minimum duration in seconds
     */
    function setMinCampaignDuration(uint256 duration) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(duration > 0, "TruthCampaignFactory: duration must be positive");
        minCampaignDuration = duration;
    }

    /**
     * @dev Sets maximum campaign duration
     * @param duration Maximum duration in seconds
     */
    function setMaxCampaignDuration(uint256 duration) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(duration > minCampaignDuration, "TruthCampaignFactory: max must be greater than min");
        maxCampaignDuration = duration;
    }

    /**
     * @dev Gets all campaigns
     */
    function getAllCampaigns() public view returns (CampaignInfo[] memory) {
        return campaigns;
    }

    /**
     * @dev Gets campaigns by brand
     * @param brand The brand address
     */
    function getCampaignsByBrand(address brand) 
        public 
        view 
        returns (address[] memory) 
    {
        return brandCampaigns[brand];
    }

    /**
     * @dev Gets campaign info by address
     * @param campaignAddress The campaign contract address
     */
    function getCampaignInfo(address campaignAddress) 
        public 
        view 
        returns (CampaignInfo memory) 
    {
        uint256 index = campaignIndex[campaignAddress];
        require(index < campaigns.length, "TruthCampaignFactory: campaign not found");
        return campaigns[index];
    }

    /**
     * @dev Gets total number of campaigns
     */
    function getTotalCampaigns() public view returns (uint256) {
        return campaigns.length;
    }

    /**
     * @dev Gets active campaigns
     */
    function getActiveCampaigns() public view returns (CampaignInfo[] memory) {
        uint256 activeCount = 0;
        
        // Count active campaigns
        for (uint256 i = 0; i < campaigns.length; i++) {
            if (campaigns[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active campaigns
        CampaignInfo[] memory activeCampaigns = new CampaignInfo[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < campaigns.length; i++) {
            if (campaigns[i].isActive) {
                activeCampaigns[index] = campaigns[i];
                index++;
            }
        }
        
        return activeCampaigns;
    }

    /**
     * @dev Withdraws collected fees (only admin)
     */
    function withdrawFees() 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        uint256 balance = address(this).balance;
        require(balance > 0, "TruthCampaignFactory: no fees to withdraw");
        
        payable(msg.sender).transfer(balance);
    }

    /**
     * @dev Pauses the factory
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the factory
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Checks if an address is a registered brand
     */
    function isBrand(address account) public view returns (bool) {
        return hasRole(BRAND_ROLE, account);
    }
}
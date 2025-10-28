// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title KarmaToken
 * @dev ERC-20 compatible token for the Astra platform's Karma system
 * @notice This token represents user reputation and can be minted/burned by authorized minters
 */
contract KarmaToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Events
    event KarmaMinted(address indexed to, uint256 amount, string reason);
    event KarmaBurned(address indexed from, uint256 amount, string reason);

    /**
     * @dev Constructor that sets up the token with initial roles
     * @param initialOwner The address that will have admin role
     */
    constructor(address initialOwner) ERC20("Karma Token", "KARMA") {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
    }

    /**
     * @dev Mints tokens to a specific address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     * @param reason The reason for minting (for event logging)
     */
    function mint(address to, uint256 amount, string memory reason) 
        public 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        require(to != address(0), "KarmaToken: mint to zero address");
        require(amount > 0, "KarmaToken: mint amount must be positive");
        
        _mint(to, amount);
        emit KarmaMinted(to, amount, reason);
    }

    /**
     * @dev Burns tokens from a specific address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     * @param reason The reason for burning (for event logging)
     */
    function burn(address from, uint256 amount, string memory reason) 
        public 
        onlyRole(BURNER_ROLE) 
        whenNotPaused 
    {
        require(from != address(0), "KarmaToken: burn from zero address");
        require(amount > 0, "KarmaToken: burn amount must be positive");
        require(balanceOf(from) >= amount, "KarmaToken: insufficient balance to burn");
        
        _burn(from, amount);
        emit KarmaBurned(from, amount, reason);
    }

    /**
     * @dev Burns tokens from the caller's account
     * @param amount The amount of tokens to burn
     */
    function burnSelf(uint256 amount) public whenNotPaused {
        require(amount > 0, "KarmaToken: burn amount must be positive");
        require(balanceOf(msg.sender) >= amount, "KarmaToken: insufficient balance to burn");
        
        _burn(msg.sender, amount);
        emit KarmaBurned(msg.sender, amount, "Self-burn");
    }

    /**
     * @dev Pauses all token transfers
     * @notice Only addresses with PAUSER_ROLE can pause
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     * @notice Only addresses with PAUSER_ROLE can unpause
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override transfer to add pause functionality
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }

    /**
     * @dev Override transferFrom to add pause functionality
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     * @notice Karma tokens use 0 decimals (whole numbers only)
     */
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * @dev Batch mint tokens to multiple addresses
     * @param recipients Array of addresses to mint tokens to
     * @param amounts Array of amounts to mint to each recipient
     * @param reason The reason for minting (for event logging)
     */
    function batchMint(
        address[] memory recipients, 
        uint256[] memory amounts, 
        string memory reason
    ) 
        public 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        require(recipients.length == amounts.length, "KarmaToken: arrays length mismatch");
        require(recipients.length > 0, "KarmaToken: empty arrays");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "KarmaToken: mint to zero address");
            require(amounts[i] > 0, "KarmaToken: mint amount must be positive");
            
            _mint(recipients[i], amounts[i]);
            emit KarmaMinted(recipients[i], amounts[i], reason);
        }
    }

    /**
     * @dev Get the total supply of tokens
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply();
    }

    /**
     * @dev Check if an address has minter role
     */
    function isMinter(address account) public view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

    /**
     * @dev Check if an address has burner role
     */
    function isBurner(address account) public view returns (bool) {
        return hasRole(BURNER_ROLE, account);
    }
}
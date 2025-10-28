// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ValidationRegistry
 * @dev Immutable registry for content validations on the Astra platform
 * @notice Records content validations with validator addresses and verdicts
 */
contract ValidationRegistry is AccessControl, Pausable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct Validation {
        bytes32 contentHash;
        address validator;
        bool isAuthentic;
        uint256 timestamp;
        string notes;
    }

    // Mapping from content hash to array of validations
    mapping(bytes32 => Validation[]) private validations;
    
    // Mapping to track if a validator has already validated specific content
    mapping(bytes32 => mapping(address => bool)) private hasValidated;
    
    // Counter for total validations
    uint256 public totalValidations;

    // Events
    event ValidationRecorded(
        bytes32 indexed contentHash,
        address indexed validator,
        bool isAuthentic,
        uint256 timestamp,
        string notes
    );

    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);

    /**
     * @dev Constructor that sets up the contract with initial roles
     * @param initialOwner The address that will have admin role
     */
    constructor(address initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(VALIDATOR_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
    }

    /**
     * @dev Records a validation for content
     * @param contentHash The hash of the content being validated
     * @param isAuthentic Whether the content is deemed authentic
     * @param notes Optional notes about the validation
     */
    function recordValidation(
        bytes32 contentHash,
        bool isAuthentic,
        string memory notes
    ) 
        public 
        onlyRole(VALIDATOR_ROLE) 
        whenNotPaused 
    {
        require(contentHash != bytes32(0), "ValidationRegistry: invalid content hash");
        require(!hasValidated[contentHash][msg.sender], "ValidationRegistry: already validated by this validator");

        Validation memory newValidation = Validation({
            contentHash: contentHash,
            validator: msg.sender,
            isAuthentic: isAuthentic,
            timestamp: block.timestamp,
            notes: notes
        });

        validations[contentHash].push(newValidation);
        hasValidated[contentHash][msg.sender] = true;
        totalValidations++;

        emit ValidationRecorded(
            contentHash,
            msg.sender,
            isAuthentic,
            block.timestamp,
            notes
        );
    }

    /**
     * @dev Gets all validations for a specific content hash
     * @param contentHash The hash of the content
     * @return Array of validations for the content
     */
    function getValidations(bytes32 contentHash) 
        public 
        view 
        returns (Validation[] memory) 
    {
        return validations[contentHash];
    }

    /**
     * @dev Gets the number of validations for specific content
     * @param contentHash The hash of the content
     * @return Number of validations
     */
    function getValidationCount(bytes32 contentHash) 
        public 
        view 
        returns (uint256) 
    {
        return validations[contentHash].length;
    }

    /**
     * @dev Gets validation consensus for content
     * @param contentHash The hash of the content
     * @return authenticCount Number of validators who marked as authentic
     * @return fakeCount Number of validators who marked as fake
     * @return totalCount Total number of validations
     */
    function getValidationConsensus(bytes32 contentHash) 
        public 
        view 
        returns (uint256 authenticCount, uint256 fakeCount, uint256 totalCount) 
    {
        Validation[] memory contentValidations = validations[contentHash];
        totalCount = contentValidations.length;
        
        for (uint256 i = 0; i < totalCount; i++) {
            if (contentValidations[i].isAuthentic) {
                authenticCount++;
            } else {
                fakeCount++;
            }
        }
    }

    /**
     * @dev Checks if a validator has already validated specific content
     * @param contentHash The hash of the content
     * @param validator The validator address
     * @return Whether the validator has validated this content
     */
    function hasValidatorValidated(bytes32 contentHash, address validator) 
        public 
        view 
        returns (bool) 
    {
        return hasValidated[contentHash][validator];
    }

    /**
     * @dev Gets validations by a specific validator
     * @param validator The validator address
     * @param contentHashes Array of content hashes to check
     * @return Array of validations by the validator
     */
    function getValidationsByValidator(
        address validator, 
        bytes32[] memory contentHashes
    ) 
        public 
        view 
        returns (Validation[] memory) 
    {
        uint256 count = 0;
        
        // First pass: count validations by this validator
        for (uint256 i = 0; i < contentHashes.length; i++) {
            if (hasValidated[contentHashes[i]][validator]) {
                count++;
            }
        }
        
        // Second pass: collect validations
        Validation[] memory result = new Validation[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < contentHashes.length; i++) {
            if (hasValidated[contentHashes[i]][validator]) {
                Validation[] memory contentValidations = validations[contentHashes[i]];
                for (uint256 j = 0; j < contentValidations.length; j++) {
                    if (contentValidations[j].validator == validator) {
                        result[index] = contentValidations[j];
                        index++;
                        break;
                    }
                }
            }
        }
        
        return result;
    }

    /**
     * @dev Adds a new validator
     * @param validator The address to grant validator role
     */
    function addValidator(address validator) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(validator != address(0), "ValidationRegistry: invalid validator address");
        _grantRole(VALIDATOR_ROLE, validator);
        emit ValidatorAdded(validator);
    }

    /**
     * @dev Removes a validator
     * @param validator The address to revoke validator role from
     */
    function removeValidator(address validator) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _revokeRole(VALIDATOR_ROLE, validator);
        emit ValidatorRemoved(validator);
    }

    /**
     * @dev Batch add validators
     * @param validators Array of addresses to grant validator role
     */
    function batchAddValidators(address[] memory validators) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        for (uint256 i = 0; i < validators.length; i++) {
            require(validators[i] != address(0), "ValidationRegistry: invalid validator address");
            _grantRole(VALIDATOR_ROLE, validators[i]);
            emit ValidatorAdded(validators[i]);
        }
    }

    /**
     * @dev Pauses the contract
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the contract
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Check if an address is a validator
     */
    function isValidator(address account) public view returns (bool) {
        return hasRole(VALIDATOR_ROLE, account);
    }

    /**
     * @dev Get total number of validations recorded
     */
    function getTotalValidations() public view returns (uint256) {
        return totalValidations;
    }
}
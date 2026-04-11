// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KiteDeskAttestations {
    struct Attestation {
        address user;
        string taskId;
        bytes32 resultHash;
        uint256 timestamp;
        string taskType;
    }

    mapping(string => Attestation) public attestations;
    mapping(address => string[]) public userTaskIds;

    event TaskAttested(
        string indexed taskId,
        address indexed user,
        bytes32 resultHash,
        uint256 timestamp
    );

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function attestTask(
        string calldata taskId,
        address user,
        bytes32 resultHash,
        string calldata taskType
    ) external onlyOwner {
        require(attestations[taskId].timestamp == 0, "Already attested");

        attestations[taskId] = Attestation({
            user: user,
            taskId: taskId,
            resultHash: resultHash,
            timestamp: block.timestamp,
            taskType: taskType
        });

        userTaskIds[user].push(taskId);

        emit TaskAttested(taskId, user, resultHash, block.timestamp);
    }

    function getAttestation(string calldata taskId)
        external
        view
        returns (Attestation memory)
    {
        return attestations[taskId];
    }

    function getUserTasks(address user)
        external
        view
        returns (string[] memory)
    {
        return userTaskIds[user];
    }
}

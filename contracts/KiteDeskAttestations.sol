// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// KiteDesk | attestation registry for tasks and multi-step agent goals

contract KiteDeskAttestations {
    struct Attestation {
        address user;
        string taskId;
        bytes32 resultHash;
        uint256 timestamp;
        string taskType;
    }

    struct GoalAttestation {
        address user;
        string taskId;
        bytes32 resultHash;
        bytes32 stepsHash;
        uint256 totalSpentMicro;
        uint8 stepCount;
        uint256 timestamp;
        string goalPreview;
    }

    mapping(string => Attestation) public attestations;
    mapping(string => GoalAttestation) public goalAttestations;
    mapping(address => string[]) public userTaskIds;

    event TaskAttested(
        string indexed taskId,
        address indexed user,
        bytes32 resultHash,
        uint256 timestamp
    );

    event GoalAttested(
        string indexed taskId,
        address indexed user,
        uint256 totalSpentMicro,
        uint8 stepCount,
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

    function attestGoal(
        string calldata taskId,
        address user,
        bytes32 resultHash,
        bytes32 stepsHash,
        uint256 totalSpentMicro,
        uint8 stepCount,
        string calldata goalPreview
    ) external onlyOwner {
        require(goalAttestations[taskId].timestamp == 0, "Already attested");

        goalAttestations[taskId] = GoalAttestation({
            user: user,
            taskId: taskId,
            resultHash: resultHash,
            stepsHash: stepsHash,
            totalSpentMicro: totalSpentMicro,
            stepCount: stepCount,
            timestamp: block.timestamp,
            goalPreview: goalPreview
        });

        emit GoalAttested(taskId, user, totalSpentMicro, stepCount, block.timestamp);
    }

    function getAttestation(string calldata taskId)
        external
        view
        returns (Attestation memory)
    {
        return attestations[taskId];
    }

    function getGoalAttestation(string calldata taskId)
        external
        view
        returns (GoalAttestation memory)
    {
        return goalAttestations[taskId];
    }

    function getUserTasks(address user)
        external
        view
        returns (string[] memory)
    {
        return userTaskIds[user];
    }
}

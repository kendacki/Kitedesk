// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SessionKeyValidator {
    struct SessionKey {
        address sessionKeyAddress;
        uint256 maxTransactionAmount;
        uint256 dailySpendLimit;
        uint48 expiresAt;
        address[] whitelistedRecipients;
        bool revoked;
    }

    struct DailySpending {
        uint256 totalSpent;
        uint256 lastResetAt;
    }

    mapping(address => mapping(bytes32 => SessionKey)) public sessionKeys;
    mapping(address => mapping(bytes32 => DailySpending)) public dailySpending;

    event SessionKeyCreated(
        address indexed smartWallet,
        bytes32 indexed sessionKeyId,
        address sessionKeyAddress,
        uint256 maxTxAmount,
        uint256 dailyLimit,
        uint48 expiresAt
    );

    event SessionKeyRevoked(
        address indexed smartWallet,
        bytes32 indexed sessionKeyId
    );

    event SessionKeyUsed(
        address indexed smartWallet,
        bytes32 indexed sessionKeyId,
        address recipient,
        uint256 amount,
        uint256 dailySpentAfter
    );

    function createSessionKey(
        address smartWallet,
        bytes32 sessionKeyId,
        address sessionKeyAddress,
        uint256 maxTransactionAmount,
        uint256 dailySpendLimit,
        uint48 expiresAt,
        address[] calldata whitelistedRecipients
    ) external {
        require(smartWallet != address(0), "Invalid smart wallet");
        require(sessionKeyAddress != address(0), "Invalid session key address");
        require(expiresAt > block.timestamp, "Expiration must be in future");
        require(maxTransactionAmount > 0, "Max tx amount must be > 0");
        require(dailySpendLimit >= maxTransactionAmount, "Daily limit must be >= max tx");
        require(whitelistedRecipients.length > 0, "Must have at least one recipient");

        require(
            sessionKeys[smartWallet][sessionKeyId].sessionKeyAddress == address(0),
            "Session key already exists"
        );

        sessionKeys[smartWallet][sessionKeyId] = SessionKey({
            sessionKeyAddress: sessionKeyAddress,
            maxTransactionAmount: maxTransactionAmount,
            dailySpendLimit: dailySpendLimit,
            expiresAt: expiresAt,
            whitelistedRecipients: whitelistedRecipients,
            revoked: false
        });

        emit SessionKeyCreated(
            smartWallet,
            sessionKeyId,
            sessionKeyAddress,
            maxTransactionAmount,
            dailySpendLimit,
            expiresAt
        );
    }

    function revokeSessionKey(bytes32 sessionKeyId) external {
        SessionKey storage key = sessionKeys[msg.sender][sessionKeyId];
        require(key.sessionKeyAddress != address(0), "Session key not found");
        require(!key.revoked, "Already revoked");

        key.revoked = true;
        emit SessionKeyRevoked(msg.sender, sessionKeyId);
    }

    function validateTransaction(
        address smartWallet,
        bytes32 sessionKeyId,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        SessionKey storage key = sessionKeys[smartWallet][sessionKeyId];

        require(key.sessionKeyAddress != address(0), "Session key not found");
        require(!key.revoked, "Session key revoked");
        require(block.timestamp < key.expiresAt, "Session key expired");
        require(
            amount <= key.maxTransactionAmount,
            "Amount exceeds max per transaction"
        );

        bool isWhitelisted = false;
        for (uint256 i = 0; i < key.whitelistedRecipients.length; i++) {
            if (key.whitelistedRecipients[i] == recipient) {
                isWhitelisted = true;
                break;
            }
        }
        require(isWhitelisted, "Recipient not whitelisted");

        DailySpending storage daily = dailySpending[smartWallet][sessionKeyId];

        if (block.timestamp >= daily.lastResetAt + 1 days) {
            daily.totalSpent = 0;
            daily.lastResetAt = block.timestamp;
        }

        require(
            daily.totalSpent + amount <= key.dailySpendLimit,
            "Daily spend limit exceeded"
        );

        daily.totalSpent += amount;

        emit SessionKeyUsed(smartWallet, sessionKeyId, recipient, amount, daily.totalSpent);

        return true;
    }

    function getSessionKey(address smartWallet, bytes32 sessionKeyId)
        external
        view
        returns (
            address sessionKeyAddress,
            uint256 maxTxAmount,
            uint256 dailyLimit,
            uint48 expiresAt,
            bool isRevoked,
            address[] memory recipients
        )
    {
        SessionKey storage key = sessionKeys[smartWallet][sessionKeyId];
        return (
            key.sessionKeyAddress,
            key.maxTransactionAmount,
            key.dailySpendLimit,
            key.expiresAt,
            key.revoked,
            key.whitelistedRecipients
        );
    }

    function canTransact(
        address smartWallet,
        bytes32 sessionKeyId,
        address recipient,
        uint256 amount
    ) external view returns (bool allowed, string memory reason) {
        SessionKey storage key = sessionKeys[smartWallet][sessionKeyId];

        if (key.sessionKeyAddress == address(0)) {
            return (false, "Session key not found");
        }
        if (key.revoked) {
            return (false, "Session key revoked");
        }
        if (block.timestamp >= key.expiresAt) {
            return (false, "Session key expired");
        }
        if (amount > key.maxTransactionAmount) {
            return (false, "Exceeds max per transaction");
        }

        bool isWhitelisted = false;
        for (uint256 i = 0; i < key.whitelistedRecipients.length; i++) {
            if (key.whitelistedRecipients[i] == recipient) {
                isWhitelisted = true;
                break;
            }
        }
        if (!isWhitelisted) {
            return (false, "Recipient not whitelisted");
        }

        DailySpending storage daily = dailySpending[smartWallet][sessionKeyId];
        uint256 spentToday = daily.totalSpent;

        if (block.timestamp >= daily.lastResetAt + 1 days) {
            spentToday = 0;
        }

        if (spentToday + amount > key.dailySpendLimit) {
            return (false, "Exceeds daily limit");
        }

        return (true, "");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BatchRegistry {
    struct Record {
        bytes32 dataHash;
        string lotId;
        string eventType;
        bytes32 prevHash;
        uint256 timestamp;
        address submitter;
    }

    // dataHash => Record
    mapping(bytes32 => Record) private _records;

    // lotId => list of dataHashes (chain of events)
    mapping(string => bytes32[]) private _lotHistory;

    address public owner;
    mapping(address => bool) public submitters;

    event BatchAnchored(
        bytes32 indexed dataHash,
        string indexed lotId,
        string eventType,
        uint256 timestamp
    );

    modifier onlySubmitter() {
        require(submitters[msg.sender] || msg.sender == owner, "Not a submitter");
        _;
    }

    constructor() {
        owner = msg.sender;
        submitters[msg.sender] = true;
    }

    function addSubmitter(address account) external {
        require(msg.sender == owner, "Not owner");
        submitters[account] = true;
    }

    function removeSubmitter(address account) external {
        require(msg.sender == owner, "Not owner");
        submitters[account] = false;
    }

    function anchor(
        bytes32 dataHash,
        string calldata lotId,
        string calldata eventType,
        bytes32 prevHash
    ) external onlySubmitter {
        require(_records[dataHash].timestamp == 0, "Already anchored");

        _records[dataHash] = Record({
            dataHash: dataHash,
            lotId: lotId,
            eventType: eventType,
            prevHash: prevHash,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        _lotHistory[lotId].push(dataHash);

        emit BatchAnchored(dataHash, lotId, eventType, block.timestamp);
    }

    function getRecord(bytes32 dataHash)
        external
        view
        returns (Record memory)
    {
        return _records[dataHash];
    }

    function getLotHistory(string calldata lotId)
        external
        view
        returns (bytes32[] memory)
    {
        return _lotHistory[lotId];
    }
}

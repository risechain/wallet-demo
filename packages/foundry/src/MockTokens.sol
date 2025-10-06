// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockERC20
/// @notice Simple ERC20 token with owner mint and public mintOnce functionality
/// @dev Used for testing and development on RISE testnet
contract MockERC20 is ERC20, Ownable {
    /// @notice Amount that can be minted once per address
    uint256 public constant MINT_ONCE_AMOUNT = 1000e18; // 1000 tokens with 18 decimals

    /// @notice Track which addresses have already minted
    mapping(address => bool) public hasMinted;

    /// @notice Emitted when a user mints their one-time allocation
    event MintedOnce(address indexed user, uint256 amount);

    /// @notice Emitted when owner mints tokens
    event OwnerMinted(address indexed to, uint256 amount);

    error AlreadyMinted();
    error ZeroAddress();
    error ZeroAmount();

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) {}

    /// @notice Allows any address to mint tokens once
    /// @dev Each address can only call this function one time
    function mintOnce() external {
        if (hasMinted[msg.sender]) revert AlreadyMinted();

        hasMinted[msg.sender] = true;
        _mint(msg.sender, MINT_ONCE_AMOUNT);

        emit MintedOnce(msg.sender, MINT_ONCE_AMOUNT);
    }

    /// @notice Owner can mint unlimited tokens to any address
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        _mint(to, amount);

        emit OwnerMinted(to, amount);
    }
}

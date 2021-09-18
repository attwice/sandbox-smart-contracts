//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AvatarStorageBase} from "../../../avatar/AvatarStorageBase.sol";

/// @dev Storage layout for the PolygonAvatar contract.
abstract contract PolygonAvatarStorage is AvatarStorageBase {
    event Deposit(address indexed token, address indexed from, uint256 tokenId);
    event Withdraw(address indexed token, address indexed from, uint256 tokenId);
    bytes32 public constant CHILD_MANAGER_ROLE = keccak256("CHILD_MANAGER_ROLE");
    address public l1TokenAddress;
}

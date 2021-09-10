//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IAvatarMinter {
    function mint(address to, uint256 id) external;
}

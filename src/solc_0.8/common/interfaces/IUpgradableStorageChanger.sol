//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IUpgradableStorageChanger {
    function changeStorage(bytes calldata data) external;
}

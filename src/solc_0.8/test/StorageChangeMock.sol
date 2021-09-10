//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Upgradeable} from "../common/BaseWithStorage/Upgradeable.sol";
import {UpgradeableStorageMock} from "./UpgradeableStorageMock.sol";
import {IUpgradableStorageChanger} from "../common/interfaces/IUpgradableStorageChanger.sol";

contract StorageChangeMock is UpgradeableStorageMock, IUpgradableStorageChanger {
    function changeStorage(bytes calldata data) external override {
        someValue1 = abi.decode(data, (uint256));
        someValue2 = 123412312;
    }
}

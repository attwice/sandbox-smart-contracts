//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {UpgradeableStorageMock} from "./UpgradeableStorageMock.sol";

contract UpgradeableUpgradeMock is UpgradeableStorageMock {
    // We can't use initializer twice, we must do it with another trick like ProxyImplementation or
    // just avoid the initialization on updates and use the storageChanger for that.
    // This is not the right way, it can be called a lot of times without restrictions.
    function initialize1(uint256 initialValue_) external {
        someValue1 = initialValue_;
        someValue2 = 512;
    }

    function getAVal() external view returns (uint256) {
        return someValue1 + 200;
    }
}

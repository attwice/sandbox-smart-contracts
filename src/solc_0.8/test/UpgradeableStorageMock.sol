//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Upgradeable} from "../common/BaseWithStorage/Upgradeable.sol";

abstract contract UpgradeableStorageMock is Upgradeable {
    // No constructor, this never happen.
    uint256 public someValue1 = 1;
    uint256 public someValue2;
    // Same issue with the constructor, don't do that!!!
    string public stringVal = "Some string";
    // Constant and inmutable don't need the constructor call (inmutable is inlined).
    string public constant constantStringVal = "Some string";
}

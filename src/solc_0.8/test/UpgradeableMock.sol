//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {UpgradeableStorageMock} from "./UpgradeableStorageMock.sol";

contract UpgradeableMock is UpgradeableStorageMock {
    function initialize(uint256 initialValue_) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __UpgradeableBase_init_unchained();
        someValue1 = initialValue_;
        someValue2 = 12;
    }

    function getAVal() external view returns (uint256) {
        return someValue1 + 20;
    }

    // This method exists here and in the proxy
    function admin() external pure returns (address) {
        return address(0x1234);
    }
}

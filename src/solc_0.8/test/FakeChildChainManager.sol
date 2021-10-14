//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../polygon/child/asset/PolygonAssetV2.sol";
import "../polygon/child/sand/PolygonSand.sol";
import "../common/interfaces/@maticnetwork/pos-portal/child/ChildToken/IChildToken.sol";

/// @dev This is NOT a secure ChildChainManager contract implementation!
/// DO NOT USE in production.

contract FakeChildChainManager {
    address public polygonAsset;

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    function setPolygonAsset(address _polygonAsset) external {
        polygonAsset = _polygonAsset;
    }

    function callDeposit(address user, bytes calldata depositData) external {
        PolygonAssetV2(polygonAsset).deposit(user, depositData);
    }

    function callSandDeposit(
        address polygonSand,
        address user,
        bytes calldata depositData
    ) external {
        PolygonSand(polygonSand).deposit(user, depositData);
    }

    /// @dev based on: @maticnetwork/pos-portal/contracts/child/ChildChainManager/ChildChainManager.sol
    function syncDeposit(
        address childTokenAddress,
        address user,
        bytes memory depositData
    ) external {
        require(childTokenAddress != address(0x0), "ChildChainManager: TOKEN_NOT_MAPPED");
        IChildToken childTokenContract = IChildToken(childTokenAddress);
        childTokenContract.deposit(user, depositData);
    }
}

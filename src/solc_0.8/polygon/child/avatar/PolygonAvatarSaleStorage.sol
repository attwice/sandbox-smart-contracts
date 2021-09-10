//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Upgradeable} from "../../../common/BaseWithStorage/Upgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IAvatarMinter} from "../../../common/interfaces/IAvatarMinter.sol";

// This contract is final, don't inherit form it.
abstract contract PolygonAvatarSaleStorage is Upgradeable, EIP712Upgradeable {
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant MINT_TYPEHASH =
        keccak256("Mint(address signer,address buyer,uint256 id,address seller,uint256 price)");
    string public name = "Sandbox Avatar Sale";
    string public version = "1.0";
    IAvatarMinter public polygonAvatarAddress;
    IERC20Upgradeable public sandTokenContractAddress;
}

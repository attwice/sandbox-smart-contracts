//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {PolygonAvatarSaleStorage} from "./PolygonAvatarSaleStorage.sol";
import {IAvatarMinter} from "../../../common/interfaces/IAvatarMinter.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

// This contract is final, don't inherit form it.
contract PolygonAvatarSale is PolygonAvatarSaleStorage {
    function initialize(
        IAvatarMinter polygonAvatarAddress_,
        IERC20Upgradeable sandTokenContractAddress_,
        address trustedForwarder_,
        address defaultAdmin_,
        address storageChanger_
    ) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __UpgradeableBase_init_unchained(defaultAdmin_, storageChanger_);
        __EIP712_init_unchained(name, version);
        __ERC2771Handler_initialize(trustedForwarder_);
        polygonAvatarAddress = polygonAvatarAddress_;
        sandTokenContractAddress = sandTokenContractAddress_;
    }

    function verify(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address signer,
        address buyer,
        uint256 id,
        address seller,
        uint256 price
    ) external view returns (bool) {
        return _verify(v, r, s, signer, buyer, id, seller, price);
    }

    function execute(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address signer,
        address buyer,
        uint256 id,
        address seller,
        uint256 price
    ) external payable {
        require(_verify(v, r, s, signer, buyer, id, seller, price), "Invalid signature");
        require(hasRole(SIGNER_ROLE, signer), "Invalid signer");
        require(hasRole(SELLER_ROLE, seller), "Invalid seller");
        polygonAvatarAddress.mint(buyer, id);
        require(sandTokenContractAddress.transferFrom(buyer, address(this), price), "TransferFrom failed");
        require(sandTokenContractAddress.transfer(seller, price), "Transfer failed");
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function _verify(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address signer,
        address buyer,
        uint256 id,
        address seller,
        uint256 price
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(MINT_TYPEHASH, signer, buyer, id, seller, price)));
        address recoveredSigner = ECDSAUpgradeable.recover(digest, v, r, s);
        return recoveredSigner == signer;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

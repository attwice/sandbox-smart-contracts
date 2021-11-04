//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Upgradeable} from "../common/BaseWithStorage/Upgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IAvatarMinter} from "../common/interfaces/IAvatarMinter.sol";
import {ERC2771Handler} from "../common/BaseWithStorage/ERC2771Handler.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title This contract is in charge calling Avatar.mint.
/// @title minting is done by sending messages signed by a user in the signer role, the contract takes the buyer
/// @title sand and send it to a whitelisted seller.
/// @dev This contract support meta transactions.
/// @dev This contract is final, don't inherit form it.
contract AvatarSale is
    Initializable,
    ContextUpgradeable,
    AccessControlUpgradeable,
    EIP712Upgradeable,
    ERC2771Handler,
    Upgradeable
{
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant SELLER_ROLE = keccak256("SELLER_ROLE");
    bytes32 public constant MINT_TYPEHASH =
        keccak256("Mint(address signer,address buyer,uint256 id,address seller,uint256 price)");
    string public constant name = "Sandbox Avatar Sale";
    string public constant version = "1.0";
    IAvatarMinter public avatarTokenAddress;
    IERC20Upgradeable public sandTokenAddress;

    function initialize(
        IAvatarMinter avatarTokenAddress_,
        IERC20Upgradeable sandTokenContractAddress_,
        address trustedForwarder_,
        address defaultAdmin_
    ) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __EIP712_init_unchained(name, version);
        __ERC2771Handler_initialize(trustedForwarder_);

        _setupRole(DEFAULT_ADMIN_ROLE, defaultAdmin_);
        avatarTokenAddress = avatarTokenAddress_;
        sandTokenAddress = sandTokenContractAddress_;
    }

    /// @notice verifies a ERC712 signature for the Mint data type.
    /// @param v signature part
    /// @param r signature part
    /// @param s signature part
    /// @param signer the address of the signer, must be part of the signer role
    /// @param buyer the buyer of the NFT, sand is taken from him.
    /// @param id NFT Id
    /// @param seller the seller of the NFT, must be whitelisted in the seller role, sand are sent to him
    /// @param price price in Sand of the NFT
    /// @return true if the signature is valid
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

    /// @notice verifies a ERC712 signature and mint a new NFT for the buyer.
    /// @param v signature part
    /// @param r signature part
    /// @param s signature part
    /// @param signer the address of the signer, must be part of the signer role
    /// @param buyer the buyer of the NFT, sand is taken from him.
    /// @param id NFT Id
    /// @param seller the seller of the NFT, must be whitelisted in the seller role, sand are sent to him
    /// @param price price in Sand of the NFT
    function execute(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address signer,
        address buyer,
        uint256 id,
        address seller,
        uint256 price
    ) external {
        require(_verify(v, r, s, signer, buyer, id, seller, price), "Invalid signature");
        require(hasRole(SIGNER_ROLE, signer), "Invalid signer");
        require(hasRole(SELLER_ROLE, seller), "Invalid seller");
        avatarTokenAddress.mint(buyer, id);
        require(sandTokenAddress.transferFrom(buyer, address(this), price), "TransferFrom failed");
        require(sandTokenAddress.transfer(seller, price), "Transfer failed");
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getChainId() external view returns (uint256) {
        return block.chainid;
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
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

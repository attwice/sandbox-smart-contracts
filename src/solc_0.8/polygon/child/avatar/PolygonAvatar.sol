//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AvatarBase} from "../../../avatar/AvatarBase.sol";
import {IAvatarMinter} from "../../../common/interfaces/IAvatarMinter.sol";
import {Upgradeable} from "../../../common/BaseWithStorage/Upgradeable.sol";

/// @title This contract is a erc 721 compatible NFT token that represents an avatar and can be minted by a minter role.
/// @dev This contract support meta transactions.
/// @dev This contract is final, don't inherit form it.
contract PolygonAvatar is AvatarBase, Upgradeable {
    event Deposit(address indexed token, address indexed from, uint256 tokenId);
    event Withdraw(address indexed token, address indexed from, uint256 tokenId);
    bytes32 public constant CHILD_MANAGER_ROLE = keccak256("CHILD_MANAGER_ROLE");
    address public l1TokenAddress;

    function initialize(
        address l1TokenAddress_,
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_,
        address trustedForwarder_,
        address defaultAdmin_
    ) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AvatarBase_init_unchained(defaultAdmin_, baseTokenURI_);
        __ERC721_init_unchained(name_, symbol_);
        __ERC2771Handler_initialize(trustedForwarder_);
        l1TokenAddress = l1TokenAddress_;
    }

    /**
     * @notice Deposit tokens
     * @param user address for deposit
     * @param tokenId tokenId to mint to user's account
     */
    function deposit(address user, uint256 tokenId) public {
        require(hasRole(CHILD_MANAGER_ROLE, _msgSender()), "!CHILD_MANAGER_ROLE");
        require(user != address(0x0), "invalid user");
        _mint(user, tokenId);
        emit Deposit(l1TokenAddress, user, tokenId);
    }

    /**
     * @notice Withdraw tokens
     * @param tokenId tokenId of the token to be withdrawn
     */
    function withdraw(uint256 tokenId) public payable {
        require(ownerOf(tokenId) == _msgSender(), "Not owner");
        _burn(tokenId);
        emit Withdraw(l1TokenAddress, _msgSender(), tokenId);
    }
}

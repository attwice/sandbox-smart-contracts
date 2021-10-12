//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AvatarBase} from "./AvatarBase.sol";
import {IAvatarMinter} from "../common/interfaces/IAvatarMinter.sol";
import {Upgradeable} from "../common/BaseWithStorage/Upgradeable.sol";
import {IMintableERC721} from "../common/interfaces/@maticnetwork/pos-portal/root/RootToken/IMintableERC721.sol";

/// @title This contract is a erc 721 compatible NFT token that represents an avatar and can be minted by a minter role.
/// @dev This contract support meta transactions.
/// @dev This contract is final, don't inherit form it.
contract Avatar is AvatarBase, Upgradeable, IMintableERC721 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    function initialize(
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
    }

    /**
     * @notice called by predicate contract to mint tokens while withdrawing
     * @dev Should be callable only by MintableERC721Predicate
     * Make sure minting is done only by this function
     * @param to user address for whom token is being minted
     * @param id tokenId being minted
     */
    function mint(address to, uint256 id) external virtual override(IAvatarMinter, IMintableERC721) {
        require(hasRole(MINTER_ROLE, _msgSender()), "must have minter role");
        _mint(to, id);
    }

    /**
     * @notice called by predicate contract to mint tokens while withdrawing with metadata from L2
     * @dev Should be callable only by MintableERC721Predicate
     * Make sure minting is only done either by this function/ 👆
     * @param user user address for whom token is being minted
     * @param tokenId tokenId being minted
     * @param metaData Associated token metadata, to be decoded & set using `setTokenMetadata`
     *
     * Note : If you're interested in taking token metadata from L2 to L1 during exit, you must
     * implement this method
     */
    function mint(
        address user,
        uint256 tokenId,
        bytes calldata metaData
    ) external override {
        require(hasRole(MINTER_ROLE, _msgSender()), "must have minter role");
        _safeMint(user, tokenId, metaData);
    }

    /**
     * @dev We don't implement {IMintableERC721-exists} but this one is a nice to have.
     */
    function exists(uint256 tokenId) external view override returns (bool) {
        return _exists(tokenId);
    }
}

//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {IAvatarMinter} from "../../../common/interfaces/IAvatarMinter.sol";
import {PolygonAvatarStorage} from "./PolygonAvatarStorage.sol";

// This contract is final, don't inherit form it.
contract PolygonAvatar is IAvatarMinter, PolygonAvatarStorage {
    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_
    ) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __UpgradeableBase_init_unchained();
        __ERC721_init_unchained(name_, symbol_);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        baseTokenURI = baseTokenURI_;
    }

    /**
     * @dev Creates a new token for `to`. Its token ID will be automatically
     * assigned (and available on the emitted {IERC721-Transfer} event), and the token
     * URI autogenerated based on the base URI passed at construction.
     *
     * See {ERC721-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(address to, uint256 id) external override {
        require(hasRole(MINTER_ROLE, _msgSender()), "must have minter role to mint");
        // TODO: we want call the callback for this one _safeMint ?
        _mint(to, id);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
}

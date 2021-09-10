//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Upgradeable} from "../../../common/BaseWithStorage/Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

// This contract is final, don't inherit form it.
abstract contract PolygonAvatarStorage is Upgradeable, ERC721Upgradeable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string public baseTokenURI;

    /**
     * @dev See {IERC165-supportsInterface}.
     * We must implement supportsInterface because ERC721Upgradeable is not abstract.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

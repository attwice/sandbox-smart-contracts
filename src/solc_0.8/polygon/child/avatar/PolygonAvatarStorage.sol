//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {Upgradeable} from "../../../common/BaseWithStorage/Upgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC2771Handler} from "../../../common/BaseWithStorage/ERC2771Handler.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

abstract contract PolygonAvatarStorage is Upgradeable, ERC721Upgradeable, ERC2771Handler {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string public baseTokenURI;

    /**
     * @dev See {IERC165-supportsInterface}.
     * We must implement supportsInterface here because ERC721Upgradeable is not abstract.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(ContextUpgradeable, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}

//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {AvatarBase} from "../../../avatar/AvatarBase.sol";
import {IAvatarMinter} from "../../../common/interfaces/IAvatarMinter.sol";
import {Upgradeable} from "../../../common/BaseWithStorage/Upgradeable.sol";

/// @title This contract is a erc 721 compatible NFT token that represents an avatar and can be minted by a minter role.
/// @dev This contract support meta transactions.
/// @dev Avatar will be minted only on L2 (using the sale contract) and can be transferred to L1 but not minted on L1.
/// @dev This contract is final, don't inherit form it.
contract PolygonAvatar is AvatarBase, Upgradeable {
    // Depending on the polygon example you take deposit events are necessary or not.
    event Deposit(address indexed token, address indexed from, uint256 tokenId);
    event DepositBatch(address indexed token, address indexed from, uint256[] tokenIds);
    // This one also depends on the example
    event Withdraw(address indexed token, address indexed from, uint256 tokenId);
    // In the example this one doesn't take the token?
    event WithdrawnBatch(address indexed user, uint256[] tokenIds);

    bytes32 public constant CHILD_MANAGER_ROLE = keccak256("CHILD_MANAGER_ROLE");
    // We only mint on L2, then it make sense to keep track of tokens transferred to L1
    // to avoid minting them twice.
    mapping(uint256 => bool) public withdrawnTokens;
    // Used to emit events.
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

    /// @notice Deposit tokens
    /// @param user address for deposit
    ///  @param tokenId tokenId to mint to user's account
    function deposit(address user, uint256 tokenId) public {
        require(hasRole(CHILD_MANAGER_ROLE, _msgSender()), "!CHILD_MANAGER_ROLE");
        _deposit(user, tokenId);
    }

    /**
     * @notice called when token is deposited on root chain
     * @dev Should be callable only by ChildChainManager
     * Should handle deposit by minting the required tokenId(s) for user
     * Should set `withdrawnTokens` mapping to `false` for the tokenId being deposited
     * Minting can also be done by other functions
     * @param user user address for whom deposit is being done
     * @param depositData abi encoded tokenIds. Batch deposit also supported.
     */
    function deposit(address user, bytes calldata depositData) external {
        require(hasRole(CHILD_MANAGER_ROLE, _msgSender()), "!CHILD_MANAGER_ROLE");
        if (depositData.length == 32) {
            // deposit single
            uint256 tokenId = abi.decode(depositData, (uint256));
            _deposit(user, tokenId);
            emit Deposit(l1TokenAddress, user, tokenId);
        } else {
            // deposit batch
            uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));
            uint256 length = tokenIds.length;
            for (uint256 i; i < length; i++) {
                _deposit(user, tokenIds[i]);
            }
            emit DepositBatch(l1TokenAddress, user, tokenIds);
        }
    }

    /// @notice Withdraw tokens
    /// @param tokenId tokenId of the token to be withdrawn
    function withdraw(uint256 tokenId) public payable {
        _withdraw(tokenId);
        emit Withdraw(l1TokenAddress, _msgSender(), tokenId);
    }

    /**
     * @notice called when user wants to withdraw multiple tokens back to root chain
     * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
     * @param tokenIds tokenId list to withdraw
     */
    function withdrawBatch(uint256[] calldata tokenIds) external {
        // Iteratively burn ERC721 tokens, for performing batch withdraw
        for (uint256 i; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            _withdraw(tokenId);
        }
        // At last emit this event, which will be used
        // in MintableERC721 predicate contract on L1
        // while verifying burn proof
        emit WithdrawnBatch(_msgSender(), tokenIds);
    }

    /// @dev Change layer1 token address
    /// @param l1TokenAddress_ The new l1TokenAddress
    function setL1TokenAddress(address l1TokenAddress_) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "must have admin role");
        l1TokenAddress = l1TokenAddress_;
    }

    /// @notice Deposit tokens
    /// @param user address for deposit
    ///  @param tokenId tokenId to mint to user's account
    function _deposit(address user, uint256 tokenId) internal {
        require(user != address(0x0), "invalid user");
        withdrawnTokens[tokenId] = false;
        _mint(user, tokenId);
    }

    /// @notice Withdraw tokens
    /// @param tokenId tokenId of the token to be withdrawn
    function _withdraw(uint256 tokenId) internal {
        require(ownerOf(tokenId) == _msgSender(), "Not owner");
        withdrawnTokens[tokenId] = true;
        _burn(tokenId);
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
        require(hasRole(MINTER_ROLE, _msgSender()), "must have minter role");
        require(!withdrawnTokens[id], "TOKEN_EXISTS_ON_ROOT_CHAIN");
        _mint(to, id);
    }
}

//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

abstract contract Upgradeable is Initializable, ContextUpgradeable, AccessControlUpgradeable {
    bytes32 public constant STORAGE_CHANGER_ROLE = keccak256("STORAGE_CHANGER_ROLE");
    // TODO: This is a good idea taken from ProxyImplementation, consider if we want to use it!!!
    // TODO: Initializable cannot be replaced totally if we want to use the Openzeppelin contracts
    // TODO: We can use our storageChange backdoor to initialize contracts and then we don't need this code
    // TODO: Discuss....
    //    mapping(string => bool) _initialised;
    //
    //    modifier phase(string memory phaseName) {
    //        if (!_initialised[phaseName]) {
    //            _initialised[phaseName] = true;
    //            _;
    //        }
    //    }

    /**
      @notice Modifier that protects the function
      @dev We use an authorized storage changed for each contract
       TODO: it is possible to use one centralized contract to delegate this mission (and is a good idea but we don't need to enforce it?).
     */
    modifier onlyAuthorizedStorageChanger() {
        require(hasRole(STORAGE_CHANGER_ROLE, _msgSender()), "not authorized storageChanger");
        _;
    }

    function __UpgradeableBase_init(address adminRole, address storageChanger) internal initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __UpgradeableBase_init_unchained(adminRole, storageChanger);
    }

    function __UpgradeableBase_init_unchained(address adminRole, address storageChanger) internal initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, adminRole);
        _setupRole(STORAGE_CHANGER_ROLE, storageChanger);
    }

    // This is very risky but we assume that we have full control over the changers!!!
    function callChanger(address changer, bytes calldata data)
        external
        onlyAuthorizedStorageChanger
        returns (bytes memory)
    {
        /* solhint-disable avoid-low-level-calls */
        (bool success, bytes memory result) =
            changer.delegatecall(abi.encodeWithSignature("changeStorage(bytes)", data));
        /* solhint-enable avoid-low-level-calls */
        require(success, "delegate call error");
        return result;
    }

    uint256[50] private __gap;
}

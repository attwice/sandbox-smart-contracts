import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestOrL2} from '../../utils/network';
import {getContractOrNull} from '@nomiclabs/hardhat-ethers/dist/src/helpers';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');
  const l1TokenAddress = await getContractOrNull(hre, 'Avatar');
  if (!l1TokenAddress) {
    console.warn("We don't have the address of the L1 avatar contract!!!");
  }
  const adminRole = sandAdmin;
  await deploy('PolygonAvatar', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          (l1TokenAddress && l1TokenAddress.address) || AddressZero,
          'Avatar',
          'TSBAV',
          'http://XXX.YYY',
          TRUSTED_FORWARDER.address,
          adminRole,
        ],
      },
      upgradeIndex: 0,
    },
  });
  // Grant roles.
  const childChainManagerRole = await deployments.read(
    'PolygonAvatar',
    'CHILD_MANAGER_ROLE'
  );
  await deployments.execute(
    'PolygonAvatar',
    {from: adminRole, log: true},
    'grantRole',
    childChainManagerRole,
    CHILD_CHAIN_MANAGER.address
  );
};

export default func;
func.tags = ['PolygonAvatar', 'PolygonAvatar_deploy'];
func.dependencies = ['Avatar', 'CHILD_CHAIN_MANAGER', 'TRUSTED_FORWARDER'];
func.skip = skipUnlessTestOrL2;

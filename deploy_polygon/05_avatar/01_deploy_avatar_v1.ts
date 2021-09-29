import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {AddressZero} from '@ethersproject/constants';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');
  // TODO: Check if we want a L1 token!!!
  const l1TokenAddress = await hre.companionNetworks['l1'].deployments.get(
    'Avatar'
  ); // layer 1
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
};

export default func;
func.tags = ['PolygonAvatar', 'PolygonAvatar_deploy'];
func.dependencies = ['CHILD_CHAIN_MANAGER', 'TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;

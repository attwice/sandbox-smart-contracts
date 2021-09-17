import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('Avatar', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          'Avatar',
          'TSBAV',
          'http://XXX.YYY',
          TRUSTED_FORWARDER.address,
          sandAdmin,
          sandAdmin,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['Avatar', 'Avatar_deploy'];
func.dependencies = ['TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;

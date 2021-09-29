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
  const l1TokenAddress = await getContractOrNull(hre, 'Avatar');
  if (!l1TokenAddress) {
    console.warn("We don't have the address of the L1 avatar contract!!!");
  }
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
          sandAdmin,
        ],
      },
      upgradeIndex: 0,
    },
  });
};

export default func;
func.tags = ['PolygonAvatar', 'PolygonAvatar_deploy'];
func.dependencies = ['Avatar', 'TRUSTED_FORWARDER'];
func.skip = skipUnlessTestOrL2;

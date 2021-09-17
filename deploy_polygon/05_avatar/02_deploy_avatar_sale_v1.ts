import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    sandAdmin,
    backendAuthWallet,
    sandboxAccount,
  } = await getNamedAccounts();
  const {deploy} = deployments;

  const avatarContract = await deployments.get('Avatar');
  const sandContract = await deployments.get('Sand');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const adminRole = sandAdmin;
  await deploy('AvatarSale', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          avatarContract.address,
          sandContract.address,
          TRUSTED_FORWARDER.address,
          adminRole,
          sandAdmin,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });

  // Grant roles.
  const minterRole = await deployments.read('Avatar', 'MINTER_ROLE');
  await deployments.execute(
    'Avatar',
    {from: adminRole, log: true},
    'grantRole',
    minterRole,
    avatarContract.address
  );

  const signerRole = await deployments.read('AvatarSale', 'SIGNER_ROLE');
  await deployments.execute(
    'AvatarSale',
    {from: adminRole, log: true},
    'grantRole',
    signerRole,
    backendAuthWallet
  );

  const sellerRole = await deployments.read('AvatarSale', 'SELLER_ROLE');
  await deployments.execute(
    'AvatarSale',
    {from: adminRole, log: true},
    'grantRole',
    sellerRole,
    sandboxAccount
  );
};

export default func;
func.tags = ['AvatarSale', 'AvatarSale_deploy'];
func.dependencies = ['TRUSTED_FORWARDER', 'Avatar', 'Sand'];
func.skip = skipUnlessTestnet;

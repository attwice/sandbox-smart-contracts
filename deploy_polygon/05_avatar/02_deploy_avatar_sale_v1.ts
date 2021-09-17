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

  const avatarContract = await deployments.get('PolygonAvatar');
  const sandContract = await deployments.get('Sand');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const adminRole = sandAdmin;
  await deploy('PolygonAvatarSale', {
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
  const minterRole = await deployments.read('PolygonAvatar', 'MINTER_ROLE');
  await deployments.execute(
    'PolygonAvatar',
    {from: adminRole, log: true},
    'grantRole',
    minterRole,
    avatarContract.address
  );

  const signerRole = await deployments.read('PolygonAvatarSale', 'SIGNER_ROLE');
  await deployments.execute(
    'PolygonAvatarSale',
    {from: adminRole, log: true},
    'grantRole',
    signerRole,
    backendAuthWallet
  );

  const sellerRole = await deployments.read('PolygonAvatarSale', 'SELLER_ROLE');
  await deployments.execute(
    'PolygonAvatarSale',
    {from: adminRole, log: true},
    'grantRole',
    sellerRole,
    sandboxAccount
  );
};

export default func;
func.tags = ['PolygonAvatarSale', 'PolygonAvatarSale_deploy'];
func.dependencies = ['TRUSTED_FORWARDER', 'PolygonAvatar', 'Sand'];
func.skip = skipUnlessTestnet;

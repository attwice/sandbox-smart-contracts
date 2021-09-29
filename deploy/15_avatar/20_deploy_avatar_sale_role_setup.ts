// TODO: Validate if we want a L1 avatar sale contract ?

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    sandAdmin,
    backendAuthWallet,
    sandboxAccount,
  } = await getNamedAccounts();

  const avatarSaleContract = await deployments.get('AvatarSale');
  const adminRole = sandAdmin;

  // Grant roles.
  const minterRole = await deployments.read('Avatar', 'MINTER_ROLE');
  await deployments.execute(
    'Avatar',
    {from: adminRole, log: true},
    'grantRole',
    minterRole,
    avatarSaleContract.address
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
func.tags = ['AvatarSale', 'AvatarSale_role_setup'];
func.dependencies = ['AvatarSale_deploy'];
func.skip = skipUnlessTestnet;

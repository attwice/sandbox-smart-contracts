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
    PolygonMintableERC721PredicateProxy,
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
    PolygonMintableERC721PredicateProxy
  );
};

export default func;
func.tags = ['Avatar', 'Avatar_setup'];
func.dependencies = ['Avatar_deploy'];
func.skip = skipUnlessTestnet;

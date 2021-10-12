import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

// Avatars can be only minted in L2, when moved to L1 the polygon predicate is in charge of minting them.
const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    sandAdmin,
    PolygonMintableERC721PredicateProxy,
  } = await getNamedAccounts();
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

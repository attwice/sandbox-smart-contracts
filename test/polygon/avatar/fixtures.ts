import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

const name = 'AVATARNAME';
const symbol = 'TSBAV';
const baseUri = 'http://api';
export const setupAvatarTest = deployments.createFixture(async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [l1Token, childChainManager] = await getUnnamedAccounts();
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    minter,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('PolygonAvatar', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [l1Token, name, symbol, baseUri, trustedForwarder, adminRole],
      },
    },
  });
  const avatar = await ethers.getContract('PolygonAvatar', deployer);
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
    childChainManager
  );
  return {
    l1Token,
    childChainManager,
    childChainManagerRole,
    baseUri,
    symbol,
    name,
    avatar,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    minter,
    other,
    dest,
  };
});

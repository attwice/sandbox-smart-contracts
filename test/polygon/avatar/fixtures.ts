import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';

const name = 'AVATARNAME';
const symbol = 'TSBAV';
const baseUri = 'http://api';

export const setupAvatarTest = deployments.createFixture(async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    storageChanger,
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
        args: [
          name,
          symbol,
          baseUri,
          trustedForwarder,
          adminRole,
          storageChanger,
        ],
      },
    },
  });
  const polygonAvatar = await ethers.getContract('PolygonAvatar', deployer);
  return {
    baseUri,
    symbol,
    name,
    polygonAvatar,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    storageChanger,
    minter,
    other,
    dest,
  };
});

export const addMinter = async function (
  adminRole: string,
  polygonAvatar: Contract,
  addr: string
): Promise<void> {
  const polygonAvatarAsAdmin = await ethers.getContract(
    'PolygonAvatar',
    adminRole
  );
  const minterRole = await polygonAvatar.MINTER_ROLE();
  await polygonAvatarAsAdmin.grantRole(minterRole, addr);
};

export const setupAvatarSaleTest = deployments.createFixture(async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    storageChanger,
    minter,
    other,
    dest,
    childChainManagerProxy,
    sandAdmin,
    executionAdmin,
  ] = await getUnnamedAccounts();
  await deployments.deploy('PolygonSand', {
    from: deployer,
    args: [childChainManagerProxy, trustedForwarder, sandAdmin, executionAdmin],
    proxy: false,
  });

  await deployments.deploy('PolygonAvatar', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          name,
          symbol,
          baseUri,
          trustedForwarder,
          adminRole,
          storageChanger,
        ],
      },
    },
  });
  const polygonAvatar = await ethers.getContract('PolygonAvatar', deployer);
  const sandToken = await ethers.getContract('PolygonSand', deployer);

  await deployments.deploy('PolygonAvatarSale', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          polygonAvatar.address,
          sandToken.address,
          trustedForwarder,
          adminRole,
          storageChanger,
        ],
      },
    },
  });
  const polygonAvatarSale = await ethers.getContract(
    'PolygonAvatarSale',
    deployer
  );
  return {
    polygonAvatarSale,
    polygonAvatar,
    sandToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    storageChanger,
    minter,
    other,
    dest,
    childChainManagerProxy,
    sandAdmin,
    executionAdmin,
  };
});

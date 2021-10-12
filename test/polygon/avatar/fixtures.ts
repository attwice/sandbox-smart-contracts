import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../../utils';
import {Contract} from 'ethers';

const name = 'AVATARNAME';
const symbol = 'TSBAV';
const baseUri = 'http://api';
export const setupAvatarTest = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    childChainManager,
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
        args: [name, symbol, baseUri, trustedForwarder, adminRole],
      },
    },
  });
  const polygonAvatar = await ethers.getContract('PolygonAvatar', deployer);
  const polygonAvatarAsAdmin = await ethers.getContract(
    'PolygonAvatar',
    adminRole
  );
  // Grant roles.
  const childChainManagerRole = await polygonAvatar.CHILD_MANAGER_ROLE();
  await polygonAvatarAsAdmin.grantRole(
    childChainManagerRole,
    childChainManager
  );
  const minterRole = await polygonAvatar.MINTER_ROLE();
  await polygonAvatarAsAdmin.grantRole(minterRole, minter);
  const polygonAvatarAsMinter = await ethers.getContract(
    'PolygonAvatar',
    minter
  );
  const polygonAvatarAsOther = await ethers.getContract('PolygonAvatar', other);
  const polygonAvatarAsTrustedForwarder = await ethers.getContract(
    'PolygonAvatar',
    trustedForwarder
  );

  return {
    childChainManager,
    childChainManagerRole,
    baseUri,
    symbol,
    name,
    polygonAvatar,
    polygonAvatarAsAdmin,
    polygonAvatarAsMinter,
    polygonAvatarAsOther,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    polygonAvatarAsTrustedForwarder,
    adminRole,
    minterRole,
    minter,
    other,
    dest,
  };
});

export const addMinter = async function (
  adminRole: string,
  avatar: Contract,
  addr: string
): Promise<void> {
  const avatarAsAdmin = await ethers.getContract('Avatar', adminRole);
  const minterRole = await avatar.MINTER_ROLE();
  await avatarAsAdmin.grantRole(minterRole, addr);
};

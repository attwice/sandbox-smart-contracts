import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumberish, Contract} from 'ethers';
import ERC20Mock from '@openzeppelin/contracts-0.8/build/contracts/ERC20PresetMinterPauser.json';
import {withSnapshot} from '../utils';

const name = 'AVATARNAME';
const symbol = 'TSBAV';
const baseUri = 'http://api';
export const setupAvatarTest = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    minter,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('Avatar', {
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
  const avatar = await ethers.getContract('Avatar', deployer);
  return {
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

export const addMinter = async function (
  adminRole: string,
  avatar: Contract,
  addr: string
): Promise<void> {
  const avatarAsAdmin = await ethers.getContract('Avatar', adminRole);
  const minterRole = await avatar.MINTER_ROLE();
  await avatarAsAdmin.grantRole(minterRole, addr);
};

export const setupAvatarSaleTest = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('SandMock', {
    from: deployer,
    contract: ERC20Mock,
    args: ['AToken', 'SAND'],
    proxy: false,
  });

  await deployments.deploy('Avatar', {
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
  const avatarAsAdmin = await ethers.getContract('Avatar', adminRole);
  const sandToken = await ethers.getContract('SandMock', deployer);

  await deployments.deploy('AvatarSale', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          avatarAsAdmin.address,
          sandToken.address,
          trustedForwarder,
          adminRole,
        ],
      },
    },
  });
  const avatarSaleAsOther = await ethers.getContract('AvatarSale', other);
  const avatarSaleAsAdmin = await ethers.getContract('AvatarSale', adminRole);
  // Grant roles.
  const minter = await avatarAsAdmin.MINTER_ROLE();
  await avatarAsAdmin.grantRole(minter, avatarSaleAsAdmin.address);
  const signerRole = await avatarSaleAsAdmin.SIGNER_ROLE();
  await avatarSaleAsAdmin.grantRole(signerRole, signer);
  const sellerRole = await avatarSaleAsAdmin.SELLER_ROLE();
  await avatarSaleAsAdmin.grantRole(sellerRole, seller);
  return {
    avatarSaleAsOther,
    avatarSaleAsAdmin,
    avatarAsAdmin,
    sandToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  };
});

export const mintSandAndApprove = async function (
  sandToken: Contract,
  addr: string,
  amount: BigNumberish,
  spender: string
): Promise<void> {
  await sandToken.mint(addr, amount);
  const sandTokenAsOther = await ethers.getContract('SandMock', addr);
  await sandTokenAsOther.approve(spender, amount);
};

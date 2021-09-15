import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber, BigNumberish, Contract} from 'ethers';
import ERC20Mock from '@openzeppelin/contracts-0.8/build/contracts/ERC20PresetMinterPauser.json';
import {toWei} from '../../utils';

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
  const polygonAvatarAsAdmin = await ethers.getContract(
    'PolygonAvatar',
    adminRole
  );
  const sandToken = await ethers.getContract('SandMock', deployer);

  await deployments.deploy('PolygonAvatarSale', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          polygonAvatarAsAdmin.address,
          sandToken.address,
          trustedForwarder,
          adminRole,
          storageChanger,
        ],
      },
    },
  });
  const polygonAvatarSaleAsOther = await ethers.getContract(
    'PolygonAvatarSale',
    other
  );
  const polygonAvatarSaleAsAdmin = await ethers.getContract(
    'PolygonAvatarSale',
    adminRole
  );
  // Grant roles.
  const minter = await polygonAvatarAsAdmin.MINTER_ROLE();
  await polygonAvatarAsAdmin.grantRole(
    minter,
    polygonAvatarSaleAsAdmin.address
  );
  const signerRole = await polygonAvatarSaleAsAdmin.SIGNER_ROLE();
  await polygonAvatarSaleAsAdmin.grantRole(signerRole, signer);
  const sellerRole = await polygonAvatarSaleAsAdmin.SELLER_ROLE();
  await polygonAvatarSaleAsAdmin.grantRole(sellerRole, seller);
  return {
    polygonAvatarSaleAsOther,
    polygonAvatarSaleAsAdmin,
    polygonAvatarAsAdmin,
    sandToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    storageChanger,
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
) {
  await sandToken.mint(addr, amount);
  const sandTokenAsOther = await ethers.getContract('SandMock', addr);
  await sandTokenAsOther.approve(spender, toWei(10));
};

export const signMint = async function (
  polygonAvatarSale: Contract,
  signer: string,
  buyer: string,
  tokenId: BigNumberish,
  seller: string,
  price: BigNumberish
) {
  const chainId = BigNumber.from(await polygonAvatarSale.getChainId());
  const signature = await ethers.provider.send('eth_signTypedData_v4', [
    signer,
    {
      types: {
        EIP712Domain: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'version',
            type: 'string',
          },
          {
            name: 'chainId',
            type: 'uint256',
          },
          {
            name: 'verifyingContract',
            type: 'address',
          },
        ],
        // Mint(address signer,address buyer,uint id,address seller,uint price)
        Mint: [
          {name: 'signer', type: 'address'},
          {name: 'buyer', type: 'address'},
          {name: 'id', type: 'uint256'},
          {name: 'seller', type: 'address'},
          {name: 'price', type: 'uint256'},
        ],
      },
      primaryType: 'Mint',
      domain: {
        name: 'Sandbox Avatar Sale',
        version: '1.0',
        chainId: chainId.toString(),
        verifyingContract: polygonAvatarSale.address,
      },
      message: {
        signer: signer,
        buyer: buyer,
        id: tokenId.toString(),
        seller: seller,
        price: price.toString(),
      },
    },
  ]);
  return ethers.utils.splitSignature(signature);
};

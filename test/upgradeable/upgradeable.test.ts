import {deployments, ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {expect} from 'chai';
import {defaultAbiCoder} from 'ethers/lib/utils';
import {withSnapshot} from '../utils';

const setupTest = withSnapshot([], async function () {
  const [
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _,
    deployer,
    upgradeAdmin,
    adminRole,
    storageChanger,
    other,
  ] = await getUnnamedAccounts();
  await deployments.deploy('UpgradeableMock', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [123, adminRole, storageChanger],
      },
    },
  });
  const upgradeableMock = await ethers.getContract('UpgradeableMock', deployer);
  return {
    upgradeableMock,
    deployer,
    upgradeAdmin,
    adminRole,
    storageChanger,
    other,
  };
});
describe('Upgradeable storage change mechanism', function () {
  it('initialization', async function () {
    const fixtures = await setupTest();
    expect(await fixtures.upgradeableMock.someValue1()).to.be.equal(
      BigNumber.from(123)
    );
    expect(await fixtures.upgradeableMock.someValue2()).to.be.equal(
      BigNumber.from(12)
    );
    expect(await fixtures.upgradeableMock.getAVal()).to.be.equal(
      BigNumber.from(123 + 20)
    );
  });

  it('update a value', async function () {
    const fixtures = await setupTest();
    await deployments.deploy('StorageChangeMock', {
      from: fixtures.deployer,
      proxy: false,
    });
    const storageChangeMock = await ethers.getContract('StorageChangeMock');

    // deployer must fail to callChanger
    await expect(
      fixtures.upgradeableMock.callChanger(
        storageChangeMock.address,
        defaultAbiCoder.encode(['uint'], [654])
      )
    ).to.be.revertedWith('not authorized storageChanger');

    const upgradeableMockAsAuthorizedChanger = await ethers.getContract(
      'UpgradeableMock',
      fixtures.storageChanger
    );
    await upgradeableMockAsAuthorizedChanger.callChanger(
      storageChangeMock.address,
      defaultAbiCoder.encode(['uint'], [654])
    );
    expect(await fixtures.upgradeableMock.someValue1()).to.be.equal(
      BigNumber.from(654)
    );
    expect(await fixtures.upgradeableMock.someValue2()).to.be.equal(
      BigNumber.from(123412312)
    );
    expect(await fixtures.upgradeableMock.getAVal()).to.be.equal(
      BigNumber.from(654 + 20)
    );
  });

  it('roles', async function () {
    const fixtures = await setupTest();
    const storageChangerRole = await fixtures.upgradeableMock.STORAGE_CHANGER_ROLE();
    expect(
      await fixtures.upgradeableMock.hasRole(
        storageChangerRole,
        fixtures.storageChanger
      )
    ).to.be.true;
    expect(
      await fixtures.upgradeableMock.hasRole(storageChangerRole, fixtures.other)
    ).to.be.false;
    const defaultAdminRole = await fixtures.upgradeableMock.DEFAULT_ADMIN_ROLE();
    expect(
      await fixtures.upgradeableMock.hasRole(
        defaultAdminRole,
        fixtures.adminRole
      )
    ).to.be.true;
    expect(
      await fixtures.upgradeableMock.hasRole(defaultAdminRole, fixtures.other)
    ).to.be.false;

    await expect(
      fixtures.upgradeableMock.grantRole(storageChangerRole, fixtures.other)
    ).to.be.revertedWith('AccessControl: sender must be an admin to grant');

    const upgradeableMockAsAdmin = await ethers.getContract(
      'UpgradeableMock',
      fixtures.adminRole
    );
    await upgradeableMockAsAdmin.grantRole(storageChangerRole, fixtures.other);

    expect(
      await fixtures.upgradeableMock.hasRole(storageChangerRole, fixtures.other)
    ).to.be.true;
  });
});

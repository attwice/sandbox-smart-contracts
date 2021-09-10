import {deployments, ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {expect} from 'chai';
import {defaultAbiCoder} from 'ethers/lib/utils';

const setupTest = deployments.createFixture(async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, deployer, upgradeAdmin] = await getUnnamedAccounts();
  await deployments.deploy('UpgradeableMock', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [123],
      },
    },
  });
  const upgradeableMock = await ethers.getContract('UpgradeableMock');
  return {upgradeableMock, deployer, upgradeAdmin};
});
describe('Upgradeable storage change mechanism', function () {
  before(async function () {
    // The problem is that
    // getOrNull(name: string) => {
    //   ...
    //   return this.db.deployments[name];
    // }
    // We need to erase this.db.deployments so the proxyAdmin is re-deployed
    // This does the trick
    await deployments.run([], {resetMemory: true});
  });
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

    const authorizedChanger = fixtures.deployer;
    const upgradeableMockAsAuthorizedChanger = await ethers.getContract(
      'UpgradeableMock',
      authorizedChanger
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
});

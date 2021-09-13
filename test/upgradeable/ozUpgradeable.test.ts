import {deployments, ethers, getUnnamedAccounts} from 'hardhat';
import {BigNumber} from 'ethers';
import {expect} from 'chai';

const setupTest = deployments.createFixture(async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [
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
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [123, adminRole, storageChanger],
      },
    },
  });
  const upgradeableMock = await ethers.getContract('UpgradeableMock');
  return {upgradeableMock, deployer, upgradeAdmin, other};
});
// This set of tests are just to explain how OpenZeppelin proxies work.
// Hardhat-deploy has a lot of alternatives for proxies when we pass the OpenZeppelinTransparentProxy
// We end up using:
// https://github.com/wighawag/hardhat-deploy/blob/master/solc_0.7/openzeppelin/proxy/TransparentUpgradeableProxy.sol
// In production is better to use OptimizedTransparentProxy parameter that end up being:
// https://github.com/wighawag/hardhat-deploy/blob/master/solc_0.7/proxy/OptimizedTransparentUpgradeableProxy.sol
// This one is the same as the OpenZeppelinTransparentProxy one but you cannot change the owner
// of the proxy (it is constant saved in the code not in the storage).
// In any case the owner/admin of the proxy is who can call the admin functions of the proxy to change implementation.
// With openzeppelin the proxy owner/admin is another contract called proxyAdmin (the proxyAdmin address is constant).
// Every admin operation on proxies is done via the proxyAdmin that has himself an Owner.
// The proxyAdmin is the owner/admin of all proxies and the owner of the proxyAdmin is an account is  authorized
// to do upgrades of the implementations.
// Hardhat-deploy do only one deploy of a proxyAdmin and call it DefaultProxyAdmin
// The initial owner of a proxyAdmin is the one related to the first deploy so some care must be taken when writing
// deploy scripts.
describe('OpenZeppelinTransparentProxy explanation', function () {
  before(async function () {
    // The problem is that hardhat-deploy find a proxyAdmin form other tests
    // (the testing environment is dirty)
    // getOrNull(name: string) => {
    //   ...
    //   return this.db.deployments[name];
    // }
    // We need to erase this.db.deployments so the proxyAdmin is re-deployed
    // This does the trick
    await deployments.fixture([], {
      fallbackToGlobal: false,
      keepExistingDeployments: false,
    });
  });
  it('there is no way to call directly the admin operations on the proxy', async function () {
    const fixtures = await setupTest();
    expect(await fixtures.upgradeableMock.callStatic['admin']()).to.be.equal(
      BigNumber.from(0x1234)
    );
    await expect(
      fixtures.upgradeableMock.callStatic['implementation']()
    ).to.to.revertedWith(
      "function selector was not recognized and there's no fallback function"
    );
  });

  it('we can call the admin operations via the proxyAdmin', async function () {
    const fixtures = await setupTest();
    const defaultProxyAdmin = await ethers.getContract('DefaultProxyAdmin');
    expect(await defaultProxyAdmin.owner()).to.be.equal(fixtures.upgradeAdmin);
    expect(
      await defaultProxyAdmin.getProxyAdmin(fixtures.upgradeableMock.address)
    ).to.be.equal(defaultProxyAdmin.address);
  });

  it('only the proxyAdmin owner can call upgrade', async function () {
    const fixtures = await setupTest();
    await deployments.deploy('UpgradeableUpgradeMock', {
      from: fixtures.deployer,
    });
    const newImpl = await ethers.getContract('UpgradeableUpgradeMock');

    const defaultProxyAdmin = await ethers.getContract(
      'DefaultProxyAdmin',
      fixtures.upgradeAdmin
    );
    expect(
      await defaultProxyAdmin.getProxyImplementation(
        fixtures.upgradeableMock.address
      )
    ).to.not.be.equal(newImpl.address);
    await defaultProxyAdmin.upgrade(
      fixtures.upgradeableMock.address,
      newImpl.address
    );
    expect(
      await defaultProxyAdmin.getProxyImplementation(
        fixtures.upgradeableMock.address
      )
    ).to.be.equal(newImpl.address);
  });

  it('we can do something strange by changing the proxy owner to other account', async function () {
    const fixtures = await setupTest();
    const defaultProxyAdmin = await ethers.getContract(
      'DefaultProxyAdmin',
      fixtures.upgradeAdmin
    );
    await defaultProxyAdmin.changeProxyAdmin(
      fixtures.upgradeableMock.address,
      fixtures.other
    );
    // Now the proxy owner is other
    const upgradeableMockAsOther = await ethers.getContract(
      'UpgradeableMock',
      fixtures.other
    );
    expect(await fixtures.upgradeableMock.callStatic['admin']()).to.be.equal(
      BigNumber.from(0x1234)
    );
    expect(await upgradeableMockAsOther.callStatic['admin']()).to.be.equal(
      fixtures.other
    );
  });

  describe('the constructor is not accesible so is not called !!!!', function () {
    it("the version without method doesn't call the constructor nor the initialize method!!!!", async function () {
      const fixtures = await setupTest();
      await deployments.deploy('UpgradeableMockWrong', {
        from: fixtures.deployer,
        proxy: {
          owner: fixtures.upgradeAdmin,
          proxyContract: 'OpenZeppelinTransparentProxy',
        },
        contract: 'UpgradeableMock',
      });
      const upgradeableMock = await ethers.getContract('UpgradeableMockWrong');
      expect(await upgradeableMock.someValue1()).to.be.equal(BigNumber.from(0));
      expect(await upgradeableMock.someValue2()).to.be.equal(BigNumber.from(0));
      expect(await upgradeableMock.getAVal()).to.be.equal(BigNumber.from(20));
      expect(await upgradeableMock.stringVal()).to.be.equal('');
      expect(await upgradeableMock.constantStringVal()).to.be.equal(
        'Some string'
      );
    });

    it('Just a an example we can use the same contract without a proxy but calling the constructor.', async function () {
      const fixtures = await setupTest();
      await deployments.deploy('UpgradeableMockNoProxy', {
        from: fixtures.deployer,
        args: [],
        proxy: false,
        contract: 'UpgradeableMock',
      });
      const upgradeableMock = await ethers.getContract(
        'UpgradeableMockNoProxy'
      );
      expect(await upgradeableMock.someValue1()).to.be.equal(BigNumber.from(1));
      expect(await upgradeableMock.someValue2()).to.be.equal(BigNumber.from(0));
      expect(await upgradeableMock.getAVal()).to.be.equal(BigNumber.from(21));
      expect(await upgradeableMock.stringVal()).to.be.equal('Some string');
      expect(await upgradeableMock.constantStringVal()).to.be.equal(
        'Some string'
      );
    });

    it('The right way, passing the initialization method name.', async function () {
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
      expect(await fixtures.upgradeableMock.stringVal()).to.be.equal('');
      expect(await fixtures.upgradeableMock.constantStringVal()).to.be.equal(
        'Some string'
      );
    });

    it('Contract upgrade example.', async function () {
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
      await deployments.deploy('UpgradeableMock', {
        from: fixtures.upgradeAdmin,
        proxy: {
          owner: fixtures.upgradeAdmin,
          proxyContract: 'OpenZeppelinTransparentProxy',
          execute: {
            methodName: 'initialize1',
            args: [312],
          },
        },
        // New version!!
        contract: 'UpgradeableUpgradeMock',
      });
      const upgradeableMock = await ethers.getContract('UpgradeableMock');
      expect(await upgradeableMock.someValue1()).to.be.equal(
        BigNumber.from(312)
      );
      expect(await upgradeableMock.someValue2()).to.be.equal(
        BigNumber.from(512)
      );
      expect(await upgradeableMock.getAVal()).to.be.equal(
        BigNumber.from(312 + 200)
      );
    });
  });
});

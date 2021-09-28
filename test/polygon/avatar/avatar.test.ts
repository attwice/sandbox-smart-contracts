import {ethers} from 'hardhat';
import {expect} from 'chai';
import {setupAvatarTest} from './fixtures';
import {cleanTestingEnvironment} from '../../utils';

describe('PolygonAvatar.sol differences with Avatar.sol', function () {
  before(cleanTestingEnvironment);
  describe('admin', function () {
    it('admin role is set', async function () {
      const fixtures = await setupAvatarTest();
      const defaultAdminRole = await fixtures.avatar.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.avatar.hasRole(defaultAdminRole, fixtures.adminRole)
      ).to.be.true;
    });
    it('admin can set the setL1TokenAddress', async function () {
      const fixtures = await setupAvatarTest();

      const avatarAsAdmin = await ethers.getContract(
        'PolygonAvatar',
        fixtures.adminRole
      );
      expect(await fixtures.avatar.l1TokenAddress()).to.be.equal(
        fixtures.l1Token
      );
      await avatarAsAdmin.setL1TokenAddress(fixtures.other);
      expect(await fixtures.avatar.l1TokenAddress()).to.be.equal(
        fixtures.other
      );
    });
    it('other should fail to set the trusted forwarder', async function () {
      const fixtures = await setupAvatarTest();
      await expect(
        fixtures.avatar.setL1TokenAddress(fixtures.other)
      ).to.revertedWith('must have admin role');
    });
  });
});

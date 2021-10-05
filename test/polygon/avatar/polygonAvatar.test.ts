import {ethers} from 'hardhat';
import {expect} from 'chai';
import {setupAvatarTest} from './fixtures';
import {BigNumber} from 'ethers';

describe('PolygonAvatar.sol differences with Avatar.sol', function () {
  describe('roles', function () {
    describe('admin', function () {
      it('admin role is set', async function () {
        const fixtures = await setupAvatarTest();
        const defaultAdminRole = await fixtures.polygonAvatar.DEFAULT_ADMIN_ROLE();
        expect(
          await fixtures.polygonAvatar.hasRole(
            defaultAdminRole,
            fixtures.adminRole
          )
        ).to.be.true;
      });
      it('admin can set the setL1TokenAddress', async function () {
        const fixtures = await setupAvatarTest();

        const avatarAsAdmin = await ethers.getContract(
          'PolygonAvatar',
          fixtures.adminRole
        );
        expect(await fixtures.polygonAvatar.l1TokenAddress()).to.be.equal(
          fixtures.l1Token
        );
        await avatarAsAdmin.setL1TokenAddress(fixtures.other);
        expect(await fixtures.polygonAvatar.l1TokenAddress()).to.be.equal(
          fixtures.other
        );
      });
      it('other should fail to set the trusted forwarder', async function () {
        const fixtures = await setupAvatarTest();
        await expect(
          fixtures.polygonAvatar.setL1TokenAddress(fixtures.other)
        ).to.revertedWith('must have admin role');
      });
    });
    describe('child chain manager', function () {
      it('check initial roles', async function () {
        const fixtures = await setupAvatarTest();
        expect(
          await fixtures.polygonAvatar.hasRole(
            fixtures.childChainManagerRole,
            fixtures.childChainManager
          )
        ).to.be.true;
        expect(
          await fixtures.polygonAvatar.hasRole(
            fixtures.childChainManagerRole,
            fixtures.other
          )
        ).to.be.false;
      });
      it('child chain manager can mint tokens', async function () {
        const tokenId = BigNumber.from('0xdada1');
        const fixtures = await setupAvatarTest();
        const avatarAsChildChainManager = await ethers.getContract(
          'PolygonAvatar',
          fixtures.childChainManager
        );
        await avatarAsChildChainManager.deposit(fixtures.other, tokenId);
        expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
          fixtures.other
        );
      });
      it('other user should fail to mint', async function () {
        const tokenId = BigNumber.from('0xdada2');
        const fixtures = await setupAvatarTest();
        await expect(
          fixtures.polygonAvatar.deposit(fixtures.other, tokenId)
        ).to.revertedWith('!CHILD_MANAGER_ROLE');
      });
      it('users can burn tokens', async function () {
        const tokenId = BigNumber.from('0xdada3');
        const fixtures = await setupAvatarTest();
        const avatarAsChildChainManager = await ethers.getContract(
          'PolygonAvatar',
          fixtures.childChainManager
        );
        await avatarAsChildChainManager.deposit(fixtures.other, tokenId);
        expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
          fixtures.other
        );

        const avatarAsOther = await ethers.getContract(
          'PolygonAvatar',
          fixtures.other
        );
        await avatarAsOther.withdraw(tokenId);
        await expect(fixtures.polygonAvatar.ownerOf(tokenId)).to.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
      });
      it('other users should fail to burn', async function () {
        const tokenId = BigNumber.from('0xdada4');
        const fixtures = await setupAvatarTest();
        const avatarAsChildChainManager = await ethers.getContract(
          'PolygonAvatar',
          fixtures.childChainManager
        );
        await avatarAsChildChainManager.deposit(fixtures.other, tokenId);
        await expect(fixtures.polygonAvatar.withdraw(tokenId)).to.revertedWith(
          'Not owner'
        );
      });
      it('we use ownerOf in withdraw, it reverts when the token missing', async function () {
        const tokenId = BigNumber.from('0xdada4');
        const fixtures = await setupAvatarTest();
        await expect(fixtures.polygonAvatar.withdraw(tokenId)).to.revertedWith(
          'ERC721: owner query for nonexistent token'
        );
      });
    });
  });
});

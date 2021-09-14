import {ethers} from 'hardhat';
import {expect} from 'chai';
import {solidityPack} from 'ethers/lib/utils';
import {addMinter, setupAvatarTest} from './fixtures';

describe('PolygonAvatar.sol', function () {
  describe('initialization', function () {
    it('creation', async function () {
      const fixtures = await setupAvatarTest();
      expect(await fixtures.polygonAvatar.name()).to.be.equal(fixtures.name);
      expect(await fixtures.polygonAvatar.symbol()).to.be.equal(
        fixtures.symbol
      );
      expect(await fixtures.polygonAvatar.baseTokenURI()).to.be.equal(
        fixtures.baseUri
      );
    });

    it('interfaces', async function () {
      const fixtures = await setupAvatarTest();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IERC721: '0x80ac58cd',
        IERC721Metadata: '0x5b5e139f',
        IAccessControl: '0x7965db0b',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.polygonAvatar.supportsInterface(i)).to.be.true;
      }
    });
  });
  describe('roles', function () {
    it('admin', async function () {
      const fixtures = await setupAvatarTest();
      const defaultAdminRole = await fixtures.polygonAvatar.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.polygonAvatar.hasRole(
          defaultAdminRole,
          fixtures.adminRole
        )
      ).to.be.true;
      const storageChangerRole = await fixtures.polygonAvatar.STORAGE_CHANGER_ROLE();
      expect(
        await fixtures.polygonAvatar.hasRole(
          storageChangerRole,
          fixtures.storageChanger
        )
      ).to.be.true;
    });

    it('minter', async function () {
      const fixtures = await setupAvatarTest();
      const polygonAvatarAsMinter = await ethers.getContract(
        'PolygonAvatar',
        fixtures.minter
      );
      await expect(
        polygonAvatarAsMinter.mint(fixtures.other, 123)
      ).to.revertedWith('must have minter role');
      await expect(
        fixtures.polygonAvatar.mint(fixtures.other, 123)
      ).to.revertedWith('must have minter role');

      await addMinter(
        fixtures.adminRole,
        fixtures.polygonAvatar,
        fixtures.minter
      );
      const minterRole = await fixtures.polygonAvatar.MINTER_ROLE();
      expect(await fixtures.polygonAvatar.hasRole(minterRole, fixtures.minter))
        .to.be.true;
      await expect(fixtures.polygonAvatar.ownerOf(123)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
      await polygonAvatarAsMinter.mint(fixtures.other, 123);
      expect(await fixtures.polygonAvatar.ownerOf(123)).to.be.equal(
        fixtures.other
      );
      await expect(
        polygonAvatarAsMinter.mint(fixtures.other, 123)
      ).to.revertedWith('ERC721: token already minted');
    });

    it('metaTX trusted forwarder', async function () {
      const fixtures = await setupAvatarTest();
      await addMinter(
        fixtures.adminRole,
        fixtures.polygonAvatar,
        fixtures.minter
      );
      // Regular transfer
      const polygonAvatarAsMinter = await ethers.getContract(
        'PolygonAvatar',
        fixtures.minter
      );
      await polygonAvatarAsMinter.mint(fixtures.other, 123);
      expect(await fixtures.polygonAvatar.ownerOf(123)).to.be.equal(
        fixtures.other
      );
      const polygonAvatarAsOther = await ethers.getContract(
        'PolygonAvatar',
        fixtures.other
      );
      await polygonAvatarAsOther.transferFrom(
        fixtures.other,
        fixtures.dest,
        123
      );
      expect(await fixtures.polygonAvatar.ownerOf(123)).to.be.equal(
        fixtures.dest
      );

      // MetaTX transfer
      await polygonAvatarAsMinter.mint(fixtures.other, 124);
      expect(await fixtures.polygonAvatar.ownerOf(124)).to.be.equal(
        fixtures.other
      );
      const polygonAvatarAsTrustedForwarder = await ethers.getContract(
        'PolygonAvatar',
        fixtures.trustedForwarder
      );
      const txData = await polygonAvatarAsTrustedForwarder.populateTransaction.transferFrom(
        fixtures.other,
        fixtures.dest,
        124
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await polygonAvatarAsTrustedForwarder.signer.sendTransaction(txData);
      expect(await fixtures.polygonAvatar.ownerOf(124)).to.be.equal(
        fixtures.dest
      );
    });
  });
});

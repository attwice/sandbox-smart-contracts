import {ethers} from 'hardhat';
import {expect} from 'chai';
import {solidityPack} from 'ethers/lib/utils';
import {mintSandAndApprove, setupAvatarSaleTest, signMint} from './fixtures';
import {BigNumber} from 'ethers';
import {toWei} from '../../utils';

describe('PolygonAvatarSale.sol', function () {
  describe('initialization', function () {
    it('interfaces', async function () {
      const fixtures = await setupAvatarSaleTest();
      const interfaces = {
        IERC165: '0x01ffc9a7',
        IAccessControl: '0x7965db0b',
      };
      for (const i of Object.values(interfaces)) {
        expect(await fixtures.polygonAvatarSaleAsOther.supportsInterface(i)).to
          .be.true;
      }
    });
  });
  describe('roles', function () {
    it('admin', async function () {
      const fixtures = await setupAvatarSaleTest();
      const defaultAdminRole = await fixtures.polygonAvatarSaleAsOther.DEFAULT_ADMIN_ROLE();
      expect(
        await fixtures.polygonAvatarSaleAsOther.hasRole(
          defaultAdminRole,
          fixtures.adminRole
        )
      ).to.be.true;
      const storageChangerRole = await fixtures.polygonAvatarSaleAsOther.STORAGE_CHANGER_ROLE();
      expect(
        await fixtures.polygonAvatarSaleAsOther.hasRole(
          storageChangerRole,
          fixtures.storageChanger
        )
      ).to.be.true;
    });

    it('signer and seller', async function () {
      const fixtures = await setupAvatarSaleTest();
      const signerRole = await fixtures.polygonAvatarSaleAsOther.SIGNER_ROLE();
      expect(
        await fixtures.polygonAvatarSaleAsOther.hasRole(
          signerRole,
          fixtures.signer
        )
      ).to.be.true;
      const sellerRole = await fixtures.polygonAvatarSaleAsOther.SELLER_ROLE();
      expect(
        await fixtures.polygonAvatarSaleAsOther.hasRole(
          sellerRole,
          fixtures.seller
        )
      ).to.be.true;
    });
  });

  describe('mint', function () {
    it('should success to mint when a message is signed by signer and has destination to a valid seller', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const tokenId = BigNumber.from(0x123);
      await mintSandAndApprove(
        fixtures.sandToken,
        buyer,
        toWei(10),
        fixtures.polygonAvatarSaleAsOther.address
      );
      const preSeller = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.seller)
      );
      const preBuyer = BigNumber.from(
        await fixtures.sandToken.balanceOf(buyer)
      );
      const price = toWei(5);
      const {v, r, s} = await signMint(
        fixtures.polygonAvatarSaleAsOther,
        fixtures.signer,
        buyer,
        tokenId,
        fixtures.seller,
        price
      );
      await fixtures.polygonAvatarSaleAsOther.execute(
        v,
        r,
        s,
        fixtures.signer,
        buyer,
        tokenId,
        fixtures.seller,
        price
      );
      expect(await fixtures.sandToken.balanceOf(fixtures.seller)).to.be.equal(
        preSeller.add(price)
      );
      expect(await fixtures.sandToken.balanceOf(buyer)).to.be.equal(
        preBuyer.sub(price)
      );
      expect(await fixtures.polygonAvatarAsAdmin.ownerOf(tokenId)).to.be.equal(
        buyer
      );
    });

    it('mint with metaTX trusted forwarder', async function () {
      const fixtures = await setupAvatarSaleTest();
      const buyer = fixtures.dest;
      const tokenId = BigNumber.from(0x123);
      await mintSandAndApprove(
        fixtures.sandToken,
        buyer,
        toWei(10),
        fixtures.polygonAvatarSaleAsOther.address
      );
      const preSeller = BigNumber.from(
        await fixtures.sandToken.balanceOf(fixtures.seller)
      );
      const preBuyer = BigNumber.from(
        await fixtures.sandToken.balanceOf(buyer)
      );
      const price = toWei(5);
      const {v, r, s} = await signMint(
        fixtures.polygonAvatarSaleAsOther,
        fixtures.signer,
        buyer,
        tokenId,
        fixtures.seller,
        price
      );

      const polygonAvatarSaleAsTrustedForwarder = await ethers.getContract(
        'PolygonAvatarSale',
        fixtures.trustedForwarder
      );

      const txData = await polygonAvatarSaleAsTrustedForwarder.populateTransaction.execute(
        v,
        r,
        s,
        fixtures.signer,
        buyer,
        tokenId,
        fixtures.seller,
        price
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      await polygonAvatarSaleAsTrustedForwarder.signer.sendTransaction(txData);

      expect(await fixtures.sandToken.balanceOf(fixtures.seller)).to.be.equal(
        preSeller.add(price)
      );
      expect(await fixtures.sandToken.balanceOf(buyer)).to.be.equal(
        preBuyer.sub(price)
      );
      expect(await fixtures.polygonAvatarAsAdmin.ownerOf(tokenId)).to.be.equal(
        buyer
      );
    });
  });
});

import hre from 'hardhat';
import {expect} from 'chai';
import {toWei, withSnapshot} from '../../utils';
import {BigNumber} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import {getContractFromDeployment} from '../../../utils/companionNetwork';
import {defaultAbiCoder} from 'ethers/lib/utils';
import {avatarSaleSignature} from '../../common/signatures';
import {getAvatarContracts} from '../../common/fixtures/avatar';

const deployAvatar = withSnapshot(
  ['Avatar', 'PolygonAvatar', 'PolygonAvatarSale', 'MINTABLE_ERC721_PREDICATE'],
  async () => {
    return await getAvatarContracts(
      hre.companionNetworks['l1'],
      hre.companionNetworks['l2']
    );
  }
);

describe('PolygonAvatar - Avatar deployment test', function () {
  describe('roles', function () {
    before(async function () {
      const {l1Net, l2Net, l1, l2, buyer} = await deployAvatar();
      this.l1Net = l1Net;
      this.l2Net = l2Net;
      this.l1 = l1;
      this.l2 = l2;
      this.buyer = buyer;
    });
    it('admin', async function () {
      const defaultAdminRole = await this.l1.avatar.DEFAULT_ADMIN_ROLE();
      expect(await this.l1.avatar.hasRole(defaultAdminRole, this.l1.sandAdmin))
        .to.be.true;
      expect(await this.l2.avatar.hasRole(defaultAdminRole, this.l2.sandAdmin))
        .to.be.true;
      expect(await this.l2.avatar.hasRole(defaultAdminRole, this.l2.sandAdmin))
        .to.be.true;
    });
    it('minter', async function () {
      const minterRole = await this.l1.avatar.MINTER_ROLE();
      expect(
        await this.l1.avatar.hasRole(
          minterRole,
          this.l1.mintableERC721Predicate.address
        )
      ).to.be.true;
      expect(await this.l2.avatar.hasRole(minterRole, this.l2.sale.address)).to
        .be.true;
    });
    it('child chain manager', async function () {
      const childChainManagerRole = await this.l2.avatar.CHILD_MANAGER_ROLE();
      expect(
        await this.l2.avatar.hasRole(
          childChainManagerRole,
          this.l2.childChainManager.address
        )
      ).to.be.true;
    });
    it('trusted forwarder', async function () {
      expect(await this.l1.avatar.getTrustedForwarder()).to.be.equal(
        this.l1.trustedForwarder.address
      );
      expect(await this.l2.avatar.getTrustedForwarder()).to.be.equal(
        this.l2.trustedForwarder.address
      );
      expect(await this.l2.sale.getTrustedForwarder()).to.be.equal(
        this.l2.trustedForwarder.address
      );
    });
    it('signer', async function () {
      const signerRole = await this.l2.sale.SIGNER_ROLE();
      expect(await this.l2.sale.hasRole(signerRole, this.l2.backendAuthWallet))
        .to.be.true;
    });
    it('seller', async function () {
      const sellerRole = await this.l2.sale.SELLER_ROLE();
      expect(await this.l2.sale.hasRole(sellerRole, this.l2.sandboxAccount)).to
        .be.true;
    });
  });

  describe('buy, withdraw to L1 and back to L2', function () {
    before(async function () {
      const {l1Net, l2Net, l1, l2, buyer} = await deployAvatar();
      this.l1Net = l1Net;
      this.l2Net = l2Net;
      this.l1 = l1;
      this.l2 = l2;
      this.buyer = buyer;
      this.tokenId = BigNumber.from(0x123);
      this.price = toWei(5);
      this.polygonAvatarAsBuyer = await getContractFromDeployment(
        this.l1Net,
        'PolygonAvatar',
        this.buyer
      );
      this.avatarAsBuyer = await getContractFromDeployment(
        this.l1Net,
        'Avatar',
        this.buyer
      );
    });
    it('mint sand', async function () {
      const sandToken = await getContractFromDeployment(
        this.l2Net,
        'PolygonSand'
      );
      await this.l2.childChainManager.callSandDeposit(
        sandToken.address,
        this.buyer,
        defaultAbiCoder.encode(['uint256'], [this.price])
      );
    });
    it('user can buy an avatar', async function () {
      const sandTokenAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonSand',
        this.buyer
      );
      const polygonAvatarSaleAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonAvatarSale',
        this.buyer
      );
      await sandTokenAsBuyer.approve(this.l2.sale.address, this.price);
      const {v, r, s} = await avatarSaleSignature(
        this.l2.sale,
        this.l2.backendAuthWallet,
        this.buyer,
        this.tokenId,
        this.l2.sandboxAccount,
        this.price,
        this.l2.backendAuthEtherWallet.privateKey
      );

      await polygonAvatarSaleAsBuyer.execute(
        v,
        r,
        s,
        this.l2.backendAuthWallet,
        this.buyer,
        this.tokenId,
        this.l2.sandboxAccount,
        this.price
      );

      await expect(this.l1.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
    });
    it('now can withdraw to L1', async function () {
      await expect(this.polygonAvatarAsBuyer.withdraw(this.tokenId))
        .to.emit(this.polygonAvatarAsBuyer, 'Transfer')
        .withArgs(this.buyer, AddressZero, this.tokenId);

      await expect(this.l1.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
      await expect(this.l2.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });
    it('With the emission of the Transfer event, the user will be able to call the predicate exitToken', async function () {
      await this.l1.mintableERC721Predicate[
        'exitTokens(address,address,uint256)'
      ](this.l1.avatar.address, this.buyer, this.tokenId);
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
      await expect(this.l2.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });
    it('now can lock the token in the predicate again', async function () {
      await this.avatarAsBuyer.approve(
        this.l1.mintableERC721Predicate.address,
        this.tokenId
      );
      await expect(
        this.l1.mintableERC721Predicate.lockTokens(
          this.buyer,
          this.avatarAsBuyer.address,
          defaultAbiCoder.encode(['uint256'], [this.tokenId])
        )
      )
        .to.emit(this.avatarAsBuyer, 'Transfer')
        .withArgs(
          this.buyer,
          this.l1.mintableERC721Predicate.address,
          this.tokenId
        );
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l1.mintableERC721Predicate.address
      );
      await expect(this.l2.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });
    it('With the emission of the Transfer event, the polygon manager will call the chain manager on L2', async function () {
      await this.l2.childChainManager.syncDeposit(
        this.l2.avatar.address,
        this.buyer,
        defaultAbiCoder.encode(['uint256'], [this.tokenId])
      );
      // Locked in L1
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l1.mintableERC721Predicate.address
      );
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
    });
    it('Now if we withdraw to L1 instead of minting the predicate will do a transfer', async function () {
      await expect(this.polygonAvatarAsBuyer.withdraw(this.tokenId))
        .to.emit(this.polygonAvatarAsBuyer, 'Transfer')
        .withArgs(this.buyer, AddressZero, this.tokenId);

      // Locked in L1
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l1.mintableERC721Predicate.address
      );
      await expect(this.l2.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );

      await this.l1.mintableERC721Predicate[
        'exitTokens(address,address,uint256)'
      ](this.l1.avatar.address, this.buyer, this.tokenId);

      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
      await expect(this.l2.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
    });
  });
});

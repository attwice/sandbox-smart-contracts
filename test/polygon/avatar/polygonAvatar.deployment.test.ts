import hre, {ethers, getUnnamedAccounts} from 'hardhat';
import {expect} from 'chai';
import {toWei, withSnapshot} from '../../utils';
import {BigNumber} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import {getContractFromDeployment} from '../../../utils/companionNetwork';
import {defaultAbiCoder} from 'ethers/lib/utils';
import {avatarSaleSignature} from '../../common/signatures';

async function layer(l: string) {
  const vals = hre.companionNetworks[l];
  const {
    deployer,
    sandAdmin,
    sandboxAccount,
    sandBeneficiary,
  } = await vals.getNamedAccounts();
  // TODO: This makes sense ?
  const backendAuthWallet = new ethers.Wallet(
    '0x4242424242424242424242424242424242424242424242424242424242424242'
  );
  return {
    deployer,
    sandAdmin,
    sandboxAccount,
    sandBeneficiary,
    backendAuthWallet,
    trustedForwarder: await vals.deployments.get('TRUSTED_FORWARDER'),
    mintableERC721Predicate: await getContractFromDeployment(
      vals,
      'MINTABLE_ERC721_PREDICATE',
      deployer
    ),
    childChainManager: await getContractFromDeployment(
      vals,
      'CHILD_CHAIN_MANAGER',
      deployer
    ),
  };
}

const deployAvatar = withSnapshot(
  ['Avatar', 'PolygonAvatar', 'PolygonAvatarSale', 'MINTABLE_ERC721_PREDICATE'],
  async () => {
    const [buyer] = await getUnnamedAccounts();
    const l1 = await layer('l1');
    const l2 = await layer('l2');
    return {
      buyer,
      l1: {...l1, avatar: await ethers.getContract('Avatar', l1.deployer)},
      l2: {
        ...l2,
        avatar: await ethers.getContract('PolygonAvatar', l2.deployer),
        sale: await ethers.getContract('PolygonAvatarSale', l2.deployer),
      },
    };
  }
);
describe('PolygonAvatar - Avatar deployment test', function () {
  describe('roles', function () {
    before(async function () {
      const {l1, l2, buyer} = await deployAvatar();
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
      // Signer
      const signerRole = await this.l2.sale.SIGNER_ROLE();
      expect(
        await this.l2.sale.hasRole(
          signerRole,
          this.l2.backendAuthWallet.address
        )
      ).to.be.true;
    });
    it('seller', async function () {
      const sellerRole = await this.l2.sale.SELLER_ROLE();
      expect(await this.l2.sale.hasRole(sellerRole, this.l2.sandboxAccount)).to
        .be.true;
    });
  });

  describe('buy, withdraw to L1 and back to L2', function () {
    before(async function () {
      const {l1, l2, buyer} = await deployAvatar();
      this.l1 = l1;
      this.l2 = l2;
      this.buyer = buyer;
      this.tokenId = BigNumber.from(0x123);
      this.price = toWei(5);
      this.polygonAvatarAsBuyer = await ethers.getContract(
        'PolygonAvatar',
        this.buyer
      );
      this.avatarAsBuyer = await ethers.getContract('Avatar', this.buyer);
    });
    it('mint sand', async function () {
      const sandToken = await ethers.getContract('PolygonSand');
      await this.l2.childChainManager.callSandDeposit(
        sandToken.address,
        this.buyer,
        defaultAbiCoder.encode(['uint256'], [this.price])
      );
    });
    it('user can buy an avatar', async function () {
      const sandTokenAsBuyer = await ethers.getContract(
        'PolygonSand',
        this.buyer
      );
      const polygonAvatarSaleAsBuyer = await ethers.getContract(
        'PolygonAvatarSale',
        this.l2.buyer
      );
      await sandTokenAsBuyer.approve(this.l2.sale.address, this.price);
      const {v, r, s} = await avatarSaleSignature(
        this.l2.sale,
        this.l2.backendAuthWallet.address,
        this.buyer,
        this.tokenId,
        this.l2.sandboxAccount,
        this.price,
        this.l2.backendAuthWallet.privateKey
      );

      await polygonAvatarSaleAsBuyer.execute(
        v,
        r,
        s,
        this.l2.backendAuthWallet.address,
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
  });
});

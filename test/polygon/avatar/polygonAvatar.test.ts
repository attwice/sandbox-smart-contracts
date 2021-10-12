import {ethers} from 'hardhat';
import {expect} from 'chai';
import {setupAvatarTest} from './fixtures';
import {BigNumber} from 'ethers';
import {defaultAbiCoder, solidityPack} from 'ethers/lib/utils';

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
        // Mint, withdraw
        await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
        await fixtures.polygonAvatarAsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await avatarAsChildChainManager.deposit(fixtures.other, depositData);
        expect(await fixtures.polygonAvatar.exists(tokenId)).to.be.true;
        expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
          fixtures.other
        );
      });
      it('other user should fail to mint', async function () {
        const tokenId = BigNumber.from('0xdada2');
        const fixtures = await setupAvatarTest();
        // Mint, withdraw
        await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
        await fixtures.polygonAvatarAsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await expect(
          fixtures.polygonAvatar.deposit(fixtures.other, depositData)
        ).to.revertedWith('!CHILD_MANAGER_ROLE');
      });
      it('users can burn tokens', async function () {
        const tokenId = BigNumber.from('0xdada3');
        const fixtures = await setupAvatarTest();
        const avatarAsChildChainManager = await ethers.getContract(
          'PolygonAvatar',
          fixtures.childChainManager
        );
        // Mint, withdraw
        await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
        await fixtures.polygonAvatarAsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await avatarAsChildChainManager.deposit(fixtures.other, depositData);
        expect(await fixtures.polygonAvatar.exists(tokenId)).to.be.true;
        expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
          fixtures.other
        );

        const avatarAsOther = await ethers.getContract(
          'PolygonAvatar',
          fixtures.other
        );
        await avatarAsOther.withdraw(tokenId);
        expect(await fixtures.polygonAvatar.exists(tokenId)).to.be.false;
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
        // Mint, withdraw
        await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
        await fixtures.polygonAvatarAsOther.withdraw(tokenId);
        // Now we can deposit again in L2
        const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
        await avatarAsChildChainManager.deposit(fixtures.other, depositData);
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
  it('mint, withdraw to L1, deposit in L2 again', async function () {
    const cant = 3;
    const baseId = BigNumber.from('0xdada1');
    const fixtures = await setupAvatarTest();
    // Mint, withdraw
    const tokenIds = [];
    for (let i = 0; i < cant; i++) {
      const tokenId = baseId.add(i);
      // Mint
      await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
      tokenIds.push(tokenId);
    }
    // Withdraw
    await expect(fixtures.polygonAvatarAsOther.withdrawBatch(tokenIds))
      .to.emit(fixtures.polygonAvatarAsOther, 'WithdrawnBatch')
      .withArgs(fixtures.other, tokenIds);

    // Now we can deposit again in L2
    const avatarAsChildChainManager = await ethers.getContract(
      'PolygonAvatar',
      fixtures.childChainManager
    );
    const depositData = defaultAbiCoder.encode(['uint256[]'], [tokenIds]);
    await expect(avatarAsChildChainManager.deposit(fixtures.other, depositData))
      .to.emit(avatarAsChildChainManager, 'DepositBatch')
      .withArgs(fixtures.other, tokenIds);
    for (let i = 0; i < cant; i++) {
      const tokenId = tokenIds[i];
      expect(await fixtures.polygonAvatar.exists(tokenId)).to.be.true;
      expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
        fixtures.other
      );
      expect(await fixtures.polygonAvatar.tokenURI(tokenId)).to.be.equal(
        fixtures.baseUri + tokenId.toString()
      );
    }
  });
  describe('metaTx', function () {
    it('withdraw', async function () {
      const tokenId = BigNumber.from('0xdada21');
      const fixtures = await setupAvatarTest();
      // Mint
      await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
      expect(await fixtures.polygonAvatar.exists(tokenId)).to.be.true;
      expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
        fixtures.other
      );

      // Withdraw
      const withdrawTxData = await fixtures.polygonAvatarAsTrustedForwarder.populateTransaction.withdraw(
        tokenId
      );
      // The msg.sender goes at the end.
      withdrawTxData.data = solidityPack(
        ['bytes', 'address'],
        [withdrawTxData.data, fixtures.other]
      );
      await fixtures.polygonAvatarAsTrustedForwarder.signer.sendTransaction(
        withdrawTxData
      );
      expect(await fixtures.polygonAvatar.withdrawnTokens(tokenId)).to.be.true;
      expect(await fixtures.polygonAvatar.exists(tokenId)).to.be.false;
      await expect(fixtures.polygonAvatar.ownerOf(tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );

      // Child chain manager now we can deposit again in L2 (using metatx is possible but strange!!!)
      const depositData = defaultAbiCoder.encode(['uint256'], [tokenId]);
      const depositTxData = await fixtures.polygonAvatarAsTrustedForwarder.populateTransaction.deposit(
        fixtures.other,
        depositData
      );
      // The msg.sender goes at the end.
      depositTxData.data = solidityPack(
        ['bytes', 'address'],
        [depositTxData.data, fixtures.childChainManager]
      );
      await fixtures.polygonAvatarAsTrustedForwarder.signer.sendTransaction(
        depositTxData
      );
      expect(await fixtures.polygonAvatar.withdrawnTokens(tokenId)).to.be.false;
      expect(await fixtures.polygonAvatar.exists(tokenId)).to.be.true;
      expect(await fixtures.polygonAvatar.ownerOf(tokenId)).to.be.equal(
        fixtures.other
      );
    });
    it('batch withdraw', async function () {
      const cant = 3;
      const baseId = BigNumber.from('0xdada20');
      const fixtures = await setupAvatarTest();
      // Mint, withdraw
      const tokenIds = [];
      for (let i = 0; i < cant; i++) {
        const tokenId = baseId.add(i);
        // Mint
        await fixtures.polygonAvatarAsMinter.mint(fixtures.other, tokenId);
        tokenIds.push(tokenId);
      }
      // Withdraw
      const withdrawTxData = await fixtures.polygonAvatarAsTrustedForwarder.populateTransaction.withdrawBatch(
        tokenIds
      );
      // The msg.sender goes at the end.
      withdrawTxData.data = solidityPack(
        ['bytes', 'address'],
        [withdrawTxData.data, fixtures.other]
      );
      await expect(
        fixtures.polygonAvatarAsTrustedForwarder.signer.sendTransaction(
          withdrawTxData
        )
      )
        .to.emit(fixtures.polygonAvatarAsOther, 'WithdrawnBatch')
        .withArgs(fixtures.other, tokenIds);
    });
  });
});

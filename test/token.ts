import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Token", function () {
  
  async function deployOneTokenContract() {
    
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, user, otherUser] = await ethers.getSigners();

    const Token = await ethers.deployContract("Token");
    //const Token = await Token.deploy();

    // await Token.deployed();
    
    return { Token, owner, otherAccount, user , otherUser};
  }

  describe("Deployment", function (){
    it("Should set the correct initial total supply", async function(){
      const {Token} = await loadFixture(deployOneTokenContract);

      const totalSupply = await Token.totalSupply();

     await expect(totalSupply).to.equal(ethers.parseEther("900000000000000000"));
    })

    it("Should set the correct token name and symbol", async function(){
      const{Token} = await loadFixture(deployOneTokenContract);

      const tokenname = await Token.name();
      const tokensymbol = await Token.symbol();

      expect(tokenname, tokensymbol).to.equal("BardAI", "BAI");
    })

    it("Should have minted token successfully to the owner", async function(){
      const{Token, owner} = await loadFixture(deployOneTokenContract);

      await expect(await Token.balanceOf(owner.address)).to.equal(await Token.totalSupply());
    })
  })

  describe("Token Transfer", function (){
    it('Should transfer tokens correctly', async () => {
      const {Token, owner, user} = await loadFixture(deployOneTokenContract);
    
      await Token.connect(owner).transfer(user.address, ethers.parseEther("10"));
      
      const userBal = await Token.balanceOf(user.address);

      expect(userBal).to.equal(ethers.parseEther("10"));
      
    });

    it("Should revert if account has Insufficient token balance", async function(){
      const {Token, otherAccount, otherUser} = await loadFixture(deployOneTokenContract);
      
      await expect (Token.connect(otherAccount).transfer(otherUser.address, ethers.parseEther("5"))).to.be.revertedWithCustomError(Token, "InsufficientToken");
    })

    it('Should prevent transfers to the zero address', async () => {
      const {Token, owner} = await loadFixture(deployOneTokenContract);
      
      await expect(Token.connect(owner).transfer('0x0000000000000000000000000000000000000000', 100)).to.be.revertedWithCustomError(Token, "AddressZero");
    });
  })


  describe("Token Approvals", function(){
    it("Should revert if approval is not granted to an account", async function(){
      const {Token, otherAccount, owner} = await loadFixture(deployOneTokenContract);

      await expect(Token.connect(otherAccount).transferFrom(owner.address, otherAccount.address, ethers.parseEther("1") )).to.be.revertedWithCustomError(Token, "InsufficientAllowance");
    })

    it("Should revert if token holder's account balance is low", async function(){
      const {Token, otherAccount, owner, user} = await loadFixture(deployOneTokenContract);

      const Approval = await Token.connect(owner).approve(otherAccount.address, ethers.parseEther("50"));
      await Approval.wait();

      const TransferOut = await Token.connect(otherAccount).transferFrom(owner.address, otherAccount.address, ethers.parseEther("10"));
      await TransferOut.wait();
  
      const approveAnotheracc = await Token.connect(otherAccount).transfer(user.address, ethers.parseEther("5"));
      await approveAnotheracc.wait();

      //owner wants to decrease otherAccount's token allowance since he hasn't transfered all the token out
      
      await expect(Token.connect(owner).decreaseAllowance(otherAccount.address, ethers.parseEther("45"))).to.be.revertedWithCustomError(Token, "InsufficientToken");

    })

    it("Should revert if account has insufficient allowance", async function(){
      const {Token, otherAccount, owner} = await loadFixture(deployOneTokenContract);
      
      const Approval = await Token.connect(owner).approve(otherAccount.address, ethers.parseEther("5"));
      await Approval.wait();
      
      console.log("other", Approval);

      await expect(Token.connect(otherAccount).transferFrom(owner.address, otherAccount.address, ethers.parseEther("7"))).to.be.revertedWithCustomError(Token, "InsufficientAllowance");
    })

  
  })


  describe ("Burning Token", function(){
    it("Should revert if caller does not have access to burn", async function(){
       const {Token, otherAccount, owner} = await loadFixture(deployOneTokenContract);

       const tx = await Token.connect(owner).transfer(otherAccount.address, ethers.parseEther("200"));
       await tx.wait();

       const burnAmount = ethers.parseEther("100");

       await expect(Token.connect(otherAccount).burn(otherAccount.address, burnAmount)).to.be.revertedWithCustomError(Token, "OnlyMinter");

    })

    it("Should burn token successfully", async function(){
      const {Token, otherAccount, owner} = await loadFixture(deployOneTokenContract);
      
      const burnAmount = ethers.parseEther("100000000000000000")

      const tx = await Token.connect(owner).burn(owner.address, burnAmount);
      await tx.wait();

      const bal = await Token.balanceOf(owner.address);
      await expect (bal).to.equal(ethers.parseEther("800000000000000000"))
    })

  })


  describe ("Minting Token", function(){
    it("Should revert if caller doesnt have a Minter Role", async function(){
      const {Token, otherAccount, owner} = await loadFixture(deployOneTokenContract);
  
      const tx = await Token.connect(owner).transfer(otherAccount.address, ethers.parseEther("200"));
       await tx.wait();

       const minTokenount = ethers.parseEther("2000000");

       await expect(Token.connect(otherAccount).mint(otherAccount.address, minTokenount)).to.be.revertedWithCustomError(Token, "OnlyMinter");
      
    });

    it("Should mint token successfully", async function(){
      const {Token, owner} = await loadFixture(deployOneTokenContract);
      
      const minTokenount = ethers.parseEther("100000000000000000")

      const tx = await Token.connect(owner).mint(owner.address, minTokenount);
      await tx.wait();

      const total = await Token.totalSupply();
      await expect (total).to.equal(ethers.parseEther("1000000000000000000"))
    })

    it("Should revert on minting if minting is finished", async function(){
      const {Token, owner} = await loadFixture(deployOneTokenContract);
      
      const minTokenount = ethers.parseEther("100000000000000000");

      const tx = await Token.connect(owner).finishMinting();
      await tx.wait();

      await expect(Token.connect(owner).mint(owner.address, minTokenount)).to.be.revertedWithCustomError(Token, "MintingHasFinished");

    })
    

  })

  
});
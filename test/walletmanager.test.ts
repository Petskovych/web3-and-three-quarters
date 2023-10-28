import { HDNodeWallet, TransactionRequest, ethers } from "ethers";
import { Web3AndThreeQuarters } from "../src/index";
import { errorMsg } from "../src/utils/constants";

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

describe("Walletmanager", () => {
  const encryptionPassphrase = "HelloWorldFrom_me_1987@";

  let wallet: HDNodeWallet;
  const web3AndThreeQuarters = new Web3AndThreeQuarters();

  beforeAll(async () => {
    wallet = await new Web3AndThreeQuarters().generateWallet();
    // console.log("In test wallet: ", wallet);
  });

  describe("generateWallet", () => {
    it("should generate correct address", async () => {
      expect(wallet.address).satisfy(addr => addr.startsWith('0x'), "wrong address prefix");
      expect(wallet.address).to.have.lengthOf(42, "wrong address length");
    });

    it("should generate correct publicKey", async () => {
      expect(wallet.publicKey).satisfy(addr => addr.startsWith('0x'), "wrong publicKey prefix");
      expect(wallet.publicKey).to.have.lengthOf(68, "wrong publicKey length");
    });

    it("should generate correct mnemonic", async () => {
      expect(wallet.mnemonic, "wallet.mnemonic is null").not.to.be.null;
      expect((wallet.mnemonic!.phrase as string).split(' ').length).to.equal(12, "wrong length");
    });
  });

  describe("encryptWallet", () => {
    it("should fail if encryption passphrase is empty", async () => {
      await expect(web3AndThreeQuarters.encryptWallet(wallet, "")).to.be.rejectedWith(errorMsg.invalidPassphraseDuringWalletGeneration);
    });

    it("should fail if encryption passphrase is < 15 chars", async () => {
      await expect(web3AndThreeQuarters.encryptWallet(wallet, "HelloWorld1@")).to.be.rejectedWith(errorMsg.invalidPassphraseDuringWalletGeneration);
    });
    
    it("should fail if encryption passphrase doesn't contain at least 1 uppercase letter", async () => {
      await expect(web3AndThreeQuarters.encryptWallet(wallet, "hello_world_from_me_1@")).to.be.rejectedWith(errorMsg.invalidPassphraseDuringWalletGeneration);
    });
    
    it("should fail if encryption passphrase doesn't contain at least 1 lowercase letters", async () => {
      await expect(web3AndThreeQuarters.encryptWallet(wallet, "HELLOWORLDF1ROMME1")).to.be.rejectedWith(errorMsg.invalidPassphraseDuringWalletGeneration);
    });
    
    it("should fail if encryption passphrase doesn't contain at least 1 lspecial character", async () => {
      await expect(web3AndThreeQuarters.encryptWallet(wallet, "HELLOWORLDF1ROMMe1")).to.be.rejectedWith(errorMsg.invalidPassphraseDuringWalletGeneration);
    });
    
    it("should succeed by returning a string", async () => {
      const res = await web3AndThreeQuarters.encryptWallet(wallet, encryptionPassphrase);
      expect(res).to.be.a('string');
      expect(res).to.not.be.empty;
    });
  });
    describe("Web3AndThreeQuarters", () => {
        let web3Instance: Web3AndThreeQuarters;

        beforeAll(() => {
            web3Instance = new Web3AndThreeQuarters();
        });

        it("should create an instance of Web3AndThreeQuarters", () => {
            expect(web3Instance).to.be.an.instanceOf(Web3AndThreeQuarters);
        });

        it("should have a valid provider", async () => {
            const provider = web3Instance.getProvider();
            expect(provider).to.exist;
            expect(provider).to.be.an.instanceOf(ethers.providers.JsonRpcProvider);
        });

        it("should return the correct network", async () => {
            const network = await web3Instance.getNetwork();
            expect(network).to.exist;
            expect(network.chainId).to.equal(1);
        });
    });

  describe("decryptWallet", () => {
    let walletEncrypted: string;

    beforeAll(async () => {
      walletEncrypted = await web3AndThreeQuarters.encryptWallet(wallet, encryptionPassphrase);
    });

    it("should fail if encrypted wallet string is empty", async () => {
      await expect(web3AndThreeQuarters.decryptWallet("", encryptionPassphrase)).to.be.rejectedWith(errorMsg.emptyEncryptedWallet);
    });

    it("should fail if passphrase used for encryption is empty", async () => {
      await expect(web3AndThreeQuarters.decryptWallet(walletEncrypted, "")).to.be.rejectedWith(errorMsg.emptyPassphrase);
    });

    it("should fail if encrypted wallet is invalid, if wrong letters", async () => {
      const corruptedWalletEncrypted = walletEncrypted.replace("a", "_").replace("v", "!").replace("e", "@").replace("i", "#").replace("s", "$");

      await expect(web3AndThreeQuarters.decryptWallet(corruptedWalletEncrypted, encryptionPassphrase)).to.be.rejectedWith(errorMsg.failedToDecrypt);
    });

    it("should fail if encrypted wallet is invalid, if corrupted \"mnemonic...\" field", async () => {
      const corruptedWalletEncrypted = walletEncrypted.replace("mnemonic", "");

      await expect(web3AndThreeQuarters.decryptWallet(corruptedWalletEncrypted, encryptionPassphrase)).to.be.rejectedWith(errorMsg.failedToDecrypt);
    });

    it("should fail if passphrase used for encryption is invalid", async () => {
      const wrongPassphrase = encryptionPassphrase + "Wrong";

      await expect(web3AndThreeQuarters.decryptWallet(walletEncrypted, wrongPassphrase)).to.be.rejectedWith(errorMsg.failedToDecrypt);
    });

    it("should return correct wallet", async () => {
      const walletDecrypted = await web3AndThreeQuarters.decryptWallet(walletEncrypted, encryptionPassphrase);

      expect(walletDecrypted).to.deep.equal(wallet);
    });
  });

  describe("signMessage", () => {
    it("should fail if _message.length == 0", async () => {
      await expect(web3AndThreeQuarters.signMessage(wallet, "")).to.be.rejectedWith(errorMsg.emptyMessageToSign);
    });

    it("should fail if wallet is wrong", async () => {
      const corruptedWallet = {
        provider: null,
        address: '0x96802b8Bfb20D009122631A0DF57F7A61043fA76',
        publicKey: '0x024e0fa0366a9b6028664a90f938e3f181fdb5eb619882a788988cf062b827c6fa'
      };
      await expect(web3AndThreeQuarters.signMessage(corruptedWallet as HDNodeWallet, "Hello World")).to.be.rejectedWith(errorMsg.failedToSignMessage);
    });

    it("should return a signature", async () => {
      const sig = await web3AndThreeQuarters.signMessage(wallet, "Hello World");

      await expect(sig).to.be.a("string");
      await expect(sig).to.have.lengthOf.above(0);
    });

    it("should verify correct signer", async () => {
      const message = "Hello World";
      const signature = await web3AndThreeQuarters.signMessage(wallet, message);
      const signer = await wallet.getAddress();

      const recoveredSigner = await ethers.verifyMessage(message, signature);

      expect(recoveredSigner).to.be.equal(signer);
    });
  });

  describe("getMessageSigner", () => {
    const message = "Hello World";
    let signature: string;
    let signer: string;

    beforeAll(async () => {
      signature = await web3AndThreeQuarters.signMessage(wallet, message);
      signer = await wallet.getAddress();
    });

    
    it("should fail if _message.length == 0", async () => {
      await expect(web3AndThreeQuarters.getMessageSigner("", signature)).to.be.rejectedWith(errorMsg.emptyMessageInGetMessageSigner);
    });

    it("should fail if _message.length == 0", async () => {
      await expect(web3AndThreeQuarters.getMessageSigner(message, "")).to.be.rejectedWith(errorMsg.emptySignatureInGetMessageSigner);
    });

    it("should return correct signer", async () => {
      const recoveredSigner = await web3AndThreeQuarters.getMessageSigner(message, signature);

      expect(recoveredSigner).to.be.equal(signer);
    });
  });

  describe("isMessageSigner", () => {
    const message = "Hello World";
    let signature: string;
    let signer: string;

    beforeAll(async () => {
      signature = await web3AndThreeQuarters.signMessage(wallet, message);
      signer = await wallet.getAddress();
    });

    
    it("should fail if _message.length == 0", async () => {
      await expect(web3AndThreeQuarters.isMessageSigner("", signature, signer)).to.be.rejectedWith(errorMsg.emptyMessageInGetMessageSigner);
    });

    it("should fail if _message.length == 0", async () => {
      await expect(web3AndThreeQuarters.isMessageSigner(message, "", signer)).to.be.rejectedWith(errorMsg.emptySignatureInGetMessageSigner);
    });

    it("should fail if _signer.length == 0", async () => {
      await expect(web3AndThreeQuarters.isMessageSigner(message, signature, "")).to.be.rejectedWith(errorMsg.emptySignerInIsMessageSigner);
    });

    it("should return false for the provided incorrect signer", async () => {
      const res = await web3AndThreeQuarters.isMessageSigner(message, signature, signer + "1");

      expect(res).to.be.false;
    });

    it("should return true for correct signer", async () => {
      const res = await web3AndThreeQuarters.isMessageSigner(message, signature, signer);

      expect(res).to.be.true;
    });
  });

  describe("signTransaction", () => {
    let tx: TransactionRequest;

    beforeAll(async () => {
      tx = {
        to: "0xa238b6008Bc2FBd9E386A5d4784511980cE504Cd",
        value: ethers.parseEther("0.001"),
        gasLimit: "21000",
        maxPriorityFeePerGas: ethers.parseUnits("5", "gwei"),
        maxFeePerGas: ethers.parseUnits("20", "gwei"),
        nonce: 0,
        type: 2,
        chainId: 5, // Corresponds to ETH_GOERLI
      };
    });

    it("should sign the transaction", async () => {
      const res = await web3AndThreeQuarters.signTransaction(wallet, tx);
      expect(res).satisfy(addr => addr.startsWith('0x'), "wrong signature prefix");
      expect(res).to.have.lengthOf.above(2, "wrong length");
    });
  });

});
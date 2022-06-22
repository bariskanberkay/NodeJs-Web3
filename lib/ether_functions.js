const fs = require("fs");
const Web3 = require("web3");
const EthereumTx = require('ethereumjs-tx').Transaction;
const axios = require('axios');
const BigNumber = require('big-number');
const { resolve } = require("path");


const abiArray = JSON.parse(fs.readFileSync('./lib/abi.json', 'utf-8'));



const providerAddressTestnet = process.env.NPM_PROVIDER_TESTNET
const providerAddressMainnet = process.env.NPM_PROVIDER_ADDRESS_MAINNET


class EtherFunctions {

    constructor(selectedNetwork) {
        this.selected_network = selectedNetwork;
        this.gas = 21000;
        this.nonce = 1;
        this.abiArray = JSON.parse(fs.readFileSync('./lib/abi.json', 'utf-8'));
        this.web3 = new Web3(new Web3.providers.HttpProvider(selectedNetwork === 'testnet' ? providerAddressTestnet : providerAddressMainnet));
    }

    createWallet() {
        return new Promise((resolve, reject) => {
            resolve(this.web3.eth.accounts.create());
        });
    }

    validateAddress(address) {
        return this.web3.utils.isAddress(address);
    }

    getTokenBalance(walletAddress, contractAddress) {

        return new Promise((resolve, reject) => {
            new this.web3.eth.Contract(abiArray, contractAddress).methods.balanceOf(this.addressCorrect(walletAddress)).call().then((result) => {
                resolve(new BigNumber(result));
            }).catch((error) => {
                reject(error.message);
            });
        });
    }

    getEthBalance(address) {
        return new Promise((resolve, reject) => {
            this.web3.eth.getBalance(this.addressCorrect(address)).then((result) => {
                resolve(result);
            }).catch((error) => {
                resolve(error);
            })
        });
    }

    async getCurrentGasPrices() {
        let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
        let prices = {
            low: response.data.safeLow / 10,
            medium: response.data.average / 10,
            high: response.data.fast / 10
        };
        return prices;
    }

    addressCorrect(address) {
        if (typeof address == "string") {
            address = address.replace(/ /g, '');
            address = address.toLowerCase();
            if (address.indexOf("0x") === 0) {
                return address;
            }
            else {
                return "0x" + address;
            }
        }
    }

    calculateFee() {

        return new Promise((resolve, reject) => {
            this.getCurrentGasPrices().then((gasPrices) => {
                let gas = new BigNumber(this.gas);
                let gasPrice = gasPrices.low * 1000000000;

                let cost = gas.multiply(gasPrice);


                resolve(cost);


            }).catch((error) => {
                resolve(error);
            })
        });
    }

    getGasPrice() {
        return new Promise((resolve, reject) => {
            this.getCurrentGasPrices().then((gasPrices) => {

                let gasPrice = gasPrices.low * 1000000000;
                resolve(gasPrice);

            }).catch((error) => {
                resolve(error);
            })
        });
    }

     strtodec(amount, dec){
        var i = 0;
        if (amount.toString().indexOf('.') != -1) {
            i = amount.toString().length - (amount.toString().indexOf('.') + 1);
        }
       let stringf = amount.toString().split('.').join('');
        if (dec<i){
            console.warn("strtodec: amount was truncated")
            stringf = stringf.substring(0,stringf.length - (i-dec));
        } else {
            stringf = stringf + "0".repeat(dec-i);
        }
        return stringf;
     }
    
    
    decimalToString(decimals) { 
        if (decimals == 6) { 
            return 'mwei';
        }
        if (decimals == 18) { 
            return 'ether';
        }

    }


    etherTransfer(senderPrivateKey, receiverAddress, amountToSend) {

        return new Promise(async (resolve, reject) => {

            let senderAddressResolver = this.web3.eth.accounts.privateKeyToAccount(this.addressCorrect(senderPrivateKey));



            let getSenderNonce = await this.web3.eth.getTransactionCount(senderAddressResolver.address, 'pending');



            if (senderAddressResolver.address == receiverAddress) {
                return reject("Sender Same As Receiver");
            }

            if (!this.validateAddress(receiverAddress)) {
                return reject("Receiver Address Not Valid !");
            }


            let etherBalance = await this.getEthBalance(senderAddressResolver.address, async (err, balance) => {

                if (err) {
                    return reject(err);
                }

                resolve(balance);

            });

            if (etherBalance == 0) {
                return reject('Wallet Ether Amount = 0');
            }



            let calculatedFee = await this.calculateFee(async (err, balance) => {
                if (err) {
                    return reject('Error Getting Balances.');
                }
                resolve(balance);
            });




            let amount = new BigNumber(this.web3.utils.toWei(amountToSend.toString(), 'ether'));

            if (amountToSend == -1) {
                let totalBalance = new BigNumber(etherBalance);
                amount = totalBalance.minus(calculatedFee);
            }


            if (calculatedFee.gte(etherBalance)) {
                return reject('Wallet amount not enough for Tx Fee !');
            }


            if (amount.gte(etherBalance) && amountToSend != -1) {
                return reject('Balance Not Enough');
            }





            let gasPrice = await this.getGasPrice();



            let transactionDetails = {
                "to": receiverAddress,
                "value": this.web3.utils.toHex(amount.toString()),
                "gas": this.gas,
                "gasPrice": this.web3.utils.toHex(gasPrice),
                "nonce": getSenderNonce,
                "chainId": 3
            };





            const transaction = new EthereumTx(transactionDetails, { chain: 'ropsten' });
            let privateKey = this.addressCorrect(senderPrivateKey).split('0x');
            let privKey = Buffer.from(privateKey[1], 'hex');
            transaction.sign(privKey);

            const serializedTransaction = transaction.serialize();

            this.web3.eth.sendSignedTransaction('0x' + serializedTransaction.toString('hex'), (err, id) => {
                if (err) {
                    return reject(err.message);
                }
                const url = `https://ropsten.etherscan.io/tx/${id}`;
                return resolve({
                    from: senderAddressResolver.address,
                    to: receiverAddress,
                    value: this.web3.utils.fromWei(amount.toString(), "ether"),
                    gas:this.gas,
                    gas_price:this.web3.utils.fromWei(gasPrice.toString(), "gwei"),
                    nonce:getSenderNonce,
                    tx_id: id,
                    explore_url: url
                });
            });






        });


    }


    tokenTransfer(contractAddress, senderPrivateKey, receiverAddress, amountToSend) {
        return new Promise(async (resolve, reject) => {


            if (!this.validateAddress(contractAddress)) {
                return resolve("Contract Address Not Valid !");
            }


            let contractWork = new this.web3.eth.Contract(abiArray, contractAddress);

            let senderAddressResolver = this.web3.eth.accounts.privateKeyToAccount(this.addressCorrect(senderPrivateKey));

            let getSenderNonce = await this.web3.eth.getTransactionCount(senderAddressResolver.address, 'pending');


            if (senderAddressResolver.address == receiverAddress) {
                return resolve("Sender Same As Receiver");
            }

            if (!this.validateAddress(receiverAddress)) {
                return resolve("Receiver Address Not Valid !");
            }

            let etherBalance = await this.getEthBalance(senderAddressResolver.address, async (err, balance) => {

                if (err) {
                    return resolve(err);
                }

                resolve(balance);

            });

            if (etherBalance == 0) {
                return resolve('Wallet Ether Amount = 0');
            }

            let calculatedFee = await this.calculateFee(async (err, balance) => {
                if (err) {
                    return resolve('Error Getting Balances.');
                }
                resolve(balance);
            });


            if (calculatedFee.gte(etherBalance)) {
                return resolve('Wallet amount not enough for Tx Fee !');
            }


            const tokenSymbol = await contractWork.methods.symbol().call();
            const tokendecimals = await contractWork.methods.decimals().call();
            const tokenname = await contractWork.methods.name().call();




            let sendAmount = new BigNumber(this.web3.utils.toWei(amountToSend.toString(), this.decimalToString(tokendecimals)));


            let tokenBalance = await this.getTokenBalance(senderAddressResolver.address, contractAddress);


            if (amountToSend == -1) { 
                sendAmount = tokenBalance.toString();
            }
        

            if (tokenBalance.lt(sendAmount) && amountToSend != -1) { 
                return resolve('Balance Not Enough');
            }

            if (tokenBalance == 0 && amountToSend == -1) { 
                return resolve('Balance Not Enough');
            }

            let gasPrice = await this.getGasPrice();

            let data = contractWork.methods.transfer(receiverAddress.toLowerCase(), this.web3.utils.toHex(sendAmount.toString())).encodeABI();

            let transactionDetails = {
                "to": contractAddress,
                "from": senderAddressResolver.address,
                "value": 0,
                "gasLimit": this.web3.utils.toHex(85000),
                "gasPrice": this.web3.utils.toHex(gasPrice),
                "nonce": getSenderNonce,
                "chainId": 3,
                "data":data
            };

            const transaction = new EthereumTx(transactionDetails, { chain: 'ropsten' });
            let privateKey = this.addressCorrect(senderPrivateKey).split('0x');
            let privKey = Buffer.from(privateKey[1], 'hex');
            transaction.sign(privKey);

            const serializedTransaction = transaction.serialize();

            this.web3.eth.sendSignedTransaction('0x' + serializedTransaction.toString('hex'), (err, id) => {
                if (err) {
                    return resolve(err.message);
                }
                const url = `https://ropsten.etherscan.io/tx/${id}`;
                return resolve({
                    name: tokenname,
                    symbol: tokenSymbol,
                    decimals: tokendecimals,
                    balance:this.web3.utils.fromWei(tokenBalance.toString(),this.decimalToString(tokendecimals)),
                    from: senderAddressResolver.address,
                    to: receiverAddress,
                    value:this.web3.utils.fromWei(sendAmount.toString(),this.decimalToString(tokendecimals)),
                    tx_id: id,
                    explore_url: url
                });
            });


            /*
            resolve({
                name: tokenname,
                symbol: tokenSymbol,
                decimals: tokendecimals,
                balance:this.web3.utils.fromWei(tokenBalance.toString(), "ether"),
            });*/


        });
    }


}

exports.EtherFunctions = EtherFunctions;
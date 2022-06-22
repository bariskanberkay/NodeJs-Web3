const express = require('express');
const router = express.Router();

const checkApiKey = require('../middlewares/check_api_key');

const ethFuncs = require('../ether_functions');

let ethFunctions = new ethFuncs.EtherFunctions('testnet');

router.get('/', checkApiKey, (req, res) => {
  res.send('hello world')
});


router.get('/create-wallet', checkApiKey, async (req, res) => {


  try {

    let result = await ethFunctions.createWallet();

    return res.status(200).json({
      status: true,
      message: "Wallet Created",
      data: result

    });

  } catch (e) {
    return res.status(200).json({
      status: false,
      message: e,
    });
  }


});


router.get('/get-wallet-balance', checkApiKey, async (req, res) => {

  let publicKey = req.body.public_key;
  let contractAddress = req.body.contract_address;


  let isToken = false;


  if (typeof contractAddress !== 'undefined' && contractAddress !== null){
    isToken = true;
 }
  
 

  try {

    let result = isToken ? await ethFunctions.getTokenBalance(publicKey, contractAddress) : await ethFunctions.getEthBalance(publicKey);
    
    let contractWork = new ethFunctions.web3.eth.Contract(ethFunctions.abiArray, contractAddress);


    return res.status(200).json({
      status: true,
      message: "Balance Retrieved",
      data: {
        "balance_raw": result.toString(),
        "balance_corrected": ethFunctions.web3.utils.fromWei(result.toString(), ethFunctions.decimalToString(isToken ? await contractWork.methods.decimals().call() : 18)),
        "name":isToken ? await contractWork.methods.name().call() : "Ethereum",
        "symbol":isToken ? await contractWork.methods.symbol().call() :  "Eth",
        "decimals":isToken ? await contractWork.methods.decimals().call() : "18"
      }

    });

  } catch (e) {
    return res.status(200).json({
      status: false,
      message: e,
    });
  }


});



router.get('/send-batch-eth', checkApiKey, async (req, res) => {

  
  
  
 

  return res.status(200).json({
    status: false,
    message: data,
  });


});



router.get('/send-single-eth', checkApiKey, async (req, res) => {

  let senderPrivateKey = req.body.sender_private_key;
  let receiverPublicKey = req.body.receiver_public_key;
  let amount = req.body.amount;



  try {

    let result = await ethFunctions.etherTransfer(senderPrivateKey, receiverPublicKey, amount);

    return res.status(200).json({
      status: true,
      message: "Transaction Created",
      data: result

    });

  } catch (e) {
    return res.status(200).json({
      status: false,
      message: e,
    });
  }


});





module.exports = router;
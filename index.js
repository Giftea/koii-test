const cron = require("node-cron");
const fs = require("fs");
require("dotenv").config();
const NODE_MODE_SERVICE = "service";
const axios = require("axios");

const { Web3Storage, getFilesFromPath } = require("web3.storage");
const storageClient = new Web3Storage({ token: process.env.WEB3_STORAGE_KEY });

// Function to setup node
async function setup() {
  console.log("Running setup function");
  await namespace.defaultTaskSetup();
}

//  Validate an individual node
async function validateNode(node) {
  console.log("Validating Node", node);
  const cid = node.submission_value;
  const res = await client.get(cid);
  const { data, error } = await namespace.verifySignedData(res, node.submitterPubkey);
  const retrievedJoke = getRandomJoke();

  if (!res.ok || error || data != retrievedJoke) {
    return false;
  } else {
    return true;
  }
}

// Fetch joke
async function getRandomJoke() {
  try {
    const response = await axios.get("https://v2.jokeapi.dev/joke/Any?type=single");
    return response.data;
  } catch (error) {
    console.log("Failed to retrieve joke", error);
  }
}

async function task() {
  const retrievedJoke = await getRandomJoke(); // fetch joke

  const jokeJSON = JSON.stringify(retrievedJoke); // convert to JSON
  const signedJSON = await namespace.signData(jokeJSON); // sign
  fs.writeFileSync("joke.json", signedJSON); // create joke.json file and populate with joke data

  if (storageClient) { // check if storage client for Web3Storage is defined
    // Storing on IPFS through web3 storage
    const file = await getFilesFromPath("./joke.json");  // fetch file
    const cid = await storageClient.put(file); // upload file
    console.log("CID of Uploaded Data: ", cid);
    await namespace.redisSet("cid", cid);
    await namespace.checkSubmissionAndUpdateRound(cid);
  } else {
    console.error("No web3 storage API key provided");
  }
}

// Execute function 
async function execute() {
    let cronArray = [];
    if (process.env.NODE_MODE == NODE_MODE_SERVICE) {
      cronArray.push(
        cron.schedule('*/1 * * * *', task),
      );
    }
    cronArray.push(cron.schedule('*/1 * * * *', () => { namespace.validateAndVoteOnNodes(validateNode) }));
    return cronArray;
  }
  
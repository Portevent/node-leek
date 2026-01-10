import NodeLeekClient from "./node-leek-client/node-leek-client";
import {CredentialsManager} from "./credentials/credentials-manager";

const args = require('minimist')(process.argv.slice(2));
const readonly = (args['readonly'] ?? args['r']) != null;

async function login(client: NodeLeekClient, index: number) {
    // await client.buy("50fights", 20);
}

// Login on each account
new CredentialsManager(args['credentials'] ?? "credentials.json")
    .forEachAccount(login)
    .then(() => console.log("LeekSync closed"));

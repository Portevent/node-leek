import NodeLeekClient from "./node-leek-client/node-leek-client";
import {Credentials, CredentialsManager} from "./credentials/credentials-manager";

const args = require('minimist')(process.argv.slice(2));
const readonly = (args['readonly'] ?? args['r']) != null;

async function leekSync(credentials : Credentials) {
   const client = new NodeLeekClient(credentials.username, credentials.password, readonly);

   await client.login();
}

// LeekSync on each account
new CredentialsManager(args['credentials'] ?? "credentials.json")
    .forEachAccount(leekSync)
    .then(() => console.log("LeekSync closed"));

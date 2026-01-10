import NodeLeekClient from "./node-leek-client/node-leek-client";
import {Credentials, CredentialsManager} from "./credentials/credentials-manager";

const args = require('minimist')(process.argv.slice(2));
const path = args['path'] ?? args['p'] ?? "./leekscripts";
const watch = (args['watch'] ?? args['w']) != null;
const choice = args['choice'] ?? args['c'];
const readonly = (args['readonly'] ?? args['r']) != null;

async function leekSync(client: NodeLeekClient, index: number) {
   await client.syncWith(path, watch, choice);
}

// LeekSync on each account
new CredentialsManager(args['credentials'] ?? "credentials.json")
    .forEachAccount(leekSync, readonly)
    .then(() => console.log("LeekSync closed"));

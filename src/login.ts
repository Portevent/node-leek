import NodeLeekClient from "./node-leek-client/node-leek-client.js";
import {CredentialsManager} from "./credentials/credentials-manager.js";
import fs from "node:fs";
import {FightResult} from "./codegen/model/fightResult.js";

const args = require('minimist')(process.argv.slice(2));
const readonly = (args['readonly'] ?? args['r']) != null;

async function login(client: NodeLeekClient, index: number) {
    // await client.buy("50fights", 20);
}

// Login on each account
new CredentialsManager(args['credentials'] ?? "credentials.json")
    .forEachAccount(login, readonly)
    .then(() => console.log("LeekSync closed"));

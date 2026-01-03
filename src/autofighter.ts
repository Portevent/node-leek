import NodeLeekClient from "./node-leek-client/node-leek-client";
import {Credentials, CredentialsManager} from "./credentials/credentials-manager";

const args = require('minimist')(process.argv.slice(2));
const readonly = (args['readonly'] ?? args['r']) != null;

async function sleep(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function autoFighter(credentials: Credentials) {
    const client = new NodeLeekClient(credentials.username, credentials.password, readonly);

    await client.login();

    const leekId: number = Number(Object.keys(client.farmer.leeks)[0]);
    console.log("Doing " + client.farmer.fights + " fights");

    for (let i = 0; i < client.farmer.fights; i++) {
        console.log("Starting fight " + i);
        await sleep(1000);
        await client.startRandomSoloFight(leekId);
    }
}

// LeekSync on each account
new CredentialsManager(args['credentials'] ?? "credentials.json")
    .forEachAccount(autoFighter)
    .then(() => console.log("AutoFighter closed"));

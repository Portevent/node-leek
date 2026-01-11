import NodeLeekClient from "./node-leek-client/node-leek-client";
import {Credentials, CredentialsManager} from "./credentials/credentials-manager";
import {PublicLeek} from "./codegen/model/publicLeek";

const args = require('minimist')(process.argv.slice(2));
const readonly = (args['readonly'] ?? args['r']) != null;

async function autoFighter(client: NodeLeekClient, index: number) {
    await client.buy("50fights", 20);
    var selectedLeek : PublicLeek = client.leeks[0];

    // Select lowest level leek to xp
    client.leeks.forEach((leek) => {
        if(leek.xpBlocked) return;
        if(leek.level <= selectedLeek.level) {
            selectedLeek = leek;
        }
    })
    console.log("Doing " + client.farmer.fights + " fights with " + selectedLeek.name);

    for (let i = 0; i < client.farmer.fights; i++) {
        console.log("Starting fight " + i);
        await client.sleep(1000);
        await client.startRandomSoloFight(selectedLeek.id);
    }
}

// LeekSync on each account
new CredentialsManager(args['credentials'] ?? "credentials.json")
    .forEachAccount(autoFighter, readonly)
    .then(() => console.log("AutoFighter closed"));

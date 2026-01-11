import NodeLeekClient from "./node-leek-client/node-leek-client";
import {CredentialsManager} from "./credentials/credentials-manager";

const args = require('minimist')(process.argv.slice(2));
const readonly = (args['readonly'] ?? args['r']) != null;

async function start(){
    const manager = new CredentialsManager(args['credentials'] ?? "credentials.json");
    //
    // // Buy fight on each accounts
    // await manager.forEachAccount(async (client: NodeLeekClient, index: number) =>
    //     await client.buy("50fights"));

    for(var i = 0; i < 50; i++){
        console.log("Fighting Nasu : " + i);
        // First account create room
        await manager.forFirstAccount(async (client: NodeLeekClient, index: number)=> {
            const roomId = await client.createRoom(1);

            if(roomId == ""){
                console.log("No more fights");
                return;
            }

            // Other account join room
            await manager.forOtherAccount(async (client: NodeLeekClient, index: number) => {
                await client.joinRoom(roomId);
            });

            await client.startRoomFight();
            await client.sleep(50);
        });
    }

    await manager.disconnectEachAccount();
}

start().then(r =>
    console.log("Login closed")
);
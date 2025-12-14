import NodeLeekClient from "../node-leek-client/node-leek-client";
import {Leek} from "../codegen/model/leek";
import {FightResult} from "../codegen/model/fightResult";

class SimpleLeekFighter{
    private client: NodeLeekClient;
    private leek: Leek | undefined;

    constructor(client: NodeLeekClient) {
        this.client = client;
        this.leek = undefined;
    }

    async start() {
        return this.client.login();
    }

    selectLowestLeek(){
        this.leek = Object.values(this.client.farmer.leeks).sort((a, b) => a.level - b.level)[0];
        console.log("🫵 Selecting " + this.leek.name + " to fight !")
    }

    async doFight(count: number = 1){
        console.log("Doing " + count + " fights");
        if (this.leek == undefined) return;
        for (let i = 1; i <= count; i++) {
            const [opponent, fightId] = await this.client.startRandomSoloFight(this.leek?.id);
            if(opponent == null) continue;
            if(fightId == -1) continue;

            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log("⚔️ " + opponent.name + " lvl." + opponent.level + " (" + opponent.talent + " talents) : " + fightId);

            this.client.getCompleteFight(fightId).then(result => {
                if (result === undefined) return;
                console.log(this.getWinner(result) + " VS " + result.leeks2[0].name + " !! ");
            })
        }
    }

    private getWinner(result: FightResult) {
        switch (result.winner){
            case -1:
                return "🕥 Fight is still ongoing "
            case 0:
                return "🕥 Draw"
            case 1:
                return "🔷 Win"
            case 2:
                return "🔶 Defeat"
            default:
                return "? result is " + result.winner
        }
        return result.winner;
    }
}

export default SimpleLeekFighter;
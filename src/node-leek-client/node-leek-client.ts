import {Farmer} from "../codegen/model/farmer";
import {Folder} from "../codegen/model/folder";
import {Ia} from "../codegen/model/ia";
import {Opponent} from "../codegen/model/opponent";
import {FightResult} from "../codegen/model/fightResult";
import LeekSyncClient from "../leek-sync/leek-sync-client";
import LeekWarsClient from "./leek-wars-client";

function randomIn(array: any[]){
    return array[Math.floor(Math.random() * array.length)];
}

class NodeLeekClient extends LeekWarsClient{

    public farmer: Farmer = new Farmer();
    private foldersById: { [id: number]: string } = {0: "/"}
    private filesByName: { [name: string]: number } = {"/": 0}
    private leekSyncClient: LeekSyncClient | null = null;

    public static async Create(username: string, password: string): Promise<NodeLeekClient> {
        var client = new NodeLeekClient(username, password);
        return client.login().then(nodeLeek => client);
    }

    public async login() {
        return this.loginOnLeekwars().then(farmer => {
            console.log("💚 NodeLeek connected !");
            this.initClient(farmer);
        }).catch(err => {
            if (err?.response?.statusCode == 401 && err.body.error == "invalid") {
                console.error("🛑 Failed to start NodeLeek : invalid credentials. Check credentials.json");
            } else {
                console.error(err);
            }
        });
    }

    private initClient(farmer: Farmer): void {
        this.farmer = farmer;
        this.logFarmerInfos();
        this.registerFolders(this.farmer.folders);
        this.registerAis(this.farmer.ais);
    }

    logFarmerInfos() {
        console.log("🤠 " + this.farmer.name + " (" + this.farmer.habs + " habs)");
        Object.values(this.farmer.leeks).forEach(leek => console.log("🥬 " + leek.name + " lvl." + leek.level + " - " + leek.talent + " talents" + (leek.capital > 0 ? " - ⚠️ " + leek.capital + " capitals to spend" : "")));
    }

    private registerFolder(folder: Folder) {
        if (this.foldersById[folder.folder] === undefined) {
            return false;
        }
        var fullname = this.foldersById[folder.folder] + folder.name + "/";
        this.filesByName[fullname] = folder.id;
        this.foldersById[folder.id] = fullname;
        return true;
    }

    private registerFolders(folders: Array<Folder>, count: number = 0) {
        if (folders.length > 0 && count < 50) {
            // Register all folders that haven't been registered on first try
            this.registerFolders(folders.filter(folder => !this.registerFolder(folder)), count + 1);
        }
    }

    private registerAis(ais: Array<Ia>) {
        ais.forEach(ai => this.registerAi(ai));
    }

    private registerAi(ai: Ia) {
        this.filesByName[this.foldersById[ai.folder] + ai.name + ".leek"] = ai.id
    }

    public getFiles(): { [name: string]: number } {
        return this.filesByName;
    }

    public async startRandomSoloFight(leek_id: number) : Promise<[Opponent, number]> {
        return this.getSoloOpponents(leek_id)
            .then((opponents) => {
                if (opponents.length == 0) {
                    console.error("Can't find opponent for " + leek_id);
                    return [null, -1];
                }

                const opponent = randomIn(opponents);
                return this.startSoloFight(leek_id, opponent.id)
                    .then((fightId) => [opponent, fightId]);
            });
    }

    public async getCompleteFight(fight_id: number) : Promise<FightResult | void> {
        var result = await this.getFight(fight_id);
        if (result == null) return;
        if (result.status == 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            return this.getCompleteFight(result.id);
        }
        return result;
    }

    public async syncWith(path: string, watch: boolean, choice: string = ""){
        this.leekSyncClient = new LeekSyncClient(this, path);
        return this.leekSyncClient.start(watch, choice);
    }
}

export {NodeLeekClient as default};
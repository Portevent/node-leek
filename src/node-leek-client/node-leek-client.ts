import {Farmer} from "../codegen/model/farmer.js";
import {Folder} from "../codegen/model/folder.js";
import {Ia} from "../codegen/model/ia.js";
import {Opponent} from "../codegen/model/opponent.js";
import {FightResult} from "../codegen/model/fightResult.js";
import {LeekSyncClient} from "../leek-sync/leek-sync-client.js";
import {LeekWarsClient} from "./leek-wars-client.js";
import {PublicLeek} from "../codegen/model/publicLeek.js";
import {FightResume} from "../codegen/model/fightResume.js";
import {AiTree} from "../codegen/model/aiTree";
import {Ai} from "../codegen/model/ai";

function randomIn(array: any[]){
    return array[Math.floor(Math.random() * array.length)];
}

export class NodeLeekClient extends LeekWarsClient{

    public farmer: Farmer = new Farmer();
    public leeks: PublicLeek[] = [];
    private foldersById: { [id: number]: string } = {0: "/"}
    private filesByName: { [name: string]: number } = {"/": 0}
    private leekSyncClient: LeekSyncClient | null = null;

    public static async Create(username: string, password: string): Promise<NodeLeekClient> {
        var client = new NodeLeekClient(username, password);
        return client.login().then(nodeLeek => client);
    }

    public async login() {
        return this.loginOnLeekwars().then(farmer => {
            console.log("\n\n\n📯 NodeLeek connected !");
            return this.initClient(farmer);
        }).catch(err => {
            if (err?.response?.statusCode == 401 && err.body.error == "invalid") {
                console.error("🛑 Failed to start NodeLeek : invalid credentials. Check credentials.json");
            } else {
                console.error(err);
            }
        });
    }

    private async initClient(farmer: Farmer): Promise<void> {
        this.farmer = farmer;
        this.logFarmerInfos();
        this.registerAis(this.farmer.aiTree);
        for (const id of Object.keys(this.farmer.leeks)) {
            await this.sleep(50);
            await this.registerOwnLeek(Number(id));
            await this.sleep(50);
        }
        this.leeks.forEach(leek => this.logLeekInfos(leek));
    }

    public logFarmerInfos() {
        console.log("🤠 " + this.farmer.name + " (" + this.farmer.habs + " habs) " + this.farmer.fights + " fights");
        //Object.values(this.farmer.leeks).forEach(leek => console.log("🥬 " + leek.name + " lvl." + leek.level + " - " + leek.talent + " talents" + (leek.capital > 0 ? " - ⚠️ " + leek.capital + " capitals to spend" : "")));
    }

    private logLeekInfos(leek: PublicLeek): void {
        console.log("\n/--- 🥬 " + leek.name + " lvl." + leek.level + " (" + Math.floor(100 * (leek.xp - leek.downXp) / (leek.upXp - leek.downXp)) + "%) " + leek.talent + " talents (" + (leek.talentMore>0?"+":"") + leek.talentMore + ") #" + leek.ranking);
        console.log("/- 🏅 " + leek.victories + " wins / " + leek.draws + " draws / " + leek.defeats + " defeats");
        console.log("/- ❤️ " + leek.totalLife + " ⭐️ " + leek.totalTp + " 👢 " + leek.totalMp + this.getImportantStats(leek));
        console.log("/- Fights : " + leek.fights.map(fight => this.fightToString(fight)).join(" "));
    }

    private getImportantStats(leek: PublicLeek): string {
        const stats : { [name: string]: number } = {
            " 🤎 " : leek.totalStrength,
            " 💚 " : leek.totalWisdom,
            " 🩵 " : leek.totalAgility,
            " 🧡 " : leek.totalResistance,
            " 💙 " : leek.totalScience,
            " 💜 " : leek.totalMagic
        }
        let maxValue : number = 0;
        Object.values(stats).forEach((value) => {
            if(value > maxValue){
                maxValue = value;
            }
        })

        let result = "";
        Object.entries(stats).forEach(([key, value]) => {
            if(value > (maxValue/2) && value > 0){
                result += key + value;
            }
        })

        return result;
    }

    private fightToString(fight: FightResume) : string {

        return "[" + {
                "win": "💚 ",
                "defeat": "🔴 ",
                "draw": "⬜️ ",
                "?": "wait "
            }[fight.result]
            + "⬆".repeat(fight.levelups)
            + "☘".repeat(fight.rareloot)
            + "⛤".repeat(fight.trophies)
            + "]";
    }

    private fightToBigString(fight: FightResume) : string {
        return "[ "
            + fight.leeks1.map(leek => leek.name).join(" ")
            + " VS "
            + fight.leeks2.map(leek => leek.name).join(" ")
            + " ]";
    }

    private async registerOwnLeek(id: number) {
        return this.getLeek(id).then(leek => {
            if(leek == null) return;
            this.leeks.push(leek);
        })
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
        if (folders.length > 0) {
            if (count < 50){
                // Register all folders that haven't been registered on first try
                this.registerFolders(folders.filter(folder => !this.registerFolder(folder)), count + 1);
            }
            else{
                // console.log("Theses folder can't be registered. Their parent are either bugged or they are more than 50 level deep in folder hierarchy :");
                // console.log(folders);
            }
        }
    }

    private registerAis(ais: AiTree) {
        ais.files!.forEach(ai => this.registerAi(ai));
    }

    private registerAi(ai: Ai) {
        /*if (this.foldersById[ai.folder] != undefined) {
            this.filesByName[(this.foldersById[ai.folder] ?? "/") + ai.name] = ai.id
        }*/
    }

    public getFiles(): { [name: string]: number } {
        return this.filesByName;
    }

    private getLocalLeekName(id: number): string | null {
        return this.farmer.leeks[id]?.name;
    }

    public async getLeekName(id: number): Promise<string> {
        return this.getLocalLeekName(id) ?? (await this.getLeek(id))?.name ?? "Unknown";
    }

    public async startRandomSoloFight(leek_id: number) : Promise<[Opponent, number]> {
        return this.getSoloOpponents(leek_id)
            .then((opponents) => {
                if (opponents.length == 0) {
                    console.error("Can't find opponent for " + this.getLocalLeekName(leek_id));
                    return [null, -1];
                }

                const opponent = randomIn(opponents);
                return this.startSoloFight(leek_id, opponent.id)
                    .then((fightId) => [opponent, fightId]);
            });
    }

    public async startRandomTeamFight(composition_id: number) : Promise<[Opponent, number]> {
        return this.getTeamOpponents(composition_id)
            .then((opponents) => {
                if (opponents.length == 0) {
                    console.error("Can't find opponent for composition " + composition_id);
                    return [null, -1];
                }

                const opponent = randomIn(opponents);
                return this.startTeamFight(composition_id, opponent.id)
                    .then((fightId) => [opponent, fightId]);
            });
    }

    public async startRandomFarmerFight() : Promise<[Opponent, number]> {
        return this.getFarmerOpponents()
            .then((opponents) => {
                if (opponents.length == 0) {
                    console.error("Can't find farmer opponents");
                    return [null, -1];
                }

                const opponent = randomIn(opponents);
                return this.startFarmerFight(opponent.id)
                    .then((fightId) => [opponent, fightId]);
            });
    }

    public async getCompleteFight(fight_id: number) : Promise<FightResult | void> {
        const result = await this.getFight(fight_id);
        if (result == null) return;
        if (result.status == 0) {
            await this.sleep(5000);
            return this.getCompleteFight(result.id);
        }
        await this.sleep(100);
        return result;
    }

    public async syncWith(path: string, watch: boolean, choice: string = ""){
        console.error("SyncWith doesn't work with new LeekWars API");
        /*
        this.leekSyncClient = new LeekSyncClient(this, path);
        return this.leekSyncClient.start(watch, choice);
        */
    }

    public async joinBattleRoyale() : Promise<void>{
        if (this.farmer.fights == 0) return;
        await this.registerInBattleRoyale(Number(Object.keys(this.farmer.leeks)[0]));
        await this.sleep(100);
    }

    public async createRoom(bossId: number, locked: boolean = false) : Promise<string>{
        return this.createRoomWith(bossId,  Object.keys(this.farmer.leeks).map(id => Number(id)), locked);
    }

    public async createRoomWith(bossId: number,  leeks: number[], locked: boolean = false) : Promise<string>{
        if (this.farmer.fights == 0) return "";
        this.currentRoom = "";
        await this.createBossRoom(bossId, locked, leeks);
        while(this.currentRoom == ""){
            await this.sleep(10);
        }
        return this.currentRoom;
    }

    public async joinRoom(roomId: string) : Promise<string>{
        return this.joinRoomWith(roomId, Object.keys(this.farmer.leeks).map(id => Number(id)));
    }

    public async joinRoomWith(roomId: string,  leeks: number[]) : Promise<string>{
        await this.joinBossRoom(roomId, leeks);
        while(this.currentRoom == ""){
            await this.sleep(10);
        }
        return this.currentRoom;
    }

    public async engageLeekInRoom(leek: number) : Promise<void>{
        return this.addLeekInBossRoom(leek);
    }

    public async disengageLeekInRoom(leek: number) : Promise<void>{
        return this.removeLeekInBossRoom(leek);
    }
}

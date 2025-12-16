import {DefaultApi, DefaultApiApiKeys} from "../codegen/api/defaultApi";
import {getCookieToken, getPhpsessidToken} from "./token-parsing";
import {Farmer} from "../codegen/model/farmer";
import {Folder} from "../codegen/model/folder";
import {Ia} from "../codegen/model/ia";
import {Aicode} from "../codegen/model/aicode";
import {Opponent} from "../codegen/model/opponent";
import {FightResult} from "../codegen/model/fightResult";
import LeekSyncClient from "../leek-sync/leek-sync-client";
import {CreateFile200ResponseAi} from "../codegen/model/createFile200ResponseAi";

function randomIn(array: any[]){
    return array[Math.floor(Math.random() * array.length)];
}

class NodeLeekClient {

    private apiClient: DefaultApi;
    ready: boolean = false;
    farmer: Farmer = new Farmer();
    private foldersById: { [id: number]: string } = {0: "/"}
    private filesByName: { [name: string]: number } = {"/": 0}
    private username: string;
    private password: string;
    private leekSyncClient: LeekSyncClient | null = null;
    private readonly: boolean;

    public static async Create(username: string, password: string): Promise<NodeLeekClient> {
        var client = new NodeLeekClient(username, password);
        return client.login().then(nodeLeek => client);
    }

    constructor(username: string, password: string, readonly: boolean = false) {
        this.readonly = readonly;
        this.username = username;
        this.password = password;
        this.apiClient = new DefaultApi();
    }

    public async login() {
        if (this.ready) return;
        return this.apiClient.login({
            login: this.username,
            password: this.password,
            keepConnected: true
        }).then(r => {
            console.log("💚 NodeLeek connected !");
            this.apiClient.setApiKey(DefaultApiApiKeys.cookieAuth, getCookieToken(r.response.headers["set-cookie"]))
            this.apiClient.setApiKey(DefaultApiApiKeys.phpsessid, getPhpsessidToken(r.response.headers["set-cookie"]))
            this.initClient(r.body.farmer);
        }).catch(err => {
            if (err?.response?.statusCode == 401 && err.body.error == "invalid") {
                console.error("🛑 Failed to start NodeLeek : invalid credentials.");
            } else {
                console.error(err);
            }
        });
    }

    private initClient(farmer: Farmer): void {
        this.ready = true;
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

    public async fetchFiles(requests: { [ai: number]: number }): Promise<Array<Aicode>> {
        if (!this.ready) return [new Aicode()];
        return this.apiClient.getFilesContent({
            ais: JSON.stringify(requests)
        })
            .then(result => result.body)
            .catch(err => {
                console.error("fetchFiles(" + requests + ") -> [" + err.statusCode + "] " + err.body.error);
                return [];
            });
    }

    public async fetchFile(ai: number, timestamp: number): Promise<Aicode> {
        if (!this.ready) return new Aicode();
        const request: { [ai: number]: number } = {}
        request[ai] = timestamp;
        return this.fetchFiles(request)
            .then(result => result[0])
            .catch(err => {
                console.error("fetchFile -> [" + err.statusCode + "] " + err.body.error);
                return new Aicode();
            });
    }

    public async saveFile(ai_id: number, code: string) : Promise<number> {
        if (!this.ready) return 0;
        if (this.readonly) {
            console.error("Readonly mode, can't save file");
            return 0;
        }
        return this.apiClient.saveFile({
            aiId: ai_id,
            code: code
        })
            .then(result => result.body.modified)
            .catch(err => {
                console.error("saveFile " + ai_id + " (code is " + code.substring(0, 20) + ") -> [" + err.statusCode + "] " + err.body.error);
                return 0;
            });
    }

    public async createFile(folder_id: number, name: string, version: number = 4) : Promise<CreateFile200ResponseAi> {
        if (!this.ready) return new CreateFile200ResponseAi();
        if (this.readonly) {
            console.error("Readonly mode, can't create file");
            return new CreateFile200ResponseAi();
        }
        return this.apiClient.createFile({
            folderId: folder_id,
            name: name,
            version: version
        })
            .then(result => result.body.ai)
            .catch(err => {
                console.error("createFile " + name + " (parent is " + folder_id + ") -> [" + err.statusCode + "] " + err.body.error);
                return new CreateFile200ResponseAi();
            });
    }

    public async createFolder(folder_id: number, name: string) : Promise<number> {
        if (!this.ready) return -1;
        if (this.readonly) {
            console.error("Readonly mode, can't create folder");
            return -1;
        }

        console.log("Create folder " + name + " parent is " + folder_id);

        return this.apiClient.createFolder({
            folderId: folder_id,
            name: name
        })
            .then(result => result.body.id)
            .catch(err => {
                if(err.statusCode == 429){ // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.createFolder(folder_id, name))
                }

                console.error("createFolder " + name + " (parent is " + folder_id + ") -> [" + err.statusCode + "] " + err.body.error);
                return -1;
            });
    }

    public async deleteFile(ai_id: number) {
        if (!this.ready) return;
        if (this.readonly) {
            console.error("Readonly mode, can't delete file");
            return;
        }
        return this.apiClient.deleteFile({
            aiId: ai_id,
        })
            .then(result => result.body)
            .catch(err => {
                console.error("deleteFile " + ai_id + " -> [" + err.statusCode + "] " + err.body.error);
            });
    }

    public async deleteFolder(folder_id: number) {
        if (!this.ready) return;
        if (this.readonly) {
            console.error("Readonly mode, can't delete folder");
            return;
        }
        return this.apiClient.deleteFolder({
            folderId: folder_id,
        })
            .then(result => result.body)
            .catch(err => {
                console.error("deleteFolder " + folder_id + " -> [" + err.statusCode + "] " + err.body.error);
            });
    }

    private async getSoloOpponents(leek_id: number) : Promise<Opponent[]> {
        return this.apiClient.getSoloOpponents(leek_id)
            .then(result => result.body.opponents)
            .catch(err => {
                console.error("getSoloOpponents " + leek_id + " -> [" + err.statusCode + "] " + err.body.error);
                return [];
            });
    }

    private async startSoloFight(leek_id: number, target_id: number) : Promise<number> {
        if (!this.ready) return -1;
        if (this.readonly) {
            console.error("Readonly mode, can't start fight");
            return -1;
        }
        return this.apiClient.startSoloFight({
            leekId: leek_id,
            targetId: target_id
        })
            .then(result => result.body.fight)
            .catch(err => {
                if(err.statusCode == 429){ // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.startSoloFight(leek_id, target_id))
                }

                console.error("startFight " + leek_id + " " + target_id + " -> [" + err.statusCode + "] " + err.body);
                return -1;
            });
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

    public async getFight(fight_id: number) : Promise<FightResult | void> {
        return this.apiClient.getFight(fight_id)
            .then(result => result.body)
            .catch(err => {
                console.error("getFight " + fight_id + " -> [" + err.statusCode + "] " + err.body.error);
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
        if (!this.ready) return;
        this.leekSyncClient = new LeekSyncClient(this, path);
        return this.leekSyncClient.start(watch, choice);
    }
}

export {NodeLeekClient as default};
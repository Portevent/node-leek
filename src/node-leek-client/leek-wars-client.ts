import {DefaultApi, DefaultApiApiKeys} from "../codegen/api/defaultApi";
import {getCookieToken, getPhpsessidToken} from "./token-parsing";
import {Farmer} from "../codegen/model/farmer";
import {Aicode} from "../codegen/model/aicode";
import {Opponent} from "../codegen/model/opponent";
import {FightResult} from "../codegen/model/fightResult";
import {CreateFile200ResponseAi} from "../codegen/model/createFile200ResponseAi";
import {FarmerOpponent} from "../codegen/model/farmerOpponent";
import {PublicLeek} from "../codegen/model/publicLeek";
import {Buy200Response} from "../codegen/model/buy200Response";

function randomIn(array: any[]) {
    return array[Math.floor(Math.random() * array.length)];
}

class LeekWarsClient {

    private apiClient: DefaultApi;
    private ready: boolean = false;
    private username: string;
    private password: string;
    private readonly: boolean;

    constructor(username: string, password: string, readonly: boolean = false) {
        this.readonly = readonly;
        this.username = username;
        this.password = password;
        this.apiClient = new DefaultApi();
    }

    protected async loginOnLeekwars() : Promise<Farmer> {
        return this.apiClient.login({
            login: this.username,
            password: this.password,
            keepConnected: true
        }).then(r => {
            this.ready = true;
            this.apiClient.setApiKey(DefaultApiApiKeys.cookieAuth, getCookieToken(r.response.headers["set-cookie"]))
            this.apiClient.setApiKey(DefaultApiApiKeys.phpsessid, getPhpsessidToken(r.response.headers["set-cookie"]))
            return r.body.farmer;
        });
    }

    public async getLeek(leek_id: number) : Promise<PublicLeek | null> {
        if (!this.ready) return null;
        return this.apiClient.getLeek(leek_id)
            .then(result => {
                return result.body;
            })
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.getLeek(leek_id))
                }

                console.error("Can't get Leek " + leek_id + " -> [" + err.statusCode + "] " + err.body.error);
                return null;
            });
    }

    public async buy(item_id: string, quantity: number) : Promise<Buy200Response | null> {
        if (!this.ready) return null;
        if (this.readonly) {
            console.error("Readonly mode, can't buy items");
            return null;
        }
        return this.apiClient.buy({
                itemId: item_id,
                quantity: quantity
            })
            .then(result => {
                return result.body;
            })
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.buy(item_id, quantity))
                }

                console.error("Can't buy " + item_id + " " + quantity + " times -> [" + err.statusCode + "] " + err.body.error);
                return null;
            });
    }

    public async fetchFiles(requests: { [ai: number]: number }): Promise<Array<Aicode>> {
        if (!this.ready) return [new Aicode()];
        return this.apiClient.getFilesContent({
            ais: JSON.stringify(requests)
        })
            .then(result => result.body)
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.fetchFiles(requests))
                }

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

    public async saveFile(ai_id: number, code: string): Promise<number> {
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
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.saveFile(ai_id, code))
                }

                console.error("saveFile " + ai_id + " (" + code.substring(0, 20) + ") -> [" + err.statusCode + "] " + err.body.error);
                return 0;
            });
    }

    public async createFile(folder_id: number, name: string, version: number = 4): Promise<CreateFile200ResponseAi> {
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
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.createFile(folder_id, name, version))
                }

                console.error("createFile " + name + " (parent is " + folder_id + ") -> [" + err.statusCode + "] " + err.body.error);
                return new CreateFile200ResponseAi();
            });
    }

    public async createFolder(folder_id: number, name: string): Promise<number> {
        if (!this.ready) return -1;
        if (this.readonly) {
            console.error("Readonly mode, can't create folder");
            return -1;
        }

        return this.apiClient.createFolder({
            folderId: folder_id,
            name: name
        })
            .then(result => result.body.id)
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.createFolder(folder_id, name))
                }

                console.error("createFolder " + name + " (parent is " + folder_id + ") -> [" + err.statusCode + "] " + err.body.error);
                return -1;
            });
    }

    public async deleteFile(ai_id: number) : Promise<void> {
        if (!this.ready) return;
        if (this.readonly) {
            console.error("Readonly mode, can't delete file");
            return;
        }
        return this.apiClient.deleteFile({
            aiId: ai_id,
        })
            .then(result => {})
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.deleteFile(ai_id))
                }

                console.error("deleteFile " + ai_id + " -> [" + err.statusCode + "] " + err.body.error);
            });
    }

    public async deleteFolder(folder_id: number) : Promise<void> {
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
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.deleteFolder(folder_id))
                }

                console.error("deleteFolder " + folder_id + " -> [" + err.statusCode + "] " + err.body.error);
            });
    }

    protected async getSoloOpponents(leek_id: number): Promise<Opponent[]> {
        return this.apiClient.getSoloOpponents(leek_id)
            .then(result => result.body.opponents)
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.getSoloOpponents(leek_id))
                }

                console.error("getSoloOpponents " + leek_id + " -> [" + err.statusCode + "] " + err.body.error);
                return [];
            });
    }

    protected async startSoloFight(leek_id: number, target_id: number): Promise<number> {
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
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.startSoloFight(leek_id, target_id))
                }

                console.error("startSoloFight " + leek_id + " vs " + target_id + " -> [" + err.statusCode + "] " + err.body);
                return -1;
            });
    }

    protected async getFarmerOpponents() : Promise<FarmerOpponent[]> {
        if (!this.ready) return [];
        return this.apiClient.getFarmerOpponents()
            .then(result => result.body.opponents)
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.getFarmerOpponents())
                }

                console.error("getFarmerOpponents -> [" + err.statusCode + "] " + err.body.error);
                return [];
            });
    }

    protected async startFarmerFight(target_id: number): Promise<number> {
        if (!this.ready) return -1;
        if (this.readonly) {
            console.error("Readonly mode, can't start fight");
            return -1;
        }
        return this.apiClient.startFarmerFight({
            targetId: target_id
        })
            .then(result => result.body.fight)
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.startFarmerFight(target_id))
                }

                console.error("startFarmerFight vs " + target_id + " -> [" + err.statusCode + "] " + err.body);
                return -1;
            });
    }

    public async getFight(fight_id: number): Promise<FightResult> {
        if (!this.ready) return new FightResult();
        return this.apiClient.getFight(fight_id)
            .then(result => result.body)
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return new Promise(resolve => setTimeout(resolve, 15000))
                        .then(() => this.getFight(fight_id))
                }

                console.error("getFight " + fight_id + " -> [" + err.statusCode + "] " + err.body.error);
                return new FightResult();
            });
    }
}

export {LeekWarsClient as default};

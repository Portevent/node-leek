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
import {SocketMessage} from "./leekwars-frontend/SocketMessage";
import {NotificationType} from "./leekwars-frontend/Notification";
import {ITEMS} from "./leekwars-frontend/Items";

function randomIn(array: any[]) {
    return array[Math.floor(Math.random() * array.length)];
}

class LeekWarsClient {

    private apiClient: DefaultApi;
    private ready: boolean = false;
    private username: string;
    private password: string;
    private readonly: boolean;

    private socket: WebSocket | null;
    private token: string = "";
    private phpsessid: string = "";

    protected currentRoom: string = "";

    constructor(username: string, password: string, readonly: boolean = false) {
        this.readonly = readonly;
        this.username = username;
        this.password = password;
        this.socket = null;
        this.apiClient = new DefaultApi();
    }

    protected async loginOnLeekwars() : Promise<Farmer> {
        return this.apiClient.login({
            login: this.username,
            password: this.password,
            keepConnected: true
        }).then(async r => {
            this.token = getCookieToken(r.response.headers["set-cookie"])
            this.phpsessid = getPhpsessidToken(r.response.headers["set-cookie"])

            this.apiClient.setApiKey(DefaultApiApiKeys.cookieAuth, this.token)
            this.apiClient.setApiKey(DefaultApiApiKeys.phpsessid, this.phpsessid)

            this.ready = true;
            await this.connectWebSocket();

            // Add on purpose delay to avoid TOO_MANY_REQUEST
            await this.sleep(100);
            return r.body.farmer;
        })
        .catch(err => {
            if (err.statusCode == 429) { // TOO MANY REQUEST
                return this.sleep(15000).then(() => this.loginOnLeekwars())
            }

            console.error("Can't connect " + this.username + " -> [" + err.statusCode + "] " + err.body.error);
            throw err;
        });
    }

    public async close(){
        this.socket?.close();
    }
    
    public async sleep(delay: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    public async getLeek(leek_id: number) : Promise<PublicLeek | null> {
        if (!this.ready) return null;
        return this.apiClient.getLeek(leek_id)
            .then(result => {
                return result.body;
            })
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return this.sleep(15000).then(() => this.getLeek(leek_id))
                }

                console.error("Can't get Leek " + leek_id + " -> [" + err.statusCode + "] " + err.body.error);
                return null;
            });
    }

    public async buy(item_id: string, quantity: number = 1) : Promise<Buy200Response | null> {
        if (!this.ready) return null;
        if (this.readonly) {
            console.error("Readonly mode, can't buy items");
            return null;
        }
        return this.apiClient.buy({
            itemId: item_id,
            quantity: quantity
        })
            .then(async result => {
                // Add on purpose delay to avoid TOO_MANY_REQUEST
                await this.sleep(100);
                return result.body;
            })
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
            .then(async result => {
                // Add on purpose delay to avoid TOO_MANY_REQUEST
                await this.sleep(100);
                return result.body.fight;
            })
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return this.sleep(15000)
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
                    return this.sleep(15000)
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
                    return this.sleep(15000)
                        .then(() => this.startFarmerFight(target_id))
                }

                console.error("startFarmerFight vs " + target_id + " -> [" + err.statusCode + "] " + err.body);
                return -1;
            });
    }

    protected async getFight(fight_id: number): Promise<FightResult> {
        if (!this.ready) return new FightResult();
        return this.apiClient.getFight(fight_id)
            .then(result => result.body)
            .catch(err => {
                if (err.statusCode == 429) { // TOO MANY REQUEST
                    return this.sleep(15000)
                        .then(() => this.getFight(fight_id))
                }

                console.error("getFight " + fight_id + " -> [" + err.statusCode + "] " + err.body.error);
                return new FightResult();
            });
    }

    protected async createBossRoom(bossId: number = 1, locked: boolean = false, leeks: number[] = []){
        const r = `[${SocketMessage.GARDEN_BOSS_CREATE_SQUAD}, ${bossId}, ${locked}, [${leeks}]]`;
        this.socket?.send(r);
        console.log("Create room : ", r);
    }

    protected async joinBossRoom(roomId: string, leeks: number[] = []){
        const r = `[${SocketMessage.GARDEN_BOSS_JOIN_SQUAD}, "${roomId}", [${leeks}]]`;
        this.socket?.send(r);
        console.log("Join room : ", r);
    }

    public async startRoomFight(){
        const r = `[${SocketMessage.GARDEN_BOSS_ATTACK}]`;
        this.socket?.send(r);
        console.log("Start room : ", r);
    }

    protected async recieveNotification(message: any){
        switch (message.type) {
            case NotificationType.TROPHY_UNLOCKED:
                console.log("Trophy unlocked : ", message);
                break;
            case NotificationType.UP_LEVEL:
                console.log("Level up : ", message);
                break;
            default:
                console.log("Notification : ", message);
                break;
        }
    }

    protected async connectWebSocket(){
        if (!this.ready) return;
        this.socket = new WebSocket('wss://leekwars.com/ws', [
            'leek-wars',
            this.token
        ]),
        this.socket.onopen = () => {
            console.log("Websocket connected !")
            // o.M.commit('invalidate-chats'),
            //     o.M.commit('wsconnected'),
            //     this.retry_count = 10,
            //     this.retry_delay = 1000;
            // for (const e of this.queue) this.send(e);
            // this.queue = [],
            //     r.H.battleRoyale.init(),
            //     r.H.bossSquads.init()
        },
            this.socket.onclose = () => {
                console.log("Websocket closed ! ")
                // if (
                //     o.M.getters.admin ||
                //     r.H.LOCAL ||
                //     r.H.DEV ||
                //     window.__FARMER__ &&
                //     1 === window.__FARMER__.farmer.id
                // ) {
                //     const e = '[WS] fermée';
                //     console.error(e)
                // }
                // o.M.commit('wsclose'),
                //     this.retry()
            },
            this.socket.onerror = e => {
                console.error('[WS] erreur', e)
            },
            this.socket.onmessage = msg => {
                const json = JSON.parse(msg.data)
                const id = json[0]
                const data = json[1]
                const request_id = json[2]

                switch (id) {
                    case SocketMessage.PONG: {
                        console.log("[WS] recieved PONG", data);
                        break
                    }
                    case SocketMessage.NOTIFICATION_RECEIVE : {
                        this.recieveNotification({ id: data[0], type: data[1], parameters: data[2], new: true });
                        break
                    }
                    case SocketMessage.LUCKY: {
                        // NOTHING TO DO
                        break
                    }
                    case SocketMessage.FAKE_LUCKY: {
                        // CLICK ON LUCKY
                        break
                    }
                    case SocketMessage.BATTLE_ROYALE_CHAT_NOTIF: {
                        console.log("[WS] recieved BATTLE_ROYALE_CHAT_NOTIF", data);
                        break
                    }
                    case SocketMessage.BATTLE_ROYALE_UPDATE: {
                        console.log("[WS] recieved BATTLE_ROYALE_UPDATE", data);
                        break
                    }
                    case SocketMessage.BATTLE_ROYALE_START: {
                        console.log("[WS] recieved BATTLE_ROYALE_START", data);
                        break
                    }
                    case SocketMessage.BATTLE_ROYALE_LEAVE: {
                        console.log("[WS] recieved BATTLE_ROYALE_LEAVE", data);
                        break
                    }
                    case SocketMessage.GARDEN_QUEUE: {
                        console.log("[WS] recieved GARDEN_QUEUE", data);
                        break
                    }
                    case SocketMessage.FIGHT_PROGRESS: {
                        console.log("[WS] recieved FIGHT_PROGRESS", data);
                        break
                    }
                    case SocketMessage.TOURNAMENT_UPDATE: {
                        console.log("[WS] recieved TOURNAMENT_UPDATE", data);
                        break
                    }
                    case SocketMessage.UPDATE_HABS: {
                        console.log("+" + data[0] + " 🪙");
                        break
                    }
                    case SocketMessage.UPDATE_LEEK_XP: {
                        console.log("+" + data[1] + " xp");
                        break
                    }
                    case SocketMessage.UPDATE_LEEK_TALENT: {
                        console.log((data[1]>0?"+":"") + data[1] + " talents");
                        break
                    }
                    case SocketMessage.UPDATE_FARMER_TALENT: {
                        console.log((data[1]>0?"+":"") + data[1] + " farmer talents");
                        break
                    }
                    case SocketMessage.UPDATE_TEAM_TALENT: {
                        console.log((data[1]>0?"+":"") + data[1] + " team talents");
                        break
                    }
                    case SocketMessage.ADD_RESOURCE: {
                        // console.log("[WS] recieved ADD_RESOURCE", data);
                        console.log("+" + (data[2]>1?data[2]:"") + " " + ITEMS[data[0]].name);
                        // console.log("add resource", data)
                        // const template = data[0]
                        // const id = data[1]
                        // const quantity = data[2]
                        // const item = "" // TODO LeekWars.items[data[0]]
                        // const time = data[3]
                        // if (item) {
                        //     //store.commit('add-inventory', { type: item.type, template, id, quantity, time })
                        // }
                        break
                    }
                    case SocketMessage.GARDEN_BOSS_SQUADS: {
                        // console.log("[WS] recieved GARDEN_BOSS_SQUADS", data);
                        break
                    }
                    case SocketMessage.GARDEN_BOSS_SQUAD_JOINED: {
                        console.log("[WS] recieved GARDEN_BOSS_SQUAD_JOINED");
                        this.currentRoom = data.id;
                        break
                    }
                    case SocketMessage.GARDEN_BOSS_SQUAD: {
                        // console.log("[WS] recieved GARDEN_BOSS_SQUAD", data);
                        break
                    }
                    case SocketMessage.GARDEN_BOSS_NO_SUCH_SQUAD: {
                        console.log("[WS] recieved GARDEN_BOSS_NO_SUCH_SQUAD", data);
                        break
                    }
                    case SocketMessage.GARDEN_BOSS_STARTED: {
                        console.log("[WS] recieved GARDEN_BOSS_STARTED");
                        this.currentRoom = "";
                        break
                    }
                    case SocketMessage.GARDEN_BOSS_LEFT: {
                        console.log("[WS] recieved GARDEN_BOSS_LEFT", data);
                        break
                    }
                    case SocketMessage.CONSOLE_RESULT: {
                        console.log("[WS] recieved CONSOLE_RESULT", data);
                        break
                    }
                    case SocketMessage.CONSOLE_ERROR: {
                        console.log("[WS] recieved CONSOLE_ERROR", data);
                        break
                    }
                    case SocketMessage.CONSOLE_LOG: {
                        console.log("[WS] recieved CONSOLE_LOG", data);
                        break
                    }
                    case SocketMessage.EDITOR_ANALYZE: {
                        console.log("[WS] recieved EDITOR_ANALYZE", data);
                        break
                    }
                    case SocketMessage.EDITOR_HOVER: {
                        console.log("[WS] recieved EDITOR_HOVER", data);
                        break
                    }
                    case SocketMessage.EDITOR_COMPLETE: {
                        console.log("[WS] recieved EDITOR_COMPLETE", data);
                        break
                    }
                }
            }
    }
}

export {LeekWarsClient as default};

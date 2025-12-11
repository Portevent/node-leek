import {DefaultApi, DefaultApiApiKeys} from "../codegen/api/defaultApi";
import getCookieToken from "./token-parsing";
import {Farmer} from "../codegen/model/farmer";
import {Folder} from "../codegen/model/folder";
import {Ia} from "../codegen/model/ia";
import {Aicode} from "../codegen/model/aicode";

class NodeLeekClient {

    apiClient: DefaultApi;
    ready: boolean = false;
    farmer: Farmer = new Farmer();
    private foldersById : {[id: number] : string} = {0:"/"}
    private filesByName : {[name: string] : number} = {"/": 0}

    constructor() {
        this.apiClient = new DefaultApi();
    }

    public login(login: string, password: string) {
        return this.apiClient.login({
            login: login,
            password: password,
            keepConnected: true
        }).then(r => {
            console.log("💚 NodeLeek connected !");
            this.apiClient.setApiKey(DefaultApiApiKeys.cookieAuth, getCookieToken(r.response.headers["set-cookie"]))
            this.initClient(r.body.farmer);

            return;
        }).catch(err => {
            if(err?.response?.statusCode == 401 && err.body.error == "invalid"){
                console.error("🛑 Failed to start NodeLeek : invalid credentials.");
            }else{
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
        Object.values(this.farmer.leeks).forEach(leek => console.log("🥬 " + leek.name + " niv." + leek.level + " - " + leek.talent + " talents" + (leek.capital > 0 ? " - ⚠️ " + leek.capital + " capitals to spend" : "")));
    }

    private registerFolder(folder: Folder) {
        if(this.foldersById[folder.folder] === undefined) {
            return false;
        }
        var fullname = this.foldersById[folder.folder] + folder.name + "/";
        this.filesByName[fullname] = folder.id;
        this.foldersById[folder.id] = fullname;
        return true;
    }

    private registerFolders(folders: Array<Folder>) {
        if (folders.length > 0) {
            // Register all folders that haven't been registered on first try
            this.registerFolders(folders.filter(folder => !this.registerFolder(folder)));
        }
    }

    private registerAis(ais: Array<Ia>) {
        ais.forEach(ai => this.registerAi(ai));
    }

    private registerAi(ai: Ia) {
        this.filesByName[this.foldersById[ai.folder] + ai.name + ".leek"] = ai.id
    }

    public getFiles() : {[name: string] : number}{
        return this.filesByName;
    }

    public async fetchFiles(requests: Array<[number, number]>): Promise<Array<Aicode>> {
        const requestedAi: { [ai: number]: number } = {};
        requests.forEach(([ai, timestamp]) => requestedAi[ai] = timestamp);
        const files = await this.apiClient.aiFetch({
            ais: JSON.stringify(requestedAi)
        });
        return files.body;
    }

    public async fetchFile(ai: number, timestamp: number) : Promise<Aicode> {
        return (await this.fetchFiles([[ai, timestamp]]))[0];
    }
}

export default NodeLeekClient;
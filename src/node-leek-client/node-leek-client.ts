import {DefaultApi, DefaultApiApiKeys} from "../codegen/api/defaultApi";
import getCookieToken from "./token-parsing";
import {Farmer} from "../codegen/model/farmer";
import {Folder} from "../codegen/model/folder";
import {Ia} from "../codegen/model/ia";
import {Aicode} from "../codegen/model/aicode";

class NodeLeekClient {

    private apiClient: DefaultApi;
    ready: boolean = false;
    farmer: Farmer = new Farmer();
    private foldersById: { [id: number]: string } = {0: "/"}
    private filesByName: { [name: string]: number } = {"/": 0}

    public static async Create(login: string, password: string): Promise<NodeLeekClient> {
        var client = new NodeLeekClient();
        return client.login(login, password).then(nodeLeek => client);
    }

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
        Object.values(this.farmer.leeks).forEach(leek => console.log("🥬 " + leek.name + " niv." + leek.level + " - " + leek.talent + " talents" + (leek.capital > 0 ? " - ⚠️ " + leek.capital + " capitals to spend" : "")));
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

    public getFiles(): { [name: string]: number } {
        return this.filesByName;
    }

    public async fetchFiles(requests: { [ai: number]: number }): Promise<Array<Aicode>> {
        return this.apiClient.aiFetch({
            ais: JSON.stringify(requests)
        })
            .then(result => result.body)
            .catch(err => {
                console.error("aiFetch(" + requests + ") -> [" + err.statusCode + "] " + err.body.error);
                return [];
            });
    }

    public async fetchFile(ai: number, timestamp: number): Promise<Aicode> {
        const request: { [ai: number]: number } = {}
        request[ai] = timestamp;
        return this.fetchFiles(request)
            .then(result => result[0])
            .catch(err => {
                console.error("aiFetch -> [" + err.statusCode + "] " + err.body.error);
                return new Aicode();
            });
    }
}

export {NodeLeekClient as default};
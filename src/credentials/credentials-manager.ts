import fs from "node:fs";
import NodeLeekClient from "../node-leek-client/node-leek-client";

export class Credentials {
    public username: string = ""
    public password: string = ""
}

export class CredentialsManager {
    private credentials: Credentials[] = [];
    private clients: (NodeLeekClient | null)[] = [];

    constructor(path: string) {
        this.load(path)
    }

    private load(path: string) {
        const credentials = JSON.parse(fs.readFileSync(path, "utf8"));
        if (Array.isArray(credentials)) {
            this.credentials = credentials;
        } else {
            this.credentials = [credentials];
        }
        this.clients = this.credentials.map(credential => null);
    }

    private async connectClient(index: number, readonly: boolean = false) : Promise<NodeLeekClient | null> {
        if (index < 0 || index > this.credentials.length) {
            console.error("CredentialsManager attempt to get client #" + index + " but it doesn't exist, please report this issue");
            return null;
        }

        if (this.clients[index] == null) {
            this.clients[index] = new NodeLeekClient(
                this.credentials[index].username,
                this.credentials[index].password,
                readonly
            )
            await this.clients[index]?.login();
        }
        return this.clients[index];
    }

    private async disconnectClient(index: number) : Promise<void> {
        if (index < 0 || index > this.credentials.length) {
            console.error("CredentialsManager attempt to get client #" + index + " but it doesn't exist, please report this issue");
            return;
        }

        if (this.clients[index] != null) {
            await this.clients[index]?.close();
        }
    }

    public async forEachAccount(input: any, readonly: boolean = false) {
        for (let i = 0; i < this.credentials.length; i++) {
            await input(await this.connectClient(i, readonly), i);
        }
    }

    public async forFirstAccount(input: any, readonly: boolean = false) {
        await input(await this.connectClient(0, readonly), 0);
    }

    public async forOtherAccount(input: any, readonly: boolean = false) {
        for (let i = 1; i < this.credentials.length; i++) {
            await input(await this.connectClient(i, readonly), i);
        }
    }

    public async forEachAccountSimultaneous(input: any, readonly: boolean = false) {
        await this.connectEachAccount();
        return Promise.all(this.clients.map(async (client, index) => {
            await input(client, index);
        }))
    }

    public async connectEachAccount(readonly: boolean = false) {
        for (var i = 0; i < this.credentials.length; i++) {
            await this.connectClient(i, readonly);
        }
    }

    public async disconnectEachAccount() {
        for (var i = 0; i < this.credentials.length; i++) {
            await this.disconnectClient(i);
        }
    }
}

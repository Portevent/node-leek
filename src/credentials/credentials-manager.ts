import fs from "node:fs";

export class Credentials {
    public username: string = ""
    public password: string = ""
}

export class CredentialsManager{
    private credentials: Credentials[] = [];

    constructor(path: string){
        this.load(path)
    }

    private load(path: string) {
        const credentials = JSON.parse(fs.readFileSync(path, "utf8"));
        if (Array.isArray(credentials)){
            this.credentials = credentials;
        }else{
            this.credentials = [credentials];
        }
    }

    public async forEachAccount(input: any) {
        for (const credential in this.credentials) {
            await input(credential);
        }
    }
}

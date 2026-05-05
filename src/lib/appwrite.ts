import { Client, Account, Databases, ID, Query } from "appwrite";

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://syd.cloud.appwrite.io/v1")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69f7627a0008ee7f5cf2");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases, ID, Query };

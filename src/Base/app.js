import { Client, GatewayIntentBits, Partials } from "discord.js";
import { readdirSync } from "node:fs";
import config from "./config.js";

class BaseClient {
  constructor(token) {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
      shards: "auto",
    });
    this.token = token;
  }

  loadHandlers() {
    readdirSync("./src/Handlers").forEach(async (file) => {
      const handlerFile = await import(`../Handlers/${file}`);
      const handler = handlerFile.default;
      handler.execute(this.client);
    });
  }

  start() {
    this.loadHandlers();
    this.client.login(this.token);
  }
}

const token = config.token;
const client = new BaseClient(token);
client.start();

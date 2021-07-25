const { Client, Collection, MessageEmbed } = require("discord.js");
const { promisify } = require("util"),
  path = require("path"),
  mysql = require("mysql"),
  fs = require("fs"),
  readdir = promisify(fs.readdir),
  config = require("./config.js");

const db = mysql.createConnection({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  charset: "utf8mb4",
});

// Creates new class
class xiBot extends Client {
  constructor(options) {
    super(options);
    this.config = config; // Load config file
    this.commands = new Collection(); // Create new collection commands
    this.aliases = new Collection(); // Create new collection aliases
    this.wait = promisify(setTimeout); // client.wait(1000)
    this.collectors = {};
    this.db = db;
    this.emotes = config.emotes;
    this.logger = require("./utils/logger.js");
    this.achievement = require("./utils/achievement.js");
    this.apiVerif = require("./utils/apiVerif.js");
  }

  loadCommand(commandPath, commandName) {
    try {
      const props = new (require(`${commandPath}${path.sep}${commandName}`))(
        this
      );
      this.logger.log(`Loading Command: ${props.help.name}. 👌`, "log");
      props.conf.location = commandPath;
      if (props.init) {
        props.init(this);
      }
      this.commands.set(props.help.name, props);
      props.conf.aliases.forEach((alias) => {
        this.aliases.set(alias, props.help.name);
      });
      return false;
    } catch (e) {
      return `Unable to load command ${commandName} : ${e}`;
    }
  }

  // This function is used to unload a command (you need to load them again)
  async unloadCommand(commandPath, commandName) {
    let command;
    if (this.commands.has(commandName)) {
      command = this.commands.get(commandName);
    } else if (this.aliases.has(commandName)) {
      command = this.commands.get(this.aliases.get(commandName));
    }
    if (!command) {
      return `The command \`${commandName}\` doesn't seem to exist, nor is it an alias. Try again!`;
    }
    if (command.shutdown) {
      await command.shutdown(this);
    }
    delete require.cache[
      require.resolve(`${commandPath}${path.sep}${commandName}.js`)
    ];
    return false;
  }
}

// Creates new client
const client = new xiBot();

const init = async () => {
  // Search for all commands
  let directories = await readdir("./commands/");
  client.logger.log(
    `Loading a total of ${directories.length} categories.`,
    "log"
  );
  directories.forEach(async (dir) => {
    let commands = await readdir("./commands/" + dir + "/");
    commands
      .filter((cmd) => cmd.split(".").pop() === "js")
      .forEach((cmd) => {
        const response = client.loadCommand("./commands/" + dir, cmd);
        if (response) {
          client.logger.log(response, "error");
        }
      });
  });

  // Then we load events, which will include our message and ready event.
  const evtFiles = await readdir("./events/");
  client.logger.log(`Loading a total of ${evtFiles.length} events.`, "log");
  evtFiles.forEach((file) => {
    const eventName = file.split(".")[0];
    client.logger.log(`Loading Event: ${eventName}`);
    const event = new (require(`./events/${file}`))(client);
    client.on(eventName, (...args) => event.run(...args));
    delete require.cache[require.resolve(`./events/${file}`)];
  });

  client.login(client.config.token).catch(console.error); // Log in to the discord api
};

init();

// if there are errors, log them
client
  .on("disconnect", () => client.logger.log("Bot is disconnecting...", "warn"))
  .on("reconnecting", () => client.logger.log("Bot reconnecting...", "log"))
  .on("error", (e) => client.logger.log(e, "error"))
  .on("warn", (info) => client.logger.log(info, "log"));

// if there is an unhandledRejection, log them
process.on("unhandledRejection", (err) => {
  console.error(err);
});

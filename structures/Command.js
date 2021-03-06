const path = require("path");

module.exports = class Command {
  constructor(
    client,
    {
      name = null,
      dirname = false,
      enabled = true,
      guildOnly = false,
      aliases = new Array(),
      examples = null,
      usage = null,
      desc = null,
      botPermissions = new Array(),
      memberPermissions = new Array(),
      nsfw = false,
      ownerOnly = false,
      cooldown = 3000,
    }
  ) {
    let category = dirname
      ? dirname.split(path.sep)[
          parseInt(dirname.split(path.sep).length - 1, 10)
        ]
      : "Other";
    this.client = client;
    this.conf = {
      enabled,
      guildOnly,
      aliases,
      memberPermissions,
      botPermissions,
      nsfw,
      ownerOnly,
      cooldown,
    };
    this.help = { name, usage, desc, examples, category };
  }
};

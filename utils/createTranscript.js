const Discord = require("discord.js");
const db = require("quick.db");
const fs = require("fs");
const { generateTranscript } = require("./utils.js");

const htmlTranscript = async (client, message, ticket, interaction) => {
  let config = client.config;
  let author = db.fetch(`ticketOwner_${interaction.channel.id}`);
  let openedTimestamp = db.fetch(`openedTimestamp_${interaction.channel.id}`);
  let messageCollection = new Discord.Collection();
  let channelMessages = await message.channel.messages.fetch({ limit: 100 });

  messageCollection = messageCollection.concat(channelMessages);

  while(channelMessages.size === 100) {
    let lastMessageId = channelMessages.lastKey();
    channelMessages = await message.channel.messages.fetch({ limit: 100, before: lastMessageId });
    if(channelMessages) messageCollection = messageCollection.concat(channelMessages);
  }
  
  let msgs = [...messageCollection.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp)
  let data = await fs.readFileSync('./data/template.html', {
    encoding: 'utf-8'
  });
  if(data) {
    await generateTranscript(message, msgs, ticket)
    let path = `./transcripts/${ticket}.html`;
    
    let logEmbed = new Discord.MessageEmbed()
      .setColor(client.embeds.transcriptLog.color);

    if (client.embeds.transcriptLog.title) logEmbed.setTitle(client.embeds.transcriptLog.title);
    let field = client.embeds.transcriptLog.fields;
    for (let i = 0; i < client.embeds.transcriptLog.fields.length; i++) {
      logEmbed.addField(field[i].title, field[i].description.replace("<closedBy>", interaction.member.user)
        .replace("<ticketId>", `${ticket}`.replace("ticket-", ""))
        .replace("<author>", `<@${author}>`)
        .replace("<channelId>", interaction.channel.id)
        .replace("<channelName>", interaction.channel.name)
        .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
        .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`))
    }

    if (client.embeds.transcriptLog.footer == true) logEmbed.setFooter({ text: message.member.user.username, iconURL: message.member.user.displayAvatarURL() }).setTimestamp();
    if (client.embeds.transcriptLog.thumbnail == true) logEmbed.setThumbnail(message.member.user.displayAvatarURL());

    if (client.embeds.transcriptLog.description) logEmbed.setDescription(client.embeds.transcriptLog.description.replace("<closedBy>", interaction.member.user)
      .replace("<ticketId>", `${ticket}`.replace("ticket-", ""))
      .replace("<author>", `<@${author}>`)
      .replace("<channelId>", interaction.channel.id)
      .replace("<channelName>", interaction.channel.name)
      .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
      .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`));
    
    let serverUrl = client.config.server.url;
    let serverPort = client.config.server.port;
    let bttnRow = new Discord.MessageActionRow();
    
    let dwnButton = new Discord.MessageButton()
      .setURL(serverUrl + `:${serverPort}` + `/tickets/${ticket.split("-")[1]}/download`)
      .setLabel(client.language.buttons.transcripts.download)
      .setStyle('LINK')
      .setEmoji(client.config.emojis.transcripts.download);
    let viewButton = new Discord.MessageButton()
      .setURL(serverUrl + `:${serverPort}` + `/tickets/${ticket.split("-")[1]}`)
      .setLabel(client.language.buttons.transcripts.view)
      .setStyle('LINK')
      .setEmoji(client.config.emojis.transcripts.view);
    
    if(client.config.server.selfhost.download == true && client.config.server.enabled == true) bttnRow.addComponents(dwnButton);
    if(client.config.server.selfhost.view == true && client.config.server.enabled == true) bttnRow.addComponents(viewButton);

    let sendObject = {
      embeds: [logEmbed],
      files: client.config.server.selfhost.download == false ? [path] : [],
      components: bttnRow.components.length > 0 ? [bttnRow] : []
    }

    let aChannel = client.utils.findChannel(message.guild, config.channels.transcripts);
    aChannel.send(sendObject).then(() => {
      setTimeout(() => {
        if(message.channel) message.channel.delete();
      }, client.config.general.delete_after * 1000);
    }); 

    if(config.general.dm_transcript == true) {
      let dmEmbed = new Discord.MessageEmbed()
        .setColor(client.embeds.dmTranscript.color);

      if(client.embeds.dmTranscript.title) dmEmbed.setTitle(client.embeds.dmTranscript.title);
      let field = client.embeds.dmTranscript.fields;
      for(let i = 0; i < client.embeds.dmTranscript.fields.length; i++) {
        dmEmbed.addField(field[i].title, field[i].description.replace("<closedBy>", interaction.member.user)
          .replace("<ticketId>", `${ticket}`.replace("ticket-", ""))
          .replace("<author>", `<@${author}>`)
          .replace("<channelId>", interaction.channel.id)
          .replace("<channelName>", interaction.channel.name)
          .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
          .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`))
      }
      
      if(client.embeds.dmTranscript.footer == true) dmEmbed.setFooter({ text: message.member.user.username, iconURL: message.member.user.displayAvatarURL() }).setTimestamp();
      if(client.embeds.dmTranscript.thumbnail == true) dmEmbed.setThumbnail(message.member.user.displayAvatarURL());

      if(client.embeds.dmTranscript.description) dmEmbed.setDescription(client.embeds.dmTranscript.description.replace("<closedBy>", interaction.member.user)
        .replace("<ticketId>", `${ticket}`.replace("ticket-", ""))
        .replace("<author>", `<@${author}>`)
        .replace("<channelId>", interaction.channel.id)
        .replace("<channelName>", interaction.channel.name)
        .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
        .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`));

      if(config.general.dm_transcript == true) {
        let authorDM = db.fetch(`ticketOwner_${message.channel.id}`);
        let supportDM = db.fetch(`ticketClaimed_${message.channel.id}`);
        authorDM = client.users.cache.get(authorDM);
        supportDM = client.users.cache.get(supportDM);
        if(authorDM != undefined) {
          authorDM.send(sendObject).catch((err) => {
            console.error("Author's DM Closed");
          });
        }
        if(supportDM != undefined && supportDM != authorDM) {
          supportDM.send(sendObject).catch((err) => {
            console.error("Support's DM Closed");
          });
        }
      };
    };
    let dataRemove = db
      .all()
      .filter((i) => i.ID.includes(message.channel.id));

    dataRemove.forEach((x) => db.delete(x.ID));
  }
}

const textTranscript = async (client, message, ticket, interaction) => {
  let config = client.config;
  let author = db.fetch(`ticketOwner_${interaction.channel.id}`);
  let openedTimestamp = db.fetch(`openedTimestamp_${interaction.channel.id}`);
  let write = fs.createWriteStream(`transcripts/ticket-${ticket}.txt`);
  message.channel.messages.fetch({ limit: 100 }).then((messages) => {
    let messages2 = messages;
    let me = messages2.sort((b, a) => b.createdTimestamp - a.createdTimestamp);

    me.forEach((msg) => {
      const time = msg.createdAt.toLocaleString();
      write.write(`[${time}] ${msg.author.tag}: ${msg.content}\n`);
    });
    write.end();
    
    let logEmbed = new Discord.MessageEmbed()
      .setColor(client.embeds.transcriptLog.color);

    if (client.embeds.transcriptLog.title) logEmbed.setTitle(client.embeds.transcriptLog.title);
    let field = client.embeds.transcriptLog.fields;
    for (let i = 0; i < client.embeds.transcriptLog.fields.length; i++) {
      logEmbed.addField(field[i].title, field[i].description.replace("<closedBy>", interaction.member.user)
        .replace("<ticketId>", `${ticket}`.replace("ticket-", ""))
        .replace("<author>", `<@${author}>`)
        .replace("<channelId>", interaction.channel.id)
        .replace("<channelName>", interaction.channel.name)
        .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
        .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`))
    }

    if (client.embeds.transcriptLog.footer == true) logEmbed.setFooter({ text: message.member.user.username, iconURL: message.member.user.displayAvatarURL() }).setTimestamp();
    if (client.embeds.transcriptLog.thumbnail == true) logEmbed.setThumbnail(message.member.user.displayAvatarURL());

    if (client.embeds.transcriptLog.description) logEmbed.setDescription(client.embeds.transcriptLog.description.replace("<closedBy>", interaction.member.user)
      .replace("<ticketId>", `${ticket}`.replace("ticket-", ""))
      .replace("<author>", `<@${author}>`)
      .replace("<channelId>", interaction.channel.id)
      .replace("<channelName>", interaction.channel.name)
      .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
      .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`));
    
    let aChannel = client.utils.findChannel(message.guild, config.channels.transcripts);
    aChannel.send({ embeds: [logEmbed], files: [`transcripts/ticket-${ticket}.txt`] }).then(() => {
      setTimeout(() => {
        if(message.channel) message.channel.delete();
      }, client.config.general.delete_after * 1000);
    }); 

    if(config.general.dm_transcript == true) {
      let dmEmbed = new Discord.MessageEmbed()
        .setColor(client.embeds.dmTranscript.color);

      if(client.embeds.dmTranscript.title) dmEmbed.setTitle(client.embeds.dmTranscript.title);
      let field = client.embeds.dmTranscript.fields;
      for(let i = 0; i < client.embeds.dmTranscript.fields.length; i++) {
        dmEmbed.addField(field[i].title, field[i].description.replace("<closedBy>", interaction.member.user)
          .replace("<ticketId>", ticket)
          .replace("<author>", `<@${author}>`)
          .replace("<channelId>", interaction.channel.id)
          .replace("<channelName>", interaction.channel.name)
          .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
          .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`))
      }
      
      if(client.embeds.dmTranscript.footer == true) dmEmbed.setFooter({ text: message.member.user.username, iconURL: message.member.user.displayAvatarURL() }).setTimestamp();
      if(client.embeds.dmTranscript.thumbnail == true) dmEmbed.setThumbnail(message.member.user.displayAvatarURL());

      if(client.embeds.dmTranscript.description) dmEmbed.setDescription(client.embeds.dmTranscript.description.replace("<closedBy>", interaction.member.user)
        .replace("<ticketId>", ticket)
        .replace("<author>", `<@${author}>`)
        .replace("<channelId>", interaction.channel.id)
        .replace("<channelName>", interaction.channel.name)
        .replace("<openedAt>", `<t:${Math.round(openedTimestamp/1000)}:F>`)
        .replace("<closedAt>", `<t:${Math.round(interaction.createdTimestamp/1000)}:F>`));

      if(config.general.dm_transcript == true) {
        let authorDM = db.fetch(`ticketOwner_${message.channel.id}`);
        let supportDM = db.fetch(`ticketClaimed_${message.channel.id}`);
        authorDM = client.users.cache.get(authorDM);
        supportDM = client.users.cache.get(supportDM);
        if(authorDM != undefined) {
          authorDM.send({ embeds: [dmEmbed], files: [`transcripts/ticket-${ticket}.txt`] }).catch((err) => {
            console.error("Author's DM Closed");
          });
        }
        if(supportDM != undefined && supportDM != authorDM) {
          supportDM.send({ embeds: [dmEmbed], files: [`transcripts/ticket-${ticket}.txt`] }).catch((err) => {
            console.error("Support's DM Closed");
          });
        }
      };
    };
    let dataRemove = db
      .all()
      .filter((i) => i.ID.includes(message.channel.id));

    dataRemove.forEach((x) => db.delete(x.ID));
  });
}

module.exports = {
  htmlTranscript,
  textTranscript,
}

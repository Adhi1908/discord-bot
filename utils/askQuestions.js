const Discord = require("discord.js");
const db = require("quick.db");

module.exports = async(client, button, channel, questionsList) => {
  let config = client.config;
  if(questionsList.length == 0) return;
  const chunkSize = 5;
  const arrOfChunks = [];

  for (let i = 0; i < questionsList.length; i += chunkSize) {
    const chunk = questionsList.slice(i, i + chunkSize);
    arrOfChunks.push(chunk)
  }

  let modalArr = [];
  for (let i = 0; i < arrOfChunks.length; i++) {
    modalArr.push(arrOfChunks[i].map((x) => {
      let questionIndex = questionsList.indexOf(questionsList.find((q) => q.name == x.name));
      let modalData = new Discord.MessageActionRow().addComponents(
        new Discord.TextInputComponent()
        .setLabel(x.name)
        .setStyle("PARAGRAPH")
        .setCustomId(`modalQuestion_${questionIndex}`)
        .setPlaceholder(x.question)
      );

      return modalData;
    }))
  }

  let startingPage = db.fetch(`questionPage_${channel.id}`) || 1;
  
  let questModal = new Discord.Modal()
    .setTitle(client.language.titles.questions.replace("<page>", startingPage).replace("<max>", modalArr.length))
    .setComponents(modalArr[startingPage - 1])
    .setCustomId("askQuestions_modal");

  let isAnswered = db.fetch(`questionsAnswered_${channel.id}`);
  
  if (isAnswered == true) {
    button.message.components[0].components[client.config.general.close_button == true ? 1 : 0]
      .setStyle("SECONDARY")
      .setLabel(client.language.buttons.answered_all)
      .setDisabled(true);
    button.message.edit({ embeds: [button.message.embeds[0]], components: [button.message.components[0]] });
    return;
  }

  button.showModal(questModal);

  const filter = (i) => i.customId == 'askQuestions_modal' && i.user.id == button.user.id;
  button.awaitModalSubmit({ filter, time: client.config.general.question_idle * 1000 })
    .then(async (interaction) => {
      let currPage = db.fetch(`questionPage_${channel.id}`);
      
      if (parseInt(currPage + 1) > modalArr.length || modalArr.length == 1) {
        await interaction.deferUpdate();
        
        if(modalArr.length <= 5) {
          interaction.components.map((v) => {
            let questionIndex = v.components[0].customId.split("_")[1];
            db.push(`channelQuestions_${channel.id}`, {
              question: questionsList[questionIndex].name,
              answer: v.components[0].value
            });
          });
        }
        
        db.set(`questionsAnswered_${channel.id}`, true);
        
        interaction.message.components[0].components[client.config.general.close_button == true ? 1 : 0]
          .setStyle("SECONDARY")
          .setLabel(client.language.buttons.answered_all)
          .setDisabled(true);

        interaction.followUp({ embeds: [client.embedBuilder(client, interaction.user, client.embeds.title, client.language.ticket.answered_all, client.embeds.success_color)], ephemeral: true });
        interaction.message.edit({ embeds: [interaction.message.embeds[0]], components: [interaction.message.components[0]] });
        let answerData = db.fetch(`channelQuestions_${channel.id}`) || [];
        
        let submitEmbed = new Discord.MessageEmbed()
          .setTitle(client.language.titles.answers)
          .setColor(client.embeds.general_color)
          .setFooter({ text: button.member.user.username, iconURL: button.member.user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();

        for (let i = 0; i < answerData.length; i++) {
          submitEmbed.addField(answerData[i].question, answerData[i].answer == "" ? "N/A" : answerData[i].answer);
        }

        interaction.followUp({ embeds: [submitEmbed] });
      } else {
        let questionPage = db.fetch(`questionPage_${channel.id}`);
        db.add(`questionPage_${channel.id}`, questionPage ? 1 : 2);
        questionPage = db.fetch(`questionPage_${channel.id}`);

        interaction.components.map((v) => {
          let questionIndex = v.components[0].customId.split("_")[1];
          db.push(`channelQuestions_${channel.id}`, {
            question: questionsList[questionIndex].name,
            answer: v.components[0].value
          });
        });

        questModal
          .setTitle(client.language.titles.questions.replace("<page>", parseInt(questionPage)).replace("<max>", modalArr.length))
          .setComponents(modalArr[parseInt(questionPage - 1)]);

        interaction.message.components[0].components[client.config.general.close_button == true ? 1 : 0].setLabel(client.language.buttons.answer_questions.replace("<page>", questionPage));
        interaction.reply({ embeds: [client.embedBuilder(client, interaction.user, client.embeds.title, client.language.ticket.answered_set, client.embeds.general_color)], ephemeral: true });
        interaction.message.edit({ embeds: [interaction.message.embeds[0]], components: [interaction.message.components[0]] })
      }
    }).catch((err) => {
      button.message.components[0].components[client.config.general.close_button == true ? 1 : 0].setDisabled(true);
      button.message.edit({ embeds: [button.message.embeds[0]], components: [button.message.components[0]] });
    });
}

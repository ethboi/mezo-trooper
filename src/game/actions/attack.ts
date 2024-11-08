import { ButtonInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js'
import { getLabelByCustomId } from '../utilities'
import { goBackButton } from './common/buttons'

export async function handleAttackOptions(interaction: ButtonInteraction) {
  const embed = new EmbedBuilder()
    .setTitle(`Select your BitcoinFi Weapon:`)
    .setDescription('Some weapons are more effective than others, choose wisely!')
    .setColor(0x00ff00)

  const stickButton = new ButtonBuilder()
    .setCustomId('dagger')
    .setLabel(getLabelByCustomId('dagger'))
    .setEmoji('🦯')
    .setStyle(ButtonStyle.Success)

  const fistButton = new ButtonBuilder()
    .setCustomId('fist')
    .setLabel(getLabelByCustomId('fist'))
    .setEmoji('👊')
    .setStyle(ButtonStyle.Success)

  const blasterButton = new ButtonBuilder()
    .setCustomId('blaster')
    .setLabel(getLabelByCustomId('blaster'))
    .setEmoji('💥')
    .setStyle(ButtonStyle.Success)

  const cannonButton = new ButtonBuilder()
    .setCustomId('cannon')
    .setLabel(getLabelByCustomId('cannon'))
    .setEmoji('🔫')
    .setStyle(ButtonStyle.Success)

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    stickButton,
    fistButton,
    blasterButton,
    cannonButton,
    goBackButton(),
  )

  await interaction.update({
    embeds: [embed],
    components: [actionRow],
  })
}

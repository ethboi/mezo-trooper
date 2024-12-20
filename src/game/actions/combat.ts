import { ButtonInteraction, bold, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Client } from 'discord.js'
import { getTrooper, insertOrUpdatePlayer, incrementDeaths } from '../../provider/mongodb'
import { defences, quotes, weapons } from '../constants'
import { logPlayerDeath } from '../utilities'
import { territories } from '../constants'
import { handleSpecialOutcome } from './special'
import { getFallbackTerritory } from './territories'
import { continueButton, goBackButton } from './common/buttons'
import { checkCooldown, handleCooldown } from './cooldown'

export async function handleCombatCommand(
  interaction: ButtonInteraction,
  userChoice: string,
  powerLevel: number,
  cooldowns: Map<string, number> = new Map(),
) {
  // Defer the interaction update to avoid expiration issues
  if (!interaction.deferred) {
    await interaction.deferUpdate()
  }
  console.log('--- handleCombatCommand START ---')

  try {
    const userId = interaction.user.id
    const avatarUrl = interaction.user.displayAvatarURL()
    const lastCommandTime = cooldowns.get(userId) || 0
    const now = Date.now()
    // const timeLeft = lastCommandTime - now;

    console.log('User ID:', userId)
    console.log('Avatar URL:', avatarUrl)
    console.log('Last Command Time:', lastCommandTime)
    console.log('Current Time:', now)
    // console.log('Time Left:', timeLeft)

    // if (timeLeft > 0) {
    //   // Player is on cooldown
    //   const cooldownEmbed = new EmbedBuilder()
    //     .setTitle('🛌 You’re on R&R!')
    //     .setDescription(
    //       `You've been put on rest and relaxation. You'll be back in action soon!\n\n**Cooldown Ends:** <t:${Math.floor(
    //         (lastCommandTime / 1000),
    //       )}:R>`,
    //     )
    //     .setColor(0x3498db) // Cooldown color
    //     .setImage('https://gifs.cackhanded.net/starship-troopers/kiss.gif'); // Replace with your GIF URL
    //     const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
 
    //       goBackButton(),
    //     )
    //   await interaction.editReply({
    //     embeds: [cooldownEmbed],
    //     components: [actionRow], 
    //   });

    //   return;
    // }

    const trooper = (await getTrooper(userId)) || {
      userId,
      points: 0,
      deaths: 0, 
      currentTerritory: territories.CAMP_SATOSHI,
    }

    console.log('Trooper Data:', trooper)

    if (interaction.isButton() && (userChoice === weapons.DAGGER || userChoice === defences.SNACKING)) {
      console.log('Handling special outcome for user choice:', userChoice)
      await handleSpecialOutcome(interaction, userChoice, trooper, userId, powerLevel, userChoice, avatarUrl)
      return
    }

    const boostedResult = isBoosted()
    const successChance = getSuccessChance(powerLevel, trooper.currentTerritory)
    const isSuccessful = Math.random() < successChance
    let pointsChange = isSuccessful ? calculatePoints(powerLevel, trooper.currentTerritory) : 0

    console.log('Boosted Result:', boostedResult)
    console.log('Success Chance:', successChance)
    console.log('Is Successful:', isSuccessful)
    console.log('Points Change before Boost:', pointsChange)

    if (boostedResult) pointsChange *= 7

    console.log('Points Change after Boost (if applied):', pointsChange)

    let title = ''
    let messageContent = ''
    let gifUrl = ''
    let color = 0x00ff00

    if (isSuccessful) {
      trooper.points += pointsChange
      title = '🎉 Mission accomplished!'
      messageContent = `You've earned ✨${bold(pointsChange.toString())} points!\nYour new total is ✨${bold(
        trooper.points.toString(),
      )} points. Keep up the great work, Trooper! 💪`

      console.log('Mission Success. Points after adding:', trooper.points)

      if (boostedResult) {
        const boosts = [
          {
            type: 'airdrop',
            title: '🪂 Airdrop Incoming!',
            message: `The latest sharding BitcoinFi Assault Rifle was airdropped from Mezo, Fiat hive was ${bold(
              'OBLITERATED',
            )}!`,
            gifUrl:
              'https://media1.tenor.com/m/C0vINUKPPtUAAAAC/dizzy-flores-isabel-flores-isabelle-flores-dina-meyer-starship-troopers.gif',
          },
          {
            type: 'grenade',
            title: '💥 Grenade Deployed!',
            message: `Tactical Mezo Decentralization Grenade deployed, Fiat hive was ${bold('NUKED')}!`,
            gifUrl: 'https://i.gifer.com/IcYx.gif',
          },
          {
            type: 'teamwork',
            title: '👥 Teamwork Boost!',
            message: `Squad ${bold('Mezo G6')} joins your position, Fiat hive was ${bold('DESTROYED')}!`,
            gifUrl: 'https://c.tenor.com/41agPzUN8gAAAAAd/tenor.gif',
          },
          {
            type: 'strike',
            title: '⚔️ Precision Strike!',
            message: `You initiated a precise Mezo strike, the Fiat Bug Empire is ${bold('DEVASTATED')}!`,
            gifUrl: 'https://c.tenor.com/c9scti8m3HAAAAAd/tenor.gif',
          },
          {
            type: 'ambush',
            title: '🚀 Surprise Ambush!',
            message: `You led an ambush, overwhelming the Fiat Empire forces, leaving them ${bold('CRUSHED')}!`,
            gifUrl: 'https://c.tenor.com/yuBjFMtigKMAAAAd/tenor.gif',
          },
          {
            type: 'recon',
            title: '🔍 Recon Success!',
            message: `Recon gathered crucial intel, catching Fiat Bugs off guard and ${bold(
              'DEMOLISHING',
            )} their defenses!`,
            gifUrl: 'https://c.tenor.com/N4KgRUxSD7gAAAAd/tenor.gif',
          },
        ]

        const randomBoost = boosts[Math.floor(Math.random() * boosts.length)]
        title = randomBoost.title
        messageContent = `${randomBoost.message}\nYou earned ✨${bold(
          pointsChange.toString(),
        )} points! New total: ✨${bold(trooper.points.toString())} points.`
        gifUrl = randomBoost.gifUrl

        console.log('Boosted Event:', randomBoost.type)
      }
    } else {
      title = '💀 Mission failed!'
      color = 0xffffff

      await logPlayerDeath(
        interaction.client as Client,
        userId,
        trooper.points,
        trooper.currentTerritory,
        userChoice,
        powerLevel,
        avatarUrl,
      )

      trooper.points = 0
      trooper.deaths = (trooper.deaths || 0) + 1; 
      await incrementDeaths(userId); // Update death count in database
      gifUrl = 'https://media1.tenor.com/m/0uCuBpDbYVYAAAAd/dizzy-death.gif'

      if (trooper.currentTerritory !== territories.CAMP_SATOSHI) {
        trooper.currentTerritory = getFallbackTerritory(trooper.currentTerritory)
        messageContent = `You were ${bold('DEFEATED')} and lost all points! Falling back to ${bold(
          trooper.currentTerritory,
        )}.\n\n${getQuote()}`
      } else {
        messageContent = `You were ${bold('DEFEATED')} and lost all points! 💀💀💀\n\n${getQuote()}`
      }

      console.log('Mission Failure. Points reset to:', trooper.points)
       // Set 5-minute cooldown
      cooldowns.set(userId, now + 5 * 60 * 1000); // 5 minutes in milliseconds
      console.log('Cooldown set for user:', userId)
    }

   

    await insertOrUpdatePlayer(trooper)
    console.log('Player data updated in database:', trooper)

    const embed = new EmbedBuilder().setTitle(title).setDescription(messageContent).setColor(color)
    if (gifUrl) embed.setImage(gifUrl)

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(continueButton())

    try {
      await interaction.editReply({
        embeds: [embed],
        components: [actionRow],
      })
    } catch (error) {
      console.error('Error in handleAttackOptions:', error)
      await interaction.followUp({
        content: 'Something went wrong while updating the attack options. Please try again.',
        ephemeral: true,
      })
    }

    console.log('--- handleCombatCommand END ---')
  } catch (error) {
    console.error('Error in handleCombatCommand:', error)
    await interaction.reply({ content: 'An unexpected error occurred. Please contact support.', ephemeral: true })
  }
}

function getQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length)
  return quotes[randomIndex]
}

function calculatePoints(powerLevel: number, territory: string): number {
  let basePoints: number

  switch (territory) {
    case territories.CAMP_SATOSHI:
      basePoints = 100
      break
    case territories.MATS_FARMING_BASE:
      basePoints = 500
      break
    case territories.MEZO_COMMAND:
      basePoints = 1000
      break
    case territories.BITCOINFI_FRONTIER:
      basePoints = 2500
      break
    default:
      basePoints = 100
  }

  switch (powerLevel) {
    case 1:
      return basePoints
    case 5:
      return basePoints * 2
    case 10:
      return basePoints * 4
    case 100:
      return basePoints * 10
    default:
      return basePoints
  }
}

function getSuccessChance(powerLevel: number, territory: string): number {
  let successChance: number
  switch (territory) {
    case territories.CAMP_SATOSHI:
      successChance = powerLevel === 100 ? 0.8 : powerLevel === 10 ? 0.85 : powerLevel === 5 ? 0.95 : 0.97
      break
    case territories.MATS_FARMING_BASE:
      successChance = powerLevel === 100 ? 0.75 : powerLevel === 10 ? 0.80 : powerLevel === 5 ? 0.92 : 0.95
      break
    case territories.MEZO_COMMAND:
      successChance = powerLevel === 100 ? 0.7 : powerLevel === 10 ? 0.75 : powerLevel === 5 ? 0.90 : 0.92
      break
    case territories.BITCOINFI_FRONTIER:
      successChance = powerLevel === 100 ? 0.5 : powerLevel === 10 ? 0.7 : powerLevel === 5 ? 0.80 : 0.90
      break
    default:
      successChance = 0.95
  }
  return successChance
}

function isBoosted() {
  return Math.floor(Math.random() * 5) === 0
}

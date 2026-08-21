require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { status, statusBedrock } = require('minecraft-server-util');

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  VOICE_CHANNEL_ID,
  MC_HOST,
  MC_PORT,
  MC_EDITION,      // "java" o "bedrock"
  CHECK_INTERVAL_MS
} = process.env;

const interval = parseInt(CHECK_INTERVAL_MS || '30000', 10); // 30s por defecto
const edition = (MC_EDITION || 'java').toLowerCase();
const port = parseInt(MC_PORT || (edition === 'bedrock' ? '19132' : '25565'), 10);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

let lastKnownOnline = null; // null = aún no se sabe, true/false = último estado conocido

// ----------------------------------------------------------------
// Link de invitación impreso en consola al arrancar
// ----------------------------------------------------------------
function printInviteLink() {
  if (!CLIENT_ID) {
    console.log('ℹ️  No configuraste CLIENT_ID en el .env, así que no puedo generar el link de invitación automáticamente.');
    console.log('   Puedes generarlo manualmente en https://discord.com/developers/applications → tu app → OAuth2 → URL Generator.');
    return;
  }
  const permissions = '3145728'; // Connect (1<<20) + Speak (1<<21)
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=bot`;
  console.log('\n===============================================');
  console.log('🔗 Link para invitar el bot a tu servidor de Discord:');
  console.log(inviteUrl);
  console.log('===============================================\n');
}

// ----------------------------------------------------------------
// Consulta el estado del servidor de Minecraft
// ----------------------------------------------------------------
async function pingServer() {
  try {
    const result = edition === 'bedrock'
      ? await statusBedrock(MC_HOST, port, { timeout: 5000 })
      : await status(MC_HOST, port, { timeout: 5000 });

    return {
      online: true,
      players: result.players.online,
      maxPlayers: result.players.max,
    };
  } catch (err) {
    return { online: false };
  }
}

// ----------------------------------------------------------------
// Unirse / salir del canal de voz según el estado
// ----------------------------------------------------------------
async function updateVoicePresence(guild, isOnline) {
  const existingConnection = getVoiceConnection(guild.id);

  if (isOnline && !existingConnection) {
    try {
      joinVoiceChannel({
        channelId: VOICE_CHANNEL_ID,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true,
      });
      console.log('✅ Server online: bot unido al canal de voz.');
    } catch (err) {
      console.error('Error al unirse al canal de voz:', err);
    }
  } else if (!isOnline && existingConnection) {
    existingConnection.destroy();
    console.log('❌ Server offline: bot salió del canal de voz.');
  }
}

// ----------------------------------------------------------------
// Actualiza el estado ("Jugando X/Y jugadores")
// ----------------------------------------------------------------
async function updateBotStatus(data) {
  if (data.online) {
    client.user.setPresence({
      activities: [{
        name: `${data.players}/${data.maxPlayers} jugadores`,
        type: ActivityType.Playing,
      }],
      status: 'online',
    });
  } else {
    client.user.setPresence({
      activities: [{ name: 'Servidor offline', type: ActivityType.Watching }],
      status: 'idle',
    });
  }
}

async function checkLoop() {
  const data = await pingServer();

  if (data.online !== lastKnownOnline) {
    console.log(data.online
      ? `Servidor detectado ONLINE (${data.players}/${data.maxPlayers})`
      : 'Servidor detectado OFFLINE');
    lastKnownOnline = data.online;
  }

  await updateBotStatus(data);

  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    await updateVoicePresence(guild, data.online);
  } else {
    console.error('⚠️ No se encontró el GUILD_ID configurado. Revisa tu .env');
  }
}

client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
  printInviteLink();
  checkLoop(); // primera verificación inmediata
  setInterval(checkLoop, interval);
});

client.login(DISCORD_TOKEN);

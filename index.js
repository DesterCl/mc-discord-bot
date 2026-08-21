require('dotenv').config();
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
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
// Mantener al bot SIEMPRE conectado al canal de voz,
// con reconexión automática si se cae la conexión.
// ----------------------------------------------------------------
function connectToVoiceChannel(guild) {
  const existing = getVoiceConnection(guild.id);
  if (existing && existing.state.status !== VoiceConnectionStatus.Destroyed) {
    return existing; // ya conectado, no hacer nada
  }

  const connection = joinVoiceChannel({
    channelId: VOICE_CHANNEL_ID,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: true,
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    console.log('⚠️ Conexión de voz perdida, intentando reconectar...');
    try {
      // Discord a veces solo re-negocia la conexión; le damos una oportunidad.
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      // No se recuperó sola: destruimos y reconectamos desde cero.
      connection.destroy();
      setTimeout(() => connectToVoiceChannel(guild), 5000);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    console.log('🔌 Conexión de voz destruida, reconectando en 5s...');
    setTimeout(() => connectToVoiceChannel(guild), 5000);
  });

  connection.on('error', (err) => {
    console.error('Error en la conexión de voz:', err);
  });

  console.log('🔊 Bot conectado al canal de voz.');
  return connection;
}

// ----------------------------------------------------------------
// Actualiza el estado del bot: 🟢 ONLINE / 🔴 OFFLINE + jugadores
// ----------------------------------------------------------------
async function updateBotStatus(data) {
  if (data.online) {
    client.user.setPresence({
      activities: [{
        name: `🟢 ONLINE (${data.players}/${data.maxPlayers})`,
        type: ActivityType.Watching,
      }],
      status: 'online',
    });
  } else {
    client.user.setPresence({
      activities: [{ name: '🔴 OFFLINE', type: ActivityType.Watching }],
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
}

client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
  printInviteLink();

  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    connectToVoiceChannel(guild);
  } else {
    console.error('⚠️ No se encontró el GUILD_ID configurado. Revisa tu .env');
  }

  checkLoop(); // primera verificación inmediata
  setInterval(checkLoop, interval);
});

// Si el bot es desconectado del gateway de Discord, discord.js reconecta solo;
// esto solo lo dejamos loggeado para que sea visible en pm2 logs.
client.on('shardDisconnect', () => {
  console.log('⚠️ Desconectado del gateway de Discord, reconectando...');
});
client.on('shardReconnecting', () => {
  console.log('🔄 Reconectando al gateway de Discord...');
});
client.on('shardResume', () => {
  console.log('✅ Reconexión al gateway de Discord exitosa.');
});
client.on('error', (err) => {
  console.error('Error del cliente de Discord:', err);
});

client.login(DISCORD_TOKEN);

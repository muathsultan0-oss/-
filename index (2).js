const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) { console.error('❌ خطأ: لم يتم العثور على DISCORD_BOT_TOKEN'); process.exit(1); }

const PREFIX = '-';
const ADMIN_ROLE_NAME = "〢ᴿᶻ ﹣˻ الطاقم الإداري ˺";

const DATA_DIR = path.join(__dirname, 'nt_data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const BALANCE_FILE = path.join(DATA_DIR, 'balances.json');
const SALARIES_FILE = path.join(DATA_DIR, 'salaries.json');

function loadJSON(p, fallback) { try { if (!fs.existsSync(p)) { fs.writeFileSync(p, JSON.stringify(fallback, null, 2)); return fallback; } return JSON.parse(fs.readFileSync(p, 'utf8') || 'null') || fallback; } catch (e) { return fallback; } }
function saveJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }

let balances = loadJSON(BALANCE_FILE, {});
let salaries = loadJSON(SALARIES_FILE, []);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} - جاهز`);
});

const TICKET_TEXT = {
  tafeel: `**__ — قسـم التـفـعـيـل

  
— مرحباً بك في تذكرة التفعيل

— يرجى كتابة اسمك وآيديك بشكل صحيح

— تأكد من توافر الشروط قبل طلب التفعيل

— يرجى الانتظار حتى يتم مراجعة بياناتك

— الاحترام واجب بين الإداري والعضو__**`,
  daam: `**__ — قسـم الدعم الفني

— مرحباً بك في تذكرة الدعم الفني

— يرجى شرح المشكلة التي تواجهها بتفاصيل واضحة

— لا تقم بفتح أكثر من تذكرة لنفس الموضوع

— يمنع استخدام أسلوب غير لائق أو إساءة للإداريين

— سيتم الرد عليك في أقرب وقت ممكن__**`,
  raqaba: `**__ — قسـم طلب القيادة

— مرحباً بك في تذكرة طلب القيادة

— يرجى كتابة اسمك وآيديك والرتبة التي تود قيادتها

— وضح سبب طلبك ومؤهلاتك إن وجدت

— تذكر أن الإداريين سيقومون بمراجعة طلبك

— تحلَّى بالصبر والأسلوب اللائق__**`
};

function parseDurationToMs(str){ if(!str) return null; const m=str.match(/^(\d+)(m|h)$/i); if(!m) return null; const num=parseInt(m[1],10), unit=m[2].toLowerCase(); if(unit==='m') return num*60*1000; if(unit==='h') return num*60*60*1000; return null; }

function ensureBalance(gid, uid){ if(!balances[gid]) balances[gid]={}; if(typeof balances[gid][uid]!=='number') balances[gid][uid]=0; }
function addMoney(gid, uid, amount){ ensureBalance(gid, uid); balances[gid][uid]+=amount; saveJSON(BALANCE_FILE, balances); }
function removeMoney(gid, uid, amount){ ensureBalance(gid, uid); balances[gid][uid]=Math.max(0, balances[gid][uid]-amount); saveJSON(BALANCE_FILE, balances); }
function getMoney(gid, uid){ ensureBalance(gid, uid); return balances[gid][uid]; }
function findAdminRole(guild){ return guild.roles.cache.find(r => r.name === ADMIN_ROLE_NAME) || null; }

setInterval(() => {
  const now = Date.now();
  const savedJobs = loadJSON(SALARIES_FILE, []);
  for (const job of savedJobs) {
    if (!job.enabled) continue;
    if (!job.lastRun) job.lastRun = now - job.intervalMs;
    if (now - job.lastRun >= job.intervalMs) {
      job.lastRun = now;
      const guild = client.guilds.cache.get(job.guildId);
      if (guild) {
        const role = guild.roles.cache.get(job.roleId);
        if (role) {
          role.members.forEach(mem => { addMoney(job.guildId, mem.id, job.amount); });
        }
      }
    }
  }
  saveJSON(SALARIES_FILE, savedJobs);
}, 60000);

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  try {
    if (cmd === 'help' || cmd === 'هلب') {
      const adminRole = findAdminRole(message.guild);
      if (!message.member.roles.cache.has(adminRole?.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ هذا الأمر للإداريين فقط');
      }

      const helpEmbed = new EmbedBuilder()
        .setTitle('📋 قائمة الأوامر - روز تاون')
        .setColor('DarkBlue')
        .setDescription(`
**أوامر الإدارة:**
\`-مسح <عدد>\` - حذف رسائل
\`-طرد @عضو\` - طرد عضو
\`-باند @عضو\` - حظر عضو
\`-فك_باند <ID>\` - فك حظر
\`-ميوت @عضو <10m/1h>\` - ميوت مؤقت
\`-فك_ميوت @عضو\` - رفع الميوت
\`-قفل\` - قفل الشات
\`-فتح\` - فتح الشات
\`-اعطاء @عضو @رتبة\` - إعطاء رتبة
\`-حذف_رتبة @عضو @رتبة\` - حذف رتبة
\`-تفعيل @عضو\` - تفعيل عضو
\`-قول <نص>\` - إرسال رسالة
\`-ايمبد <عنوان>|<وصف>\` - إرسال embed

**أوامر التذاكر:**
\`-تكت_تفعيل\` - إرسال تكت التفعيل
\`-تكت_دعم\` - إرسال تكت الدعم
\`-تكت_قيادة\` - إرسال تكت القيادة

**أوامر أخرى:**
\`-استبيان @عضو\` - بدء استبيان
\`-قسم\` - إرسال قسم روز تاون
\`-راتب @رتبة <مبلغ> <10m/1h>\` - تفعيل راتب
\`-ايقاف_راتب @رتبة\` - إيقاف راتب

**أوامر الاقتصاد:**
\`-بنك\` - عرض رصيدك
\`-شراء <منتج> <سعر> @بائع\` - شراء منتج
\`-بيع <منتج> <سعر>\` - إعلان بيع
`)
        .setFooter({ text: 'روز تاون - RoOz ToWeN' });

      try {
        await message.author.send({ embeds: [helpEmbed] });
        return message.reply('✅ تم إرسال قائمة الأوامر في الخاص');
      } catch {
        return message.reply({ embeds: [helpEmbed] });
      }
    }

    if (cmd === 'مسح') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ ليس لديك صلاحية');
      const count = parseInt(args[0]);
      if (isNaN(count) || count < 1 || count > 100) return message.reply('❌ أدخل عدد صحيح بين 1-100');
      await message.channel.bulkDelete(count + 1, true);
      const msg = await message.channel.send(`✅ تم مسح ${count} رسالة`);
      setTimeout(() => msg.delete().catch(()=>{}), 3000);
      return;
    }

    if (cmd === 'طرد') {
      if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.reply('❌ ليس لديك صلاحية');
      const user = message.mentions.users.first();
      if (!user) return message.reply('❌ منشن العضو');
      const mem = await message.guild.members.fetch(user.id).catch(()=>null);
      if (!mem) return message.reply('❌ العضو غير موجود');
      await mem.kick();
      return message.reply(`✅ تم طرد ${user.tag}`);
    }

    if (cmd === 'باند') {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ ليس لديك صلاحية');
      const user = message.mentions.users.first();
      if (!user) return message.reply('❌ منشن العضو');
      await message.guild.members.ban(user.id);
      return message.reply(`✅ تم حظر ${user.tag}`);
    }

    if (cmd === 'فك_باند') {
      if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.reply('❌ ليس لديك صلاحية');
      const id = args[0];
      if (!id) return message.reply('❌ أدخل ID المستخدم');
      await message.guild.members.unban(id);
      return message.reply(`✅ تم فك الباند عن ${id}`);
    }

    if (cmd === 'ميوت') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ ليس لديك صلاحية');
      const user = message.mentions.users.first();
      const dur = args[1] || '10m';
      if (!user) return message.reply('❌ منشن العضو');
      const msDur = parseDurationToMs(dur) || 10*60*1000;
      const mem = await message.guild.members.fetch(user.id).catch(()=>null);
      if (!mem) return message.reply('❌ العضو غير موجود');
      await mem.timeout(msDur);
      return message.reply(`🔇 تم ميوت ${user.tag} لمدة ${dur}`);
    }

    if (cmd === 'فك_ميوت') {
      if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return message.reply('❌ ليس لديك صلاحية');
      const user = message.mentions.users.first();
      if (!user) return message.reply('❌ منشن العضو');
      const mem = await message.guild.members.fetch(user.id).catch(()=>null);
      if (!mem) return message.reply('❌ العضو غير موجود');
      await mem.timeout(null);
      return message.reply(`🔊 تم إزالة الميوت عن ${user.tag}`);
    }

    if (cmd === 'قفل') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ ليس لديك صلاحية');
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
      return message.reply('🔒 تم قفل الشات');
    }

    if (cmd === 'فتح') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('❌ ليس لديك صلاحية');
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
      return message.reply('🔓 تم فتح الشات');
    }

    if (cmd === 'اعطاء') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ ليس لديك صلاحية');
      const user = message.mentions.users.first();
      const role = message.mentions.roles.first();
      if (!user || !role) return message.reply('❌ منشن العضو والرتبة');
      const mem = await message.guild.members.fetch(user.id).catch(()=>null);
      if (!mem) return message.reply('❌ العضو غير موجود');
      await mem.roles.add(role);
      return message.reply(`✅ تم إعطاء رتبة ${role.name} لـ ${user.tag}`);
    }

    if (cmd === 'حذف_رتبة') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.reply('❌ ليس لديك صلاحية');
      const user = message.mentions.users.first();
      const role = message.mentions.roles.first();
      if (!user || !role) return message.reply('❌ منشن العضو والرتبة');
      const mem = await message.guild.members.fetch(user.id).catch(()=>null);
      if (!mem) return message.reply('❌ العضو غير موجود');
      await mem.roles.remove(role);
      return message.reply(`✅ تم حذف رتبة ${role.name} من ${user.tag}`);
    }

    if (cmd === 'تفعيل') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ ليس لديك صلاحية');
      const user = message.mentions.users.first();
      if (!user) return message.reply('❌ منشن العضو');
      const mem = await message.guild.members.fetch(user.id).catch(()=>null);
      if (!mem) return message.reply('❌ العضو غير موجود');
      return message.reply(`✅ تم تفعيل ${user.tag}`);
    }

    if (cmd === 'قول') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.reply('❌ ليس لديك صلاحية');
      const text = args.join(' ');
      if (!text) return message.reply('❌ اكتب النص');
      await message.channel.send(text);
      return message.delete().catch(()=>{});
    }

    if (cmd === 'ايمبد') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply('❌ ليس لديك صلاحية');
      const content = args.join(' ');
      const parts = content.split('|');
      const emb = new EmbedBuilder().setColor('DarkBlue');
      if (parts[0]) emb.setTitle(parts[0].trim());
      if (parts[1]) emb.setDescription(parts[1].trim());
      await message.channel.send({ embeds: [emb] });
      return message.delete().catch(()=>{});
    }

    if (cmd === 'تكت_تفعيل') {
      const adminRole = findAdminRole(message.guild);
      if (!message.member.roles.cache.has(adminRole?.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ هذا الأمر للإداريين فقط');
      }
      const emb = new EmbedBuilder().setTitle('🎫 تكت التفعيل').setDescription(TICKET_TEXT.tafeel).setColor('DarkBlue');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open_tafeel').setLabel('فتح تكت التفعيل').setEmoji('🎫').setStyle(ButtonStyle.Primary)
      );
      return message.channel.send({ embeds: [emb], components: [row] });
    }

    if (cmd === 'تكت_دعم') {
      const adminRole = findAdminRole(message.guild);
      if (!message.member.roles.cache.has(adminRole?.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ هذا الأمر للإداريين فقط');
      }
      const emb = new EmbedBuilder().setTitle('🛠 دعم فني').setDescription(TICKET_TEXT.daam).setColor('DarkBlue');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open_daam').setLabel('فتح تكت الدعم').setEmoji('🛠').setStyle(ButtonStyle.Success)
      );
      return message.channel.send({ embeds: [emb], components: [row] });
    }

    if (cmd === 'تكت_قيادة') {
      const adminRole = findAdminRole(message.guild);
      if (!message.member.roles.cache.has(adminRole?.id) && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ هذا الأمر للإداريين فقط');
      }
      const emb = new EmbedBuilder().setTitle('🎯 طلب قيادة').setDescription(TICKET_TEXT.raqaba).setColor('DarkBlue');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open_raqaba').setLabel('فتح تكت القيادة').setEmoji('🎯').setStyle(ButtonStyle.Secondary)
      );
      return message.channel.send({ embeds: [emb], components: [row] });
    }

    if (cmd === 'استبيان') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ هذا الأمر للإداريين فقط');
      const target = message.mentions.users.first();
      if (!target) return message.reply('❌ منشن الشخص الذي سيجاوب');

      await message.reply(`سيبدأ الاستبيان لـ <@${target.id}> بعد 3 ثوانٍ...`);

      const questions = [
        '1 - اسمك :',
        '2 - عمرك :',
        '3 - آيديك :',
        '4 - ما هو القانون الذهبي :',
        '5 - عرف الرول بلاي :',
        '6 - ما هو قانون LAR :',
        '7 - ما هو قانون RDM :',
        '8 - ما هو قانون VDM :',
        '9 - عرف الحاجز السمعي :',
        '10 - هل يسمح الخطف في المنطقة الآمنة :',
        '11 - هل يسمح سرقة الممتلكات الحكومية :',
        '12 - هل يسمح الإزعاج في المراكز الحكومية :',
        '13 - هل يسمح القدوم للمراكز أول عشر دقائق :',
        '14 - هل يسمح الخطف أول عشر دقائق :',
        '15 - بعد الانفجار كم كفر يجب التوقف :'
      ];

      setTimeout(async () => {
        const answers = [];
        const channel = message.channel;

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const progress = Math.round(((i + 1) / questions.length) * 100);
          const progressBar = '▓'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
          
          const ask = await channel.send(`<@${target.id}> ${q}`);
          
          const progressMsg = await channel.send({
            embeds: [new EmbedBuilder()
              .setTitle(`— قـريــب تــآلـق —`)
              .setDescription(`**الاسم:**\n${target.username}\n\n**التقدم: ${progress}%**\n${progressBar}\n\nجاري الانتظار...`)
              .setColor('DarkBlue')
            ]
          });

          let collected = null;
          while (!collected) {
            collected = await channel.awaitMessages({
              filter: m => m.author.id === target.id,
              max: 1,
              time: 600000
            }).catch(() => null);
            if (!collected || collected.size === 0) collected = null;
          }

          const msg = collected.first();
          answers.push({ q, a: msg.content });
          await ask.delete().catch(() => {});
          await msg.delete().catch(() => {});
          await progressMsg.delete().catch(() => {});
        }

        const emb = new EmbedBuilder()
          .setTitle('📋 نتائج الاستبيان')
          .setColor('Blue')
          .setDescription(answers.map(x => `**${x.q}**\n${x.a}`).join('\n\n'));
        await channel.send({ embeds: [emb] });
      }, 3000);
      return;
    }

    if (cmd === 'قسم') {
      const emb = new EmbedBuilder().setColor('DarkBlue').setDescription(`**__أقسم بالله العظيم وعلى كتابه الكريم أني لن أخرب سيرفر روز تاون ولن أكون سببًا في إيذاء أي عضو فيه
وأتعهد بالالتزام الكامل بجميع القوانين والتعليمات المعلنة والمخفية في السيرفر وتفادي نشر أو ترويج وأتعهد باحترام الجميع سواء كان اداري او عضو
وفي حال مخالفتي لأي من هذه البنود أكون مستحقًا للعقوبة التي تقررها إدارة السيرفر
والله على مااقوله شهيد

قال رسول الله ﷺ:  "من حلف على يمين هو فيها كاذب يقتطع بها مال امرئ مسلم بغير حق [لقي] الله [وهو] عليه غضبان وفي اللفظ الآخر: فقد أوجب الله له النار، وحرم عليه الجنة"."__**`);
      return message.channel.send({ embeds: [emb] });
    }

    if (cmd === 'بنك') {
      const gid = message.guildId;
      ensureBalance(gid, message.author.id);
      try {
        await message.author.send(`💰 رصيدك: ${getMoney(gid, message.author.id)}$`);
        return message.reply('✅ تم إرسال رصيدك في الخاص');
      } catch {
        return message.reply(`💰 رصيدك: ${getMoney(gid, message.author.id)}$`);
      }
    }

    if (cmd === 'شراء') {
      const product = args[0];
      const price = parseInt(args[1]);
      const seller = message.mentions.users.first();
      if (!product || isNaN(price) || !seller) return message.reply('❌ الاستخدام: -شراء <منتج> <سعر> @بائع');
      const gid = message.guildId;
      ensureBalance(gid, message.author.id);
      ensureBalance(gid, seller.id);
      if (getMoney(gid, message.author.id) < price) return message.reply('❌ رصيدك لا يكفي');
      removeMoney(gid, message.author.id, price);
      addMoney(gid, seller.id, price);
      return message.reply(`✅ تم شراء **${product}** بسعر **${price}$** من ${seller}`);
    }

    if (cmd === 'بيع') {
      const product = args[0];
      const price = parseInt(args[1]);
      if (!product || isNaN(price)) return message.reply('❌ الاستخدام: -بيع <منتج> <سعر>');
      const emb = new EmbedBuilder().setTitle('📢 إعلان بيع').setDescription(`المنتج: **${product}**\nالسعر: **${price}$**\nالمعلن: ${message.author}`).setColor('Gold');
      return message.channel.send({ embeds: [emb] });
    }

    if (cmd === 'راتب') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ ليس لديك صلاحية');
      const role = message.mentions.roles.first();
      const amount = parseInt(args[1]);
      const duration = args[2];
      if (!role || isNaN(amount) || !duration) return message.reply('❌ الاستخدام: -راتب @رتبة <مبلغ> <10m/1h>');
      const intervalMs = parseDurationToMs(duration);
      if (!intervalMs) return message.reply('❌ المدة غير صحيحة. استخدم مثال: 10m أو 1h');
      const job = { guildId: message.guildId, roleId: role.id, amount, intervalMs, enabled: true };
      const saved = loadJSON(SALARIES_FILE, []);
      saved.push(job);
      saveJSON(SALARIES_FILE, saved);
      return message.reply(`✅ تم تفعيل راتب ${amount}$ لكل عضو بالرتبة ${role.name} كل ${duration}`);
    }

    if (cmd === 'ايقاف_راتب') {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.reply('❌ ليس لديك صلاحية');
      const role = message.mentions.roles.first();
      if (!role) return message.reply('❌ الاستخدام: -ايقاف_راتب @رتبة');
      const saved = loadJSON(SALARIES_FILE, []);
      const updated = saved.filter(s => !(s.guildId === message.guildId && s.roleId === role.id));
      saveJSON(SALARIES_FILE, updated);
      return message.reply(`✅ تم إيقاف راتب الرتبة ${role.name}`);
    }

  } catch (error) {
    console.error('خطأ في الأمر:', error);
    message.reply('❌ حدث خطأ أثناء تنفيذ الأمر').catch(()=>{});
  }
});

client.on('interactionCreate', async interaction => {
try {
if (!interaction.isButton()) return;

if (interaction.customId === 'open_tafeel' || interaction.customId === 'open_raqaba' || interaction.customId === 'open_daam') {
const type = interaction.customId === 'open_tafeel' ? 'تفعيل' : interaction.customId === 'open_raqaba' ? 'طلب قيادة' : 'دعم فني';
const guild = interaction.guild;
const adminRole = findAdminRole(guild);
const ch = await guild.channels.create({
  name: `ticket-${type.toLowerCase().replace(/ /g,'-')}-${interaction.user.username}`.slice(0, 90),
  type: ChannelType.GuildText,
  topic: `owner_${interaction.user.id}`,
  permissionOverwrites: [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
    ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])
  ],
});

const text = interaction.customId === 'open_tafeel' ? TICKET_TEXT.tafeel : interaction.customId === 'open_raqaba' ? TICKET_TEXT.raqaba : TICKET_TEXT.daam;
const embed = new EmbedBuilder().setTitle(`🎫 تذكرة — ${type}`).setDescription(text).setColor('Blue');

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setStyle(ButtonStyle.Danger)
);

if (interaction.customId === 'open_tafeel') {
  row.addComponents(
    new ButtonBuilder().setCustomId('start_survey').setLabel('بدأ التفعيل').setEmoji('📋').setStyle(ButtonStyle.Primary)
  );
}

const mentionText = adminRole ? `<@&${adminRole.id}>` : `<@${interaction.guild.ownerId}>`;
await ch.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
await ch.send({ content: mentionText });
await interaction.reply({ content: `✅ تم فتح التذكرة في ${ch}`, ephemeral: true });
return;
}

if (interaction.customId === 'claim_ticket') {
const adminRoleObj = findAdminRole(interaction.guild);
if (!interaction.member.roles.cache.has(adminRoleObj?.id) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
  return interaction.reply({ content: '❌ فقط الطاقم الإداري يمكنه الاستلام', ephemeral: true });
}

const currentTopic = interaction.channel.topic;
const ownerMatch = currentTopic?.match(/owner_(\d+)/);
const ownerId = ownerMatch ? ownerMatch[1] : null;

if (currentTopic && currentTopic.includes('claimed_by_')) {
  return interaction.reply({ content: '❌ التذكرة مستلمة بالفعل من قبل إداري آخر', ephemeral: true });
}

const newTopic = ownerId ? `owner_${ownerId}|claimed_by_${interaction.user.id}` : `claimed_by_${interaction.user.id}`;
await interaction.channel.setTopic(newTopic).catch(()=>{});
await interaction.reply({ content: `✅ تم استلام التذكرة بواسطة ${interaction.user.tag}`, ephemeral: true });

const newRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('unclaim_ticket').setLabel('ترك التذكرة').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setStyle(ButtonStyle.Danger)
);

const isTafeel = interaction.channel.name.includes('تفعيل');
if (isTafeel) {
  newRow.addComponents(
    new ButtonBuilder().setCustomId('start_survey').setLabel('بدأ التفعيل').setEmoji('📋').setStyle(ButtonStyle.Primary)
  );
}

try {
  await interaction.message.edit({ components: [newRow] }).catch(()=>{});
  await interaction.channel.send(`${interaction.user} — تم استلام التذكرة`).catch(()=>{});
} catch {}
return;
}

if (interaction.customId === 'unclaim_ticket') {
const currentTopic = interaction.channel.topic;
if (!currentTopic || !currentTopic.includes('claimed_by_')) {
  return interaction.reply({ content: '❌ التذكرة غير مستلمة', ephemeral: true });
}

const claimerMatch = currentTopic.match(/claimed_by_(\d+)/);
const claimerId = claimerMatch ? claimerMatch[1] : null;
if (claimerId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
  return interaction.reply({ content: '❌ فقط من استلم التذكرة يمكنه تركها', ephemeral: true });
}

const ownerMatch = currentTopic.match(/owner_(\d+)/);
const ownerId = ownerMatch ? ownerMatch[1] : null;
const newTopic = ownerId ? `owner_${ownerId}` : '';
await interaction.channel.setTopic(newTopic).catch(()=>{});
await interaction.reply({ content: `✅ تم ترك التذكرة من قبل ${interaction.user.tag}`, ephemeral: true });

const originalRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('claim_ticket').setLabel('استلام').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق').setStyle(ButtonStyle.Danger)
);

const isTafeel = interaction.channel.name.includes('تفعيل');
if (isTafeel) {
  originalRow.addComponents(
    new ButtonBuilder().setCustomId('start_survey').setLabel('بدأ التفعيل').setEmoji('📋').setStyle(ButtonStyle.Primary)
  );
}

try {
  await interaction.message.edit({ components: [originalRow] }).catch(()=>{});
  await interaction.channel.send(`تم ترك التذكرة — الآن يمكن لأي إداري استلامها`).catch(()=>{});
} catch {}
return;
}

if (interaction.customId === 'start_survey') {
const adminRoleObj = findAdminRole(interaction.guild);
const topicMatch = interaction.channel.topic?.match(/owner_(\d+)/);
const ownerId = topicMatch ? topicMatch[1] : null;
const isOwner = ownerId === interaction.user.id;
const isAdmin = interaction.member.roles.cache.has(adminRoleObj?.id) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

if (!isOwner && !isAdmin) {
  return interaction.reply({ content: '❌ فقط صاحب التذكرة أو الطاقم الإداري يمكنه بدء التفعيل', ephemeral: true });
}

const channelMembers = interaction.channel.members;
let targetUser = null;
for (const [id, member] of channelMembers) {
  if (!member.user.bot && !member.roles.cache.has(adminRoleObj?.id) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
    targetUser = member.user;
    break;
  }
}

if (!targetUser) {
  return interaction.reply({ content: '❌ لم يتم العثور على العضو المراد تفعيله', ephemeral: true });
}

await interaction.reply({ content: `سيبدأ الاستبيان لـ <@${targetUser.id}> بعد 3 ثوانٍ...` });

const questions = [
  '1 - اسمك :',
  '2 - عمرك :',
  '3 - آيديك :',
  '4 - ما هو القانون الذهبي :',
  '5 - عرف الرول بلاي :',
  '6 - ما هو قانون LAR :',
  '7 - ما هو قانون RDM :',
  '8 - ما هو قانون VDM :',
  '9 - عرف الحاجز السمعي :',
  '10 - هل يسمح الخطف في المنطقة الآمنة :',
  '11 - هل يسمح سرقة الممتلكات الحكومية :',
  '12 - هل يسمح الإزعاج في المراكز الحكومية :',
  '13 - هل يسمح القدوم للمراكز أول عشر دقائق :',
  '14 - هل يسمح الخطف أول عشر دقائق :',
  '15 - بعد الانفجار كم كفر يجب التوقف :'
];

setTimeout(async () => {
  const answers = [];
  const channel = interaction.channel;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const progress = Math.round(((i + 1) / questions.length) * 100);
    const progressBar = '▓'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    
    const ask = await channel.send(`<@${targetUser.id}> ${q}`);
    
    const progressMsg = await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle(`— قـريــب تــآلـق —`)
        .setDescription(`**الاسم:**\n${targetUser.username}\n\n**التقدم: ${progress}%**\n${progressBar}\n\nجاري الانتظار...`)
        .setColor('DarkBlue')
      ]
    });

    let collected = null;
    while (!collected) {
      collected = await channel.awaitMessages({
        filter: m => m.author.id === targetUser.id,
        max: 1,
        time: 600000
      }).catch(() => null);
      if (!collected || collected.size === 0) collected = null;
    }

    const msg = collected.first();
    answers.push({ q, a: msg.content });
    await ask.delete().catch(() => {});
    await msg.delete().catch(() => {});
    await progressMsg.delete().catch(() => {});
  }

  const emb = new EmbedBuilder()
    .setTitle('📋 نتائج الاستبيان')
    .setColor('Blue')
    .setDescription(answers.map(x => `**${x.q}**\n${x.a}`).join('\n\n'));
  await channel.send({ embeds: [emb] });
}, 3000);

return;
}

if (interaction.customId === 'close_ticket') {
if (interaction.channel && interaction.channel.name && interaction.channel.name.startsWith('ticket-')) {
  const currentTopic = interaction.channel.topic;
  const ownerMatch = currentTopic?.match(/owner_(\d+)/);
  const ownerId = ownerMatch ? ownerMatch[1] : null;
  const claimerMatch = currentTopic?.match(/claimed_by_(\d+)/);
  const claimerId = claimerMatch ? claimerMatch[1] : null;
  
  const isOwner = ownerId === interaction.user.id;
  const isClaimer = claimerId === interaction.user.id;
  
  if (!isOwner && !isClaimer) {
    return interaction.reply({ content: '❌ فقط صاحب التذكرة أو من استلمها يمكنه إغلاقها', ephemeral: true });
  }
  
  await interaction.reply({ content: '🔒 سيتم حذف القناة خلال 5 ثوانٍ', ephemeral: true });
  setTimeout(() => { interaction.channel.delete().catch(()=>{}); }, 5000);
  return;
} else {
  return interaction.reply({ content: 'هذا الزر يستخدم داخل التذكرة فقط.', ephemeral: true });
}
}
} catch (e) {
console.error('button handler error', e);
}
});

const express = require('express');
const app = express();

app.get('/', (req, res) => res.send("Bot is running"));

app.listen(3000);

client.login(TOKEN);

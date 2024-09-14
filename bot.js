const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const admin = require('firebase-admin');
const cron = require('node-cron');
const { ethers } = require('ethers');
const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const TronApi = require('tron-api');
const serviceAccount = require('./firebase.json');
const { createClient } = require('redis');
const token = '7532996436:AAErlKMPvDOrwKDZNPyKOEKCDJlP4RI6pMY';
const bot = new TelegramBot(token, {polling: true});
const Web3 = require('web3');

const redisClient = createClient({
    password: '4syzuHeGtpWNnN9v6fyGh2gGNXrfhhwH',
    socket: {
        host: 'redis-18899.c91.us-east-1-3.ec2.redns.redis-cloud.com',
        port: 18899
    }
});

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

//all inline keyboards 
const mainmenu = {
    inline_keyboard: [
      [{ text: 'Wallet 💰', callback_data: 'walletopen' }, { text: 'Profile 🦄', callback_data: 'profileopen' }],
      [{ text: '------   Games 🎮   ------', callback_data: 'xxxxxx' }],
      [{ text: 'Casino 🎰', callback_data: 'casinoopen' },{ text: 'Lottery 🎟', callback_data: 'lotteryopen' } ],
      [{ text: 'Group Games 🔥', callback_data: 'groupgamesopen' }],
      [{ text: 'Tournament 🏆', callback_data: 'tournamentopen' }],
      [{ text: 'Invite Friends 🤝', callback_data: 'affilateopen' }, { text: 'Bonus Code ⭐️', callback_data: 'bonusopen' }],
    ]
};
//game menu if user clicked xxxxxx
const walletmenu = {
    inline_keyboard: [
      [{ text: 'Withdraw 💸', callback_data: 'withdrawbtn' }, { text: 'Deposit 💵', callback_data: 'depositbtn' }],
      [{ text: 'Swap coins 🔄', callback_data: 'swapbtn' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const gamesmenu = {
    inline_keyboard: [
      [{ text: 'Casino 🎰', callback_data: 'casinoopen' },{ text: 'Lottery 🎟', callback_data: 'lotteryopen' } ],
      [{ text: 'Group Games 🔥', callback_data: 'groupgamesopen' }],
      [{ text: 'Tournament 🏆', callback_data: 'tournamentopen' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const casinomenu = {
    inline_keyboard: [
      [{ text: 'Coin Flip 🪙', callback_data: 'coinflipopen' }],
      [{ text: 'Mines 💎', callback_data: 'minesopen' }],
      [{ text: 'TG Dart 🎯', callback_data: 'dartopen' }],
      [{ text: 'TG Slot 🎰 (Hot 🔥)', callback_data: 'slotopen' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const lotterymenu = {
    inline_keyboard: [
      [{ text: '100 USDT Weekend lottery! 💰', callback_data: 'lottery1open' }],
      [{ text: '500 USDT Monthly lottery! 🤑', callback_data: 'lottery2open' }],
      [{ text: '1K USDT Mega lottery! 🌚', callback_data: 'lottery3open' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

const tournamentmenu = {
    inline_keyboard: [
      [{ text: 'Coming Soon..', callback_data: 'backtomainmenu' }],//tournament1open
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};

function createGroupShareUrl(command) {
    return `tg://msg_url?url=${encodeURIComponent(`${command} 1 USDT`)}&chat_type=group`;
}
  
const groupgamesmenu = {
    inline_keyboard: [
      [{ text: 'Dice 🎲', url: createGroupShareUrl('/dice') }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }]
    ]
};
 
const bonuscodemenu = {
    inline_keyboard: [
      [{ text: 'Submit Code ⭐️', callback_data: 'submitcode' }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }]
    ]
};
 
const backforallmenu = {
    inline_keyboard: [
      [{ text: '< Back', callback_data: 'backtomainmenu' }]
    ]
};

//lottery stuff 
const lottery1menu = {
    inline_keyboard: [
      [{ text: 'Buy 1 🎟', callback_data: `lottery1_buy1` }, { text: 'Buy 5 🎟', callback_data: `lottery1_buy5` }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};          

const lottery2menu = {
    inline_keyboard: [
      [{ text: 'Buy 1 🎟', callback_data: `lottery2_buy1` }, { text: 'Buy 5 🎟', callback_data: `lottery2_buy5` }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};          

const lottery3menu = {
    inline_keyboard: [
      [{ text: 'Buy 1 🎟', callback_data: `lottery3_buy1` }, { text: 'Buy 5 🎟', callback_data: `lottery3_buy5` }],
      [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ]
};          

const swapmenu = {
    inline_keyboard: [
    [{ text: 'Confirm!', callback_data: `confirmswap` }],
    [{ text: '< Back', callback_data: 'backtomainmenu' }],
    ] 
 };          

//some out let vars
let casinobetopen = 'false';
let betuserid = '';
let coindbname = '';
let betamount = '';
let betstatus = '';
let usergivenbouscode = false;
let referedfromid = 'none';
let letlevel = 'Bronze 🥉';


const coinapisheet = {
    usdtbalance: 'matic-polygon',
    ethbalance: 'eth-ethereum',
    bnbbalance: 'bnb-binance-coin',
    maticbalance: 'matic-polygon',
    trxbalance: 'trx-tron',
};

bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const userId = msg.from.id.toString();
    const fullCode = match ? match[1] : null;
    const first_name = msg.from.first_name;
    const chatId = msg.chat.id.toString();
    const username = msg.from.username;
    const xCodeMatch = fullCode ? fullCode.match(/^x_(.*)$/) : null;
    const refCodeMatch = fullCode ? fullCode.match(/^ref_(.*)$/) : null;
    const profileCodeMatch = fullCode ? fullCode.match(/^profile_(.*)$/) : null;
    await connectRedis()
    if (refCodeMatch) {
        // Handle ref_ case
        const code = refCodeMatch[1];
        referedfromid = code;
        const key = `duckplays:users:${code}`;
        const walletinfo = await redisClient.hGetAll(key);
        const key2 = `duckplays:users:${userId}`;
        const walletinfo2 = await redisClient.hGetAll(key2);
        if(Object.keys(walletinfo2).length > 0){
            if (Object.keys(walletinfo).length > 0) {
            const usdtbalance = parseFloat(walletinfo.usdtbalance);


            await redisClient.hSet(key, {
              usdtbalance: usdtbalance + 0.25,
            });
            bot.sendMessage(code, `Someone Joined through your referral link <code>+0.25 USDT</code> 🎁`, { parse_mode: 'HTML', disable_web_page_preview: true })
          }else{
            //nothing
          }
        }

    } else if (profileCodeMatch) {
        const code = profileCodeMatch[1];
        const userId2 = code;
        const key = `duckplays:users:${userId2}`;
        const profileinfo = await redisClient.hGetAll(key);
        if (Object.keys(profileinfo).length > 0) {
            const totalinvites = profileinfo.invites;
            const wagered = parseFloat(profileinfo.wagered);
            const totalbets = profileinfo.totalbets;
            const level = profileinfo.level;
            const lostbets = profileinfo.lostbets;
            const wonbets = profileinfo.wonbets;
            const bonusclaimedusd = profileinfo.bonusclaimedusd;
            if(level === 'bronze'){
                letlevel = 'Bronze 🥉';
            }else if(level === 'silver'){
                letlevel = 'Silver 🥈'
            }else if(level === 'gold'){
                letlevel = 'Gold 🥇'
            }
            bot.sendMessage(chatId,`Hello ${first_name}, Here below is that guy's profile and status! 🚀\n\n🪪 User ID : <code>${userId2}</code>\n🥂 Level : ${letlevel}\n💵 Bonus Claimed : ${bonusclaimedusd} USD\n🪄 Wagered : ${wagered.toFixed(4)} USD\n⏱ Total Bets : ${totalbets}\n🟢 Won Bets : ${wonbets}\n🔴 Lost Bets : ${lostbets}`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu), disable_web_page_preview: true } )
            return;
        }else{
            bot.sendMessage(chatId, `User's Profile Not found!`)
        }
    }
    if (msg.chat.type === 'private') {
        const key = `duckplays:users:${userId}`;

        // Check if user already exists
        const existingUser = await redisClient.hGetAll(key);
        if (Object.keys(existingUser).length > 0) {

            bot.sendMessage(chatId, `Welcome to Duck Plays bot!\n\nGamble to earn, Good luck!🚀\n<a href='https://t.me/+BBZGprubPtliMWI1'>Global Chat</a> | <a href='https://t.me/+kJjcSyPgtdYwMWM1'> Announcement</a> | <a href='https://t.me/duckplaysSP_bot'>Support</a>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(mainmenu), disable_web_page_preview: true });
        
            return;
        }

        await redisClient.hSet(key, {
            userid: userId,
            chatId: chatId, 
            wagered: 0,
            invites: 0,
            totalbets: 0,
            level: 'bronze',
            lostbets: 0,
            wonbets: 0,
            inprofitorlossusd: 0,
            bonusclaimedusd: 0,
            invitedby: referedfromid,
            ethbalance: 0.00000000,
            bnbbalance: 0.00000000,
            usdtbalance: 0.00000000,
            solbalance: 0.00000000,
            trxbalance: 0.00000000,
            maticbalance: 0.00000000
        });

       
        bot.sendMessage(chatId, `Welcome to Duck Plays bot!\n\nGamble to earn, Good luck!🚀\n<a href='https://t.me/+BBZGprubPtliMWI1'>Global Chat</a> | <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Announcement</a> | <a href='https://t.me/duckplaysSP_bot'>Support</a>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(mainmenu), disable_web_page_preview: true });
    }
});


bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const message = callbackQuery.message;
    const messageId = message.message_id;
    const first_name = callbackQuery.from.first_name;
    const key = `duckplays:users:${userId}`;
    try {
        // Immediately acknowledge the callback query to keep the bot responsive
        await bot.answerCallbackQuery(callbackQuery.id);
        await connectRedis()
        // Fast response based on callback data
        switch (data) {
            case 'walletopen':
                const walletinfo = await redisClient.hGetAll(key);
                const ethbalance = parseFloat(walletinfo.ethbalance);
                const bnbbalance = parseFloat(walletinfo.bnbbalance);
                const usdtbalance = parseFloat(walletinfo.usdtbalance);
                const solbalance = parseFloat(walletinfo.solbalance);
                const trxbalance = parseFloat(walletinfo.trxbalance);
                const maticbalance = parseFloat(walletinfo.maticbalance);
                await bot.editMessageText(`💳 Wallet\n\n<b>Ethereum (ETH)</b> : <code>${ethbalance.toFixed(8)}</code>\n<b>Binance Coin (BNB)</b> : <code>${bnbbalance.toFixed(8)}</code>\n<b>Tether (USDT)</b> : <code>${usdtbalance.toFixed(8)}</code>\n<b>Solana (SOL)</b> : <code>${solbalance.toFixed(8)}</code>\n<b>Tron (TRX)</b> : <code>${trxbalance.toFixed(8)}</code>\n<b>Polygon (MATIC)</b> : <code>${maticbalance.toFixed(8)}</code>\n\nCall /wallet_help for helps regarding wallet/withdraw/deposit! 👍`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(walletmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'profileopen':
                const profiletext = encodeURIComponent(`🤟 Mine Duck Plays profile\n\nhttps://t.me/duckplays_bot?start=profile_${userId}`);
                const profileurl = `https://t.me/share/url?url=${profiletext}`;
                const profilemenu = {
                    inline_keyboard: [
                      [{ text: 'Share Profile 🗯', url: profileurl }],
                      [{ text: '< Back', callback_data: 'backtomainmenu' }],
                    ]
                };
                   
                        const profileinfo = await redisClient.hGetAll(key);
                        const totalinvites = profileinfo.invites;
                        const wagered = parseFloat(profileinfo.wagered);
                        const totalbets = profileinfo.totalbets;
                        const level = profileinfo.level;
                        const lostbets = profileinfo.lostbets;
                        const wonbets = profileinfo.wonbets;
                        const bonusclaimedusd = profileinfo.bonusclaimedusd;
                    if(level === 'bronze'){
                        letlevel = 'Bronze 🥉';
                    }else if(level === 'silver'){
                        letlevel = 'Silver 🥈'
                    }else if(level === 'gold'){
                        letlevel = 'Gold 🥇'
                    }
                 await bot.editMessageText(`Hello ${first_name}, Here below is your profile and status! 🚀\n\n🪪 User ID : <code>${userId}</code>\n🥂 Level : ${letlevel}\n💵 Bonus Claimed : ${bonusclaimedusd} USD\n🪄 Wagered : ${wagered.toFixed(4)} USD\n⏱ Total Bets : ${totalbets}\n🟢 Won Bets : ${wonbets}\n🔴 Lost Bets : ${lostbets}\n\nBe sure to share your profile with your friends 🔽`, {
                            parse_mode: 'HTML',
                            chat_id: chatId,
                            message_id: messageId,
                            reply_markup: JSON.stringify(profilemenu),
                            disable_web_page_preview: true
                 });
                break;
            case 'backtomainmenu':
                await bot.editMessageText(`Welcome to Duck Plays bot!\n\nGamble to earn, Good luck!🚀\n<a href='https://t.me/+BBZGprubPtliMWI1'>Global Chat</a> | <a href='https://t.me/+kJjcSyPgtdYwMWM1'> Announcement</a> | <a href='https://t.me/duckplaysSP_bot'>Support</a>`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(mainmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'xxxxxx':
                bot.sendMessage(chatId, 'These are below the games option for you! 👇', { parse_mode: 'HTML', reply_markup: JSON.stringify(gamesmenu), disable_web_page_preview: true });
                break;
            case 'casinoopen':
                await bot.editMessageText(`Casino Games 🎮`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(casinomenu),
                    disable_web_page_preview: true
                });
                break;
            case 'lotteryopen':
                await bot.editMessageText(`Available Lotteries 🎟`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(lotterymenu),
                    disable_web_page_preview: true
                });
                break;
            case 'groupgamesopen':
              
                await bot.editMessageText(`Community Games 🤘\n\nTop Group 🔽\n<a href='https://t.me/+BBZGprubPtliMWI1'> Global Chat </a>\n\n⚠️ Only Push commands to group, where im admin!`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(groupgamesmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'tournamentopen':
    
                await bot.editMessageText(`Active Tournaments! 🏆🧗`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(tournamentmenu),
                    disable_web_page_preview: true
                });
                break;
            case 'affilateopen':
                const affilatetext = encodeURIComponent(`Come Come!\nLets play crypto games in TG!🚀 \n\nhttps://t.me/duckplays_bot?start=ref_${userId}`);
                const affialteurl = `https://t.me/share/url?url=${affilatetext}`;
                const affilatemenu = {
                    inline_keyboard: [
                      [{ text: 'Share ▶️', url: affialteurl }],
                      [{ text: '< Back', callback_data: 'backtomainmenu' }]
                    ]
                };
        
                    // Check if user already exists
                    const existingUser = await redisClient.hGetAll(key);
                    const invites = existingUser.invites;
                    await bot.editMessageText(`Invite and play with your friends 🚀\n\nYour total invites : <b>${invites}</b>\nReward grabed : <b>${invites * 0.25} USDT</b>\n\n🔗 Link : <code>https://t.me/duckplays_bot?start=ref_${userId}</code>\n\n⚠️ Your invited user must deposit 1$ to be consider valid!`, {
                        parse_mode: 'HTML',
                        chat_id: chatId,
                        message_id: messageId,
                        reply_markup: JSON.stringify(affilatemenu),
                        disable_web_page_preview: true
                    });
                    return;    
                
                break;
            case 'bonusopen':
    
                await bot.editMessageText(`🎖 Bonus is here!\n\n<a href='https://t.me/+BBZGprubPtliMWI1'>New Codes everyday here!</a> 🚀\n\n▶️ Welcome code for new users, <code>IMNEW</code> for 0.1 USDT Bonus!`, {
                    parse_mode: 'HTML',
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: JSON.stringify(bonuscodemenu),
                    disable_web_page_preview: true
                });
                break;
            case 'withdrawbtn':
    
                bot.sendMessage(chatId, `To withdraw your funds 💸\n\nCall /withdraw (amount) (coin) (address)\n\nE.g <code>/withdraw 10 USDT 0x53e...</code>\n      <code>/withdraw 0.1 SOL EYb...</code>`, {parse_mode: 'HTML',})
                break;
            case 'depositbtn':
    
                bot.sendMessage(chatId, `To deposit funds 💵\n\nCall /deposit (coin)\n\nE.g <code>/deposit USDT </code>\n      <code>/deposit SOL </code>`, {parse_mode: 'HTML',})
                break;
            case 'swapbtn':
    
                bot.sendMessage(chatId, `To Swap coins 💵\n\nCall /swap (amount) (coin1) (coin2)\n\nE.g <code>/swap 1 USDT SOL</code>\n      <code>/swap 1 MATIC ETH </code>`, {parse_mode: 'HTML',})
                break;
            case 'submitcode':
                bot.sendMessage(chatId, `Send the bonus code that you get ⬇️`, {parse_mode: 'HTML',})
                usergivenbouscode = true;
                break;
            case 'coinflipopen': 
                bot.sendMessage(chatId, `To play Coin-Flip Game 🪙\n\nUse /flip (amount) (coin), E.g <code>/flip 1 USDT</code>\n\nChoose Head or Tail if won then make x2 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            case 'minesopen': 
                bot.sendMessage(chatId, `To play Mines Game ⛏\n\nUse /mines (amount) (coin), E.g <code>/mines 1 USDT</code>\n\nThere will be 12 slots that you have to mine with 4 dumy bombs, for each diamond 💎 for you will get x0.25 from bet amount! 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            case 'dartopen': 
                bot.sendMessage(chatId, `To play TG Dart Game 🎯\n\nUse /dart (amount) (coin), E.g <code>/dart 1 USDT</code>\n\nIf your sended dart hited the center then you will get x3 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            case 'slotopen': 
                bot.sendMessage(chatId, `To play TG Slot 🎰\n\nUse /slot (amount) (coin), E.g <code>/slot 1 USDT</code>\n\nIf in your sended slot 3 identical icons appear then you won x7 🚀`, {parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu),})
                break;
            //from here lotteries opening starting
            case 'lottery1open': 
              const lottery1data = await db.collection('Lottery').doc('lottery1').get();
              if (lottery1data.exists) {
                const data = lottery1data.data();
                
                const lottery1ticketsno = data[userId];
                      
                bot.sendMessage(chatId, `🎟 100 USDT Weekend Lottery! \n\n💰 Prize Pool : 100 USDT\n🏆 Winners : 10 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 30 Sept\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : ${lottery1ticketsno} 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery1menu), disable_web_page_preview: true})
        
              }else{
                const initialData = {
                    [userId]: '0' // Set your initial value here
                  };
                
                  await db.collection('Lottery').doc('lottery1').set(initialData);
                  bot.sendMessage(chatId, `🎟 100 USDT Weekend Lottery! \n\n💰 Prize Pool : 100 USDT\n🏆 Winners : 10 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 30 Sept\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : 0 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery1menu), disable_web_page_preview: true})
              }
                break;
            case 'lottery2open': 
                const lottery2data = await db.collection('Lottery').doc('lottery2').get();
                if (lottery2data.exists) {
                  const data = lottery2data.data();
                  
                  const lottery1ticketsno = data[userId];
                        
                  bot.sendMessage(chatId, `🎟 500 USDT Monthly Lottery! \n\n💰 Prize Pool : 500 USDT\n🏆 Winners : 50 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 15 Oct\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : ${lottery1ticketsno} 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery2menu), disable_web_page_preview: true})
          
                }else{
                  const initialData = {
                      [userId]: '0' // Set your initial value here
                    };
                  
                    await db.collection('Lottery').doc('lottery2').set(initialData);
                    bot.sendMessage(chatId, `🎟 500 USDT Monthly Lottery! \n\n💰 Prize Pool : 500 USDT\n🏆 Winners : 50 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 15 Oct\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : 0 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery2menu), disable_web_page_preview: true})
                }
                break;
            case 'lottery3open': 
                const lottery3data = await db.collection('Lottery').doc('lottery3').get();
                if (lottery3data.exists) {
                  const data = lottery3data.data();
                  
                  const lottery1ticketsno = data[userId];
                        
                  bot.sendMessage(chatId, `🎟 1K USDT Mega Lottery! \n\n💰 Prize Pool : 1K USDT\n🏆 Winners : 100 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 1 Nov\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : ${lottery1ticketsno} 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery3menu), disable_web_page_preview: true})
          
                }else{
                  const initialData = {
                      [userId]: '0' // Set your initial value here
                    };
                  
                    await db.collection('Lottery').doc('lottery3').set(initialData);
                    bot.sendMessage(chatId, `🎟 1K USDT Mega Lottery! \n\n💰 Prize Pool : 1K USDT\n🏆 Winners : 100 Winners, Each will receive 10 USDT 💵\n🟢 Draw on : 1 Nov\n\n💳 1 Ticket Price : 1 USDT \n➡️ You have : 0 🎟\n\n🏅 Full winner list get published on <a href='https://t.me/+kJjcSyPgtdYwMWM1'>Channel</a> and <a href='https://t.me/+BBZGprubPtliMWI1'>Group</a>`, {parse_mode: 'HTML', reply_markup: JSON.stringify(lottery3menu), disable_web_page_preview: true})
                }
                break;
            //lottery ticket buying, lottery-1, lottery-2, lottery-2
            case 'lottery1_buy1':
                const walletinfo1 = await redisClient.hGetAll(key);
                const usdtbalance1 = walletinfo1.usdtbalance;
                if(usdtbalance1 > 1 || usdtbalance1 === 1 ){
                    const userRef = db.collection('Lottery').doc('lottery1');
                    await userRef.update({ [userId]: admin.firestore.FieldValue.increment(1) });
                    const currentusdtbalance = parseInt(usdtbalance1, 10);
                    const newusdtbalance = currentusdtbalance - 1;
                   
 

                    await redisClient.hSet(key, {
                        usdtbalance: newusdtbalance,
                    });
                    bot.sendMessage(chatId, `Great, You got 1 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                }else{
                    bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                }
                break;
            case 'lottery1_buy5':
                    const walletinfo2 = await redisClient.hGetAll(key);
                    const usdtbalance2 = walletinfo2.usdtbalance;
                    if(usdtbalance2 > 5 || usdtbalance2 === 5 ){
                        const userRef = db.collection('Lottery').doc('lottery1');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(5) });
                        const currentusdtbalance = parseInt(usdtbalance2, 10);
                        const newusdtbalance = currentusdtbalance - 5;
                       
     
    
                        await redisClient.hSet(key, {
                            usdtbalance: newusdtbalance,
                        });
                        bot.sendMessage(chatId, `Great, You got 5 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                    }else{
                        bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                    }
                    break;
            case 'lottery2_buy1':
                    const walletinfo3 = await redisClient.hGetAll(key);
                    const usdtbalance3 = walletinfo3.usdtbalance;
                    if(usdtbalance3 > 1 || usdtbalance3 === 1 ){
                        const userRef = db.collection('Lottery').doc('lottery2');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(1) });
                        const currentusdtbalance = parseInt(usdtbalance3, 10);
                        const newusdtbalance = currentusdtbalance - 1;
                           
         
        
                            await redisClient.hSet(key, {
                                usdtbalance: newusdtbalance,
                            });
                            bot.sendMessage(chatId, `Great, You got 1 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                    break;
            case 'lottery2_buy5':
                    const walletinfo4 = await redisClient.hGetAll(key);
                    const usdtbalance4 = walletinfo4.usdtbalance;
                    if(usdtbalance4 > 5 || usdtbalance4 === 5 ){
                        const userRef = db.collection('Lottery').doc('lottery2');
                        await userRef.update({ [userId]: admin.firestore.FieldValue.increment(5) });
                        const currentusdtbalance = parseInt(usdtbalance4, 10);
                        const newusdtbalance = currentusdtbalance - 5;
                               
             
            
                            await redisClient.hSet(key, {
                                usdtbalance: newusdtbalance,
                            });
                            bot.sendMessage(chatId, `Great, You got 5 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                    break;
            case 'lottery3_buy1':
                    const walletinfo5 = await redisClient.hGetAll(key);
                    const usdtbalance5 = walletinfo5.usdtbalance;
                    if(usdtbalance5 > 1 || usdtbalance5 === 1 ){
                    const userRef = db.collection('Lottery').doc('lottery3');
                    await userRef.update({ [userId]: admin.firestore.FieldValue.increment(1) });
                    const currentusdtbalance = parseInt(usdtbalance5, 10);
                    const newusdtbalance = currentusdtbalance - 1;
                               
             
            
                        await redisClient.hSet(key, {
                                usdtbalance: newusdtbalance,
                            });
                            bot.sendMessage(chatId, `Great, You got 1 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                    break;
            case 'lottery3_buy5':
                        const walletinfo6 = await redisClient.hGetAll(key);
                        const usdtbalance6 = walletinfo6.usdtbalance;
                        if(usdtbalance6 > 5 || usdtbalance6 === 5 ){
                            const userRef = db.collection('Lottery').doc('lottery3');
                            await userRef.update({ [userId]: admin.firestore.FieldValue.increment(5) });
                            const currentusdtbalance = parseInt(usdtbalance6, 10);
                            const newusdtbalance = currentusdtbalance - 5;
                                   
                 
                
                                await redisClient.hSet(key, {
                                    usdtbalance: newusdtbalance,
                                });
                                bot.sendMessage(chatId, `Great, You got 5 more! 🎟`, {reply_markup: JSON.stringify(backforallmenu)})
                        }else{
                            bot.sendMessage(chatId, `Insufficient USDT Balance!`)
                        }
                break;
            default:
               // bot.sendMessage(chatId, 'Looks like something went wrong! Report it to admin through @duckplays');
                bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'This is a popup message!',
                    show_alert: true
                  });
                break;
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
});


//single comands 
bot.onText(/\/menu/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;

    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, `Welcome to Duck Plays bot!\n\nGamble to earn, Good luck!🚀\n<a href='https://t.me/+BBZGprubPtliMWI1'>Global Chat</a> | <a href='https://t.me/+kJjcSyPgtdYwMWM1'> Announcement</a> | <a href='https://t.me/duckplaysSP_bot'>Support</a>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(mainmenu), disable_web_page_preview: true });
    }else{
        bot.sendMessage(chatId, 'Come on DM for menu :)', {
            reply_to_message_id: messageId
          }).catch((error) => {
            //none
          });
    }
});


bot.onText(/\/wallet/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    const key = `duckplays:users:${userId}`;
    await connectRedis()
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = parseFloat(walletinfo.ethbalance);
    const bnbbalance = parseFloat(walletinfo.bnbbalance);
    const usdtbalance = parseFloat(walletinfo.usdtbalance);
    const solbalance = parseFloat(walletinfo.solbalance);
    const trxbalance = parseFloat(walletinfo.trxbalance);
    const maticbalance = parseFloat(walletinfo.maticbalance);
    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, `💳 Wallet\n\n<b>Ethereum (ETH)</b> : <code>${ethbalance.toFixed(8)}</code>\n<b>Binance Coin (BNB)</b> : <code>${bnbbalance.toFixed(8)}</code>\n<b>Tether (USDT)</b> : <code>${usdtbalance.toFixed(8)}</code>\n<b>Solana (SOL)</b> : <code>${solbalance.toFixed(8)}</code>\n<b>Tron (TRX)</b> : <code>${trxbalance.toFixed(8)}</code>\n<b>Polygon (MATIC)</b> : <code>${maticbalance.toFixed(8)}</code>\n\nCall /wallet_help for helps regarding wallet/withdraw/deposit! 👍`, { parse_mode: 'HTML', reply_markup: JSON.stringify(walletmenu), disable_web_page_preview: true });
    }else{
        bot.sendMessage(chatId, 'Come on DM to view your funds :)', {
            reply_to_message_id: messageId
          }).catch((error) => {
            //none
          });
    }
});

bot.onText(/\/games/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    if (msg.chat.type === 'private') {
        bot.sendMessage(chatId, 'These are below the games option for you! 👇', { parse_mode: 'HTML', reply_markup: JSON.stringify(gamesmenu), disable_web_page_preview: true });
    }else{
        bot.sendMessage(chatId, '🎮 Games that can be played in group chats! 🚀\n\n/dice (amount) (coin), E.g : <code>/dice 1 USDT</code>\nNew games on the way!\n\n🍀 Good luck ', {
            reply_to_message_id: messageId,
            parse_mode: 'HTML',
          }).catch((error) => {
            //none
          });
    }
});

bot.onText(/\/help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, 'All helps commands below 👇\n\n/wallet_help - for wallet matters\n/casino_help - for casino games matter\n/lottery_help - for lottery matter\n/groupgames_help - for group games matter \n/invite_help - for affilate matter', { parse_mode: 'HTML', disable_web_page_preview: true });

});

bot.onText(/\/wallet_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, '▶️ Wallet Help (FAQ)\n\nℹ️ How to Deposit? How much time does it take?\n▶️ Use <code>/deposit (coin)</code>, e.g. <code>/deposit USDT</code> to deposit funds. Each coin/token takes about 5-30 minutes for deposit confirmation!\n\nℹ️ How to swap? What are the fees and time for a swap?\n▶️ Use <code>/swap (amount) (coin1) (coin2)</code>, e.g. <code>/swap 1 USDT TRX</code>. Swap fees are 1% and swaps are successful within 2 seconds.\n\nℹ️ How to withdraw? How much time does it take to withdraw funds and what are the gas fees?\n▶️ Use <code>/withdraw (amount) (coin) (address)</code>, e.g. <code>/withdraw 1 USDT 0xanc3..</code>. Each coin has different gas fees depending on the supported networks, which you can see while confirming your withdrawal.\n\n▶️ List of All Supported Coins and Their Networks:\nEthereum (ETH): Ethereum Mainnet (1)\nBinance Coin (BNB): Binance Smart Chain (1)\nTether (USDT): Binance Smart Chain, Solana Mainnet, Polygon Mainnet (3)\nSolana: Solana Mainnet (1)\nTron (TRX): Tron Mainnet (1)\nPolygon (MATIC): Polygon Mainnet (1)\n\n▶️ For more help, go to support at @duckplaysSP_bot', { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/casino_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Casino Help (FAQ)\n\nℹ️ How to play coin flip? What are the returns on a win?\n▶️ Use <code>/flip (amount) (coin)</code>, e.g. <code>/flip 1 USDT</code>. When you use this command, you will get an option for 'Head' or 'Tail'. Click on one of these options, and if you win, you will receive x2 returns!\n\nℹ️ How to play TG slots? What are the returns?\n▶️ Use <code>/slots (amount) (coin)</code>, e.g. <code>/slots 1 USDT</code>. In TG Slots, you win x7 if 3 identical icons appear. It is extremely hard to win, but it's 100% fair through Telegram.\n\nℹ️ How to play TG Dart ? What are the returns?\n▶️ Use <code>/dart (amount) (coin)</code>, E.g <code>/dart (amount) (coin)</code>, While playing dart game through this command you have send dart after pushing the command and if dart hited the center then x3 returns!\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/lottery_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Lottery Help (FAQ)\n\nℹ️ How to participate in the lottery? What are the returns on a win?\n\n▶️ Click on the Lottery option from the main menu, then select an available lottery option. There you can see your purchased tickets and all information about the lottery event, including the start date, end date, rewards, and winner selection limits. Buy a ticket and hope for a win. All winner lists are published in the global group chat and participant's DMs.\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/groupgames_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Group Games Help (FAQ)\n\nℹ️ How to play the dice game? What are the returns on a win, and what are the rules?\n▶️ Use <code>/dice (amount) (coin)</code>, e.g. <code>/dice 1 USDT</code>. Only use this command in a group chat where @duckplays_bot is an admin. Anyone can join the game who has any coin/token equal to the bet value. After that, each player must send the Dice (🎲) Emoji while replying or forwarding the bot's message. The player with the highest dice (🎲) number wins x1.98 returns!\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

bot.onText(/\/invite_help/, async(msg) => {
    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const userId = msg.from.id;
    bot.sendMessage(chatId, `▶️ Affiliate Help (FAQ)\n\nHow to invite? What is the reward and what are the rules?\n\n▶️ Click on the 'Invite Friends' option from the main menu. There you can check the statistics of invites & rewards, get your invite link, and start sharing it with your friends. Once your friend makes a 1 USD deposit, you will receive a 0.25 USDT bonus!\n\n▶️ For more help, go to support at @duckplaysSP_bot`, { parse_mode: 'HTML', disable_web_page_preview: true });
});

//getting thinsg from msg.from 
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id;
    const key = `duckplays:users:${userId}`;
    
    if (usergivenbouscode) {
        await connectRedis();
        
        try {
            // Reset the flag
            usergivenbouscode = false;
            
            if (text === 'IMNEW') {
                const existingData = await redisClient.hGetAll(key);
                const oldUsdtBalance = parseFloat(existingData.usdtbalance || 0); 
                const oldBonusClaimedUsd = parseFloat(existingData.bonusclaimedusd || 0); 
                
                const bonusDataSnapshot = await db.collection('BonusCodes').doc('IMNEW').get();
                
                if (bonusDataSnapshot.exists) {
                    const bonusData = bonusDataSnapshot.data();
                    
                    if (bonusData[userId] === 'true') {
                        bot.sendMessage(chatId, `You have already claimed this code, go back and chill with games! 🎮`, {reply_markup: JSON.stringify(mainmenu)});
                    } else {
                        const data = {
                            [userId]: 'true',
                        };
                        await db.collection('BonusCodes').doc('IMNEW').set(data, { merge: true });
                        
                        const updatedData = {
                            usdtbalance: oldUsdtBalance + 0.1,
                            bonusclaimedusd: oldBonusClaimedUsd + 0.1,
                        };
                        
                        await redisClient.hSet(key, updatedData);
                        bot.sendMessage(chatId, `Awesome, you have claimed 0.1 USDT! 💵`, {reply_markup: JSON.stringify(backforallmenu)});
                    }
                } else {
                    bot.sendMessage(chatId, `Bonus code is not available! Please try again later!`, {reply_markup: JSON.stringify(backforallmenu)});
                }
            } else {
                bot.sendMessage(chatId, `Invalid or expired code! Go back and try again!`, {reply_markup: JSON.stringify(backforallmenu)});
            }
        } catch (error) {
            bot.sendMessage(chatId, `Something went to wrong, pls try again or get help from global group of Duck Plays!`);
        }
    }
});

//wallet - withdraw / deposit

bot.onText(/\/deposit(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].split(' ') : [];
    await connectRedis();
    
    if (input.length === 0) {
        bot.sendMessage(chatId, 'Please follow the correct format to deposit : /deposit (coin tricker) \nE.g : <code>/deposit USDT </code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }


    if (input.length !== 1) {
        bot.sendMessage(chatId, 'Please follow the correct format to deposit : /deposit (coin tricker) \nE.g : <code>/deposit USDT </code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    const [ cointricker] = input;

    const cointrickermain = cointricker.toUpperCase();

    if(cointrickermain === 'ETH'){ //ethreuem coin (ETH)
        const stepmenu = {
            inline_keyboard: [
              [{ text: 'Ethereum Mainnet', callback_data: `depositeth-ethmainnet_none` }],
              [{ text: '< Back', callback_data: 'backtomainmenu' }],
            ]
        };

        bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
      return;
    }
    if(cointrickermain === 'BNB'){ //binance coin (BNB)
         //   const stepmenu = {
             //   inline_keyboard: [
             //     [{ text: 'BSC Mainnet', callback_data: `depositbnb-bscmainnet_none` }],
           //       [{ text: '< Back', callback_data: 'backtomainmenu' }],
          //      ]
          //  };
    
            bot.sendMessage(chatId, `BNB and USDT deposit are under maintenance!`,  {reply_markup: JSON.stringify(backforallmenu)})  
        return;
    }
    if(cointrickermain === 'USDT'){ //Theter coin (USDT)
        //    const stepmenu = {
           //     inline_keyboard: [
           //       [{ text: 'BSC Mainnet', callback_data: `depositusdt-bscmainnet_none` }],
              //    [{ text: 'Solana Mainnet', callback_data: `depositusdt-solmainnet_none` }],
             //     [{ text: 'Polygon Mainnet', callback_data: `depositusdt-maticmainnet_none` }],
             //     [{ text: '< Back', callback_data: 'backtomainmenu' }],
             //   ]
            //};
    
            bot.sendMessage(chatId, `BNB and USDT deposit are under maintenance!`,  {reply_markup: JSON.stringify(backforallmenu)})  
        return;
    }
    if(cointrickermain === 'SOL'){ //Solana coin (SOL)
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Solana Mainnet', callback_data: `depositsol-solmainnet_none` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
        return;
    }
    if(cointrickermain === 'TRX'){ //Tron coin (TRX)
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Tron Mainnet', callback_data: `deposittrx-trxmainnet_none` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
        return;
    }
    if(cointrickermain === 'MATIC'){ //Polygon coin (MATIC)
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Polygon Mainnet', callback_data: `depositmatic-maticmainnet_none` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select chain of ${cointrickermain} to deposit! 💰`,  {reply_markup: JSON.stringify(stepmenu)})
        return;
    }else{
        bot.sendMessage(chatId, `${cointrickermain} Not Supported on @duckplays`)
    }
});

bot.onText(/\/withdraw(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].split(' ') : [];
    await connectRedis();
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    if (input.length === 0) {
        bot.sendMessage(chatId, 'Please follow the correct format to withdraw : /withdraw (amount) (coin tricker) (wallet address)\nE.g : <code>/withdraw 1 USDT 0x12..</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }


    if (input.length !== 3) {
        bot.sendMessage(chatId, 'Please follow the correct format to withdraw : /withdraw (amount) (coin tricker) (wallet address)\nE.g : <code>/withdraw 1 USDT 0x12..</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    const [amount, cointricker, walletaddress] = input;

    if (isNaN(amount)) {
        bot.sendMessage(chatId, 'Please follow the correct format to withdraw : /withdraw (amount) (coin tricker) (wallet address)\nE.g : <code>/withdraw 1 USDT 0x12..</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
        return;
    }

    const cointrickermain = cointricker.toUpperCase();

    if(cointrickermain === 'ETH'){ //ethreuem coin (ETH)
      if(ethbalance >= amount){
        const stepmenu = {
            inline_keyboard: [
              [{ text: 'Ethereum Mainnet', callback_data: `eth-ethmainnet_${amount}_${walletaddress}` }],
              [{ text: '< Back', callback_data: 'backtomainmenu' }],
            ]
        };

        bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})
      }else{
        bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
      }
      return;
    }
    if(cointrickermain === 'BNB'){ //binance coin (BNB)
        if(bnbbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'BSC Mainnet', callback_data: `bnb-bscmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})
  
        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'USDT'){ //Theter coin (USDT)
        if(usdtbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'BSC Mainnet', callback_data: `usdt-bscmainnet_${amount}_${walletaddress}` }],
                  [{ text: 'Solana Mainnet', callback_data: `usdt-solmainnet_${amount}_${walletaddress}` }],
                  [{ text: 'Polygon Mainnet', callback_data: `usdt-maticmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})
  
        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'SOL'){ //Solana coin (SOL)
        if(solbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Solana Mainnet', callback_data: `sol-solmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})
  
        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'TRX'){ //Tron coin (TRX)
        if(trxbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Tron Mainnet', callback_data: `trx-trxmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})
  
        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }
    if(cointrickermain === 'MATIC'){ //Polygon coin (MATIC)
        if(maticbalance >= amount){
            const stepmenu = {
                inline_keyboard: [
                  [{ text: 'Polygon Mainnet', callback_data: `matic-maticmainnet_${amount}_${walletaddress}` }],
                  [{ text: '< Back', callback_data: 'backtomainmenu' }],
                ]
            };
    
            bot.sendMessage(chatId, `Select Chain of Wallet address and it will be confirmed!`,  {reply_markup: JSON.stringify(stepmenu)})
  
        }else{
          bot.sendMessage(chatId, `Insufficient ${cointrickermain} Balance!`)
        }
        return;
    }else{
        bot.sendMessage(chatId, `${cointrickermain} Not Supported on @duckplays`)
    }
});


//swap data room - With Defaults stuff 
let confirmdata = 'none'
let coin1let = 'ETH';
let coin2let = 'MATIC';
let coin1balancelet = '0';
let coin1dbnamelet = 'ethbalance';
let coin2dbnamelet = 'maticbalance';
let coin1priceapilet = 'eth-ethereum';
let coin2priceapilet = 'matic-polygon';

bot.onText(/\/swap(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const input = match[1] ? match[1].split(' ') : [];
    await connectRedis();
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    if(msg.chat.type === 'private'){
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Please follow correct format to swap tokens\n\nE.g : /swap (amount) (coin1) (coin2)\n<code>/swap 1 USDT MATIC</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
    
        if (input.length !== 3) {
            bot.sendMessage(chatId, 'Please follow correct format to swap tokens\n\nE.g : /swap (amount) (coin1) (coin2)\n<code>/swap 1 USDT MATIC</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
    
        const [amount, coin1, coin2] = input;
    
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Please follow correct format to swap tokens\n\nE.g : /swap (amount) (coin1) (coin2)\n<code>/swap 1 USDT MATIC</code>', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
    
        const coindata = {
            'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'eth-ethereum'},
            'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'bnb-binance-coin' },
            'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'usdt-tether' },
            'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'sol-solana'},
            'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'trx-tron' },
            'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-polygon'},
        };

        const cointricker1 = coin1.toUpperCase();
        const cointricker2 = coin2.toUpperCase();

        if (coindata[cointricker1] && coindata[cointricker2]) {
            const coin1Data = coindata[cointricker1];
            const coin2Data = coindata[cointricker2];
        
            const coin1balance = coin1Data.balance;
            const coin1dbname = coin1Data.dbname;
            const coin1priapi = coin1Data.priceapi;

            const coin2balance = coin2Data.balance;
            const coin2dbname = coin2Data.dbname;
            const coin2priapi = coin2Data.priceapi;

            const response1 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin1priapi}`);
            const priceusd1 = response1.data.quotes.USD.price;

            const response2 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin2priapi}`);
            const priceusd2 = response2.data.quotes.USD.price;


            const amountInUsd = amount * priceusd1;

            const amountinestimate = priceusd1 / priceusd2;
            const amountInCoin2 = amountInUsd / priceusd2;
            const onePercentOfCoin2 = amountInCoin2 * 0.03; //3% hidden fees, visible 1%

            if(coin1balance.toString() >= amount.toString()){
            bot.sendMessage(chatId, `💰 <b>Estimate Price :</b><code> 1 ${cointricker1} ≈ ${amountinestimate.toFixed(8)} ${cointricker2}</code>\n\n🟢 <b>You receiving :</b><code> ${amountInCoin2.toFixed(8)} ${cointricker2}</code>\n💸 <b>1% Fees :</b> <code>${onePercentOfCoin2.toFixed(8)} ${cointricker2}</code>`,  {parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: JSON.stringify(swapmenu)})
              coin1let = cointricker1;
              coin2let = cointricker2;
              coin1balancelet = amount;
              coin1dbnamelet = coin1dbname;
              coin2dbnamelet = coin2dbname; 
              coin1priceapilet = coin1priapi;
              coin2priceapilet = coin2priapi;
              confirmdata = 'true';
            }else{
              bot.sendMessage(chatId, `Insufficient ${cointricker1} Balance!`)
            }

        } else {
            bot.sendMessage(chatId, `Unsupported Coin/Token, Call /wallet_help and get list of supported Tokens/Coins!`)
        }
    }else{
        //nothing if user pushed this command in punlic group chat 
    }
    

});

//group games
let coinbalance1 = '';
let coindbname1 = '';



bot.onText(/\/dice(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
    };

    if(msg.chat.type === 'private'){
      bot.sendMessage(chatId, `You can only play this game in group chat, Try <a href = 'https://t.me/+BBZGprubPtliMWI1'> Ducks Group </a>`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Dice game in group chat \nE.g /dice (amount) (coin)\n<code>/dice 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
    
      
        const [amount, coin] = input;
       
        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Dice game in group chat \nE.g /dice (amount) (coin)\n<code>/dice 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Dice game in group chat \nE.g /dice (amount) (coin)\n<code>/dice 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = coin.balance;
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coin.balance >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const tokenoldbalance = parseFloat(walletinfo[coindbname1]);
                await redisClient.hSet(key, {
                    [coindbname1]: tokenoldbalance - amount,
                });
                const gamecode = generategamecode(20);
                const diceopen = {
                    inline_keyboard: [
                      [{ text: 'Join 🎲', callback_data: `joindice_${gamecode}` }],
                      [{ text: 'Delete ❌', callback_data: `deletedice_${gamecode}` }],
                    ]
                };
                const dicekey = `duckplays:dicegames:${gamecode}`;
                await redisClient.hSet(dicekey, {
                    creator: userId,
                    player2: 0,
                    cointricker: cointricker,
                    amount: amount,
                    gamecode: gamecode,
                    dbname: coindbname1,
                    move1: 'none',
                    move2: 'none'
                });
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                const { data } = response;
                
                const priceusd = data.market_data.current_price.usd;
                const betvalueusd = priceusd * amount;
    
                bot.sendMessage(chatId, `${userlink}, 🎲 Dice Game Created!\n\n💵 Bet Amount : ${amount} ${cointricker} || $${betvalueusd.toFixed(3)} USD\n\n🎮 Game ID : #${gamecode}`, { parse_mode: 'HTML', reply_markup: JSON.stringify(diceopen) })
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }
            
        }else{
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Dice game in group chat \nE.g /dice (amount) (coin)\n<code>/dice 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true}); 
        } 
    }
});


//coin flip game 
bot.onText(/\/flip(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
    };

    if(msg.chat.type !== 'private'){
      bot.sendMessage(chatId, `You can only play this game in my DM :)`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Coin Flip game in group chat \nE.g /flip (amount) (coin)\n<code>/flip 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
    
      
        const [amount, coin] = input;
       
        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Coin Flip game in group chat \nE.g /flip (amount) (coin)\n<code>/flip 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Coin Flip game in group chat \nE.g /flip (amount) (coin)\n<code>/flip 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = coin.balance;
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coin.balance >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const filpopen = {
                    inline_keyboard: [
                      [{ text: 'Coin Head 🪙', callback_data: `coinhead_${amount}_${coindbname1}_${cointricker}` }],
                      [{ text: 'Coin Tail 🪙', callback_data: `cointail_${amount}_${coindbname1}_${cointricker}` }],
                    ]
                };
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                const { data } = response;
                
                const priceusd = data.market_data.current_price.usd;
                const betvalueusd = priceusd * amount;
    
                bot.sendMessage(chatId, `Choose Head or Tail, on Win get <b>x1.98</b> 🍾\n\n💰 Bet amount : ${amount} ${cointricker} || ${betvalueusd.toFixed(8)} USD`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }      
        }else{
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play Coin Flip game in group chat \nE.g /flip (amount) (coin)\n<code>/flip 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});

//dart game 
bot.onText(/\/dart(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
    };

    if(msg.chat.type !== 'private'){
      bot.sendMessage(chatId, `You can only play this game in my DM :)`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎯 Dart game in group chat \nE.g /dart (amount) (coin)\n<code>/dart 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
    
      
        const [amount, coin] = input;
       
        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎯 Dart game in group chat \nE.g /dart (amount) (coin)\n<code>/dart 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎯 Dart game in group chat \nE.g /dart (amount) (coin)\n<code>/dart 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = coin.balance;
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coin.balance >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const filpopen = {
                    inline_keyboard: [
                      [{ text: '🎯 Center x3', callback_data: `dartcenter_${amount}_${coindbname1}_${cointricker}` }],
                      [{ text: '🎯 Red 1.4x', callback_data: `dartred_${amount}_${coindbname1}_${cointricker}` }],
                      [{ text: '🎯 White 1.4x', callback_data: `dartwhite_${amount}_${coindbname1}_${cointricker}` }],
                    ]
                };
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                const { data } = response;
                
                const priceusd = data.market_data.current_price.usd;
                const betvalueusd = priceusd * amount;
    
                bot.sendMessage(chatId, `Choose best 🎯 slot 🍀\n\n💰 Bet amount : ${amount} ${cointricker} || ${betvalueusd.toFixed(8)} USD`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }      
        }else{
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎯 Dart game in group chat \nE.g /dart (amount) (coin)\n<code>/dart 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});

//Tg slot game
bot.onText(/\/slot(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = walletinfo.ethbalance;
    const bnbbalance = walletinfo.bnbbalance;
    const usdtbalance = walletinfo.usdtbalance;
    const solbalance = walletinfo.solbalance;
    const trxbalance = walletinfo.trxbalance;
    const maticbalance = walletinfo.maticbalance;
    const coindata = {
        'ETH': { dbname: 'ethbalance', balance: ethbalance, priceapi : 'ethereum'},
        'BNB': { dbname: 'bnbbalance', balance: bnbbalance, priceapi : 'binancecoin' },
        'USDT': { dbname: 'usdtbalance', balance: usdtbalance, priceapi : 'tether' },
        'SOL': { dbname: 'solbalance', balance: solbalance, priceapi : 'solana'},
        'TRX': { dbname: 'trxbalance', balance: trxbalance, priceapi : 'tron' },
        'MATIC': { dbname: 'maticbalance', balance: maticbalance, priceapi : 'matic-network'},
    };

    if(msg.chat.type !== 'private'){
      bot.sendMessage(chatId, `You can only play this game in my DM :)`, {parse_mode: 'HTML', disable_web_page_preview: true})
    }else{
        if (input.length === 0) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎰 TG Slots game in group chat \nE.g /slot (amount) (coin)\n<code>/slot 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
    
      
        const [amount, coin] = input;
       
        if (!coin) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎰 TG Slots game in group chat \nE.g /slot (amount) (coin)\n<code>/slot 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        if (isNaN(amount)) {
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎰 TG Slots game in group chat \nE.g /slot (amount) (coin)\n<code>/slot 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
            return;
        }
        const cointricker = coin.toUpperCase();
        if (coindata.hasOwnProperty(cointricker)) {
            const coin = coindata[cointricker];
            coinbalance1 = coin.balance;
            coindbname1 = coin.dbname;
            const apiname = coin.priceapi;
            if (coin.balance >= amount) { 
                coinbalance1 = coin.balance;
                coindbname1 = coin.dbname;
                const filpopen = {
                    inline_keyboard: [
                      [{ text: 'Push 🔘🎰', callback_data: `slotopen_${amount}_${coindbname1}_${cointricker}` }],
                    ]
                };
                const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
                const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${apiname}`);
                const { data } = response;
                
                const priceusd = data.market_data.current_price.usd;
                const betvalueusd = priceusd * amount;
    
                bot.sendMessage(chatId, `Press on push and send 🎰, get x7 on win! 🍀\n\n💰 Bet amount : ${amount} ${cointricker} || ${betvalueusd.toFixed(8)} USD`, { parse_mode: 'HTML', reply_markup: JSON.stringify(filpopen) })
            } else {
                bot.sendMessage(chatId, `Insufficient ${cointricker} Balance!`)
            }      
        }else{
            bot.sendMessage(chatId, 'Hello, Please follow the correct format to play 🎰 TG Slots game in group chat \nE.g /slot (amount) (coin)\n<code>/slot 1 USDT</code>\n\nFor More help call /groupgames_help', { parse_mode: 'HTML', disable_web_page_preview: true});
        } 
    }
});

//chat game one warn
let chatgameopen = 'false'

//dart game data room
let dartopen = 'false'// false means not open || use this every where to get openchat game detection to avoid multi game bugs ty
let dartamount = '0'; //default values
let darttricker = 'ETH';
let dartdbname = 'ethbalance';
let dartgamemode = 'none';

//slot game data room
let slotopen = 'false';
let slotamount = '0';
let slottricker = 'ETH'
let slotdbname = 'ethbalance';

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();
    const first_name = callbackQuery.from.first_name;
    const key = `duckplays:users:${userId}`;
    await connectRedis()
    const walletinfo = await redisClient.hGetAll(key);
    const ethbalance = parseFloat(walletinfo.ethbalance);
    const bnbbalance = parseFloat(walletinfo.bnbbalance);
    const usdtbalance = parseFloat(walletinfo.usdtbalance);
    const solbalance = parseFloat(walletinfo.solbalance);
    const trxbalance = parseFloat(walletinfo.trxbalance);
    const maticbalance = parseFloat(walletinfo.maticbalance);
    const oldusdwagered = parseFloat(walletinfo.wagered)
    const oldtotalbets = parseFloat(walletinfo.totalbets);
    const oldwonbets = parseFloat(walletinfo.wonbets);
    const oldlossbets = parseFloat(walletinfo.lostbets);
    const evmkey = `duckplays:evmwallet:${userId}`;
    const evminfo = await redisClient.hGetAll(evmkey);
    const evmaddress = evminfo.address;
    const solkey = `duckplays:solwallet:${userId}`;
    const solinfo = await redisClient.hGetAll(solkey);
    const soladdress = solinfo.address;
    const trxkey = `duckplays:trxwallet:${userId}`;
    const trxinfo = await redisClient.hGetAll(trxkey);
    const trxaddress = trxinfo.address;
    const match1 = data.match(/joindice_(.+)/);
    const match2 = data.match(/deletedice_(.+)/);
    const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`
    if (match1) {
        const gamecode = match1[1];
        const dicekey = `duckplays:dicegames:${gamecode}`; //get dice game info data 
        const gameinfo = await redisClient.hGetAll(dicekey);
        const player1id = gameinfo.creator.toString();
        const player2id = gameinfo.player2.toString();
        const betamount = gameinfo.amount.toString();
        const userlink2 = `<a href="tg://user?id=${player1id}">${'Game Host'}</a>`
        const cointricker = gameinfo.cointricker;
        const dbname = gameinfo.dbname;
        const userdata = await redisClient.hGetAll(key);
        const coinbalance = userdata[dbname];
        
        if(coinbalance < betamount ){
            bot.sendMessage(chatId, `${userlink}, Insufficient ${cointricker} balance to join the game..\n\nHave /swap or /deposit 💰`, { parse_mode: 'HTML'})

            return;
        }

        if(userId === player1id){
            bot.sendMessage(chatId, `${userlink}, You are the host, you can't join! lol!`, { parse_mode: 'HTML'})

            return;
        }

        if(player2id === '0'){
            await redisClient.hSet(dicekey, {
                player2: userId,
            });
            await redisClient.hSet(key, {
                [dbname]: coinbalance - betamount,
            });

            bot.sendMessage(chatId, `${userlink}, Joined game with <code>${betamount} ${cointricker}</code>\n\nID : #Dice_${gamecode}\n\nNow Send <code>🎲</code> While replying this msg ${userlink} and ${userlink2}`, { parse_mode: 'HTML'})
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (error) {
                console.error('Error deleting message:', error);
            }

        }else{
            bot.sendMessage(chatId, `${userlink}, Game full! 😂`)
        }
    } else if (match2) {
        const gamecode = match2[1];
        const dicekey = `duckplays:dicegames:${gamecode}`;
        const gameifo = await redisClient.hGetAll(dicekey);
        const player1id = gameifo.creator.toString();
        const cointricker = gameifo.cointricker;
        const amount = parseFloat(gameifo.amount || 0);
        const dbnameofcoin = gameifo.dbname;
        const mainwalletinfo = await redisClient.hGetAll(key);
        const mainamount = parseFloat(mainwalletinfo[dbnameofcoin]);


        if (userId === player1id) {
            await redisClient.del(dicekey);
            await redisClient.hSet(key, {
                [dbnameofcoin]: amount + mainamount,
            });
            bot.sendMessage(player1id, `Dice Game #${gamecode} closed\n+${amount} ${cointricker} (Refund)`);
            try {
                await bot.deleteMessage(chatId, messageId);
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        } else {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: 'Oh no, not you!',
                show_alert: true,
            });
        }
    }

    if(data === 'confirmswap' && confirmdata !== 'none'){
        coin1let
        coin2let
        coin1balancelet
        coin1dbnamelet
        coin2dbnamelet
        coin1priceapilet 
        coin2priceapilet 

        const response1 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin1priceapilet}`);
        const priceusd1 = response1.data.quotes.USD.price;

        const response2 = await axios.get(`https://api.coinpaprika.com/v1/tickers/${coin2priceapilet}`);
        const priceusd2 = response2.data.quotes.USD.price;


        const amountInUsd = coin1balancelet * priceusd1;

        const amountinestimate = priceusd1 / priceusd2;
        const amountInCoin2 = amountInUsd / priceusd2;
        const onePercentOfCoin2 = amountInCoin2 * 0.03; //3% hidden fees, visible 1%

        const key = `duckplays:users:${userId}`;
        const walletinfo = await redisClient.hGetAll(key);
        const coin1balance = parseFloat(walletinfo[coin1dbnamelet] || 0);
        const coin2balance = parseFloat(walletinfo[coin2dbnamelet] || 0);
        if(coin1balance >= coin1balancelet){
         
        bot.sendMessage(chatId, `Swap Confirmed ✅\n<code>+${amountInCoin2.toFixed(8) - onePercentOfCoin2} ${coin2let}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
        
        await redisClient.hSet(key, {
            [coin1dbnamelet]: coin1balance - coin1balancelet,
            [coin2dbnamelet]: parseFloat(coin2balance) + amountInCoin2 - onePercentOfCoin2,
        });
        
        }else{
            bot.sendMessage(chatId, `Low ${coin1let} balance to commit swap!`)
        }
        confirmdata = 'none';
    }

    //withdraw matchs from here 
    const eth_ethmainnet = data.match(/eth-ethmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const bnb_bscmainnet = data.match(/bnb-bscmainnet_(\d+)_([a-fA-F0-9]+)/);
    const usdt_maticmainnet = data.match(/usdt-maticmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const usdt_solmainnet = data.match(/usdt-solmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const usdt_bscmainnet = data.match(/usdt-bscmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const sol_solmainnet = data.match(/sol-solmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const trx_trxmainnet = data.match(/trx-trxmainnet_(\d+)_([a-zA-Z0-9]+)/);
    const matic_maticmainnet = data.match(/matic-maticmainnet_(\d+)_([a-zA-Z0-9]+)/);

    if(eth_ethmainnet){
        const amount = parseFloat(eth_ethmainnet[1]); 
        const walletAddress = eth_ethmainnet[2]; 

        const isValidEthAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidEthAddress(walletAddress)){
         if(ethbalance >= amount + 0.003){
            await redisClient.hSet(key, {
                ethbalance: ethbalance - amount + 0.003,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} ETH-Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.003 ETH</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : ETH\nAmount : <code>${amount}</code>\nChain : ETH mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough ETH balance to cover gas fees <code>0.003 ETH</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid ETH-Mainnet address, Retry or contact support!`)
        }
        
    }

    if(bnb_bscmainnet){
        const amount = parseFloat(bnb_bscmainnet[1]); 
        const walletAddress = bnb_bscmainnet[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(bnbbalance >= amount + 0.004){
            await redisClient.hSet(key, {
                bnbbalance: bnbbalance - amount + 0.004,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} BNB-BSC_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.004 BNB</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : BNB\nAmount : <code>${amount}</code>\nChain : BSC mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough BNB balance to cover gas fees <code>0.004 BNB</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid BSC-Mainnet address, Retry or contact support!`)
        }
        
    }

    if(usdt_maticmainnet){
        const amount = parseFloat(usdt_maticmainnet[1]); 
        const walletAddress = usdt_maticmainnet[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(usdtbalance >= amount + 0.4){
            await redisClient.hSet(key, {
                usdtbalance: usdtbalance - amount + 0.4,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} USDT-Polygon_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.4 USDT</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : USDT\nAmount : <code>${amount}</code>\nChain : Polygon mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough USDT balance to cover gas fees <code>0.4 USDT</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid Polygon-Mainnet address, Retry or contact support!`)
        }
        
    }

    if(usdt_solmainnet){
        const amount = parseFloat(usdt_solmainnet[1]); 
        const walletAddress = usdt_solmainnet[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(usdtbalance >= amount + 0.5){
            await redisClient.hSet(key, {
                usdtbalance: usdtbalance - amount + 0.5,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} USDT-Solana_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.5 USDT</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : USDT\nAmount : <code>${amount}</code>\nChain : Solana mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough USDT balance to cover gas fees <code>0.5 USDT</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid Solana-Mainnet address, Retry or contact support!`)
        }
        
    }

    if(usdt_bscmainnet){
        const amount = parseFloat(usdt_bscmainnet[1]); 
        const walletAddress = usdt_bscmainnet[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(usdtbalance >= amount + 1){
            await redisClient.hSet(key, {
                usdtbalance: usdtbalance - amount + 1,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} USDT-BSC_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-1 USDT</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : USDT\nAmount : <code>${amount}</code>\nChain : BSC mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough USDT balance to cover gas fees <code>1 USDT</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid BSC-Mainnet address, Retry or contact support!`)
        }
        
    }

    if(sol_solmainnet){
        const amount = parseFloat(sol_solmainnet[1]); 
        const walletAddress = sol_solmainnet[2]; 

        const isValidSolAddress = (address) => /^[1-9A-HJ-NP-Za-km-z]{44,48}$/.test(address);
        if(isValidSolAddress(walletAddress)){
         if(solbalance >= amount + 0.02){
            await redisClient.hSet(key, {
                solbalance: solbalance - amount + 0.02,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} SOL-Solana_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-0.02 SOL</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : SOL\nAmount : <code>${amount}</code>\nChain : Solana mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough SOL balance to cover gas fees <code>0.02 Solana</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid SOL-Mainnet address, Retry or contact support!`)
        }
        
    }

    if(trx_trxmainnet){
        const amount = parseFloat(trx_trxmainnet[1]); 
        const walletAddress = trx_trxmainnet[2]; 

        const isValidTrxAddress = (address) => /^T[a-zA-Z0-9]{33}$/.test(address);
        if(isValidTrxAddress(walletAddress)){
         if(trxbalance >= amount + 7){
            await redisClient.hSet(key, {
                trxbalance: trxbalance - amount + 7,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} TRX-Tron_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-7 TRX</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : TRX\nAmount : <code>${amount}</code>\nChain : Tron mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough TRX balance to cover gas fees : <code>7 TRX</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid Tron-Mainnet address, Retry or contact support!`)
        }
        
    }

    if(matic_maticmainnet){
        const amount = parseFloat(matic_maticmainnet[1]); 
        const walletAddress = matic_maticmainnet[2]; 

        const isValidBscAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);
        if(isValidBscAddress(walletAddress)){
         if(maticbalance >= amount + 1){
            await redisClient.hSet(key, {
                maticbalance: maticbalance - amount + 1,
            });
            bot.sendMessage(chatId, `Withdraw request pushed!\n\nYou will get <b>${amount} Matic-Polygon_Mainnet</b> on<code>${walletAddress}</code>\n\nGas fees : <code>-1 MATIC</code>`, {parse_mode: 'HTML'})
            bot.sendMessage('-4584429066', `Withdraw from ${userlink}\n\nCoin : MATIC\nAmount : <code>${amount}</code>\nChain : Polygon mainnet\nWallet address :<code>${walletAddress}</code>`, { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }else{
            bot.sendMessage(chatId, `Not Engough MATIC balance to cover gas fees : <code>1 MATIC</code>`,  { parse_mode: 'HTML', reply_markup: JSON.stringify(backforallmenu) })
         }
        }else{
            bot.sendMessage(chatId, `Invalid Polygon-Mainnet address, Retry or contact support!`)
        }
        
    }

    //coin flip game - head/tail
    const headGif = 'https://media1.tenor.com/m/nEu74vu_sT4AAAAC/heads-coinflip.gif';
    const tailGif = 'https://media1.tenor.com/m/Gv5d5zs4sisAAAAC/google-flip-coin-tail.gif';

    const winChance = 0.35; // 35% chance to win

    if (data.startsWith('coinhead_')) {
     const [prefix, amount, coindbname1, cointricker] = data.split('_');
     const isUserWin = Math.random() < winChance; 
     const coinbalance = parseFloat(walletinfo[coindbname1]);
     if(coinbalance >= amount){
        await redisClient.hSet(key, {
            [coindbname1]: coinbalance - amount,
        });
        const result = isUserWin ? 'Heads' : 'Tails';
        const gifUrl = isUserWin ? headGif : tailGif;
     
        bot.sendMessage(chatId, `🪙 Fliping..`);
        bot.sendAnimation(chatId, gifUrl);
        const apikey = coinapisheet[coindbname1];
        const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
        const priceusd = response.data.quotes.USD.price;
        const betvalueusd = amount * priceusd;
        setTimeout( async () => {
          if(result === 'Heads'){ //here in this users win
           await redisClient.hSet(key, {
            [coindbname1]: coinbalance + amount * 1.98,
           });
           bot.sendMessage(chatId, `Congrats 🎉 You won <b>+${amount * 1.98} ${cointricker}</b>`,  { parse_mode: 'HTML'})
           await redisClient.hSet(key, {
            wagered:  oldusdwagered + betvalueusd,
            totalbets: oldtotalbets + 1,
            wonbets: oldwonbets + 1,
           });
          }else if(result === 'Tails'){ //here in this users lose
            bot.sendMessage(chatId, `You lost 🥲 <b>-${amount } ${cointricker}</b>`,  { parse_mode: 'HTML'})
            await redisClient.hSet(key, {
                wagered:  oldusdwagered + betvalueusd,
                totalbets: oldtotalbets + 1,
                lostbets: oldlossbets + 1,
            });
          }
        }, 2000);
     }else{
        bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
     }
    }
     
    if (data.startsWith('cointail_')) {
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });
           const result = isUserWin ? 'Tails' : 'Heads';
           const gifUrl = isUserWin ? tailGif : headGif;
        
           bot.sendMessage(chatId, `🪙 Fliping..`);
           bot.sendAnimation(chatId, gifUrl);
           const apikey = coinapisheet[coindbname1];
           const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
           const priceusd = response.data.quotes.USD.price;
           const betvalueusd = amount * priceusd;
           setTimeout( async () => {
             if(result === 'Tails'){ //here in this users win
              await redisClient.hSet(key, {
               [coindbname1]: coinbalance + amount * 1.98,
              });
              bot.sendMessage(chatId, `Congrats 🎉 You won <b>+${amount * 1.98} ${cointricker}</b>`,  { parse_mode: 'HTML'})
              await redisClient.hSet(key, {
                wagered:  oldusdwagered + betvalueusd,
                totalbets: oldtotalbets + 1,
                wonbets: oldwonbets + 1,
               });
             }else if(result === 'Heads'){ //here in this users lose
               bot.sendMessage(chatId, `You lost 🥲 <b>-${amount } ${cointricker}</b>`,  { parse_mode: 'HTML'})
               await redisClient.hSet(key, {
                wagered:  oldusdwagered + betvalueusd,
                totalbets: oldtotalbets + 1,
                lostbets: oldlossbets + 1,
               });
             }
           }, 2000);
        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }
     
    if (data.startsWith('dartcenter_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        }
        if(dartopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎯</code> and close your old game for new game 🎮`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);
   
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });
           
           bot.sendMessage(chatId, `Now send a <code>🎯</code> <code>🎯</code> 🍀🤞`,  { parse_mode: 'HTML'})

           dartopen = 'true';
           chatgameopen = 'true';
           darttricker = cointricker;
           dartdbname = coindbname1;
           dartamount = amount;
           dartgamemode = 'gamecenter';
           
        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    if (data.startsWith('dartred_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        } 
        if(dartopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎯</code> and close your old game for new game 🎮`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });
           
           bot.sendMessage(chatId, `Now send a <code>🎯</code> <code>🎯</code> 🍀🤞`,  { parse_mode: 'HTML'})

           dartopen = 'true';
           chatgameopen = 'true';
           darttricker = cointricker;
           dartdbname = coindbname1;
           dartamount = amount;
           dartgamemode = 'redonly';
           
        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    if (data.startsWith('dartwhite_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        } 
        if(dartopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎯</code> and close your old game for new game 🎮`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const isUserWin = Math.random() < winChance; 
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });
           
           bot.sendMessage(chatId, `Now send a <code>🎯</code> <code>🎯</code> 🍀🤞`,  { parse_mode: 'HTML'})

           dartopen = 'true';
           darttricker = cointricker;
           chatgameopen = 'true';
           dartamount = amount;
           dartdbname = coindbname1;
           dartgamemode = 'whiteonly';
           
        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    if (data.startsWith('slotopen_')) {
        if(chatgameopen === 'true'){
            bot.sendMessage(chatId, `⚠️ Already a private chat game open, first close it then start new one! 🥂`)
        } 
        if(slotopen === 'true'){
            bot.sendMessage(chatId, `First send <code>🎰</code> and close your old game for new game 👀`, { parse_mode: 'HTML'})

            return;
        }
        const [prefix, amount, coindbname1, cointricker] = data.split('_');
        const coinbalance = parseFloat(walletinfo[coindbname1]);
        if(coinbalance >= amount){
           await redisClient.hSet(key, {
               [coindbname1]: coinbalance - amount,
           });
           
           bot.sendMessage(chatId, `Now send a <code>🎰</code> <code>🎰</code> 🍀🤞`,  { parse_mode: 'HTML'})

           slotopen = 'true';
           chatgameopen = 'true';
           slotamount = amount;
           slottricker = cointricker
           slotdbname = coindbname1;

           
        }else{
           bot.sendMessage(chatId, `Not Enough ${cointricker} Balance!`)
        }
    }

    //deposit matchs 
    const depositeth_ethmainnet = data.match(/depositeth-ethmainnet_none/); 
    const depositbnb_bscmainnet = data.match(/depositbnb-bscmainnet_none/);
    const depositusdt_maticmainnet = data.match(/depositusdt-maticmainnet_none/);
    const depositusdt_solmainnet = data.match(/depositusdt-solmainnet_none/);
    const depositusdt_bscmainnet = data.match(/depositusdt-bscmainnet_none/);
    const depositsol_solmainnet = data.match(/depositsol-solmainnet_none/);
    const deposittrx_trxmainnet = data.match(/deposittrx-trxmainnet_none/);
    const depositmatic_maticmainnet = data.match(/depositmatic-maticmainnet_none/);

    if(depositeth_ethmainnet){
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 ETH (Ethereum Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 ETH (Ethereum Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }

    if(depositbnb_bscmainnet){
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 BNB (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 BNB (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }

    if(depositusdt_maticmainnet){
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 USDT (Polygon Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 USDT (Polygon Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }

    if(depositusdt_bscmainnet){
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 USDT (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 USDT (Binance Smart Chain - Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }

    if(depositusdt_solmainnet){
        if (Object.keys(solinfo).length > 0) {
          bot.sendMessage(chatId, `💰 USDT (Solana Mainnet) Deposit Address!\n\n<code>${soladdress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = Keypair.generate();
            await redisClient.hSet(solkey, {
                address: wallet.publicKey.toString(),
                privatekey: Buffer.from(wallet.secretKey).toString('hex'),
            });
            bot.sendMessage(chatId, `💰 USDT (Solana Mainnet) Deposit Address!\n\n<code>${wallet.publicKey.toString()}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5-20 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }

    if(depositmatic_maticmainnet){
        if (Object.keys(evminfo).length > 0) {
          bot.sendMessage(chatId, `💰 USDT (Polygon Mainnet) Deposit Address!\n\n<code>${evmaddress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = ethers.Wallet.createRandom();
            await redisClient.hSet(evmkey, {
                address: wallet.address,
                publickey: wallet.publicKey,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 USDT (Polygon Mainnet) Deposit Address!\n\n<code>${wallet.address}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }

    if(depositsol_solmainnet){
        if (Object.keys(solinfo).length > 0) {
          bot.sendMessage(chatId, `💰 SOL (Solana Mainnet) Deposit Address!\n\n<code>${soladdress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = Keypair.generate();
            await redisClient.hSet(solkey, {
                address: wallet.publicKey.toString(),
                privatekey: Buffer.from(wallet.secretKey).toString('hex'),
            });
            bot.sendMessage(chatId, `💰 SOL (Solana Mainnet) Deposit Address!\n\n<code>${wallet.publicKey.toString()}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 5-20 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }
    
    
    if(deposittrx_trxmainnet){
        if (Object.keys(trxinfo).length > 0) {
          bot.sendMessage(chatId, `💰 TRX (Tron Mainnet) Deposit Address!\n\n<code>${trxaddress}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 10-50 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }else{
            const wallet = TronApi.utils.accounts.generateAccount();
            await redisClient.hSet(trxkey, {
                address: wallet.address.base58,
                privatekey: wallet.privateKey,
            });
            bot.sendMessage(chatId, `💰 TRX (Tron Mainnet) Deposit Address!\n\n<code>${wallet.address.base58}</code>\n\n⚠️ Deposit will arrive in 5 mins - 30 mins with 10-50 Block confirmation ☑️`, { parse_mode: 'HTML', disable_web_page_preview: true})
        }
    }
});

//Full Dice game msg code and win/lose 
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    await connectRedis()
    const first_name = msg.from.first_name;
    const key = `duckplays:users:${userId}`;
    const walletinfo = await redisClient.hGetAll(key);
    const oldusdwagered = parseFloat(walletinfo.wagered)
    const oldtotalbets = parseFloat(walletinfo.totalbets);
    const oldwonbets = parseFloat(walletinfo.wonbets);
    const oldlossbets = parseFloat(walletinfo.lostbets);
    const userlink = `<a href="tg://user?id=${userId}">${first_name}</a>`;

    // Check if the message is a reply to another message (bot's message)
    if (msg.reply_to_message && msg.reply_to_message.text) {
        // Extract the game code from the bot's message using a regex
        const diceMatch = msg.reply_to_message.text.match(/#Dice_(\w+)/);

        if (diceMatch) {
            // Extract the game code from the regex match
            const dicegamecode = diceMatch[1];  // This gets the part after "#Dice_"
            const dicekey = `duckplays:dicegames:${dicegamecode}`;
            

            // Proceed with game logic, fetch game data from Redis, etc.
            const gameinfo = await redisClient.hGetAll(dicekey);
            const player1id = gameinfo.creator.toString();
            const player2id = gameinfo.player2.toString();
            const dbname = gameinfo.dbname;
            const amount = gameinfo.amount;
            const key1 = `duckplays:users:${player1id}`;
            const walletinfo1 = await redisClient.hGetAll(key1);
            const coinbalance1 = parseFloat(walletinfo1[dbname]);
            const key2 = `duckplays:users:${player1id}`;
            const walletinfo2 = await redisClient.hGetAll(key2);
            const coinbalance2 = parseFloat(walletinfo2[dbname]);
            const cointricker = gameinfo.cointricker;
            const gamehost = `<a href="tg://user?id=${player1id}">${'Game Host'}</a>`;
            const player2link = `<a href="tg://user?id=${player2id}">${'Second Player'}</a>`;

            let move1 = gameinfo.move1 || 'none';
            let move2 = gameinfo.move2 || 'none';

            // Check if the user is one of the players
            if (userId === player1id || userId === player2id) {
                if (msg.dice) {
                    const diceValue = msg.dice.value;

                    // Assign the dice roll to the correct player (either player 1 or player 2)
                    if (userId === player1id && move1 === 'none') {
                        move1 = diceValue;
                        await redisClient.hSet(dicekey, 'move1', move1);
                        bot.sendMessage(chatId, `${userlink} got <b>${move1}!</b>`,  { parse_mode: 'HTML'});
                    } else if (userId === player2id && move2 === 'none') {
                        move2 = diceValue;
                        await redisClient.hSet(dicekey, 'move2', move2);
                        bot.sendMessage(chatId, `${userlink} rolled a <b>${move2}!</b>`,  { parse_mode: 'HTML' });
                    }

                    // If both moves have been made, compare the dice values and declare the winner
                    if (move1 !== 'none' && move2 !== 'none') {
                        if (move1 > move2) {
                            bot.sendMessage(chatId, `${gamehost} wins <b>${amount * 1.98} ${cointricker}</b> 🎉 with a roll of <b>${move1}</b>, while ${player2link} rolled ${move2}`, { parse_mode: 'HTML'});
                            await redisClient.hSet(key1, {
                                [dbname]:  coinbalance1 + amount * 1.98,
                            });
                        } else if (move1 < move2) {
                            bot.sendMessage(chatId, `${player2id} wins <b>${amount * 1.98} ${cointricker}</b> 🎉with a roll of <b>${move2}</b>, while ${gamehost} rolled ${move1}`,  { parse_mode: 'HTML'});
                            await redisClient.hSet(key2, {
                                [dbname]:  coinbalance2 + amount * 1.98,
                            });
                        } else {
                            bot.sendMessage(chatId, `It's a tie! Both players rolled a ${move1}\n\n${gamehost} got refund of +${amount} ${cointricker}`,  { parse_mode: 'HTML'});
                            await redisClient.hSet(key1, {
                                [dbname]:  coinbalance1 + amount,
                            });
                        }
                        // Reset the game
                    }
                }
            } else {
                //none - user is not part of the game
            }
        }
    }

    if(dartopen === 'true'){
        const coinbalance = parseFloat(walletinfo[dartdbname]);
        if(msg.dice && msg.dice.emoji === '🎯'){
            const dartvalue = msg.dice.value.toString();
            const apikey = coinapisheet[dartdbname];
            const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
            const priceusd = response.data.quotes.USD.price;
            const betvalueusd = dartamount * priceusd;
            if(dartgamemode === 'gamecenter'){
                if(dartvalue === '6'){
                    await redisClient.hSet(key, {
                        [dartdbname]:  coinbalance + dartamount * 3,
                    });
                    const winamount = dartamount * 3;
                    bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered + betvalueusd,
                        totalbets: oldtotalbets + 1,
                        wonbets: oldwonbets + 1,
                    });
                }else{
                  bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                  await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                  });
                }

                dartopen = 'false';
                chatgameopen = 'false';
                return;
            }

            if(dartgamemode === 'redonly'){
                if(dartvalue === '4' || dartvalue === '2' || dartvalue === '6'){
                    await redisClient.hSet(key, {
                        [dartdbname]:  coinbalance + dartamount * 1.4,
                    });
                    const winamount = dartamount * 1.4;
                    bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered + betvalueusd,
                        totalbets: oldtotalbets + 1,
                        wonbets: oldwonbets + 1,
                    });
                }else{
                  bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                  await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                  });
                }

                dartopen = 'false';
                chatgameopen = 'false';
                return;
            }

            if(dartgamemode === 'whiteonly'){
                if(dartvalue === '5' || dartvalue === '3'){
                    await redisClient.hSet(key, {
                        [dartdbname]:  coinbalance + dartamount * 1.4,
                    });
                    const winamount = dartamount * 1.4;
                    bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${darttricker}`,  { parse_mode: 'HTML'});
                    await redisClient.hSet(key, {
                        wagered:  oldusdwagered + betvalueusd,
                        totalbets: oldtotalbets + 1,
                        wonbets: oldwonbets + 1,
                    });
                }else{
                  bot.sendMessage(chatId, `Opps you lost ${dartamount} ${darttricker} :(`)
                  await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                  });
                }

                dartopen = 'false';
                chatgameopen = 'false';
                return;
            }
        }else{
            bot.sendMessage(chatId, `Send a dart first <code>🎯</code> and close the game 🍀`,  { parse_mode: 'HTML'});
        }
    }

    if(slotopen === 'true'){
        const coinbalance = parseFloat(walletinfo[slotdbname]);
        const apikey = coinapisheet[slotdbname];
            const response = await axios.get(`https://api.coinpaprika.com/v1/tickers/${apikey}`);
            const priceusd = response.data.quotes.USD.price;
            const betvalueusd = slotamount * priceusd;
        if(msg.dice && msg.dice.emoji === '🎰'){
            const slotvalue = msg.dice.value.toString();
            if(slotvalue === '1' || slotvalue === '22' || slotvalue === '43' || slotvalue === '64'){
                await redisClient.hSet(key, {
                  [slotdbname]:  coinbalance + slotamount * 7,
                });
                const winamount = slotamount * 7;
                bot.sendMessage(chatId, `Congrats 🎉 You won ${winamount.toFixed(8)} ${slottricker}`,  { parse_mode: 'HTML'});
                await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    wonbets: oldwonbets + 1,
                });
            }else{
                bot.sendMessage(chatId, `Opps you lost ${slotamount} ${slottricker} :(`)
                await redisClient.hSet(key, {
                    wagered:  oldusdwagered + betvalueusd,
                    totalbets: oldtotalbets + 1,
                    lostbets: oldlossbets + 1,
                });
            }

            slotopen  = 'false';
            chatgameopen = 'false';
            return;
            
        }else{
            bot.sendMessage(chatId, `Send the slot first <code>🎰</code> and close the game 🍀`,  { parse_mode: 'HTML'});
        }
    }
});


//Generate Game code for all group games
function generategamecode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

bot.onText(/\/chatid(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const first_name = msg.from.first_name;
    
    bot.sendMessage(chatId, `This group chatid >> ${chatId}`)
});
    
bot.onText(/\/add_money(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const first_name = msg.from.first_name;
    const input = match[1] ? match[1].split(' ') : [];
    const correctformat = ''
    await connectRedis()
    const [userid, amount, dbname, tricker] = input;
    const key = `duckplays:users:${userid}`;
    
    if(userId === '6975590709'){
        await redisClient.hSet(key, {
            [dbname]:  amount,
        });

        bot.sendMessage(userid, `Admin, Sent you ${amount} ${tricker} 🎁`)
    }
});

//coins deposit whole system 

//api/endpoints of different chains
const ethmainneturl = 'https://eth-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const bscmainneturl = 'https://eth-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const maticmainneturl = 'https://polygon-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const usdt_maticmainneturl = 'https://yolo-omniscient-firefly.matic.quiknode.pro/4e32dfdd93c0055622c4ed164b7fe3ac39bf85ea';
const solmainneturl = 'https://solana-mainnet.g.alchemy.com/v2/m06W_6INaTzAq2cO5J4SmAtujUEnTYTr';
const trxmainneturl = 'https://api.trongrid.io';

const weiToEth = (wei) => parseInt(wei) / 1e18; // this is for all evm based chains coins ( not tokens )

async function getAllEvmWallets() { //getting evm wallet-address with there associated userids
    const keys = await redisClient.keys('duckplays:evmwallet:*');
    const wallets = [];
  
    for (const key of keys) {
      const walletInfo = await redisClient.hGetAll(key);
      if (walletInfo.address) {
        // Extract userId from the key
        const userId = key.split(':')[2];
        wallets.push({
          userId,
          address: walletInfo.address
        });
      }
    }
  
    return wallets;
}

async function getAllTrxWallets() { //getting trx wallet-address with there associated userids
    const keys = await redisClient.keys('duckplays:trxwallet:*');
    const wallets = [];
  
    for (const key of keys) {
      const walletInfo = await redisClient.hGetAll(key);
      if (walletInfo.address) {
        // Extract userId from the key
        const userId = key.split(':')[2];
        wallets.push({
          userId,
          address: walletInfo.address
        });
      }
    }
  
    return wallets;
}

async function getAllSolWallets() { //getting trx wallet-address with there associated userids
    const keys = await redisClient.keys('duckplays:solwallet:*');
    const wallets = [];
  
    for (const key of keys) {
      const walletInfo = await redisClient.hGetAll(key);
      if (walletInfo.address) {
        // Extract userId from the key
        const userId = key.split(':')[2];
        wallets.push({
          userId,
          address: walletInfo.address
        });
      }
    }
  
    return wallets;
}
  
//eth of eth mainnet 
async function eth_ethmainnet(address) {
    try {
      const balanceResponse = await axios.post(ethmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
  
      const balanceWei = balanceResponse.data.result;
      const balanceMatic = weiToEth(balanceWei);
  
      const blockNumberResponse = await axios.post(ethmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      });
  
      const latestBlock = blockNumberResponse.data.result;
  
      const txListResponse = await axios.post(ethmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: "0x" + (parseInt(latestBlock, 16) - 10000).toString(16),
            toBlock: latestBlock,
            toAddress: address,
            category: ["external"],
            order: "desc"
          }
        ]
      });
  
      const transfers = txListResponse.data.result.transfers;
      let recentTx = null;
      let recentTxValue = '0';
  
      if (transfers && transfers.length > 0) {
        recentTx = transfers[0].hash;
        recentTxValue = parseFloat(transfers[0].value).toFixed(4);
      }
  
      return {
        address,
        balance: balanceMatic.toFixed(4),
        recentTx,
        recentTxValue
      };
    } catch (error) {
      console.error(`Error fetching info for ${address}:`, error.message);
      return { address, error: error.message };
    }
  }
  
  async function processethWallet(wallet) {
    const info = await eth_ethmainnet(wallet.address);
    if (info.error) {
      console.log(`User ID: ${wallet.userId}`);
      console.log(`Address: ${info.address} - Error: ${info.error}`);
    } else {
      const key = `duckplays:users:${wallet.userId}`;
      const key2 = `duckplays:eth_ethmainnettxid:${wallet.userId}`;
      const txiddataroom = await redisClient.hGetAll(key2);
      const checktxid = txiddataroom[info.recentTx];
      const walletinfo = await redisClient.hGetAll(key);
      const ethbalance = parseFloat(walletinfo.ethbalance || '0');
  
      if (ethbalance !== parseFloat(info.balance)) {
        if (!checktxid) {
          await redisClient.hSet(key2, info.recentTx, info.recentTx);
          const newBalance = (ethbalance + parseFloat(info.recentTxValue)).toFixed(4);
          await redisClient.hSet(key, 'ethbalance', newBalance);
          await bot.sendMessage(wallet.userId, `ETH (Ethereum Mainnet) Deposit Found!\n\nTransaction: <code>${info.recentTx}</code>\n\nAmount: <code>${info.recentTxValue} ETH</code>\nNew Balance: <code>${newBalance} ETH</code>`,  { parse_mode: 'HTML'});
        }
      }
    }
  }
  
  async function eth_ethmainnetmain() {
    try {
      await connectRedis();
      const wallets = await getAllEvmWallets();
  
      for (const wallet of wallets) {
        await processethWallet(wallet);
      }
    } catch (error) {
      console.error('Main error:', error);
    } finally {
      if (redisClient) {
      //  await redisClient.quit();
      }
    }
}
  

//matic of matic mainnet
async function matic_maticmainnet(address) {
    try {
      const balanceResponse = await axios.post(maticmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
  
      const balanceWei = balanceResponse.data.result;
      const balanceMatic = weiToEth(balanceWei);
  
      const blockNumberResponse = await axios.post(maticmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      });
  
      const latestBlock = blockNumberResponse.data.result;
  
      const txListResponse = await axios.post(maticmainneturl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            fromBlock: "0x" + (parseInt(latestBlock, 16) - 10000).toString(16),
            toBlock: latestBlock,
            toAddress: address,
            category: ["external"],
            order: "desc"
          }
        ]
      });
  
      const transfers = txListResponse.data.result.transfers;
      let recentTx = null;
      let recentTxValue = '0';
  
      if (transfers && transfers.length > 0) {
        recentTx = transfers[0].hash;
        recentTxValue = parseFloat(transfers[0].value).toFixed(4);
      }
  
      return {
        address,
        balance: balanceMatic.toFixed(4),
        recentTx,
        recentTxValue
      };
    } catch (error) {
      console.error(`Error fetching info for ${address}:`, error.message);
      return { address, error: error.message };
    }
  }
  
  async function processmaticWallet(wallet) {
    const info = await matic_maticmainnet(wallet.address);
    if (info.error) {
      console.log(`User ID: ${wallet.userId}`);
      console.log(`Address: ${info.address} - Error: ${info.error}`);
    } else {
      const key = `duckplays:users:${wallet.userId}`;
      const key2 = `duckplays:matic_maticmainnettxid:${wallet.userId}`;
      const txiddataroom = await redisClient.hGetAll(key2);
      const checktxid = txiddataroom[info.recentTx];
      const walletinfo = await redisClient.hGetAll(key);
      const maticbalance = parseFloat(walletinfo.maticbalance || '0');
  
      if (maticbalance !== parseFloat(info.balance)) {
        if (!checktxid) {
          await redisClient.hSet(key2, info.recentTx, info.recentTx);
          const newBalance = (maticbalance + parseFloat(info.recentTxValue)).toFixed(4);
          await redisClient.hSet(key, 'maticbalance', newBalance);
          await bot.sendMessage(wallet.userId, `MATIC (Polygon Mainnet) Deposit Found!\n\nTransaction: <code>${info.recentTx}</code>\n\nAmount: <code>${info.recentTxValue} MATIC</code>\nNew Balance: <code>${newBalance} MATIC</code>`,  { parse_mode: 'HTML'});
        }
      }
    }
  }
  
  async function matic_maticmainnetmain() {
    try {
      await connectRedis();
      const wallets = await getAllEvmWallets();
  
      for (const wallet of wallets) {
        await processmaticWallet(wallet);
      }
    } catch (error) {
      console.error('Main error:', error);
    } finally {
      if (redisClient) {
       // await redisClient.quit();
      }
    }
}
  
// Tron TRX 
async function trx_trxmainnet(address) {
    try {
      // Fetch TRX balance
      const balanceResponse = await axios.get(`${trxmainneturl}/v1/accounts/${address}`);
      const balance = balanceResponse.data.data[0].balance / 1e6; // Convert to TRX
  
      // Fetch recent incoming transactions
      const txResponse = await axios.get(`${trxmainneturl}/v1/accounts/${address}/transactions?only_to=true&limit=1`);
      const recentTx = txResponse.data.data[0];
  
      const recentTxDetails = recentTx ? {
        txID: recentTx.txID,
        value: recentTx.raw_data.contract[0].parameter.value.amount / 1e6,
        from: recentTx.raw_data.contract[0].parameter.value.owner_address,
        timestamp: new Date(recentTx.block_timestamp)
      } : null;
  
      return {
        address,
        balance,
        recentTx: recentTxDetails ? recentTxDetails.txID : null,
        recentTxValue: recentTxDetails ? recentTxDetails.value : null
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }
  
  // Replace with the TRX address you want to check
  
  
  async function trx_trxmainnetmain() {
    try {
      await connectRedis();
      const wallets = await getAllTrxWallets();
  
      for (const wallet of wallets) {
        await processtrxWallet(wallet);
      }
    } catch (error) {
      console.error('Main error:', error);
    } finally {
      if (redisClient) {
      //  await redisClient.quit();
      }
    }
  }
  
  async function processtrxWallet(wallet) {
    const info = await trx_trxmainnet(wallet.address);
    if (info.error) {
      console.log(`User ID: ${wallet.userId}`);
      console.log(`Address: ${info.address} - Error: ${info.error}`);
    } else {
      const key = `duckplays:users:${wallet.userId}`;
      const key2 = `duckplays:trx_trxmainnettxid:${wallet.userId}`;
      const txiddataroom = await redisClient.hGetAll(key2);
      const checktxid = txiddataroom[info.recentTx];
      const walletinfo = await redisClient.hGetAll(key);
      const trxbalance = parseFloat(walletinfo.trxbalance || '0');
  
      if (trxbalance !== parseFloat(info.balance)) {
        if (!checktxid) {
          await redisClient.hSet(key2, info.recentTx, info.recentTx);
          const newBalance = (trxbalance + parseFloat(info.recentTxValue)).toFixed(4);
          await redisClient.hSet(key, 'trxbalance', newBalance);
          await bot.sendMessage(wallet.userId, `TRX (Tron Mainnet) Deposit Found!\n\nTransaction: <code>${info.recentTx}</code>\n\nAmount: <code>${info.recentTxValue} TRX</code>\nNew Balance: <code>${newBalance} TRX</code>`,  { parse_mode: 'HTML'});
        }
      }
    }
}


//Solana - sol mainnet deposit things 
async function sol_solmainnet(walletAddress) {
    try {
      const connection = new Connection(solmainneturl, 'confirmed');
      const publicKey = new PublicKey(walletAddress);
  
      // Get SOL balance
      const balance = await connection.getBalance(publicKey);
      const balanceInSOL = balance / LAMPORTS_PER_SOL;
  
      // Get recent transactions
      const transactions = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
  
      let mostRecentDeposit = null;
  
      for (const tx of transactions) {
        try {
          const txInfo = await connection.getParsedTransaction(tx.signature, {
            maxSupportedTransactionVersion: 0
          });
  
          if (!txInfo || !txInfo.meta || !txInfo.meta.postBalances || !txInfo.meta.preBalances) {
            continue;
          }
  
          const walletIndex = txInfo.transaction.message.accountKeys.findIndex(
            key => key.pubkey.toBase58() === walletAddress
          );
  
          if (walletIndex === -1) continue;
  
          const preBalance = txInfo.meta.preBalances[walletIndex];
          const postBalance = txInfo.meta.postBalances[walletIndex];
  
          // Check if this is an incoming transfer (balance increased)
          if (postBalance > preBalance) {
            mostRecentDeposit = {
              txId: tx.signature,
              value: (postBalance - preBalance) / LAMPORTS_PER_SOL
            };
            break;
          }
        } catch (txError) {
          console.error(`Error fetching transaction ${tx.signature}:`, txError.message);
          continue;
        }
      }
  
      return {
        address: walletAddress,
        balance: balanceInSOL.toFixed(9),
        recentTx: mostRecentDeposit ? mostRecentDeposit.txId : null,
        recentTxValue: mostRecentDeposit ? mostRecentDeposit.value.toFixed(9) : null,
        error: null
      };
  
    } catch (error) {
      console.error('Error:', error.message);
      return {
        address: walletAddress,
        balance: null,
        recentTx: null,
        recentTxValue: null,
        error: error.message
      };
    }
 }
  


async function processsolWallet(wallet) {
    const info = await sol_solmainnet(wallet.address);
    if (info.error) {
      console.log(`User ID: ${wallet.userId}`);
      console.log(`Address: ${info.address} - Error: ${info.error}`);
    } else {
      const key = `duckplays:users:${wallet.userId}`;
      const key2 = `duckplays:sol_solmainnettxid:${wallet.userId}`;
      const txiddataroom = await redisClient.hGetAll(key2);
      const checktxid = txiddataroom[info.recentTx];
      const walletinfo = await redisClient.hGetAll(key);
      const solbalance = parseFloat(walletinfo.solbalance || '0');
  
      if (solbalance !== parseFloat(info.balance)) {
        if (!checktxid) {
          await redisClient.hSet(key2, info.recentTx, info.recentTx);
          const newBalance = (solbalance + parseFloat(info.recentTxValue)).toFixed(4);
          await redisClient.hSet(key, 'solbalance', newBalance);
          await bot.sendMessage(wallet.userId, `SOL (Solana Mainnet) Deposit Found!\n\nTransaction: <code>${info.recentTx}</code>\n\nAmount: <code>${info.recentTxValue} SOL</code>\nNew Balance: <code>${newBalance} SOL</code>`,  { parse_mode: 'HTML'});
        }
      }
    }
}

async function sol_solmainnetmain() {
    try {
      await connectRedis();
      const wallets = await getAllSolWallets();
  
      for (const wallet of wallets) {
        await processsolWallet(wallet);
      }
    } catch (error) {
      console.error('Main error:', error);
    } finally {
      if (redisClient) {
      //  await redisClient.quit();
      }
    }
}


bot.onText(/\/check_deposit/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const first_name = msg.from.first_name;
    
    matic_maticmainnetmain()
    eth_ethmainnetmain()
    trx_trxmainnetmain()
    sol_solmainnetmain()

});

//all checks will be done will be repeated here tho
setInterval(() => {
    eth_ethmainnetmain();
    matic_maticmainnetmain();
    trx_trxmainnetmain();
    sol_solmainnetmain()
}, 600000); // 10 minutes = 600,000 milliseconds



//Bets Setup 


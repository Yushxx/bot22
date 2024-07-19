const TelegramBot = require('node-telegram-bot-api');
const request = require('request');
const fs = require('fs');
const http = require('http');

// Configuration des bots
const botsConfig = [
    {
        token: '7377212911:AAFg7WwqfDbKYLG8mHXajHrnbsGDFoc_uTs',
        url: 'https://t.me/+nLRP43gL3k9iMTM8',
        savePath: 'https://solkah.org/melbet/index1.php',
        dataPath: 'https://solkah.org/melbet/id/data1.txt',
        adminId: 814566054 // Remplacez par l'ID Telegram de l'administrateur
    },
    {
        token: '7482988491:AAGnuBmUnmC9aXV741kEC-hquo_vYuebyjw',
        url: 'https://t.me/+rioWZrgD_F1lNTI0',
        savePath: 'https://solkah.org/melbet/index2.php',
        dataPath: 'https://solkah.org/melbet/id/data2.txt',
        adminId: 814566054
    },
    {
        token: '6808636294:AAHSrYD-xN9OBYBKECGsrfe7YOVBtUXVnZk',
        url: 'https://t.me/+Z0Tuo_T0jVw1ODg0',
        savePath: 'https://solkah.org/melbet/index3.php',
        dataPath: 'https://solkah.org/melbet/id/data3.txt',
        adminId: 814566054
    },
    {
        token: '7028647907:AAHicbsE2BMHN2xhwOL7nmJk7Czj9jwiJ_g',
        url: 'https://t.me/+ZX_ubOP6c9Y4YzQ0',
        savePath: 'https://solkah.org/melbet/index4.php',
        dataPath: 'https://solkah.org/melbet/id/data4.txt',
        adminId: 814566054
    }
];

// Fonction pour lire le nombre d'abonnés
function getSubscriberCount(dataPath, callback) {
    request(dataPath, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            console.error(`Erreur lors de la lecture du fichier: ${error}`);
            callback(0);
            return;
        }
        const lines = body.trim().split('\n');
        callback(lines.length);
    });
}

// Fonction pour envoyer des messages aux abonnés
function sendMessageToSubscribers(bot, dataPath, message, messageType, caption = '') {
    request(dataPath, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            console.error(`Erreur lors de la lecture du fichier: ${error}`);
            return;
        }
        const lines = body.trim().split('\n');
        const subscriberIds = lines.map(line => line.split(':')[1].trim());
        let successCount = 0;
        let failureCount = 0;

        subscriberIds.forEach(id => {
            const options = { caption: caption };
            let sendFunction;

            if (messageType === 'text') {
                sendFunction = bot.sendMessage(id, message);
            } else if (messageType === 'photo') {
                sendFunction = bot.sendPhoto(id, message, options);
            } else if (messageType === 'video') {
                sendFunction = bot.sendVideo(id, message, options);
            } else if (messageType === 'audio') {
                sendFunction = bot.sendAudio(id, message, options);
            } else if (messageType === 'document') {
                sendFunction = bot.sendDocument(id, message, options);
            }

            sendFunction
                .then(() => successCount++)
                .catch(() => failureCount++)
                .finally(() => {
                    if (successCount + failureCount === subscriberIds.length) {
                        bot.sendMessage(bot.adminId, `Messages envoyés avec succès à ${successCount} abonnés. Échecs : ${failureCount}`);
                    }
                });
        });
    });
}

// Fonction pour initialiser un bot avec sa configuration
function initializeBot(config) {
    const bot = new TelegramBot(config.token, { polling: true });
    let adminState = {};

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const firstName = msg.from.first_name;

        bot.sendMessage(chatId, `Salut ${firstName} ! Bienvenue dans le programme hack de solkah. Cliquez sur le bouton ci-dessous pour nous rejoindre`, {
            reply_markup: {
                inline_keyboard: [[
                    { text: 'Rejoindre ✅️🤑', url: config.url }
                ]]
            }
        });

        // Envoi de l'ID de l'utilisateur à votre site PHP
        const user_id = msg.from.id;
        request.post(config.savePath, { json: { user_id: user_id } }, (error, res, body) => {
            if (error) {
                console.error(`Error posting to ${config.savePath}:`, error);
                return;
            }
            console.log(`statusCode: ${res.statusCode}`);
            console.log(body);
        });
    });

    bot.onText(/\/admis/, (msg) => {
        if (msg.chat.id === config.adminId) {
            bot.sendMessage(config.adminId, 'Bienvenue, Admin. Que souhaitez-vous faire ?', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Nombre d\'abonnés', callback_data: 'subscriber_count' }],
                        [{ text: 'Envoyer un message', callback_data: 'send_message' }]
                    ]
                }
            });
        }
    });

    bot.onText(/\/delete/, (msg) => {
        if (msg.chat.id === config.adminId) {
            bot.deleteMessage(msg.chat.id, msg.message_id.toString())
                .then(() => {
                    bot.sendMessage(config.adminId, 'Message supprimé avec succès.');
                })
                .catch(err => {
                    bot.sendMessage(config.adminId, `Erreur lors de la suppression du message : ${err}`);
                });
        }
    });

    bot.on('callback_query', (callbackQuery) => {
        const action = callbackQuery.data;
        const msg = callbackQuery.message;

        if (msg.chat.id === config.adminId) {
            if (action === 'subscriber_count') {
                getSubscriberCount(config.dataPath, (count) => {
                    bot.sendMessage(config.adminId, `Nombre d'abonnés : ${count}`);
                });
            } else if (action === 'send_message') {
                adminState[config.adminId] = 'awaiting_message';
                bot.sendMessage(config.adminId, 'Veuillez envoyer votre message.');
            } else if (action === 'confirm_send') {
                const messageData = adminState[config.adminId];
                sendMessageToSubscribers(bot, config.dataPath, messageData.message, messageData.type, messageData.caption);
                adminState[config.adminId] = null;
            }
        }
    });

    bot.on('message', (msg) => {
        if (msg.chat.id === config.adminId && adminState[config.adminId] === 'awaiting_message' && msg.text !== '/admis') {
            let messageType = 'text';
            let messageContent = msg.text;
            let caption = '';

            if (msg.photo) {
                messageType = 'photo';
                messageContent = msg.photo[msg.photo.length - 1].file_id; // Prendre la photo de la meilleure qualité
                caption = msg.caption || '';
            } else if (msg.video) {
                messageType = 'video';
                messageContent = msg.video.file_id;
                caption = msg.caption || '';
            } else if (msg.audio) {
                messageType = 'audio';
                messageContent = msg.audio.file_id;
            } else if (msg.document) {
                messageType = 'document';
                messageContent = msg.document.file_id;
            }

            adminState[config.adminId] = { message: messageContent, type: messageType, caption: caption };

            bot.sendMessage(config.adminId, 'Êtes-vous sûr de vouloir envoyer ce message à tous les abonnés ?', {
                reply_markup: {
                    inline_keyboard: [[{ text: 'Envoyer', callback_data: 'confirm_send' }]]
                }
            });
        }
    });

    return bot;
}

// Initialiser tous les bots
botsConfig.forEach(config => initializeBot(config));

// Créez un serveur HTTP simple qui renvoie "I'm alive" lorsque vous accédez à son URL
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write("I'm alive");
    res.end();
});

// Écoutez le port 8080
server.listen(8080, () => {
    console.log("Keep alive server is running on port 8080");
});

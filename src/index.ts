import NodeCache from '@cacheable/node-cache'
import { Boom } from '@hapi/boom'
import makeWASocket, { AnyMessageContent, BinaryInfo, delay, DisconnectReason, encodeWAM, fetchLatestBaileysVersion, getAggregateVotesInPollMessage, isJidNewsletter, makeCacheableSignalKeyStore, proto, useMultiFileAuthState, WAMessageContent, WAMessageKey } from 'baileys'
import fs from 'fs'
import P from 'pino'
import readline from 'readline'

const logger = P({ timestamp: () => `,"time":"${new Date().toJSON()}"` }, P.destination('./wa-logs.txt'))
logger.level = 'trace'

const doReplies = process.argv.includes('--do-reply')
const usePairingCode = process.argv.includes('--use-pairing-code')

const msgRetryCounterCache = new NodeCache()

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

const startSock = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info')
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: !usePairingCode,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        getMessage,
    })

    if (usePairingCode && !sock.authState.creds.registered) {
        const phoneNumber = await question('Please enter your phone number:\n')
        const code = await sock.requestPairingCode(phoneNumber)
        console.log(`Pairing code: ${code}`)
    }

    const sendMessageWTyping = async (msg: AnyMessageContent, jid: string) => {
        await sock.presenceSubscribe(jid)
        await delay(500)
        await sock.sendPresenceUpdate('composing', jid)
        await delay(2000)
        await sock.sendPresenceUpdate('paused', jid)
        await sock.sendMessage(jid, msg)
    }

    sock.ev.process(
        async (events: any) => {
            if (events['connection.update']) {
                const update = events['connection.update']
                const { connection, lastDisconnect } = update
                if (connection === 'close') {
                    if ((lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut) {
                        startSock()
                    } else {
                        console.log('Connection closed. You are logged out.')
                    }
                }

                const sendWAMExample = false;
                if (connection === 'open' && sendWAMExample) {
                    const {
                        header: {
                            wamVersion,
                            eventSequenceNumber,
                        },
                        events,
                    } = JSON.parse(await fs.promises.readFile("./boot_analytics_test.json", "utf-8"))

                    const binaryInfo = new BinaryInfo({
                        protocolVersion: wamVersion,
                        sequence: eventSequenceNumber,
                        events: events
                    })

                    const buffer = encodeWAM(binaryInfo);

                    const result = await sock.sendWAMBuffer(buffer)
                    console.log(result)
                }

                console.log('connection update', update)
            }

            if (events['creds.update']) {
                await saveCreds()
            }

            if (events['labels.association']) {
                console.log(events['labels.association'])
            }


            if (events['labels.edit']) {
                console.log(events['labels.edit'])
            }

            if (events.call) {
                console.log('recv call event', events.call)
            }

            if (events['messaging-history.set']) {
                const { chats, contacts, messages, isLatest, progress, syncType } = events['messaging-history.set']
                if (syncType === proto.HistorySync.HistorySyncType.ON_DEMAND) {
                    console.log('received on-demand history sync, messages=', messages)
                }
                console.log(`recv ${chats.length} chats, ${contacts.length} contacts, ${messages.length} msgs (is latest: ${isLatest}, progress: ${progress}%), type: ${syncType}`)
            }

            if (events['messages.upsert']) {
                const upsert = events['messages.upsert']
                console.log('recv messages ', JSON.stringify(upsert, undefined, 2))

                if (upsert.type === 'notify') {
                    for (const msg of upsert.messages) {
                        if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
                            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
                            if (text == "requestPlaceholder" && !upsert.requestId) {
                                const messageId = await sock.requestPlaceholderResend(msg.key)
                                console.log('requested placeholder resync, id=', messageId)
                            } else if (upsert.requestId) {
                                console.log('Message received from phone, id=', upsert.requestId, msg)
                            }

                            // go to an old chat and send this
                            if (text == "onDemandHistSync") {
                                const messageId = await sock.fetchMessageHistory(50, msg.key, msg.messageTimestamp!)
                                console.log('requested on-demand sync, id=', messageId)
                            }
                        }

                        if (!msg.key.fromMe && doReplies && !isJidNewsletter(msg.key?.remoteJid!)) {

                            console.log('replying to', msg.key.remoteJid)
                            await sock!.readMessages([msg.key])
                            await sendMessageWTyping({ text: 'Hello there!' }, msg.key.remoteJid!)
                        }
                    }
                }
            }

            if (events['messages.update']) {
                console.log(
                    JSON.stringify(events['messages.update'], undefined, 2)
                )

                for (const { key, update } of events['messages.update']) {
                    if (update.pollUpdates) {
                        const pollCreation: proto.IMessage = {}
                        if (pollCreation) {
                            console.log(
                                'got poll update, aggregation: ',
                                getAggregateVotesInPollMessage({
                                    message: pollCreation,
                                    pollUpdates: update.pollUpdates,
                                })
                            )
                        }
                    }
                }
            }

            if (events['message-receipt.update']) {
                console.log(events['message-receipt.update'])
            }

            if (events['messages.reaction']) {
                console.log(events['messages.reaction'])
            }

            if (events['presence.update']) {
                console.log(events['presence.update'])
            }

            if (events['chats.update']) {
                console.log(events['chats.update'])
            }

            if (events['contacts.update']) {
                for (const contact of events['contacts.update']) {
                    if (typeof contact.imgUrl !== 'undefined') {
                        const newUrl = contact.imgUrl === null
                            ? null
                            : await sock!.profilePictureUrl(contact.id!).catch(() => null)
                        console.log(
                            `contact ${contact.id} has a new profile pic: ${newUrl}`,
                        )
                    }
                }
            }

            if (events['chats.delete']) {
                console.log('chats deleted ', events['chats.delete'])
            }
        }
    )

    return sock

    async function getMessage(key: WAMessageKey): Promise<WAMessageContent | undefined> {
        return proto.Message.fromObject({})
    }
}

startSock()
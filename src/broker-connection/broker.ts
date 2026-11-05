
import amqp, { type Channel, type ChannelModel } from 'amqplib';

export let connectionRabbitMQ: ChannelModel | null = null;
export let channel: Channel | null = null;
const exchange = process.env.EXCHANGE_NAME;
const internalExchangeName = process.env.INTERNAL_EXCHANGE_NAME;

function cleanupConnection() {
    if (connectionRabbitMQ) {
        connectionRabbitMQ.removeAllListeners();
    }
    connectionRabbitMQ = null;
    channel = null;
}

export async function connectRabbitMQ(): Promise<void> {
    const broker_url = process.env.BROKER_URL;
    if (!exchange) throw new Error("process.env.EXCHANGE_NAME não configurada ");
    if (!broker_url) throw new Error("process.env.BROKER_URL não configurada ");

    if (connectionRabbitMQ && channel) {
        return;
    }

    try {
        cleanupConnection();

        connectionRabbitMQ = await amqp.connect(broker_url, {
            heartbeat: 30,
        });
        channel = await connectionRabbitMQ.createChannel();
        await channel.assertExchange(exchange, 'topic', { durable: true });

        connectionRabbitMQ.on('close', () => {
            console.warn("[ RabbitMQ ] Conexão fechada. Tentando reconectar...");
            cleanupConnection();
            setTimeout(connectRabbitMQ, 5000);
        });

        connectionRabbitMQ.on('error', (err) => {
            console.error("[ RabbitMQ ] Erro na Conexão:", err);
            cleanupConnection();
            if (connectionRabbitMQ) {
                connectionRabbitMQ.close().catch(() => {});
            }
            cleanupConnection();
            setTimeout(connectRabbitMQ, 5000);
        });

        console.log("[ RabbitMQ ] Conectado com sucesso.");
    } catch (e) {
        cleanupConnection();
        console.log(" [ RabbitMQ] Falha ao conectar. Tentando novamente...");
        setTimeout(connectRabbitMQ, 5000);
    }
}

export async function publishExchangeMessage(routingKey: string, data: any): Promise<boolean> {
    if (!channel || !connectionRabbitMQ) {
        console.warn("[RabbitMQ] Sem conexão ativa. Mensagem não enviada.");
        return false;
    }
    if (!exchange) throw new Error("process.env.EXCHANGE_NAME não configurada ");

    try {
        const buffer = Buffer.from(JSON.stringify(data));

        return channel.publish(exchange, routingKey, buffer, {
            persistent: true,
        });
    } catch (error) {
        console.error("[RabbitMQ] Erro ao tentar publicar:", error);
        return false;
    }
}
 
export async function publishInternalExchangeMessage(routingKey: string, data: any): Promise<boolean> {
    if (!channel || !connectionRabbitMQ) {
        console.warn("[RabbitMQ] Sem conexão ativa. Mensagem não enviada.");
        return false;
    }
    if (!internalExchangeName) throw new Error("process.env.INTERNAL_EXCHANGE_NAME não configurada ");

    try {
        const buffer = Buffer.from(JSON.stringify(data));

        return channel.publish(internalExchangeName, routingKey, buffer, {
            persistent: true,
        });
    } catch (error) {
        console.error("[RabbitMQ] Erro ao tentar publicar:", error);
        return false;
    }
}







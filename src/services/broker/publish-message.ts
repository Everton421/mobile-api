import { connectRabbitMQ, publishExchangeMessage, publishInternalExchangeMessage } from "../../broker-connection/broker.ts";
import { sendWebhooks } from "../webhook/webhook-dispatcher.ts";
 

/**
 * 
 * @param cnpj cnpj do cliente
 * @param evento   'pedido.criado', 'produto.cadastrado' 
 * @param data  dados da mensagem enviada ao broker. Ex:  "{ codigo:1 , estoque:2 }"
 * @param source identificador de onde veio a mensagem, opcional, caso nao informado o valor padrao  ['api_internal'] será aplicado.
 * @returns 
 */
export async function publishMessage(cnpj: string, evento: string, data: any, source?: string) {

    await connectRabbitMQ();
    const cnpjCliente = cnpj;
    const metadata_source = source || 'api_internal';
    const routingKey = `tenant.${cnpjCliente}.${evento}`;
    const mensagem = {
        metadata: {
            tenant_id: cnpjCliente,
            event: evento,
            timestamp: new Date().toISOString(),
            origin: metadata_source
        },
        data: data
    };

    console.log(`📤 Enviando para: ${routingKey}`);

    const enviado = await publishExchangeMessage(routingKey, mensagem);

    if (enviado) console.log("✅ Mensagem enviada com sucesso!");
    else console.error("❌ Falha no envio.");

    void sendWebhooks(cnpjCliente, evento, data, source).catch(err => {
        console.error('[Webhook] Erro ao enviar webhooks:', err);
    });

    return enviado;
}




 
export async function publishInternalMessage(cnpj: string, evento: string, data: any ) {

    await connectRabbitMQ();
    const cnpjCliente = cnpj;

    
    const mensagem = {
        metadata: {
            tenant_id: cnpjCliente,
            event: evento,
            timestamp: new Date().toISOString(),
        },
        data: data
    };

    console.log(`📤 Enviando para: ${evento}`);

    const enviado = await publishInternalExchangeMessage(evento, mensagem);

    if (enviado) console.log("✅ Mensagem enviada com sucesso!");
    else console.error("❌ Falha no envio.");


    return enviado;
}


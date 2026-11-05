import { channel, connectionRabbitMQ, connectRabbitMQ } from "../../broker-connection/broker.ts";
import { ProcessFactory } from "./process-factory.ts";

const internalExchangeName = process.env.INTERNAL_EXCHANGE_NAME;

export async function startTenenatWorker() {
    await connectRabbitMQ();
    
       if (!channel || !connectionRabbitMQ) {
            console.warn("[RabbitMQ] Sem conexão ativa.");
            return false;
         }
 
         if (!internalExchangeName) throw new Error("process.env.INTERNAL_EXCHANGE_NAME não configurada ");

         const globalQueueName = "api.processamento";

      await channel.assertExchange(internalExchangeName, 'topic', { durable: true });

       await channel.assertQueue(globalQueueName, { durable: true });


         const bindingKey = "*.processar.*";
         await channel.bindQueue(globalQueueName, internalExchangeName,bindingKey );
         console.log(`[Worker] Worker interno iniciado!`);
         
         await channel.prefetch(1);
 
         await channel.consume(globalQueueName, async ( msg )=>{
            if(!msg) return ;
            try {
                 const routingKey = msg.fields.routingKey; // Ex: "loteseriesetor.processar.123456"
                const  [ modulo, processar,  tenantId] = routingKey.split('.'); 

                const content = JSON.parse(msg.content.toString());
                  
                  const service = ProcessFactory.getProcess(modulo as any);

                  const resultInsert = await service.execute(tenantId,content.data.itens )

                if(resultInsert) channel!.ack(msg);

                console.log(`[Worker] Lote do módulo [${modulo}] para o Tenant [${tenantId}] processado com sucesso!`);


            } catch (error) {
                 console.error('[Worker] Erro crítico no processamento do lote:', error);
                // Re-enfileira (true) se for um erro temporário (ex: banco caiu), 
                // ou descarta (false) se for um erro de código/dados inválidos
                channel!.nack(msg, false, true); 
            }
         })
}

startTenenatWorker()


 



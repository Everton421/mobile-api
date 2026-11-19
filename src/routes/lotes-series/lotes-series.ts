import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectLotesSeries } from '../../models/lotes-series/select.ts';
import { InsertLotesSeries } from '../../models/lotes-series/insert.ts';
import { UpdateLotesSeries } from '../../models/lotes-series/update.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishInternalMessage, publishMessage } from '../../services/broker/publish-message.ts';
import { type LotesSeriesInput } from '../../models/lotes-series/types/lotes-series-type.ts';

const lotesSeriesResponseSchema = z.object({
    codigo: z.coerce.number().optional(),
    id: z.string().nullable().optional(),
    produto: z.coerce.number(),
    lote: z.coerce.string().nullable(),
    serie: z.coerce.string().nullable(),
    data_cadastro: z.string(),
    data_recadastro: z.string()
});

const lotesSeriesBodySchema = z.object({
    codigo: z.number().optional(),
    id: z.string().optional().nullable().describe("Id"),
    produto: z.number(),
    lote: z.string().optional().nullable(),
    serie: z.string().optional().nullable()
});

const lotesSeriesUpdateBodySchema = z.object({
    codigo: z.number(),
    id: z.string().optional().nullable(),
    produto: z.number().optional(),
    lote: z.string().optional().nullable(),
    serie: z.string().optional().nullable()
});

const lotesSeriesBulkBodySchema = z.array(z.object({
    codigo: z.number().optional().describe('Código único do registro'),
    id: z.string().optional().nullable(),
    produto: z.number(),
    lote: z.string().optional().nullable(),
    serie: z.string().optional().nullable()
}));

const lotesSeriesRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/lotes-series/search', {
        schema: {
            tags: ['lotes-series'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                codigo: z.coerce.number().optional(),
                id: z.string().optional(),
                produto: z.coerce.number().optional(),
                serie: z.string().optional(),
                lote: z.string().optional()
            }),
            response: {
                200: z.array(lotesSeriesResponseSchema),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectLotesSeries();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;

        try {
            
             let  result = await select.findByFilters(dbName,request.query );
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error searching lotes-series:', e);
            return reply.status(400).send({ success: false, message: 'Error searching lotes-series' });
        }
    });

    server.post('/lotes-series', {
        schema: {
            description: "Cadastra/atualiza lote serie. Se informado o código e o registro já existir, o mesmo será atualizado com os novos dados.",
            tags: ['lotes-series'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: lotesSeriesBodySchema,
            response: {
                201: lotesSeriesResponseSchema,
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const dateService = new DateService();
        const decodedToken = DecodedToken(String(request.headers.token));
        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }
        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo, id, produto, lote, serie } = request.body;
        const data_cadastro = dateService.obterDataAtual();
        const data_recadastro = dateService.obterDataHoraAtual();

        try {
            const insert = new InsertLotesSeries();

          const result =  await insert.insertOrUpdate(dbName,
                 {
                ...(codigo !== undefined ? { codigo } : {}),
                id,
                produto,
                lote,
                serie,
                data_cadastro,
                data_recadastro
            }
            )
             let item: LotesSeriesInput = {
                id: id ?? null,
                produto,
                lote: lote ?? null,
                serie: serie ?? null,
                data_cadastro,
                data_recadastro
            };
                if(result.insertId){
                    item.codigo =  result.insertId;
                }
              
       
              await publishMessage(empresa, 'lotesserie.inserido', item, source);
            return reply.status(201).send(item as any);
      

        } catch (e) {
            console.error('Error inserting lotes-series:', e);
            return reply.status(400).send({ success: false, message: 'Error inserting lotes-series' });
        }
    });

    server.put('/lotes-series', {
        schema: {
            tags: ['lotes-series'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: lotesSeriesUpdateBodySchema,
            response: {
                200: lotesSeriesResponseSchema,
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const dateService = new DateService();
        const decodedToken = DecodedToken(String(request.headers.token));
        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }
        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo, id, produto, lote, serie } = request.body;

        try {
            const select = new SelectLotesSeries();
            const existing = await select.findByCode(dbName, codigo);
            if (existing.length === 0) {
                return reply.status(400).send({ success: false, message: 'Record not found' });
            }

            const update = new UpdateLotesSeries();
            const data_recadastro = dateService.obterDataHoraAtual();
            const updateData: any = { codigo, data_recadastro };
            if (id !== undefined) updateData.id = id;
            if (produto !== undefined) updateData.produto = produto;
            if (lote !== undefined) updateData.lote = lote;
            if (serie !== undefined) updateData.serie = serie;

            await update.update(dbName, updateData);

            const [updated] = await select.findByCode(dbName, codigo);
            await publishMessage(empresa, 'lotesserie.atualizado', updated, source);
            return reply.status(200).send(updated);
        } catch (e) {
            console.error('Error updating lotes-series:', e);
            return reply.status(400).send({ success: false, message: 'Error updating lotes-series' });
        }
    });
    server.post('/async/bulk/lotes-series', {
        schema: {
            description: "Cadastra/atualiza lote serie em lote. Se informado o código e o registro já existir, o mesmo será atualizado com os novos dados. Limite maximo por lote: 5000 ",
            tags: ['lotes-series'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: lotesSeriesBulkBodySchema,
            response: {
                202: z.object({
                        success: z.boolean(), 
                       message: z.string(),
                       lote_id: z.string()
                   }),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                500: z.object({
                   success: z.boolean(),
                   message: z.string()
               })
            }
        }
    }, async (request, reply) => {
        const dateService = new DateService();
        const decodedToken = DecodedToken(String(request.headers.token));
        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }
        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const dados = request.body;

        if (!Array.isArray(dados) || dados.length === 0) {
            return reply.status(400).send({ success: false, message: 'Array of items is required' });
        }
            if ( dados.length > 5000) {
            return reply.status(400).send({ success: false, message: 'record limit per batch reached' });
        }
        try {
                const loteId = crypto.randomUUID(); 
                             const QUEUE_CHUNK_SIZE = 5000;  
            
                            for (let i = 0; i < dados.length; i += QUEUE_CHUNK_SIZE) {
                                const chunk = dados.slice(i, i + QUEUE_CHUNK_SIZE);
                                
                                const payloadFila = {
                                    loteId,
                                    dbName,
                                    empresa,
                                    source,
                                    itens: chunk
                                };
            
                               await publishInternalMessage(empresa, `loteserie.processar.${empresa}`, payloadFila);
            
                            }
            
                            return reply.status(202).send({ 
                                success: true, 
                                message: 'O processamento do lote foi iniciado em segundo plano.',
                                lote_id: loteId
                            });
        } catch (e) {
                 console.error('Error triggering background job:', e);
                return reply.status(500).send({ success: false, message: 'Internal server error' });
        }
    });
    server.post('/bulk/lotes-series', {
        schema: {
            description: "Cadastra/atualiza lote serie em lote. Se informado o código e o registro já existir, o mesmo será atualizado com os novos dados. Limite maximo por lote: 5000 ",
            tags: ['lotes-series'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: lotesSeriesBulkBodySchema,
            response: {
                200: z.array(lotesSeriesResponseSchema),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                500: z.object({
                   success: z.boolean(),
                   message: z.string()
               })
            }
        }
    }, async (request, reply) => {
        const dateService = new DateService();
        const decodedToken = DecodedToken(String(request.headers.token));
        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }
        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const dados = request.body;

            if (!Array.isArray(dados) || dados.length === 0) {
                return reply.status(400).send({ success: false, message: 'Array of items is required' });
            }
            if ( dados.length > 5000) {
                return reply.status(400).send({ success: false, message: 'record limit per batch reached' });
            }

            const insert = new InsertLotesSeries();
            const select = new SelectLotesSeries();

        try {
                                const dataToInsert:LotesSeriesInput[] =[];

                                for(const loteSerie of dados){
                                    
                                let item:LotesSeriesInput = {
                                        serie: loteSerie.serie,
                                        produto: loteSerie.produto,
                                        data_cadastro: dateService.obterDataAtual(),
                                        data_recadastro: dateService.obterDataHoraAtual(),
                                    }
                                    if( loteSerie.id ) item.id = loteSerie.id ;
                                    if(loteSerie.codigo ) item.codigo = loteSerie.codigo; 

                                    dataToInsert.push(item )
                                }
                                // insere os dados em lote.
                               await insert.bulkInsertOrUpdate(dbName,dataToInsert  )   

                               const seriesInserted =  dataToInsert.map( ( s ) => s.serie! );

                                const dataToResult   = await select.findByArraySeriesIn(dbName,  seriesInserted )

                             return reply.status(200).send( dataToResult);
        } catch (e) {
                 console.error('Error triggering background job:', e);
                return reply.status(500).send({ success: false, message: 'Internal server error' });
        }
    });

};

export { lotesSeriesRoute };
export default lotesSeriesRoute;

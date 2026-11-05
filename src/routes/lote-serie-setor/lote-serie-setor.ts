import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z, { boolean, promise } from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectLoteSerieSetor } from '../../models/lote-serie-setor/select.ts';
import { InsertLoteSerieSetor } from '../../models/lote-serie-setor/insert.ts';
import { publishInternalMessage, publishMessage } from '../../services/broker/publish-message.ts';

const loteSerieSetorResponseSchema = z.object({
    setor: z.number(),
    produto: z.number(),
    lote_serie: z.number(),
    estoque: z.number(),
    lote:z.string().nullable(),
    serie:z.string().nullable(),
});

const loteSerieSetorBodySchema = z.object({
    setor: z.number(),
    produto: z.number(),
    lote_serie: z.number(),
    estoque: z.number()
});

const loteSerieSetorBulkBodySchema = z.array(z.object({
    setor: z.number(),
    produto: z.number(),
    lote_serie: z.number(),
    estoque: z.number()
}));

const loteSerieSetorRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/lote-serie-setor/search', {
        schema: {
            tags: ['lote-serie-setor'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                setor: z.coerce.number().optional(),
                produto: z.coerce.number().optional(),
                lote_serie: z.coerce.number().optional(),
                serie: z.coerce.string().optional(),
                situacao_estoque: z.enum(['positivo', 'negativo', 'zerado', 'todos']).optional()
            }),
            response: {
                200: z.array(loteSerieSetorResponseSchema),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectLoteSerieSetor();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { setor, produto, lote_serie,  situacao_estoque, serie } = request.query;

        try {
            const result = await select.findByFilters(dbName, {
                setor,
                produto,
                serie,
                lote_serie,
                estoqueFilter: situacao_estoque
            });
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error searching lote-serie-setor:', e);
            return reply.status(400).send({ success: false, message: 'Error searching lote-serie-setor' });
        }
    });

    server.put('/lote-serie-setor', {
        schema: {
            tags: ['lote-serie-setor'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: loteSerieSetorBodySchema,
            response: {
                200: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const decodedToken = DecodedToken(String(request.headers.token));
        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }
        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { setor, produto, lote_serie, estoque } = request.body;

        try {
            const insert = new InsertLoteSerieSetor();
            await insert.insertOrUpdate(dbName, { setor, produto, lote_serie, estoque });
            const select = new SelectLoteSerieSetor();
            const [updated] = await select.findBySectorAndLoteSerie(dbName, setor, lote_serie);
            await publishMessage(empresa, 'loteseriesetor.atualizado', updated, source);
            return reply.status(200).send({ success: true, message: 'Stock updated successfully' });
        } catch (e) {
            console.error('Error updating lote-serie-setor:', e);
            return reply.status(400).send({ success: false, message: 'Error updating lote-serie-setor' });
        }
    });

       server.put('/bulk/lote-serie-setor', {
        schema: {
            tags: ['lote-serie-setor'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: loteSerieSetorBulkBodySchema,
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

                   await publishInternalMessage(empresa, `loteseriesetor.processar.${empresa}`, payloadFila);

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
};

export { loteSerieSetorRoute };
export default loteSerieSetorRoute;

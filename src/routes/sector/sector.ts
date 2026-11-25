import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectSector } from '../../models/sector/select.ts';
import { InsertSector } from '../../models/sector/insert.ts';
import { UpdateSector } from '../../models/sector/update.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishInternalMessage, publishMessage } from '../../services/broker/publish-message.ts';

const sectorBulkBodySchema = z.array(z.object({
    codigo: z.number().optional(),
    id: z.string(),
    descricao: z.string()
}));

const responseSchema= z.object({
                    codigo: z.number(),
                    id: z.string(),
                    data_cadastro: z.string(),
                    data_recadastro: z.string(),
                    descricao: z.string(),
                    ativo: z.string()
                });

                
const sectorsRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/bulk/setores', {
        schema: {
            tags: ['setores'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                data_recadastro: z.string().optional(),
                limit: z.coerce.number().optional()
            }),
            response: {
                200: z.array( responseSchema),
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
        const select = new SelectSector();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { data_recadastro } = request.query;

        try {
            const result = await select.findAll(dbName, data_recadastro);
            return reply.status(200).send(result as any);
        } catch (e) {
            console.error('Error fetching sectors:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching sectors' });
        }
    });

    server.get('/setores/search', {
        schema: {
            tags: ['setores'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                codigo: z.coerce.number().optional(),
                descricao: z.string().optional(),
                id: z.string().optional(),
                ativo: z.string().optional(),
                limit: z.coerce.number().optional(),
                 search: z.coerce.string().optional(),
                orderBy: z.enum(['codigo' , 'descricao', 'data_recadastro', 'id' ]).default('codigo')
            }),
            response: {
                200: z.array( responseSchema),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectSector();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;

        try {
            const result = await select.findByParams(dbName, request.query);
            return reply.status(200).send(result as any);
        } catch (e) {
            console.error('Error searching sectors:', e);
            return reply.status(400).send({ success: false, message: 'Error searching sectors' });
        }
    });

    server.get('/setores/last-codigo', {
        schema: {
            tags: ['setores'],
            headers: z.object({
                token: z.string()
            }),
            response: {
                200: z.object({
                    codigo: z.number()
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

        try {
            const select = new SelectSector();
            const result = await select.findLastInsertedCode(dbName);
            return reply.status(200).send({ codigo: result.codigo ?? 0 });
        } catch (e) {
            console.error('Error fetching last sector code:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching last sector code' });
        }
    });

    server.post('/setores', {
        schema: {
            description: "Cadastra/atualiza setor. Se informado o código e o registro já existir, o mesmo será atualizado com os novos dados.",
            tags: ['setores'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                codigo: z.number().optional(),
                id: z.string(),
                descricao: z.string()
            }),
            response: {
                201: z.object({
                    codigo: z.number(),
                    id: z.string(),
                    data_cadastro: z.string(),
                    data_recadastro: z.string(),
                    descricao: z.string(),
                    ativo: z.string()
                }),
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
        const { id, descricao, codigo } = request.body;

        const data_recadastro = dateService.obterDataHoraAtual();

        const insert = new InsertSector();
        const select = new SelectSector();

        const existingByCode = codigo !== undefined ? await select.findByParams(dbName, { codigo }) : [];
        const isUpdate = existingByCode.length > 0;

        const sectorsById = await select.findByParams(dbName, { id });
        const idOwner = sectorsById.find((sector) => sector.id === id);

        if (idOwner && (codigo === undefined || Number(idOwner.codigo) !== Number(codigo))) {
            return reply.status(400).send({ success: false, message: `Sector ID ${id} already exists.` });
        }

        const data_cadastro = isUpdate ? existingByCode[0].data_cadastro : dateService.obterDataAtual();

        try {
            const result = await insert.insertOrUpdate(dbName, {
                ...(codigo !== undefined ? { codigo } : {}),
                id,
                descricao,
                ativo: 'S',
                data_cadastro,
                data_recadastro
            });
            const item = {
                codigo: codigo !== undefined ? codigo : result.insertId,
                id,
                descricao,
                ativo: 'S',
                data_cadastro,
                data_recadastro
            };
            await publishMessage(empresa, isUpdate ? 'setor.atualizado' : 'setor.inserido', item, source);
            return reply.status(201).send(item);
        } catch (e) {
            console.error('Error inserting sector:', e);
            return reply.status(400).send({ success: false, message: 'Error inserting sector' });
        }
    });

     server.post('/bulk/setores', {
        schema: {
            description: " cadastra/atualiza setores em lote. Se informado o código e o registro já existir, o mesmo será atualizado com os novos dados. Limite maximo por lote: 5000",
            tags: ['setores'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: sectorBulkBodySchema,
            response: {
                200: z.array(responseSchema),
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

        if (dados.length > 5000) {
            return reply.status(400).send({ success: false, message: 'record limit per batch reached' });
        }

        try {
             const insert = new InsertSector();
             const select = new SelectSector();

         await  insert.bulkInsertOrUpdate(dbName, dados)
         const ids = dados.map(( i )=> i.id);

           const dataToResult = await select.findByIds(dbName, ids );
          return reply.status(200).send( dataToResult as any);

        } catch (e) {
            console.error('Error triggering background job:', e);
            return reply.status(500).send({ success: false, message: 'Internal server error' });
        }
    });

    server.post('/async/bulk/setores', {
        schema: {
            description: "Processamento assíncrono, cadastra/atualiza setores em lote. Se informado o código e o registro já existir, o mesmo será atualizado com os novos dados. Limite maximo por lote: 5000",
            tags: ['setores'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: sectorBulkBodySchema,
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

        if (dados.length > 5000) {
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

                await publishInternalMessage(empresa, `setores.processar.${empresa}`, payloadFila);
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

    server.put('/setores', {
        schema: {
            tags: ['setores'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                codigo: z.number(),
                id: z.string(),
                descricao: z.string()
            }),
            response: {
                200: z.object({
                    codigo: z.number(),
                    id: z.string(),
                    data_cadastro: z.string(),
                    data_recadastro: z.string(),
                    descricao: z.string(),
                    ativo: z.string()
                }),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const dateService = new DateService();
        const select = new SelectSector();
        const update = new UpdateSector();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo, id, descricao } = request.body;

        if (!codigo) {
            return reply.status(400).send({ success: false, message: 'Code is required' });
        }

        const existing = await select.findByCode(dbName, codigo);
        if (existing.length === 0) {
            return reply.status(400).send({ success: false, message: 'Sector not found' });
        }

        const data_cadastro = existing[0].data_cadastro;
        const data_recadastro = dateService.obterDataHoraAtual();

        try {
            const result = await update.update(dbName, { codigo, id, descricao, data_cadastro, data_recadastro, ativo: 'S' });

            if (result.affectedRows > 0) {
                const item = { codigo, id, descricao, ativo: 'S', data_cadastro, data_recadastro };
                await publishMessage(empresa, 'setor.atualizado', item, source);
                return reply.status(200).send(item);
            }

            return reply.status(400).send({ success: false, message: 'No rows affected' });
        } catch (e) {
            console.error('Error updating sector:', e);
            return reply.status(400).send({ success: false, message: 'Error updating sector' });
        }
    });
};

export { sectorsRoute };
export default sectorsRoute;

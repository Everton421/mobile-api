import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectServiceOrderType } from '../../models/service-order/select.ts';
import { InsertServiceOrderType } from '../../models/service-order/insert.ts';
import { UpdateServiceOrderType } from '../../models/service-order/update.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishMessage } from '../../services/broker/publish-message.ts';

const getServiceOrderTypesRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/bulk/tipo_os', {
        schema: {
            tags: ['tipos de os'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                data_recadastro: z.string().optional(),
                limit: z.coerce.number().optional()
            }),
                response: {
                200: z.array(z.object({
                    codigo: z.number(),
                    id: z.coerce.string(),
                    data_cadastro: z.coerce.string(),
                    data_recadastro: z.coerce.string(),
                    descricao: z.coerce.string(),
                    ativo: z.enum(['S' , 'N']).default('S')
                })),
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
        const select = new SelectServiceOrderType();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { data_recadastro, limit } = request.query;

        try {
            const result = await select.findAll(dbName, data_recadastro);
            
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error fetching service order types:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching service order types' });
        }
    });

    server.get('/tipo_os/search', {
        schema: {
            tags: ['tipos de os'],
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
                200: z.array(z.object({
                    codigo: z.number(),
                    id: z.coerce.string(),
                    data_cadastro: z.coerce.string(),
                    data_recadastro: z.coerce.string(),
                    descricao: z.coerce.string(),
                    ativo: z.enum(['S' , 'N']).default('S')
                })),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectServiceOrderType();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;

        try {
            const result = await select.findByParams(dbName, request.query);
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error searching service order types:', e);
            return reply.status(400).send({ success: false, message: 'Error searching service order types' });
        }
    });

    server.post('/tipo_os', {
        schema: {
            tags: ['tipos de os'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                codigo: z.number().optional(),
                id: z.string(),
                descricao: z.string(),
                ativo: z.enum(['S', 'N']).default('S')
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
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo, id, descricao, ativo } = request.body;

        const data_cadastro = dateService.obterDataAtual();
        const data_recadastro = dateService.obterDataHoraAtual();

        const insert = new InsertServiceOrderType();
        const select = new SelectServiceOrderType();
        const verify = await select.findByParams( dbName ,{  id });
        if( verify.length >  0) return reply.status(400).send({ success: false, message: `service order type ID ${id} already exists.`}) 
        try {
            const result = await insert.insert(dbName, { ...(codigo !== undefined ? { codigo } : {}), id, descricao, ativo, data_cadastro, data_recadastro });
            const item = { codigo: result.insertId, id, descricao, ativo, data_cadastro, data_recadastro };
            await publishMessage(empresa, 'tipoos.inserido', item, source);
            return reply.status(200).send(item);
        } catch (e) {
            console.error('Error inserting service order type:', e);
            return reply.status(400).send({ success: false, message: 'Error inserting service order type' });
        }
    });

    server.put('/tipo_os', {
        schema: {
            tags: ['tipos de os'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                codigo: z.number(),
                id: z.string(),
                descricao: z.string(),
                ativo: z.enum(['S', 'N']).default('S')
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
        const select = new SelectServiceOrderType();
        const update = new UpdateServiceOrderType();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo, id, descricao, ativo } = request.body;

        if (!codigo) {
            return reply.status(400).send({ success: false, message: 'Code is required' });
        }

        const existing = await select.findByCode(dbName, codigo);
        if (existing.length === 0) {
            return reply.status(400).send({ success: false, message: 'Service order type not found' });
        }

        const data_cadastro = existing[0].data_cadastro;
        const data_recadastro = dateService.obterDataHoraAtual();

        try {
            const result = await update.update(dbName, { codigo, id, descricao, ativo, data_cadastro, data_recadastro });

            if (result.affectedRows > 0) {
                const item = { codigo, id, descricao, ativo, data_cadastro, data_recadastro };
                await publishMessage(empresa, 'tipoos.atualizado', item, source);
                return reply.status(200).send(item);
            }

            return reply.status(400).send({ success: false, message: 'No rows affected' });
        } catch (e) {
            console.error('Error updating service order type:', e);
            return reply.status(400).send({ success: false, message: 'Error updating service order type' });
        }
    });
};

export { getServiceOrderTypesRoute };
export default getServiceOrderTypesRoute;

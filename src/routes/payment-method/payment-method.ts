import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectPaymentMethod } from '../../models/payment-method/select.ts';
import { InsertPaymentMethod } from '../../models/payment-method/insert.ts';
import { UpdatePaymentMethod } from '../../models/payment-method/update.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishMessage } from '../../services/broker/publish-message.ts';

const paymentMethodsRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/bulk/formas_pagamento', {
        schema: {
            tags: ['formas pagamento'],
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
                        data_cadastro: z.string(),
                        data_recadastro: z.string(),
                        descricao: z.string(),
                        desc_maximo: z.coerce.number(),
                        parcelas: z.coerce.number(),
                        intervalo: z.coerce.number(),
                        recebimento: z.coerce.number(),
                        ativo: z.string()
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
        const select = new SelectPaymentMethod();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { data_recadastro, limit } = request.query;

        try {
            const result = await select.findAll(dbName, data_recadastro);
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error fetching payment methods:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching payment methods' });
        }
    });

    server.get('/formas_pagamento/search', {
        schema: {
            tags: ['formas pagamento'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                codigo: z.coerce.number().optional(),
                descricao: z.string().optional(),
                id: z.coerce.string().optional(),
                parcelas: z.coerce.number().optional(),
                ativo: z.string().optional(),
                limit: z.coerce.number().optional()
            }),
            response: {
                200: z.array(z.object({
                    codigo: z.number(),
                    id: z.coerce.string(),
                    data_cadastro: z.string(),
                    data_recadastro: z.string(),
                    descricao: z.string(),
                    desc_maximo: z.coerce.number(),
                    parcelas: z.coerce.number(),
                    intervalo: z.coerce.number(),
                    recebimento: z.coerce.number(),
                    ativo: z.string()
                })),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectPaymentMethod();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;

        try {
            const result = await select.findByParams(dbName, request.query);
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error searching payment methods:', e);
            return reply.status(400).send({ success: false, message: 'Error searching payment methods' });
        }
    });

    server.post('/formas_pagamento', {
        schema: {
            tags: ['formas pagamento'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                id: z.string(),
                descricao: z.string(),
                desc_maximo: z.number(),
                parcelas: z.number(),
                intervalo: z.number(),
                recebimento: z.number(),
                ativo: z.enum(['S', 'N']).default('S')
            }),
            response: {
                201: z.object({
                    codigo: z.number(),
                    id: z.string(),
                    data_cadastro: z.string(),
                    data_recadastro: z.string(),
                    descricao: z.string(),
                    desc_maximo: z.number(),
                    parcelas: z.number(),
                    intervalo: z.number(),
                    recebimento: z.number(),
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
        const { id, descricao, desc_maximo, parcelas, intervalo, recebimento, ativo } = request.body;

        const data_cadastro = dateService.obterDataAtual();
        const data_recadastro = dateService.obterDataHoraAtual();

        const insert = new InsertPaymentMethod();
        const select = new SelectPaymentMethod();
            const verify = await select.findByParams(dbName, { id: id })
            
            if( verify.length > 0 ) return reply.status(400).send({ success:false, message:`Payment method ID ${id} already exists.`})
        
            try {
            const result = await insert.insert(dbName, { id, descricao, desc_maximo, parcelas, intervalo, recebimento, data_cadastro, data_recadastro, ativo });
            const item = { codigo: result.insertId, id, descricao, desc_maximo, parcelas, intervalo, recebimento, data_cadastro, data_recadastro, ativo };
           
           
            await publishMessage(empresa, 'formaspagamento.inserido', item, source);
           
            return reply.status(201).send(item);
        } catch (e) {
            console.error('Error inserting payment method:', e);
            return reply.status(400).send({ success: false, message: 'Error inserting payment method' });
        }
    });

    server.put('/formas_pagamento', {
        schema: {
            tags: ['formas pagamento'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                codigo: z.number(),
                id: z.string(),
                descricao: z.string(),
                desc_maximo: z.number(),
                parcelas: z.number(),
                intervalo: z.number(),
                recebimento: z.number(),
                ativo: z.enum(['S', 'N']).default('S')
            }),
            response: {
                200: z.object({
                    codigo: z.number(),
                    id: z.string(),
                    data_cadastro: z.string(),
                    data_recadastro: z.string(),
                    descricao: z.string(),
                    desc_maximo: z.number(),
                    parcelas: z.number(),
                    intervalo: z.number(),
                    recebimento: z.number(),
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
        const select = new SelectPaymentMethod();
        const update = new UpdatePaymentMethod();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo, id, descricao, desc_maximo, parcelas, intervalo, recebimento, ativo } = request.body;

        if (!codigo) {
            return reply.status(400).send({ success: false, message: 'Code is required' });
        }

        const existing = await select.findByCode(dbName, codigo);
        if (existing.length === 0) {
            return reply.status(400).send({ success: false, message: 'Payment method not found' });
        }

        const data_cadastro = existing[0].data_cadastro;
        const data_recadastro = dateService.obterDataHoraAtual();

        try {
            const result = await update.update(dbName, { codigo, id, descricao, desc_maximo, parcelas, intervalo, recebimento, data_cadastro, data_recadastro, ativo });

            if (result.affectedRows > 0) {
                const item = { codigo, id, descricao, desc_maximo, parcelas, intervalo, recebimento, data_cadastro, data_recadastro, ativo };
                await publishMessage(empresa, 'formaspagamento.atualizado', item, source);
                return reply.status(200).send(item);
            }

            return reply.status(400).send({ success: false, message: 'No rows affected' });
        } catch (e) {
            console.error('Error updating payment method:', e);
            return reply.status(400).send({ success: false, message: 'Error updating payment method' });
        }
    });
};

export { paymentMethodsRoute };
export default paymentMethodsRoute;

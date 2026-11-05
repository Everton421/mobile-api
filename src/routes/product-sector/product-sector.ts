import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectProductSector } from '../../models/product-sector/select.ts';
import { InsertProductSector } from '../../models/product-sector/insert.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishInternalMessage, publishMessage } from '../../services/broker/publish-message.ts';
import { type ProductSectorType } from '../../models/product-sector/types/product-sector-type.ts';

const productSectorResponseSchema = z.object({
    setor: z.number(),
    produto: z.number(),
    estoque: z.number(),
    local_produto: z.string().nullable(),
    local1_produto: z.string().nullable(),
    local2_produto: z.string().nullable(),
    local3_produto: z.string().nullable(),
    local4_produto: z.string().nullable(),
    data_recadastro: z.string(),
    id_produto: z.string(),
    id_setor: z.string()
});

const productSectorBodySchema = z.object({
    setor: z.number(),
    produto: z.number(),
    estoque: z.number().default(0),
    local_produto:  z.string().default('').nullable(),
    local1_produto: z.string().default('').nullable(),
    local2_produto: z.string().default('').nullable(),
    local3_produto: z.string().default('').nullable(),
    local4_produto: z.string().default('').nullable()
});

const productSectorOfflineBodySchema = z.array(z.object({
    setor: z.number(),
    produto: z.number(),
    estoque: z.number(),
    local_produto: z.string().default('').nullable(),
    local1_produto: z.string().default('').nullable(),
    local2_produto: z.string().default('').nullable(),
    local3_produto: z.string().default('').nullable(),
    local4_produto: z.string().default('').nullable(),
    data_recadastro: z.string().optional()
}));

const productSectorRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/bulk/produtos-setor', {
        schema: {
            tags: ['produtos-setor'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                data_recadastro: z.string().optional(),
                limit: z.coerce.number().optional()
            }),
            response: {
                200: z.array(productSectorResponseSchema),
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
        const select = new SelectProductSector();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { data_recadastro, limit } = request.query;

        try {
            let result = await select.findAll(dbName, data_recadastro);
            if (limit && result.length > limit) {
                result = result.slice(0, limit);
            }
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error fetching product sectors:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching product sectors' });
        }
    });

    server.get('/produtos-setor/search', {
        schema: {
            tags: ['produtos-setor'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                produto: z.coerce.number().optional(),
                setor: z.coerce.number().optional(),
                search: z.string().optional()
            }),
            response: {
                200: z.array(productSectorResponseSchema),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectProductSector();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { produto, setor, search } = request.query;

        console.log(request.query)
        try {
            let result;
                result = await select.findByParams(dbName,{ produto, search, setor});

            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error searching product sectors:', e);
            return reply.status(400).send({ success: false, message: 'Error searching product sectors' });
        }
    });

    server.get('/produtos-setor/search-grouped', {
        schema: {
            tags: ['produtos-setor'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                produto: z.coerce.number().optional(),
                setor: z.coerce.number().optional(),
                search: z.string().optional(),
                limit: z.coerce.number().optional().default(20),
                num_fabricante: z.coerce.string().optional(),
                num_original:z.coerce.string().optional(), 
                sku:z.coerce.string().optional()
            }),
            response: {
                200: z.array(z.object({
                    produto: z.object({
                        codigo: z.number(),
                        descricao: z.string(),
                        id: z.string(),
                        controle_lote_serie: z.enum(['S' , 'N'])
                    }),
                    setor: z.array(z.object({
                        codigo: z.number(),
                        descricao: z.string(),
                        ativo: z.string(),
                        id: z.string(),
                        estoque: z.number(),
                        local_produto: z.string().nullable(),
                        local1_produto: z.string().nullable(),
                        local2_produto: z.string().nullable(),
                        local3_produto: z.string().nullable(),
                        local4_produto: z.string().nullable()
                    }))
                })),
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectProductSector();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { produto, setor, search,limit ,num_original ,sku, num_fabricante} = request.query;

        try {
            const result = await select.findByParamsGrouped(dbName, { produto, limit, search, setor, num_fabricante, num_original ,sku });
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Error searching grouped product sectors:', e);
            return reply.status(400).send({ success: false, message: 'Error searching grouped product sectors' });
        }
    });

    server.put('/produtos-setor', {
        schema: {
            tags: ['produtos-setor'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: productSectorBodySchema,
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
        const dateService = new DateService();
        const select = new SelectProductSector();
        const insert = new InsertProductSector();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { produto, setor, estoque, local_produto, local1_produto, local2_produto, local3_produto, local4_produto } = request.body;

        const data_recadastro = dateService.obterDataHoraAtual();

        try {
            const existing = await select.findByProductAndSector(dbName, produto, setor);

            if (existing.length > 0) {
                const resultVerify = existing[0];
                    const objInsert = {
                        setor,
                        produto,
                        estoque,
                        local_produto: local_produto || '',
                        local1_produto: local1_produto || '',
                        local2_produto: local2_produto || '' ,
                        local3_produto: local3_produto || '',
                        local4_produto: local4_produto || '',
                        data_recadastro
                    };
                    await insert.insertOrUpdate(dbName, objInsert);

                    const [updated] = await select.findByProductAndSector(dbName, produto, setor);
                    await publishMessage(empresa, 'produtosetor.atualizado', updated, source);
                    return reply.status(200).send({ success: true, message: 'Stock updated successfully' });
            } else {
                const objInsert = {
                    setor,
                    produto,
                    estoque,
                    local_produto: local_produto || '',
                    local1_produto: local1_produto || '',
                    local2_produto: local2_produto || '' ,
                    local3_produto: local3_produto || '',
                    local4_produto: local4_produto || '',
                    data_recadastro
                };
                await insert.insertOrUpdate(dbName, objInsert);
                const [newResult] = await select.findByProductAndSector(dbName, produto, setor);
                
                await publishMessage(empresa, 'produtosetor.atualizado', newResult, source);
                return reply.status(200).send({ success: true, message: 'Stock updated successfully' });
            }
        } catch (e) {
            console.error('Error updating product sector:', e);
            return reply.status(400).send({ success: false, message: 'Error updating product sector' });
        }
    });

       server.put('/bulk/produtos-setor', {
        schema: {
            tags: ['produtos-setor'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: productSectorOfflineBodySchema,
            response: {
                200: z.object({
                    success: z.boolean(),
                    itens: z.array(z.object({
                        produto: z.number()
                    }))
                }),
                 202: z.object({
                     success: z.boolean(), 
                    message: z.string(),
                    lote_id: z.string()
                 }),

                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const dateService = new DateService();
        const select = new SelectProductSector();
        const insert = new InsertProductSector();
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

        const updatedItens: { produto: number }[] = [];

        try {

                const loteId = crypto.randomUUID();
                const QUEUE_CHUNK_SIZE = 5000;
                
                for( let i =0; i < dados.length; i += QUEUE_CHUNK_SIZE){

                    const chunk = dados.slice(i, i + QUEUE_CHUNK_SIZE);

                    const payloadFila = {
                         loteId,
                         dbName,
                         empresa,
                         source,
                         itens: chunk
                    };
                        await publishInternalMessage(empresa, `prodsetor.processar.${empresa}`, payloadFila);
                }
                   return reply.status(202).send({ 
                    success: true, 
                    message: 'O processamento do lote foi iniciado em segundo plano.',
                    lote_id: loteId
                });

        } catch (e) {
            console.error('Error updating product sectors offline:', e);
            return reply.status(400).send({ success: false, message: 'Error updating product sectors offline' });
        }
    });

    // server.put('/bulk/produtos-setor', {
    //     schema: {
    //         tags: ['produtos-setor'],
    //         headers: z.object({
    //             token: z.string(),
    //             source: z.string().optional()
    //         }),
    //         body: productSectorOfflineBodySchema,
    //         response: {
    //             200: z.object({
    //                 success: z.boolean(),
    //                 itens: z.array(z.object({
    //                     produto: z.number()
    //                 }))
    //             }),
    //             400: z.object({
    //                 success: z.boolean(),
    //                 message: z.string()
    //             })
    //         }
    //     }
    // }, async (request, reply) => {
    //     const dateService = new DateService();
    //     const select = new SelectProductSector();
    //     const insert = new InsertProductSector();
    //     const decodedToken = DecodedToken(String(request.headers.token));

    //     if (!decodedToken.payload?.cnpj) {
    //         return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
    //     }

    //     const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
    //     const dbName = `\`${empresa}\``;
    //     const source = request.headers.source as string || 'api_internal';
    //     const dados = request.body;

    //     if (!Array.isArray(dados) || dados.length === 0) {
    //         return reply.status(400).send({ success: false, message: 'Array of items is required' });
    //     }

    //     const updatedItens: { produto: number }[] = [];

    //     try {
    //         for (const item of dados) {
    //             if (!item.setor || !item.produto || item.estoque === undefined) {
    //                 return reply.status(400).send({ success: false, message: 'Setor, produto and estoque are required for each item' });
    //             }

    //             const data_recadastro = item.data_recadastro || dateService.obterDataHoraAtual();

    //             const existing = await select.findByProductAndSector(dbName, item.produto, item.setor);

    //             if (existing.length > 0) {
    //                 const resultVerify = existing[0];
    //                     const objInsert = {
    //                         setor: item.setor,
    //                         produto: item.produto,
    //                         estoque: item.estoque,
    //                         local_produto: item.local_produto || '',
    //                         local1_produto: item.local1_produto || '',
    //                         local2_produto: item.local2_produto || '',
    //                         local3_produto: item.local3_produto || '',
    //                         local4_produto: item.local4_produto || '',
    //                         data_recadastro
    //                     };
    //                     await insert.insertOrUpdate(dbName, objInsert);
    //                     const [updated] = await select.findByProductAndSector(dbName, item.produto, item.setor);
    //                     await publishMessage(empresa, 'produtosetor.atualizado', updated, source);
    //                     updatedItens.push({ produto: item.produto });
    //             } else {
    //                 const objInsert = {
    //                     setor: item.setor,
    //                     produto: item.produto,
    //                     estoque: item.estoque,
    //                     local_produto: item.local_produto || '',
    //                     local1_produto: item.local1_produto || '' ,
    //                     local2_produto: item.local2_produto || '' ,
    //                     local3_produto: item.local3_produto || '' ,
    //                     local4_produto: item.local4_produto || '' ,
    //                     data_recadastro
    //                 };
    //                 await insert.insertOrUpdate(dbName, objInsert);
    //                 const [newResult] = await select.findByProductAndSector(dbName, item.produto, item.setor);
    //                 await publishMessage(empresa, 'produtosetor.atualizado', newResult, source);
    //                 updatedItens.push({ produto: item.produto });
    //             }
    //         }

    //         return reply.status(200).send({ success: true, itens: updatedItens });
    //     } catch (e) {
    //         console.error('Error updating product sectors offline:', e);
    //         return reply.status(400).send({ success: false, message: 'Error updating product sectors offline' });
    //     }
    // });
    
};

export { productSectorRoute };
export default productSectorRoute;

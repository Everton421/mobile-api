import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectOrder } from '../../models/order/select.ts';
import { OrderSeries } from '../../models/order/order-series.ts';
import { SelectOrderItems } from '../../models/order/select-items.ts';
import { SelectLoteSerieSetor } from '../../models/lote-serie-setor/select.ts';
import { conn } from '../../database/databaseConfig.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishMessage } from '../../services/broker/publish-message.ts';

const separacaoItemSchema =  z.object({
  itens: z.array(
        z.object({
            produto: z.number(),
            quantidade_separada: z.number(),
            series: z.array(z.object({
                lote_serie: z.number(),
                quantidade: z.number()
            })).optional()
        }) 
    ),
    setor: z.number(),
    status_separacao: z.enum(['NAO INICIADA' , 'EM ANDAMENTO' , 'PAUSADA' , 'RECUSADA', 'CONCLUIDA']),
    usuario_separacao: z.coerce.number(),
    observacoes_separacao: z.string().optional()
})

const orderSeriesRoute: FastifyPluginAsyncZod = async (server) => {
    server.post('/pedidos/:codigo/separar', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            params: z.object({
                codigo: z.coerce.number()
            }),
            body: separacaoItemSchema ,
            response: {
                200: z.object({
                    success: z.boolean(),
                    message: z.string(),
                    data: z.object({
                        pedido: z.number(),
                        situacao_separacao: z.string(),
                        status_separacao: z.string(),
                        usuario_separacao: z.number(),
                        itens_processados: z.number(),
                        series_registradas: z.number()
                    }).optional()
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
        const selectPedido = new SelectOrder();
        const selectOrderItems = new SelectOrderItems();
        const orderSeriesModel = new OrderSeries();
        const selectLoteSerieSetor = new SelectLoteSerieSetor();
        const dateService = new DateService();

        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o token!' });
        }

        const cnpj = decodedToken.payload.cnpj.replace(/\D/g, '');
        const empresa = `\`${cnpj}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo } = request.params;
        const { itens, setor, status_separacao, usuario_separacao, observacoes_separacao } = request.body;

        try {
            const existingOrder = await selectPedido.findByCode(empresa, codigo);
            if (existingOrder.length === 0) {
                return reply.status(400).send({ success: false, message: `Pedido ${codigo} não encontrado` });
            }

            const order = existingOrder[0];

            if (order.situacao === 'RE') {
                return reply.status(400).send({ success: false, message: 'Pedido cancelado não pode ser separado' });
            }

            const orderProducts = await selectOrderItems.findProductsByOrder(empresa, codigo);
            const orderProductsMap = new Map(orderProducts.map(p => [p.codigo, p]));

            for (const item of itens) {
                const productInOrder = orderProductsMap.get(item.produto);
                if (!productInOrder) {
                    return reply.status(400).send({ success: false, message: `Produto ${item.produto} não encontrado no pedido ${codigo}` });
                }
               

                    if (item.quantidade_separada > productInOrder.quantidade) {
                        return reply.status(400).send({ success: false, message: `Quantidade separada do produto ${item.produto} (${item.quantidade_separada}) excede a quantidade do pedido (${productInOrder.quantidade})` });
                    }

                if (item.series && item.series.length > 0) {
                    if (!setor ||  setor === 0) {
                        return reply.status(400).send({ success: false, message: `Pedido ${codigo} não possui setor definido. Defina um setor no pedido antes de separar séries.` });
                    }

                    const totalSeriesQty = item.series.reduce((sum, s) => sum + s.quantidade, 0);
                    if (totalSeriesQty !== item.quantidade_separada) {
                        return reply.status(400).send({ success: false, message: `A soma das séries do produto ${item.produto} (${totalSeriesQty}) não corresponde à quantidade separada (${item.quantidade_separada})` });
                    }

            // if(order.status_separacao == 'EM ANDAMENTO' && status_separacao == 'CONCLUIDA'){
            //        for (const serie of item.series) {
            //            const stockRows = await selectLoteSerieSetor.findBySectorAndLoteSerie(empresa, order.setor, serie.lote_serie);
            //            if (stockRows.length === 0 || stockRows[0].estoque < serie.quantidade) {
            //                return reply.status(400).send({ success: false, message: `Estoque insuficiente para lote/série ${serie.lote_serie} no setor ${order.setor}. Disponível: ${stockRows.length > 0 ? stockRows[0].estoque : 0}, solicitado: ${serie.quantidade}` });
            //            }
            //            }
            //        }
                }

                for ( const iten of itens ){
                    if(iten.series && iten.series?.length){
                        for(const s of iten.series){
                            const previousOrderSeries = await orderSeriesModel.findByOrderAndProduct(empresa, codigo, iten.produto);

                             if(previousOrderSeries.length) {
                              //  console.log(`[V] series encontrada no pedido, status antigo ${order.status_separacao } novo status ${status_separacao}`)
                                continue;
                            };
                              const stockRows = await selectLoteSerieSetor.findBySectorAndLoteSerie(empresa, order.setor,  s.lote_serie);
                             if(stockRows.length) {
                                //console.log(`[V] series encontrada no setor,  status do pedido antigo ${order.status_separacao } novo status do pedido  ${status_separacao}`)
                                continue;
                            };

                             if(!stockRows.length && !previousOrderSeries.length ){
                              return reply.status(400).send({ success: false, message: `Estoque insuficiente para lote/série ${ s.lote_serie} no setor ${order.setor}. Disponível: ${stockRows.length > 0 ? stockRows[0].estoque : 0}, solicitado: ${s.quantidade}` });
                             }
                        }
                    }   
                }
            }

            const connection = conn;
            const connInstance = connection as any;

            try {
                await connInstance.query('START TRANSACTION');

                const previousSeries = await orderSeriesModel.findByOrder(empresa, codigo);
                
                 if (previousSeries.length > 0) {
                    for (const ps of previousSeries) {
                        const sql = `UPDATE ${empresa}.lote_serie_setor
                            SET estoque = estoque + ?
                            WHERE setor = ? AND lote_serie = ?`;
                        await conn.query(sql, [ps.quantidade, order.setor, ps.lote_serie]);
                    }
                }

               const resultDeleteSeries = await orderSeriesModel.deleteByOrder(empresa, codigo);
                let totalSeriesRegistradas = 0;
                    for (const item of itens) {
                        if (item.series && item.series.length > 0) {
                            const seriesToInsert = item.series.map(s => ({
                                produto: item.produto,
                                lote_serie: s.lote_serie,
                                quantidade: s.quantidade
                            }));
                            await orderSeriesModel.insertSeries(empresa, codigo, seriesToInsert);
                            totalSeriesRegistradas += seriesToInsert.length;


                            for (const serie of item.series) {
                                const sql = `UPDATE ${empresa}.lote_serie_setor
                                    SET estoque = estoque - ?
                                    WHERE setor = ? AND lote_serie = ?`;
                                await conn.query(sql, [serie.quantidade, order.setor, serie.lote_serie]);
                            }
                    }
                }

                for (const item of itens) {
                    const sql = `UPDATE ${empresa}.produtos_pedido
                        SET quantidade_separada = ?
                        WHERE pedido = ? AND codigo = ?`;
                    await conn.query(sql, [item.quantidade_separada, codigo, item.produto]);
                }

                let situacaoSeparacao: string;
                const totalProdutos = orderProducts.length;
                const totalTotalSeparado = itens.reduce((sum, item) => sum + Number(item.quantidade_separada), 0);
                 const totalTotalPedido = orderProducts.reduce((sum, p) =>  { return sum + Number(p.quantidade) },0);
                if (totalTotalSeparado >= totalTotalPedido) {
                    situacaoSeparacao = 'I';
                } else if (totalTotalSeparado > 0) {
                    situacaoSeparacao = 'P';
                } else {
                    situacaoSeparacao = 'N';
                }

                let sqlUpdateOrder = `UPDATE ${empresa}.pedidos SET situacao_separacao = ?, setor = ?, status_separacao = ?, usuario_separacao = ? `;
                if(status_separacao == 'CONCLUIDA'){
                    sqlUpdateOrder += `, fim_separacao = now()`
                }
                const valuesUpdateOrder: any[] = [situacaoSeparacao, setor, status_separacao, usuario_separacao];

                if (observacoes_separacao !== undefined) {
                    sqlUpdateOrder += `, observacoes_separacao = ?`;
                    valuesUpdateOrder.push(observacoes_separacao);
                }

                sqlUpdateOrder += ` WHERE codigo = ?`;
                valuesUpdateOrder.push(codigo);

                await conn.query(sqlUpdateOrder, valuesUpdateOrder);

                await connInstance.query('COMMIT');
                
                            
                await publishMessage(cnpj, 'pedido.separado', { pedido: codigo, tipo:order.tipo ,situacao_separacao: situacaoSeparacao, status_separacao, usuario_separacao, itens_processados: itens.length, series_registradas: totalSeriesRegistradas, observacoes_separacao }, source);
                
                return reply.status(200).send({
                    success: true,
                    message: 'Separação realizada com sucesso',
                    data: {
                        pedido: codigo,
                        situacao_separacao: situacaoSeparacao,
                        status_separacao,
                        usuario_separacao,
                        itens_processados: itens.length,
                        series_registradas: totalSeriesRegistradas
                    }
                });
            } catch (e) {
                await connInstance.query('ROLLBACK');
                throw e;
            }
        } catch (e) {
            console.error('Erro ao processar separação:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao processar separação' });
        }
    });

    server.get('/pedidos/:codigo/series-disponiveis', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string()
            }),
            params: z.object({
                codigo: z.coerce.number()
            }),
            querystring: z.object({
                setor: z.coerce.number().optional(),
                serie: z.coerce.string().optional()
            }),
            response: {
                200: z.array(z.object({
                    codigo: z.number(),
                    descricao: z.string().optional(),
                    quantidade: z.coerce.number(),
                    quantidade_separada: z.coerce.number().optional(),
                    controle_lote_serie: z.string().optional(),
                    series_disponiveis: z.array(z.object({
                        lote_serie: z.coerce.number(),
                        serie: z.string().nullable(),
                        lote: z.string().nullable(),
                        estoque: z.coerce.number()
                    }))
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
        const selectPedido = new SelectOrder();
        const selectOrderItems = new SelectOrderItems();
        const selectLoteSerieSetor = new SelectLoteSerieSetor();

        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o token!' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { codigo } = request.params;
        const { setor: querySetor } = request.query;
        const { serie } = request.query;

        try {
            const existingOrder = await selectPedido.findByCode(dbName, codigo);
            if (existingOrder.length === 0) {
                return reply.status(400).send({ success: false, message: `Pedido ${codigo} não encontrado` });
            }

            const order = existingOrder[0];
            const setor = querySetor || order.setor || 0;

            if (!setor || setor === 0) {
                return reply.status(400).send({ success: false, message: 'Pedido não possui setor definido. Informe um setor na consulta.' });
            }

            const products = await selectOrderItems.findProductsWithSeriesByOrder(dbName, codigo);

            const result = await Promise.all(products.map(async (p) => {
                if (p.controle_lote_serie !== 'S') {
                    return {
                        codigo: p.codigo,
                        descricao: p.descricao,
                        quantidade: p.quantidade,
                        quantidade_separada: p.quantidade_separada,
                        controle_lote_serie: 'N',
                        series_disponiveis: []
                    };
                }

                let sql = `SELECT lss.lote_serie, ls.serie, ls.lote, lss.estoque
                FROM ${dbName}.lote_serie_setor lss
                JOIN ${dbName}.lotes_series ls ON ls.codigo = lss.lote_serie
                WHERE lss.produto = ? AND lss.setor = ? AND lss.estoque > 0`;
                const valuesQuery:any[] = [p.codigo, setor]
                if(serie){
                    sql +=' AND ls.serie = ? ';
                    valuesQuery.push(serie)
                }

                const [seriesRows] = await conn.query(sql, valuesQuery);
                const seriesDisponiveis = seriesRows as { lote_serie: number; serie: string; lote: string; estoque: number }[];

                return {
                    codigo: p.codigo,
                    descricao: p.descricao,
                    quantidade: p.quantidade,
                    quantidade_separada: p.quantidade_separada,
                    controle_lote_serie: 'S',
                    series_disponiveis: seriesDisponiveis.map(s => ({
                        lote_serie: s.lote_serie,
                        serie: s.serie,
                        lote: s.lote,
                        estoque: s.estoque
                    }))
                };
            }));
            console.log(result)
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Erro ao buscar séries disponíveis:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao buscar séries disponíveis' });
        }
    });

      server.get('/pedidos/:codigo/lotes-series', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string()
            }),
            params: z.object({
                codigo: z.coerce.number()
            }),
            response: {
                200: z.array(z.object({
                        lote_serie: z.coerce.number(),
                        serie: z.string().nullable(),
                        lote: z.string().nullable(),
                        quantidade: z.coerce.number(),
                        produto: z.coerce.number()
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
        const selectPedido = new SelectOrder();

        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o token!' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { codigo } = request.params;

        try {
            const existingOrder = await selectPedido.findByCode(dbName, codigo);
            if (existingOrder.length === 0) {
                return reply.status(400).send({ success: false, message: `Pedido ${codigo} não encontrado` });
            }


                const sql = `select 
                        ls.codigo as lote_serie,
                        ls.serie ,
                        ls.lote,
                        pls.produto,
                        pls.quantidade
                        from ${dbName}.lotes_series ls 
                            join ${dbName}.pedido_series pls on pls.lote_serie = ls.codigo
                            where pls.pedido = ? `;

                const [rows] = await conn.query(sql, codigo);
                const loteSerie = rows as  { lote_serie:number, serie:string | null, lote:string | null, produto:number, quantidade:number }[]
            console.log(rows)
            return reply.status(200).send(loteSerie);
        } catch (e) {
            console.error('Erro ao buscar séries disponíveis:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao buscar séries disponíveis' });
        }
    });

};

export { orderSeriesRoute };
export default orderSeriesRoute;

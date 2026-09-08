import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z, { number } from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectOrder } from '../../models/order/select.ts';
import { InsertOrder } from '../../models/order/insert.ts';
import { UpdateOrder } from '../../models/order/update.ts';
import { type OrderInstallment,type OrderItemProduct,type OrderItemService,   SelectOrderItems } from '../../models/order/select-items.ts';
import { SelectClient } from '../../models/client/select.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishMessage } from '../../services/broker/publish-message.ts';
import { type OrderReceivedType, type OrderType } from '../../models/order/types/order-type.ts';
import { SelectSupplier } from '../../models/supplier/select.ts';
import { SelectProductSector } from '../../models/product-sector/select.ts';

const productOrderSchema = z.object({
    codigo: z.union([z.number(), z.string()]),
    preco: z.coerce.number().optional(),
    quantidade: z.coerce.number(),
    desconto: z.coerce.number().optional(),
    total: z.coerce.number(),
    frete: z.coerce.number().optional(),
    sequencia:z.number().nullable(),
     descricao: z.string().optional(),
     id: z.union([z.number(), z.string()]).optional(),
     controle_lote_serie:z.enum(['S','N']),
    quantidade_separada: z.coerce.number().optional(),
    quantidade_faturada: z.coerce.number().optional(),
    lote_serie: z.number().optional(),
    sku:z.string().optional(),
    num_original:z.string().optional(),
    num_fabricante:z.string().optional(),
    series: z.array(
        z.object({
            lote_serie: z.number(),
            quantidade: z.coerce.number() ,
            serie: z.string(),
            lote: z.string().nullable()
        })
    ).optional(),
    dados_setor: z.array(
        z.object({
            setor:z.string(),
            local_produto:z.string(),
            local1_produto:z.string(),
            local2_produto:z.string(),
            local3_produto:z.string(),
            local4_produto:z.string(),
            estoque:z.number(),
        })
    ).optional().nullish()
});






const serviceOrderSchema = z.object({
    codigo: z.union([z.number(), z.string()]),
    quantidade: z.union([z.number(), z.string()]).optional(),
    desconto: z.union([z.number(), z.string()]).optional(),
    total: z.union([z.number(), z.string()]),
    valor: z.union([z.number(), z.string()]),
     aplicacao: z.string().optional(),
     id: z.union([z.number(), z.string()]).optional(),

});

const parcelOrderSchema = z.object({
    parcela: z.coerce.number(),
    valor: z.coerce.number(),
    vencimento: z.string()
});

const clientSchema = z.object({
    codigo: z.number(),
    nome: z.string().optional(),
    id: z.union([z.number(), z.string()]).optional()
});
const supplierSchema = z.object({
    codigo: z.number(),
    nome: z.string().optional(),
    id: z.union([z.number(), z.string()]).optional()
});
const orderResponseSchema = z.object({
    codigo: z.union([z.number(), z.string()]),
    id: z.union([z.number(), z.string()]).optional(),
    id_externo: z.union([z.number(), z.string()]).nullable(),
    id_interno: z.string().nullable(),
    vendedor: z.union([z.number(), z.string()]),
    situacao:z.enum([ 'EA' , 'FI' , 'RE' , 'AI' , 'FP', 'BM' ]).optional().describe(" EA = Em aberto/orcamento , FI = Faturado integralmente , AI = aprovado/pedido , FP = faturado parcialmente, BM = Baixado manualmente"),
    situacao_separacao: z.enum(['N','P','I']).optional().describe('I =separado integralmente, P = separado parcialmente, N = não foi separado'),
    contato: z.string().nullable(),
    descontos: z.union([z.number(), z.string()]).optional(),
    frete: z.union([z.number(), z.string()]).optional(),
    forma_pagamento: z.union([z.number(), z.string()]).optional(),
    quantidade_parcelas: z.union([z.number(), z.string()]).optional(),
    total_geral: z.union([z.number(), z.string()]).optional(),
    total_produtos: z.union([z.number(), z.string()]).optional(),
    total_servicos: z.union([z.number(), z.string()]).optional(),
    veiculo: z.union([z.number(), z.string()]).optional(),
    data_cadastro: z.string().optional(),
    data_recadastro: z.string().optional(),
    tipo_os: z.union([z.number(), z.string()]).optional(),
    enviado: z.enum(['S' , 'N']).default('S').optional(),
    tipo: z.union([z.number(), z.string()]).optional().describe('1 = venda, 6 = pedido de compra '),
    nome: z.string().optional(),
    observacoes: z.string().nullable(),
    produtos: z.array(productOrderSchema).optional(),
    servicos: z.array(serviceOrderSchema).optional(),
    parcelas: z.array(parcelOrderSchema).optional(),
    cliente: clientSchema.nullish(),
    operacao: z.enum([ 'V' , 'C']).describe('V= venda, C = compra '),
    setor: z.number().optional(),
    fornecedor:supplierSchema.nullish(),
    filial: z.coerce.number(),
    usuario:z.coerce.number().default(0),
    usuario_separacao:z.coerce.number().default(0),
    inicio_separacao:z.string(),
    fim_separacao:z.string(),
    status_separacao: z.enum(['NAO INICIADA' , 'EM ANDAMENTO' , 'PAUSADA' , 'RECUSADA', 'CONCLUIDA']).default('NAO INICIADA'),
    observacoes_separacao: z.string().nullable().optional()

});
         
const ordersRoute: FastifyPluginAsyncZod = async (server) => {
    server.post('/pedidos', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.array(z.object({
                id: z.coerce.string(),
                id_externo: z.coerce.string().default('0'),
                id_interno: z.coerce.string().default('0'),
                vendedor: z.number().optional(),
                situacao:z.enum([ 'EA' , 'FI' , 'RE' , 'AI' , 'FP', 'BM' ]).describe(" EA = Em aberto/orcamento , FI = Faturado integralmente , AI = aprovado/pedido , FP = faturado parcialmente, BM = Baixado manualmente"),
                situacao_separacao: z.enum(['N','P','I']).describe('I =separado integralmente, P = separado parcialmente, N = não foi separado'),
                contato: z.string(),
                descontos: z.coerce.string(),
                frete: z.coerce.string(),
                forma_pagamento: z.number(),
                quantidade_parcelas: z.number(),
                total_geral: z.coerce.string(),
                total_produtos: z.coerce.string(),
                total_servicos: z.coerce.string(),
                operacao: z.enum(['C', 'V']).describe('C = compra, V =venda'),
                cliente: z.object({
                    codigo: z.number()
                }).optional(),
                fornecedor: z.object({
                    codigo: z.number()
                }).optional(),
                filial: z.number().default(0),
                veiculo: z.number(),
                data_cadastro: z.string(),
                data_recadastro: z.string(),
                tipo_os: z.number(),
                tipo: z.number(),
                observacoes: z.string(),
                observacoes2: z.string(),
                setor: z.number().optional(),
                usuario: z.number().optional().default(0),
                usuario_separacao: z.number().optional().default(0),
                inicio_separacao:z.string().optional().default('2000-01-01 00:00:00'),
                fim_separacao:z.string().optional().default('2000-01-01 00:00:00'),
                status_separacao: z.enum(['NAO INICIADA' , 'EM ANDAMENTO' , 'PAUSADA' , 'CONCLUIDA', 'RECUSADA']).optional().default('NAO INICIADA'),
                produtos: z.array(productOrderSchema) ,
                servicos: z.array(serviceOrderSchema) ,
                parcelas: z.array(parcelOrderSchema),

            })),
            response: {
                201: z.object({
                    results: z.array(z.object({
                        id: z.string(),
                        codigo: z.number().optional(),
                        status: z.string()
                    }))
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
        const insertPedido = new InsertOrder();
        const selectPedido = new SelectOrder();
        const updatePedido = new UpdateOrder();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o token!' });
        }

        const cnpj = decodedToken.payload.cnpj.replace(/\D/g, '');
        const empresa = `\`${cnpj}\``;
        const source = request.headers.source as string || 'api_internal';

        if (!request.body || request.body.length === 0) {
            return reply.status(400).send({ success: false, message: 'É necessário informar os pedidos!' });
        }

        try {
            const results = await Promise.all(request.body.map(async (p) => {
                let status: string;
                let codigo: number | undefined;

                const validPedido = await selectPedido.existsByExternalId(empresa, p.id, p.operacao);

                if (validPedido) {
                    const existingOrder = await selectPedido.findByExternalId(empresa, p.id, p.operacao);
                    if (existingOrder.length > 0) {
                        const existingRecadastro = existingOrder[0].data_recadastro;
                        
                        if (p.data_recadastro && p.data_recadastro > existingRecadastro) {
                            console.log(`Atualizando pedido id=${p.id} operacao=${p.operacao}`);
                            await updatePedido.updateByExternalId(empresa, p as unknown as OrderReceivedType, p.id, p.operacao);
                            await publishMessage(cnpj, 'pedido.atualizado', p, source);
                            status = 'atualizado';
                        } else {
                            status = `O pedido id=${p.id} se encontra atualizado`;
                        }
                    } else {
                        status = `Pedido id=${p.id} não encontrado para atualização`;
                    }
                } else {
                    const result = await insertPedido.create(empresa, p as unknown as OrderReceivedType);
                    codigo = result.insertId;
                    await publishMessage(cnpj, 'pedido.inserido', { ...p, internalCodigo: codigo }, source);
                    status = 'inserido';
                }

                return { id: p.id, codigo, status };
            }));

            return reply.status(201).send({ results });
        } catch (e) {
            console.error('Erro ao processar pedidos:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao processar pedidos.' });
        }
    });

    server.patch('/pedidos/:codigo', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            params: z.object({
                codigo: z.coerce.number()
            }),
            body: z.object({
                cliente: z.union([z.object({ codigo: z.coerce.number() }), z.coerce.number()]).optional(),
                fornecedor: z.union([z.object({ codigo: z.coerce.number() }), z.coerce.number()]).optional(),
                vendedor: z.coerce.number().optional(),
                situacao: z.enum(['EA', 'FI', 'RE', 'AI', 'FP', 'BM']).optional(),
                situacao_separacao: z.enum(['N', 'P', 'I']).optional(),
                contato: z.string().optional(),
                descontos: z.coerce.string().optional(),
                frete: z.coerce.string().optional(),
                forma_pagamento: z.coerce.number().optional(),
                quantidade_parcelas: z.coerce.number().optional(),
                total_geral: z.coerce.string().optional(),
                total_produtos: z.coerce.string().optional(),
                total_servicos: z.coerce.string().optional(),
                veiculo: z.coerce.number().optional(),
                data_cadastro: z.string().optional(),
                data_recadastro: z.string().optional(),
                tipo_os: z.coerce.number().optional(),
                tipo: z.coerce.number().optional(),
                observacoes: z.string().optional(),
                operacao: z.enum(['V', 'C']).optional(),
                setor: z.coerce.number().optional(),
                usuario: z.coerce.number().optional(),
                usuario_separacao: z.coerce.number().optional(),
                inicio_separacao: z.string().optional(),
                fim_separacao: z.string().optional(),
                status_separacao: z.enum(['NAO INICIADA', 'EM ANDAMENTO', 'PAUSADA', 'RECUSADA', 'CONCLUIDA']).optional(),
                observacoes_separacao: z.string().optional(),
                filial: z.coerce.number().optional(),
                id_interno: z.string().optional(),
                id_externo: z.coerce.string().optional()
            }).refine((body) => Object.keys(body).length > 0, {
                message: 'Informe ao menos um campo para atualizar o pedido'
            }),
            response: {
                200: orderResponseSchema,
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                404: z.object({
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
        const selectCliente = new SelectClient();
        const selectSupplier = new SelectSupplier();
        const updatePedido = new UpdateOrder();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o token!' });
        }

        const cnpj = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${cnpj}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo } = request.params;
        const data = request.body;

        try {
            const existingOrder = await selectPedido.findByCode(dbName, codigo);

            if (existingOrder.length === 0) {
                return reply.status(404).send({ success: false, message: `Pedido ${codigo} não foi encontrado.` });
            }

            await updatePedido.updateMainData(dbName, codigo, data as unknown as Partial<OrderReceivedType>);
            await publishMessage(cnpj, 'pedido.atualizado', { ...data, codigo }, source);

            const updated = await selectPedido.findByCode(dbName, codigo);
            const pedido = updated[0];

            let cliente: any;
            let fornecedor: any = null;

            if (pedido.operacao === 'V' && pedido.cliente > 0) {
                try {
                    const resultCliente = await selectCliente.findByCode(dbName, pedido.cliente);
                    if (resultCliente.length > 0) {
                        const { codigo, id, nome } = resultCliente[0];
                        cliente = { codigo, nome, id };
                    }
                } catch (e) { console.log(`Erro ao buscar o cliente do pedido ${pedido.codigo}`, e); }
            }

            if (pedido.operacao === 'C' && pedido.fornecedor > 0) {
                try {
                    const resultSupplier = await selectSupplier.findByCode(dbName, pedido.fornecedor);
                    if (resultSupplier.length > 0) {
                        const { codigo, id, nome } = resultSupplier[0];
                        fornecedor = { codigo, nome, id };
                    }
                } catch (e) { console.log(`Erro ao buscar o fornecedor do pedido ${pedido.codigo}`, e); }
            }

            return reply.status(200).send({ ...pedido, cliente, fornecedor });
        } catch (e) {
            console.error('Erro ao atualizar o pedido:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao atualizar o pedido.' });
        }
    });

    server.get('/pedidos', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                data_inicial: z.string().optional(),
                data_final: z.string().optional(), 
                id_interno:z.string().optional(),
                codigo: z.coerce.number().optional(),
                id: z.string().optional(),
                id_externo:z.string().optional(),
                vendedor: z.coerce.number().optional(),
                search: z.string().optional().describe("Consulta o pedido atravéz do id_externo, codigo, id_interno, id e pelo nome do cliente ."),
                tipo:z.coerce.number().optional(),
                limit: z.coerce.number().optional().default(20),
                situacao: z.enum([ 'EA' ,'*', 'FI' , 'RE' , 'AI' , 'FP', 'BM' ]).optional().describe(" * = todos, EA = Em aberto/orcamento , FI = Faturado integralmente , AI = aprovado/pedido , FP = faturado parcialmente, , BM = Baixado manualmente "),
                situacao_separacao: z.enum([ 'I' , 'P' , 'N' ]).optional().describe('I =separado integralmente, P = separado parcialmente, N = não foi separado'),
                orderBy: z.enum(["id_externo", "codigo", "id_interno", "id", "nome" , "data_recadastro"]).default('data_recadastro').describe("Ordena os pedidos atravéz do id_externo, codigo, id_interno, id e pelo nome do cliente ."),
                operacao:z.enum(['V', 'C']).optional().describe('V= venda, C = compra '),
                filial: z.coerce.number().optional(),
                usuario_separacao: z.coerce.number().int().nonnegative().optional()
            }),
            response: {
              //  200: z.array(orderResponseSchema),
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
        const selectCliente = new SelectClient();
        const selectSupplier = new SelectSupplier();

        const selectOrderItems = new SelectOrderItems();
        const dateService = new DateService();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o token!' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { filial, usuario_separacao, data_final, data_inicial ,operacao, search , tipo, vendedor, limit, situacao, situacao_separacao, orderBy} = request.query;

        const {id_externo, id_interno, codigo  , id } = request.query;


        if (data_final && !dateService.isValidDate(data_final)) {
            return reply.status(400).send({
                success: false,
                message: 'Informe a data no formato YYYY-MM-DD HH:mm:ss'
            });
        }

        if (data_inicial && !dateService.isValidDate(data_inicial)) {
            return reply.status(400).send({
                success: false,
                message: 'Informe a data no formato YYYY-MM-DD HH:mm:ss'
            });
        }


        try {
            const dados_orcamentos = await selectPedido.findByParams(dbName, 
                { 
                        startDate:data_inicial,
                        endDate:data_final,
                        search: search,
                        type:tipo,
                          limit,
                        seller:vendedor ,
                          situacao,
                          situacao_separacao,
                          orderBy,
                        id_externo,
                        codigo,
                        id,
                        id_interno,
                        operation:operacao,
                        filial,
                        usuario_separacao
                        });

            if (dados_orcamentos.length === 0) {
                return reply.status(200).send([]);
            }

            const orcamentos_registrados = await Promise.all(dados_orcamentos.map(async (i: OrderType) => {
                let produtos: OrderItemProduct[] = [];
                let servicos: OrderItemService[] = [];
                let parcelas: OrderInstallment[] = [];
                let cliente: any;
                let fornecedor: any = null;

                if(i.operacao == 'C' && i.fornecedor > 0 ){
                        try{
                        const resultSupplier = await selectSupplier.findByCode(dbName, i.fornecedor);
                                if(resultSupplier.length > 0){
                                const { codigo, id, nome } =resultSupplier[0];
                                        fornecedor = {  codigo,  nome, id }
                                } 
                            } catch (e) { console.log(`Erro ao buscar o fornecedor do pedido ${i.codigo} `, e); }

                }
                if(i.operacao == 'V'){
                    try {
                        const resultCliente = await selectCliente.findByCode(dbName, i.cliente);
                        if(resultCliente.length > 0 ){
                          const { codigo, id , nome }  =resultCliente[0];
                          cliente = resultCliente.length > 0 ? {  codigo,  nome , id  } : null;
                        }

                    } catch (e) { console.log(`Erro ao buscar o cliente do pedido ${i.codigo} `, e); }
                
                }
             

                try {
                    produtos = await selectOrderItems.findProductsWithSeriesByOrder(dbName, i.codigo);
                      
                } catch (e) { console.log(`Erro ao buscar os produtos do pedido ${i.codigo}`); }

                try {
                    servicos = await selectOrderItems.findServicesByOrder(dbName, i.codigo);
                } catch (e) { console.log(`Erro ao buscar os servicos do pedido ${i.codigo}`); }

                try {
                    parcelas = await selectOrderItems.findInstallmentsByOrder(dbName, i.codigo);
                } catch (e) { console.log(`Erro ao buscar as parcelas do pedido ${i.codigo}`); }

                return {
                    ...i,
                    produtos,
                    servicos,
                    parcelas,
                    cliente,
                    fornecedor,
                };
            }));
            return reply.status(200).send(orcamentos_registrados);
        } catch (error) {
            console.error('Erro ao buscar orçamentos:', error);
            return reply.status(500).send({ success: false, message: 'Erro interno ao buscar orçamentos.' });
        }
    });
    server.get('/pedidos/:codigo', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string()
            }),
           params: z.object({
                 codigo: z.coerce.number()
               }),
            response: {
                200: orderResponseSchema ,
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                404: z.object({
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
        const selectCliente = new SelectClient();
        const selectOrderItems = new SelectOrderItems();
        const dateService = new DateService();
        const decodedToken = DecodedToken(String(request.headers.token));
        const selectSupplier = new SelectSupplier();
        const selectProductSector = new SelectProductSector();

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o token!' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const {  codigo } = request.params;

        try {
            const dados_orcamentos = await selectPedido.findByCode(dbName, codigo);

            if (dados_orcamentos.length === 0) {
                return reply.status(404).send({ success: false, message:`Pedido ${codigo} não foi encontrado.`});
            }

            const orcamentos_registrados = await Promise.all(dados_orcamentos.map(async (i: OrderType) => {
                let produtos: OrderItemProduct   [] = [];
                let servicos: OrderItemService[] = [];
                let parcelas: OrderInstallment[] = [];
                let cliente: any;
                let fornecedor: any = null;

               try {
                    const resultCliente = await selectCliente.findByCode(dbName, i.cliente);
                        const { codigo, id , nome }  =resultCliente[0];
                    cliente = resultCliente.length > 0 ? {  codigo,  nome , id  } : undefined;
                } catch (e) { console.log(`Erro ao buscar o cliente do pedido ${i.codigo}`); }
                try{

                   const resultSupplier = await selectSupplier.findByCode(dbName, i.fornecedor);
                   const { codigo, id, nome } =resultSupplier[0];
                    fornecedor = resultSupplier.length > 0 ? {  codigo,  nome, id } : null;
               
                }catch(e){

                }

                try {
                    const dataprodutos = await selectOrderItems.findProductsWithSeriesByOrder(dbName, i.codigo);
                    for( const product of dataprodutos){
                        const dataStockProdutc = await selectProductSector.findProductSectorByPositiveStock(dbName,product.codigo, true );
                        produtos.push({...product, dados_setor: dataStockProdutc})
                      }

                } catch (e) { console.log(`Erro ao buscar os produtos do pedido ${i.codigo}`); }

                try {
                    servicos = await selectOrderItems.findServicesByOrder(dbName, i.codigo);
                } catch (e) { console.log(`Erro ao buscar os servicos do pedido ${i.codigo}`); }

                try {
                    parcelas = await selectOrderItems.findInstallmentsByOrder(dbName, i.codigo);
                } catch (e) { console.log(`Erro ao buscar as parcelas do pedido ${i.codigo}`); }

                return {
                    ...i,
                    produtos,
                    servicos,
                    parcelas,
                    cliente,
                    fornecedor
                };
            }));
            return reply.status(200).send(orcamentos_registrados[0]);
        } catch (error) {
            console.error('Erro ao buscar orçamentos:', error);
            return reply.status(500).send({ success: false, message: 'Erro interno ao buscar orçamentos.' });
        }
    });
    server.get('/pedidos/totais', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                vendedor: z.coerce.number()
            }),
            response: {
                200: z.array(z.object({
                    total_faturado: z.string().nullable().default('0.00'),
                    total_pedidos: z.string().nullable().default('0.00'),
                    media_pedidos: z.string().nullable().default('0.00'),
                    quantidade_pedidos: z.number().nullable(),
                    novos_clientes: z.number().nullable(),
                    total_clientes: z.number().nullable()
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
        const vendedor = Number(request.query.vendedor);

        if (!vendedor) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o vendedor' });
        }

        try {
            const result = await selectPedido.findStats(dbName, vendedor);
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Erro ao buscar totais:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao buscar os dados dos orçamentos.' });
        }
    });

    server.get('/pedidos/ultimos', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                vendedor: z.coerce.number(),
                limit: z.coerce.number().optional()
            }),
            response: {
                200: z.array(z.object({
                    id: z.string().optional(),
                    id_externo: z.string().optional(),
                    total_geral: z.string().optional(),
                    situacao: z.string().optional(),
                    nome: z.string().optional(),
                    data_cadastro: z.string().optional(),
                    cliente_nome:z.string().optional(),
                    cliente_id:z.string().optional() 
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
        const vendedor = Number(request.query.vendedor);
        const limit = request.query.limit || 7;

        if (!vendedor) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o vendedor' });
        }

        try {
            const result = await selectPedido.findLastInserted(dbName, vendedor, limit);
            return reply.status(200).send(result);
        } catch (e) {
            console.error('Erro ao buscar últimos inseridos:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao buscar os dados dos orçamentos.' });
        }
    });

    server.get('/pedidos/totais-por-data', {
        schema: {
            tags: ['pedidos'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                vendedor: z.coerce.number()
            }),
             
            response: {
                200: z.array(z.object({
                    total: z.string().nullable().default('0'),
                    data_cadastro: z.string()
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
        const vendedor = Number(request.query.vendedor);

        if (!vendedor) {
            return reply.status(400).send({ success: false, message: 'É necessário informar o vendedor' });
        }

        try {
            const result = await selectPedido.findTotalsByDate(dbName, vendedor);
            return reply.status(200).send(result);

        } catch (e) {
            console.error('Erro ao buscar totais por data:', e);
            return reply.status(500).send({ success: false, message: 'Erro interno ao buscar os dados dos orçamentos.' });
        }
    });
};

export { ordersRoute };
export default ordersRoute;

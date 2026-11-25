import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { DecodedToken } from '../../services/decoded-token/decodedToken.ts';
import { SelectProduct } from '../../models/product/select.ts';
import { InsertProduct } from '../../models/product/insert.ts';
import { UpdateProduct } from '../../models/product/update.ts';
import { DateService } from '../../utils/dateService.ts';
import { publishInternalMessage, publishMessage } from '../../services/broker/publish-message.ts';
import { type ProductType } from '../../models/product/types/product-type.ts';
import { SelectPhoto } from '../../models/photo/select.ts';
import { InsertPhoto } from '../../models/photo/insert.ts';
import { UpdatePhoto } from '../../models/photo/update.ts';
import { type PhotoType } from '../../models/photo/types/photo-type.ts';

type productTypeAndPhotos  = ProductType & { fotos: PhotoType[]; codigo: number }

const photoInputSchema = z.object({
    sequencia: z.number(),
    descricao: z.string().default(''),
    link: z.string().default(''),
    foto: z.string()
});
const productResponseSchema = z.object({
    codigo: z.number(),
    id: z.coerce.string(),
    estoque: z.coerce.number(),
    preco: z.coerce.string(),
    unidade_medida: z.string(),
    grupo: z.number(),
    origem: z.string().nullable(),
    descricao: z.string(),
    num_fabricante: z.string().nullable(),
    num_original: z.string().nullable(),
    sku: z.string().nullable(),
    marca: z.number(),
    ativo: z.enum(["S" ,"N"]).describe('S = ativo, N = inativo'),
    class_fiscal: z.string(),
    cst: z.string().nullable(),
    caracteristica: z.coerce.number().nullable(),
    data_cadastro: z.string(),
    data_recadastro: z.string(),
    observacoes1: z.string().nullable(),
    observacoes2: z.string().nullable(),
    observacoes3: z.string().nullable(),
    tipo: z.number(),
    controle_lote_serie: z.enum(['S', 'N']).default('N'),
    fotos: z.array(
            z.object({
                produto: z.coerce.number(),
                sequencia: z.coerce.number(),
                descricao: z.coerce.string(),
                link: z.coerce.string(),
                foto: z.coerce.string(),
                data_cadastro: z.coerce.string(),
                data_recadastro: z.coerce.string()
            })
    )

});

   const productBulkInsert =    z.array( 
             z.object({
                codigo: z.number(),
                id: z.coerce.string(),
                estoque: z.coerce.number().default(0),
                preco: z.coerce.string().default('0'),
                unidade_medida: z.string().default('und'),
                grupo: z.number(),
                origem: z.union([z.string(), z.number()]).default('0'),
                descricao: z.string(),
                num_fabricante: z.string().default(''),
                num_original: z.string().default(''),
                sku: z.string().default(''),
                marca: z.number(),
                ativo: z.enum(['S', 'N']).default('S'),
                class_fiscal: z.string().default(''),
                cst: z.string().default(''),
                caracteristica: z.number().default(0),
                controle_lote_serie: z.enum(['S', 'N']).default('N'),
                observacoes1: z.string().default(''),
                observacoes2: z.string().default(''),
                observacoes3: z.string().default(''),
                tipo: z.number().default(0),
                fotos: z.array(photoInputSchema) 
            })
        )

export type typeProductBulkInsert = z.infer<typeof productBulkInsert>;

const productsRoute: FastifyPluginAsyncZod = async (server) => {
    server.get('/bulk/produtos', {
        schema: {
            tags: ['produtos'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                data_recadastro: z.string().optional(),
                limit: z.coerce.number().optional()
            }),
            response: {
                 200: z.array(productResponseSchema),
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
        const select = new SelectProduct();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { data_recadastro, limit } = request.query;
        const selectPhoto = new SelectPhoto();
        let arrResult =[]
        try {
            let result = await select.findAll(dbName, data_recadastro, limit );
                    const productResponse:productTypeAndPhotos[] =[]
                      
                    for( let i of result as any ){
                        let fotos:PhotoType[] =[];


                         const resultFotos = await selectPhoto.findByProduct(dbName, i.codigo);
                        fotos = resultFotos  
                        i = {  ...i, fotos } as productTypeAndPhotos;

                        productResponse.push(i)
                    }
            return reply.status(200).send(productResponse);
        } catch (e) {
            console.error('Error fetching products:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching products' });
        }
    });

    server.get('/produtos/search', {
        schema: {
            tags: ['produtos'],
            headers: z.object({
                token: z.string()
            }),
            querystring: z.object({
                codigo: z.coerce.number().optional(),
                descricao: z.string().optional(),
                marca: z.coerce.number().optional(),
                grupo: z.coerce.number().optional(),
                ativo: z.string().optional(),
                id: z.string().optional(),
                num_fabricante: z.string().optional(),
                num_original: z.string().optional(),
                sku: z.string().optional(),
                limit: z.coerce.number().optional(),
                search: z.coerce.string().optional().describe("Pesquisa nos campos codigo, descricao e id do produto. "),
                orderBy: z.enum(['codigo' , 'descricao', 'id']).default('codigo')
            }),
             response: {
                 200: z.array(productResponseSchema),
                 400: z.object({
                     success: z.boolean(),
                     message: z.string()
                 })
             }
        }
    }, async (request, reply) => {
        const select = new SelectProduct();
        const selectPhoto = new SelectPhoto();

        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;

        try {
                let productsResponseRequest:any[] =[]
                    const { orderBy,  ativo, codigo, descricao, grupo, id, limit, marca, search} =request.query;
            let resultProductsSeachByParams = await select.findByParams(dbName, request.query) as productTypeAndPhotos[];
            if(resultProductsSeachByParams.length > 0 ){

                 for( let p of resultProductsSeachByParams as any[] ) { 
                    const fotos = await selectPhoto.findByProduct(dbName, p.codigo);
                    p.fotos = fotos
                    productsResponseRequest.push(p);
                 }
            }
            return reply.status(200).send(productsResponseRequest);
        } catch (e) {
            console.error('Error searching products:', e);
            return reply.status(400).send({ success: false, message: 'Error searching products' });
        }
    });

    server.get('/produtos/last-codigo', {
        schema: {
            tags: ['produtos'],
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
            const select = new SelectProduct();
            const result = await select.findLastInsertedCode(dbName);
            return reply.status(200).send({ codigo: result.codigo ?? 0 });
        } catch (e) {
            console.error('Error fetching last product code:', e);
            return reply.status(500).send({ success: false, message: 'Error fetching last product code' });
        }
    });

    server.get('/produtos/:codigo', {
        schema: {
            tags: ['produtos'],
            headers: z.object({
                token: z.string()
            }),
            params: z.object({
                codigo: z.coerce.number()
            }),
            response: {
                200: productResponseSchema,
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                }),
                404: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const select = new SelectProduct();
        const decodedToken = DecodedToken(String(request.headers.token));
        const empresa = decodedToken.payload?.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const { codigo } = request.params;
        const selectPhoto = new SelectPhoto();

        try {
            const result = await select.findByCode(dbName, codigo);
            if (result.length === 0) {
                return reply.status(404).send({ success: false, message: 'Product not found' });
            }

            let product = result[0] as any;

                if(result && result.length > 0 ){
                    
                    const fotos = await selectPhoto.findByProduct(dbName, result[0].codigo!);
                    product.fotos = fotos
            }

            return reply.status(200).send(product);
        } catch (e) {
            console.error('Error fetching product:', e);
            return reply.status(400).send({ success: false, message: 'Error fetching product' });
        }
    });

    server.post('/produtos', {
        schema: {
            description: "Cadastra/atualiza produto. Se informado o código e o registro já existir, o mesmo será atualizado com os novos dados.",
            tags: ['produtos'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                codigo: z.number().optional(),
                id: z.coerce.string(),
                estoque: z.coerce.number().default(0),
                preco: z.coerce.string().default('0'),
                unidade_medida: z.string().default('und'),
                grupo: z.number(),
                origem: z.union([z.string(), z.number()]).default('0'),
                descricao: z.string(),
                num_fabricante: z.string().default(''),
                num_original: z.string().default(''),
                sku: z.string().default(''),
                marca: z.number(),
                ativo: z.enum(['S', 'N']).default('S'),
                class_fiscal: z.string().default(''),
                cst: z.string().default(''),
                caracteristica: z.number().default(0),
                controle_lote_serie: z.enum(['S', 'N']).default('N'),
                observacoes1: z.string().default(''),
                observacoes2: z.string().default(''),
                observacoes3: z.string().default(''),
                tipo: z.number().default(0),
                fotos: z.array(photoInputSchema).optional().default([])

            }),
            response: {
                201: productResponseSchema,
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

        const data_cadastro = dateService.obterDataAtual();
        const data_recadastro = dateService.obterDataHoraAtual();
        const { id, codigo } = request.body
        const insert = new InsertProduct();
        const select = new SelectProduct();

        const existingByCode = codigo !== undefined ? await select.findByCode(dbName, codigo) : [];
        const isUpdate = existingByCode.length > 0;

        const productsById = await select.searchProductByUniqueParams(dbName, { id });
        const idOwner = productsById.find((product) => product.id === id);

        if (idOwner && (codigo === undefined || Number(idOwner.codigo) !== Number(codigo))) {
            return reply.status(400).send({ success: false, message: `Product ID: ${id} already exists.` });
        }

        try {
            const { origem, fotos, ...rest } = request.body;
            const productData: ProductType = {
                ...rest,
                origem: String(origem),
                data_cadastro: isUpdate ? existingByCode[0].data_cadastro : data_cadastro,
                data_recadastro
            };

            const result = await insert.insertOrUpdate(dbName, productData);
            const productCode = codigo !== undefined ? codigo : result.insertId;

            const insertPhoto = new InsertPhoto();
            const updatePhoto = new UpdatePhoto();
            const fotosPost: PhotoType[] = [];

            if (isUpdate) {
                await updatePhoto.deleteByProduct(dbName, productCode);
            }

            for (const foto of fotos) {
                const photoData: Omit<PhotoType, 'codigo'> = {
                    produto: productCode,
                    sequencia: foto.sequencia,
                    descricao: foto.descricao,
                    link: foto.link,
                    foto: foto.foto,
                    data_cadastro,
                    data_recadastro
                };
                const photoResult = await insertPhoto.insert(dbName, photoData);
                fotosPost.push({ ...photoData, codigo: photoResult.insertId });
            }

            const item = { ...productData, codigo: productCode, fotos: fotosPost };

            await publishMessage(empresa, isUpdate ? 'produto.atualizado' : 'produto.inserido', item, source);
            return reply.status(201).send(item);
        } catch (e) {
            console.error('Error inserting product:', e);
            return reply.status(400).send({ success: false, message: 'Error inserting product' });
        }
    });

    server.put('/produtos', {
        schema: {
            tags: ['produtos'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body: z.object({
                codigo: z.number(),
                id: z.string(),
                 estoque: z.coerce.number().default(0),
                preco: z.coerce.string().default('0'),
                unidade_medida: z.string(),
                grupo: z.number(),
                origem: z.union([z.string(), z.number()]).default('0'),
                descricao: z.string(),
                num_fabricante: z.string().default(''),
                num_original: z.string().default(''),
                sku: z.string().default(''),
                marca: z.number(),
                ativo: z.enum(['S', 'N']).default('S'),
                class_fiscal: z.string().default(''),
                cst: z.string().default(''),
                tipo: z.number().default(0),
                caracteristica: z.number().default(0),
                controle_lote_serie: z.enum(['S', 'N']).default('N'),
                observacoes1: z.string().default(''),
                observacoes2: z.string().default(''),
                observacoes3: z.string().default(''),
                fotos: z.array(photoInputSchema).optional().default([])
            }),
            response: {
                200: productResponseSchema,
                400: z.object({
                    success: z.boolean(),
                    message: z.string()
                })
            }
        }
    }, async (request, reply) => {
        const dateService = new DateService();
        const select = new SelectProduct();
        const update = new UpdateProduct();
        const decodedToken = DecodedToken(String(request.headers.token));

        if (!decodedToken.payload?.cnpj) {
            return reply.status(400).send({ success: false, message: 'Company identifier not provided' });
        }

        const empresa = decodedToken.payload.cnpj.replace(/\D/g, '');
        const dbName = `\`${empresa}\``;
        const source = request.headers.source as string || 'api_internal';
        const { codigo } = request.body;

        if (!codigo) {
            return reply.status(400).send({ success: false, message: 'Code is required' });
        }

        const existing = await select.findByCode(dbName, codigo);
        if (existing.length === 0) {
            return reply.status(400).send({ success: false, message: 'Product not found' });
        }
        const data_cadastro = existing[0].data_cadastro;
        const data_recadastro = dateService.obterDataHoraAtual();

        try {
            const { origem, fotos, ...rest } = request.body;
            const productData: ProductType = {
                ...rest,
                origem: String(origem),
                data_cadastro,
                data_recadastro
            };

            const result = await update.update(dbName, productData);

            if (result.affectedRows > 0) {
                const updatePhoto = new UpdatePhoto();
                const insertPhoto = new InsertPhoto();

                await updatePhoto.deleteByProduct(dbName, codigo);

                const fotosPut: PhotoType[] = [];
                for (const foto of fotos) {
                    const photoData: Omit<PhotoType, 'codigo'> = {
                        produto: codigo,
                        sequencia: foto.sequencia,
                        descricao: foto.descricao,
                        link: foto.link,
                        foto: foto.foto,
                        data_cadastro,
                        data_recadastro
                    };
                    const photoResult = await insertPhoto.insert(dbName, photoData);
                    fotosPut.push({ ...photoData, codigo: photoResult.insertId });
                }

                const item = { ...productData, fotos: fotosPut };
                await publishMessage(empresa, 'produto.atualizado', item, source);
                return reply.status(200).send(item as any);
            }

            return reply.status(400).send({ success: false, message: 'No rows affected' });
        } catch (e) {
            console.error('Error updating product:', e);
            return reply.status(400).send({ success: false, message: 'Error updating product' });
        }
    });
    server.post('/bulk/produtos', {
          schema: {
            description:"cadastra/atualiza produtos em lote, caso informado o codigo e o registro correspondente já existir, o mesmo será atualizado.\n Maximo de produtos permitidos por lote : 1000.",
            tags: ['produtos'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body:productBulkInsert
            ,
            response: {
                200: productBulkInsert,
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
        const insert = new InsertProduct();
                const insertPhoto = new InsertPhoto();

     
        const dados = request.body;

        if (!Array.isArray(dados) || dados.length === 0) {
            return reply.status(400).send({ success: false, message: 'Array of items is required' });
         }
            if ( dados.length > 1000) {
            return reply.status(400).send({ success: false, message: 'record limit per batch reached' });
        }
             let photos:any[] = [];

            try {
                await insert.bulkInsertOrUpdate(dbName, dados as any);
                for(const product of dados ){
                       product.fotos.map((i)=> { photos.push( { ...i, produto:product.codigo } ) })
                }
                 if(photos.length > 0 ){ 
                     await insertPhoto.bulkInsertOrUpdate(dbName, photos);
                }

                reply.status(200).send(dados);

        } catch (e) {
                 console.error('Error triggering background job:', e);
                return reply.status(500).send({ success: false, message: 'Internal server error' });
        }
       

        
    });
    server.post('/async/bulk/produtos', {
          schema: {
            description:"Processamento assíncrono - cadastra/atualiza produtos em lote, caso informado o codigo e o registro correspondente já existir, o mesmo será atualizado.\n Maximo de produtos permitidos por lote : 1000.",
            tags: ['produtos'],
            headers: z.object({
                token: z.string(),
                source: z.string().optional()
            }),
            body:productBulkInsert
            ,
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
            if ( dados.length > 1000) {
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
            
                               await publishInternalMessage(empresa, `produtos.processar.${empresa}`, payloadFila);
            
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

export { productsRoute };
export default productsRoute;

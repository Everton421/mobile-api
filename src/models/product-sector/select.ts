import { conn } from "../../database/databaseConfig.ts";
import { type ProductSectorType, type GroupedProductSectorType } from "./types/product-sector-type.ts";
   type queryByParams={
            setor:number,
            produto:number,
            search:string,
             num_fabricante:string ,
             num_original:string,
              sku :string,
            limit:number
    }
export class SelectProductSector {
    async findAll(dbName: string, dataRecadastro?: string): Promise<ProductSectorType[]> {
        let sql = ` SELECT 
            ps.*,
            s.id as id_setor,
            p.id as id_produto,
            COALESCE(DATE_FORMAT(ps.data_recadastro, '%Y-%m-%d %H:%i:%s'), '0000-00-00 00:00:00') AS data_recadastro
         FROM ${dbName}.produto_setor ps
         JOIN ${dbName}.setores s ON s.codigo = ps.setor  
         JOIN ${dbName}.produtos p ON p.codigo = ps.produto `;

        const params: any[] = [];

        if (dataRecadastro) {
            sql += ' WHERE ps.data_recadastro > ?';
            params.push(dataRecadastro);
        } else {
            sql += ' WHERE s.ativo = ?';
            params.push('S');
        }

        const [result] = await conn.query(sql, params);
        return result as ProductSectorType[];
    }

    async findByProduct(dbName: string, productCode: number ): Promise<ProductSectorType[]> {
        let sql = ` SELECT 
            ps.*,
              s.id as id_setor,
            p.id as id_produto,
            COALESCE(DATE_FORMAT(ps.data_recadastro, '%Y-%m-%d %H:%i:%s'), '0000-00-00 00:00:00') AS data_recadastro
         FROM ${dbName}.produto_setor ps 
         
         JOIN ${dbName}.setores s ON s.codigo = ps.setor
         WHERE produto = ? AND s.ativo = 'S'`;
        
        const [result] = await conn.query(sql, [productCode]);
        return result as ProductSectorType[];
    }

    async findByProductAndSector(dbName: string, productCode?: number, sectorCode?: number): Promise<ProductSectorType[]> {
        let sql = ` SELECT 
            ps.*,
            s.id as id_setor,
            p.id as id_produto,
            COALESCE(DATE_FORMAT(ps.data_recadastro, '%Y-%m-%d %H:%i:%s'), '0000-00-00 00:00:00') AS data_recadastro
         FROM ${dbName}.produto_setor ps 
         JOIN ${dbName}.setores s ON s.codigo = ps.setor
         JOIN ${dbName}.produtos p ON p.codigo = ps.produto
         WHERE  s.ativo = 'S' `;
          const values =[]

        if(productCode){
            sql += 'AND ps.produto = ? '
            values.push(productCode)
        }

         if(sectorCode){
            sql += ' AND ps.setor = ? '
            values.push(sectorCode)
         }

        const [result] = await conn.query(sql, values);
        return result as ProductSectorType[];
    }

 
     async findByParams(dbName: string, query: Partial<queryByParams>): Promise<ProductSectorType[]> {
        const {   produto, search, setor} =query 

        let sql = ` SELECT 
            ps.*,
            s.id as id_setor,
            p.id as id_produto,
            COALESCE(DATE_FORMAT(ps.data_recadastro, '%Y-%m-%d %H:%i:%s'), '0000-00-00 00:00:00') AS data_recadastro
         FROM ${dbName}.produto_setor ps 
         JOIN ${dbName}.setores s ON s.codigo = ps.setor
         JOIN ${dbName}.produtos p ON p.codigo = ps.produto
              `;

         const values =[]
         const conditions=[];
              conditions.push('s.ativo = ?')
                values.push('S')

            if(produto){
                conditions.push('ps.produto = ?')
                values.push(produto)
            }
            if(setor){
                conditions.push('ps.setor = ?')
                values.push(setor)
            }

            if( search ){
                    const terms = search.trim().split(/\s+/).filter(t => t.length > 0);
                if (terms.length > 0) {
                        const termConditions = terms.map(() =>
                        '(   s.descricao LIKE ? OR p.descricao LIKE ? )'
                        );
                        conditions.push(`(${termConditions.join(' AND ')})`);
                        terms.forEach(term => {
                        values.push(`%${term.toLocaleLowerCase()}%`, `%${term.toLowerCase()}%` );
                        });
                }
            }
            sql = sql + ' WHERE ' + conditions.join(' AND ')
        const [result] = await conn.query(sql, values);
        return result as ProductSectorType[];
    }

    async findByParamsGrouped(dbName: string, query: Partial<queryByParams>): Promise<GroupedProductSectorType[]> {
        const { produto, search, setor, limit , num_fabricante ,num_original, sku } = query;

        let sql = ` SELECT 
            ps.setor,
            ps.produto,
            ps.estoque,
            ps.local_produto,
            ps.local1_produto,
            ps.local2_produto,
            ps.local3_produto,
            ps.local4_produto,
            s.descricao AS setor_descricao,
            s.id AS id_setor,
            s.ativo AS setor_ativo,
            p.descricao AS produto_descricao,
            p.id AS id_produto,
            p.controle_lote_serie
         FROM ${dbName}.produto_setor ps 
         JOIN ${dbName}.setores s ON s.codigo = ps.setor
         JOIN ${dbName}.produtos p ON p.codigo = ps.produto`;

        const values: any[] = [];
        const conditions: string[] = [];

        conditions.push('s.ativo = ?');
        values.push('S');

        if (produto) {
            conditions.push('ps.produto = ?');
            values.push(produto);
        }
        if (setor) {
            conditions.push('ps.setor = ?');
            values.push(setor);
        }
        
    if(num_fabricante){
        conditions.push(' p.num_fabricante = ? ')
        values.push(num_fabricante);
    }   
    if(num_original){
        conditions.push(' p.num_original = ? ')
        values.push(num_original);
        }     
    if(sku){
        conditions.push(' p.sku = ? ')
        values.push(sku);
    } 
   
   
   if (search) {
            const terms = search.trim().split(/\s+/).filter(t => t.length > 0);
            if (terms.length > 0) {
                const termConditions = terms.map(() =>
                    '(s.descricao LIKE ? OR p.descricao LIKE ? OR p.codigo LIKE ? OR p.id LIKE ? )'
                );
                conditions.push(`(${termConditions.join(' AND ')})`);
                terms.forEach(term => {
                    values.push(`%${term.toLocaleLowerCase()}%`, `%${term.toLowerCase()}%`, `%${term.toLowerCase()}%`,`%${term.toLowerCase()}%`,);
                });
            }
        }

        sql = sql + ' WHERE ' + conditions.join(' AND ') ;
        if(limit){
            sql+=` limit ${limit}  `
        }
        console.log(sql)
        const [rows] = await conn.query(sql, values) as [any[], any];

        const productMap = new Map<number, GroupedProductSectorType>();

        for (const row of rows) {
            const produtoCodigo = row.produto;

            if (!productMap.has(produtoCodigo)) {
                productMap.set(produtoCodigo, {
                    produto: {
                        codigo: produtoCodigo,
                        descricao: row.produto_descricao,
                        id: row.id_produto,
                        controle_lote_serie: row.controle_lote_serie
                    },
                    setor: []
                });
            }

            const grouped = productMap.get(produtoCodigo)!;

            grouped.setor.push({
                codigo: row.setor,
                descricao: row.setor_descricao,
                ativo: row.setor_ativo,
                id: row.id_setor,
                estoque: row.estoque,
                local_produto: row.local_produto,
                local1_produto: row.local1_produto,
                local2_produto: row.local2_produto,
                local3_produto: row.local3_produto,
                local4_produto: row.local4_produto
            });
        }

        return Array.from(productMap.values());
    }

     /**
      * 
      */   
    async findProductSectorByPositiveStock(dbName: string, product:number, positive:boolean = true ,sector?:number, ){
             let baseSql = `
             SELECT 
				s.descricao as setor , 
					ps.local_produto, 
					ps.local1_produto, 
					ps.local2_produto, 
					ps.local3_produto,
					ps.local4_produto,
					ps.estoque
					FROM  ${dbName}.produto_setor ps 
                JOIN ${dbName}.setores s ON s.codigo = ps.setor
                 
				 `;
          const params =[];
          const values =[];
          
           params.push(` s.ativo = ? `);
            values.push('S');

        if(product != undefined){
             params.push(` ps.produto = ? `);
            values.push(product);
        }
            if(positive){
              params.push(` ps.estoque > ? `);
              values.push(0);
            }
            if(sector != undefined){
              params.push(` ps.setor = ? `);
              values.push(sector);
            }
            const whereClause = ' WHERE ';
            const finalSQl = baseSql + whereClause + params.join(" AND ");
        const [result] = await conn.query(finalSQl, values);
        return result as  {
            	  setor:string; 
				  local_produto:string; 
				  local1_produto:string; 
				  local2_produto:string; 
				  local3_produto:string;
				  local4_produto:string;
				  estoque:number }[];
    }
}
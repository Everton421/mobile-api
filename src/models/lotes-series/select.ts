import { conn } from "../../database/databaseConfig.ts";
import { type LotesSeriesType } from "./types/lotes-series-type.ts";

export class SelectLotesSeries {
    async findAll(dbName: string): Promise<LotesSeriesType[]> {
        const sql = `SELECT *,
            DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
         FROM ${dbName}.lotes_series`;
        const [result] = await conn.query(sql);
        return result as LotesSeriesType[];
    }

    async findByCode(dbName: string, codigo: number): Promise<LotesSeriesType[]> {
        const sql = `SELECT *,
            DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
         FROM ${dbName}.lotes_series WHERE codigo = ?`;
        const [result] = await conn.query(sql, [codigo]);
        return result as LotesSeriesType[];
    }

    async findByProduct(dbName: string, produto: number): Promise<LotesSeriesType[]> {
        const sql = `SELECT *,
            DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
         FROM ${dbName}.lotes_series WHERE produto = ?`;
        const [result] = await conn.query(sql, [produto]);
        return result as LotesSeriesType[];
    }

    async findBySerie(dbName: string, serie: string): Promise<LotesSeriesType[]> {
        const sql = `SELECT *,
            DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
         FROM ${dbName}.lotes_series WHERE serie = ?`;
        const [result] = await conn.query(sql, [serie]);
        return result as LotesSeriesType[];
    }

    async findByArraySeriesIn( dbName: string, series:string[]){
        const sql = `SELECT *,
                    DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS data_cadastro,
                    DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
                FROM ${dbName}.lotes_series WHERE serie in ( ? )`;
                const [result] = await conn.query(sql, [series]);
                return result as LotesSeriesType[];

    }

      async findByFilters(
            dbName: string,
            filters: {
                codigo?:number
                id?:string
                produto?: number;
                serie?:string;
                lote?:string;
            }
        ): Promise<LotesSeriesType[]> {
            const conditions: string[] = [];
            const values: (number | string)[] = [];
    
           if(filters.codigo){
                conditions.push(' codigo = ? ');
                values.push(filters.codigo);
            }

            if(filters.id !== undefined){
                conditions.push(' id = ? ');
                values.push(filters.id);
            }
    
            if(filters.serie){
                conditions.push(' serie = ? ');
                values.push(filters.serie);
            }
    
            if (filters.produto && filters.produto > 0 ) {
                conditions.push(' produto = ? ');
                values.push(filters.produto);
            }
    
            if (filters.lote !== undefined) {
                conditions.push(' lote = ? ');
                values.push(filters.lote);
            }
    
       
    
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const sql = `SELECT 
                               *,
            DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
                     FROM ${dbName}.lotes_series  
                     ${whereClause}`;
    
            const [result] = await conn.query(sql, values);
            return result as LotesSeriesType[];
        }

     
}

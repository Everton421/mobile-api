import { conn } from "../../database/databaseConfig.ts";
import { type LoteSerieSetorType } from "./types/lote-serie-setor-type.ts";

type resultLoteSerieSearch = {
        setor: number;
    produto: number;
    lote_serie: number;
    estoque: number;
    serie:string | null
    lote: string | null
}

type resultLoteSerieChanged = resultLoteSerieSearch & {
    data_recadastro: string;
}
export class SelectLoteSerieSetor {
    async findAll(dbName: string): Promise<LoteSerieSetorType[]> {
        const sql = `SELECT * FROM ${dbName}.lote_serie_setor`;
        const [result] = await conn.query(sql);
        return result as LoteSerieSetorType[];
    }

    async findBySector(dbName: string, setor: number): Promise<LoteSerieSetorType[]> {
        const sql = `SELECT * FROM ${dbName}.lote_serie_setor WHERE setor = ?`;
        const [result] = await conn.query(sql, [setor]);
        return result as LoteSerieSetorType[];
    }

    async findByProduct(dbName: string, produto: number): Promise<LoteSerieSetorType[]> {
        const sql = `SELECT * FROM ${dbName}.lote_serie_setor WHERE produto = ?`;
        const [result] = await conn.query(sql, [produto]);
        return result as LoteSerieSetorType[];
    }

    async findByLoteSerie(dbName: string, loteSerie: number): Promise<LoteSerieSetorType[]> {
        const sql = `SELECT * FROM ${dbName}.lote_serie_setor WHERE lote_serie = ?`;
        const [result] = await conn.query(sql, [loteSerie]);
        return result as LoteSerieSetorType[];
    }

    async findBySectorAndLoteSerie(dbName: string, setor: number, loteSerie: number): Promise<LoteSerieSetorType[]> {
        const sql = `SELECT * FROM ${dbName}.lote_serie_setor WHERE setor = ? AND lote_serie = ?`;
        const [result] = await conn.query(sql, [setor, loteSerie]);
        return result as LoteSerieSetorType[];
    }

    async findByFilters(
        dbName: string,
        filters: {
            setor?: number;
            produto?: number;
            lote_serie?: number;
            serie?:string;
            lote?:string;
            estoqueFilter?: 'positivo' | 'negativo' | 'zerado' | 'todos';
        }
    ): Promise<resultLoteSerieSearch[]> {
        const conditions: string[] = [];
        const values: (number | string)[] = [];

        if (filters.setor && filters.setor > 0 ) {
            conditions.push('lss.setor = ?');
            values.push(filters.setor);
        }

        if(filters.serie){
            conditions.push('ls.serie = ?');
            values.push(filters.serie);
        }

        if (filters.produto && filters.produto > 0 ) {
            conditions.push('lss.produto = ?');
            values.push(filters.produto);
        }

        if (filters.lote_serie !== undefined) {
            conditions.push('lss.lote_serie = ?');
            values.push(filters.lote_serie);
        }

        if (filters.estoqueFilter && filters.estoqueFilter !== 'todos') {
            if (filters.estoqueFilter === 'positivo') {
                conditions.push('lss.estoque > 0');
            } else if (filters.estoqueFilter === 'negativo') {
                conditions.push('lss.estoque < 0');
            } else if (filters.estoqueFilter === 'zerado') {
                conditions.push('lss.estoque = 0');
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `SELECT 
                            lss.*,
                            ls.lote,
                            ls.serie
                 FROM ${dbName}.lote_serie_setor lss 
                 JOIN ${dbName}.lotes_series ls on ls.codigo = lss.lote_serie
                 ${whereClause}`;

        const [result] = await conn.query(sql, values);
        return result as resultLoteSerieSearch[];
    }

    async findChangedAfter(
        dbName: string,
        dataRecadastro?: string,
        limit: number = 1000
    ): Promise<resultLoteSerieChanged[]> {
        const conditions: string[] = [];
        const values: (number | string)[] = [];

        if (dataRecadastro) {
            conditions.push('lss.data_recadastro > ?');
            values.push(dataRecadastro);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `SELECT
                            lss.setor,
                            lss.produto,
                            lss.lote_serie,
                            lss.estoque,
                            ls.lote,
                            ls.serie,
                            DATE_FORMAT(lss.data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
                     FROM ${dbName}.lote_serie_setor lss
                     JOIN ${dbName}.lotes_series ls on ls.codigo = lss.lote_serie
                     ${whereClause}
                     ORDER BY lss.data_recadastro ASC, lss.setor ASC, lss.lote_serie ASC
                     LIMIT ? ` ;
        values.push(limit);
        const [result] = await conn.query(sql, values);
        return result as resultLoteSerieChanged[];
    }
}

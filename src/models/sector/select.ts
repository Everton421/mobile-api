import { conn } from "../../database/databaseConfig.ts";
import { type SectorType } from "./types/sector-type.ts";

export class SelectSector {
    async findAll(dbName: string, dataRecadastro?: string): Promise<SectorType[]> {
        let sql = `SELECT *,
            COALESCE(DATE_FORMAT(data_cadastro, '%Y-%m-%d'), '0000-00-00') AS data_cadastro,
            COALESCE(DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s'), '0000-00-00 00:00:00') AS data_recadastro
        FROM ${dbName}.setores`;

        const params: any[] = [];

        if (dataRecadastro) {
            sql += ' WHERE data_recadastro > ?';
            params.push(dataRecadastro);
        }

        const [result] = await conn.query(sql, params);
        return result as SectorType[];
    }

    async findByCode(dbName: string, code: number): Promise<SectorType[]> {
        const sql = `SELECT *,
            COALESCE(DATE_FORMAT(data_cadastro, '%Y-%m-%d'), '0000-00-00') AS data_cadastro,
            COALESCE(DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s'), '0000-00-00 00:00:00') AS data_recadastro
        FROM ${dbName}.setores
        WHERE codigo = ? AND ativo = 'S'`;

        const [result] = await conn.query(sql, [code]);
        return result as SectorType[];
    }

    async findByParams(dbName: string, params: {
        codigo?: number;
        descricao?: string;
        id?: string;
        limit?: number;
        ativo?: string;
        search?:string;
        orderBy?: 'codigo' | 'descricao' | 'data_recadastro' | 'id'
    }): Promise<SectorType[]> {
        const {
            codigo,
            descricao,
            id,
            limit = 20,
            ativo,
            orderBy,
            search
        } = params;

        let sql = `SELECT *,
            DATE_FORMAT(data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro
        FROM ${dbName}.setores`;

        const conditions: string[] = [];
        const values: any[] = [];

        if (ativo) {
            conditions.push("ativo = ?");
            values.push(ativo);
        }
        if (codigo) {
            conditions.push("codigo = ?");
            values.push(codigo);
        }
        if (id) {
            conditions.push("id = ?");
            values.push(  id );
        }
        if (descricao) {
            conditions.push("descricao LIKE ?");
            values.push(`%${descricao.toLowerCase()}%`);
        }

        if(search){
            conditions.push(" descricao LIKE ? OR id LIKE ? OR codigo LIKE  ?  ");
            values.push(`%${search.toLowerCase()}%`, `%${search}%`, `%${search}%` );
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

      if(orderBy){
            sql+= ` ORDER BY ${orderBy} `
        }
        sql += ' LIMIT ?';
        values.push(Number(limit));

        const [result] = await conn.query(sql, values);
        return result as SectorType[];
    }

    async  findByIds(dbName: string, ids: string[]): Promise<SectorType[]> {
        const sql = `SELECT *,
            COALESCE(DATE_FORMAT(data_cadastro, '%Y-%m-%d'), '0000-00-00') AS data_cadastro,
            COALESCE(DATE_FORMAT(data_recadastro, '%Y-%m-%d %H:%i:%s'), '0000-00-00 00:00:00') AS data_recadastro
        FROM ${dbName}.setores
        WHERE  id in ( ? )`;

        const [result] = await conn.query(sql, [ids]);
        return result as SectorType[];
    }

    async findLastInsertedCode(dbName: string): Promise<{ codigo: number }> {
        const sql = `SELECT MAX(codigo) as codigo FROM ${dbName}.setores`;
        const [result] = await conn.query(sql);
        return (result as any)[0];
    }
}

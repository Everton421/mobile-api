import { type ResultSetHeader } from "mysql2";
import { conn } from "../../database/databaseConfig.ts";
import { DateService } from "../../utils/dateService.ts";
import { type SectorType } from "./types/sector-type.ts";


type inputBulkInsert = {
    codigo?: number | undefined;
    id: string;
    data_cadastro?: string;
    data_recadastro?: string;
    descricao: string;
    ativo?: string ;
}

export class InsertSector {
    async insert(dbName: string, data: SectorType): Promise<{ insertId: number }> {
         
        const columns =['id', 'data_cadastro', 'data_recadastro', 'descricao']

        const values: (string | number)[] = [data.id, data.data_cadastro, data.data_recadastro, data.descricao];
        
           if (data.codigo != null) {
            columns.unshift('codigo');
            values.unshift(data.codigo);
        }

                      const placeholders = values.map(() => '?').join(', ');
     const sql = `INSERT INTO ${dbName}.setores  (${columns.join(', ')}) values (${placeholders})` ;

        const [result] = await conn.query(sql, values);
        return { insertId: (result as any).insertId };
    }

    async insertOrUpdate(dbName: string, data: SectorType): Promise<ResultSetHeader> {
        const fields = ['id', 'data_cadastro', 'data_recadastro', 'descricao', 'ativo'];
        const values: (string | number)[] = [data.id, data.data_cadastro, data.data_recadastro, data.descricao, data.ativo];

        if (data.codigo != null) {
            fields.unshift('codigo');
            values.unshift(data.codigo);
        }

        const placeholders = values.map(() => '?').join(', ');
        const sql = `INSERT INTO ${dbName}.setores (${fields.join(', ')}) VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE
                id = VALUES(id),
                descricao = VALUES(descricao),
                ativo = VALUES(ativo),
                data_recadastro = VALUES(data_recadastro)
        `;

        const [result] = await conn.query(sql, values);
        return result as ResultSetHeader;
    }

    async bulkInsertOrUpdate(dbName: string, data: inputBulkInsert[]): Promise<{ affectedRows: number }> {
        const dateService = new DateService();
        const params: string[] = [];
        const values: (string | number | null)[] = [];

        for (const sector of data) {
            const data_cadastro = sector.data_cadastro ? sector.data_cadastro : dateService.obterDataAtual();
            const data_recadastro = sector.data_recadastro ? sector.data_recadastro : dateService.obterDataHoraAtual();

            params.push("(?, ?, ?, ?, ?, ?)");
            values.push(
                sector.codigo ?? null,
                sector.id,
                data_cadastro,
                data_recadastro,
                sector.descricao,
                sector.ativo ?? 'S'
            );
        }

        if (params.length === 0) {
            return { affectedRows: 0 };
        }

        const sql = `INSERT INTO ${dbName}.setores
            (codigo, id, data_cadastro, data_recadastro, descricao, ativo)
            VALUES ${params.join(', ')}
            ON DUPLICATE KEY UPDATE
                id = VALUES(id),
                descricao = VALUES(descricao),
                ativo = VALUES(ativo),
                data_recadastro = VALUES(data_recadastro)
        `;

        const [result] = await conn.query(sql, values);
        return { affectedRows: (result as any).affectedRows };
    }
}

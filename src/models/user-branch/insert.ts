import { conn } from "../../database/databaseConfig.ts";

export class InsertUserBranch {
    async insert(dbName: string, codigoUsuario: number, codigosFiliais: number[]): Promise<void> {
        if (codigosFiliais.length === 0) return;

        const sql = `INSERT INTO ${dbName}.usuarios_filiais (usuario, filial) VALUES ?`;
        const values = codigosFiliais.map(codigoFilial => [codigoUsuario, codigoFilial]);
        await conn.query(sql, [values]);
    }
}
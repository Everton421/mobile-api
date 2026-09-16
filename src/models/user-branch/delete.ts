import { conn } from "../../database/databaseConfig.ts";

export class DeleteUserBranch {
    async deleteByUser(dbName: string, codigoUsuario: number): Promise<void> {
        const sql = `DELETE FROM ${dbName}.usuarios_filiais WHERE usuario = ?`;
        await conn.query(sql, [codigoUsuario]);
    }

    async deleteByFilial(dbName: string, codigoFilial: number): Promise<void> {
        const sql = `DELETE FROM ${dbName}.usuarios_filiais WHERE filial = ?`;
        await conn.query(sql, [codigoFilial]);
    }
}
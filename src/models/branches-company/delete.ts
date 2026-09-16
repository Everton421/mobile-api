import { conn } from "../../database/databaseConfig.ts";

export class DeleteBranchesCompany {
    async delete(dbName: string, codigo: number): Promise<{ affectedRows: number }> {
        const sql = `DELETE FROM ${dbName}.filiais WHERE codigo = ?`;
        const [result] = await conn.query(sql, [codigo]);
        return { affectedRows: (result as any).affectedRows };
    }
}
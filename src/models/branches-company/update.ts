import { conn } from "../../database/databaseConfig.ts";
import { type typeBranchesCompany } from "./types/typ-branches-company.ts";

export class UpdateBranchesCompany {
    async update(dbName: string, filial: typeBranchesCompany): Promise<{ affectedRows: number }> {
        const sql = `UPDATE ${dbName}.filiais SET nome_fantasia = ?, razao_social = ?, cnpj = ?, ativo = ? WHERE codigo = ?`;
        const values = [filial.nome_fantasia, filial.razao_social, filial.cnpj, filial.ativo, filial.codigo];
        const [result] = await conn.query(sql, values);
        return { affectedRows: (result as any).affectedRows };
    }
}
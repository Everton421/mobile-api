import { conn } from "../../database/databaseConfig.ts";
import { type NewBranchesCompany } from "./types/typ-branches-company.ts";

export class InsertBranchesCompany {
    async insert(dbName: string, filial: NewBranchesCompany): Promise<{ insertId: number }> {
        const sql = `INSERT INTO ${dbName}.filiais (nome_fantasia, razao_social, cnpj, ativo) VALUES (?, ?, ?, ?)`;
        const values = [filial.nome_fantasia, filial.razao_social, filial.cnpj, filial.ativo];
        const [result] = await conn.query(sql, values);
        return { insertId: (result as any).insertId };
    }
}
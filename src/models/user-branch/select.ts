import { conn } from "../../database/databaseConfig.ts";
import { type typeBranchesCompany } from "../branches-company/types/typ-branches-company.ts";
import { type UserBranchRow } from "./types/user-branch-type.ts";

export class SelectUserBranch {
    async findByUser(dbName: string, codigoUsuario: number): Promise<typeBranchesCompany[]> {
        const sql = `
            SELECT f.* FROM ${dbName}.filiais f
            INNER JOIN ${dbName}.usuarios_filiais uf ON f.codigo = uf.filial
            WHERE uf.usuario = ?
            ORDER BY f.nome_fantasia
        `;
        const [result] = await conn.query(sql, [codigoUsuario]);
        return result as typeBranchesCompany[];
    }

    async findByUserIds(dbName: string, codigosUsuarios: number[]): Promise<UserBranchRow[]> {
        if (codigosUsuarios.length === 0) return [];

        const placeholders = codigosUsuarios.map(() => "?").join(", ");
        const sql = `
            SELECT uf.usuario, f.codigo, f.nome_fantasia, f.razao_social, f.cnpj, f.ativo
            FROM ${dbName}.usuarios_filiais uf
            INNER JOIN ${dbName}.filiais f ON f.codigo = uf.filial
            WHERE uf.usuario IN (${placeholders})
            ORDER BY f.nome_fantasia
        `;
        const [result] = await conn.query(sql, codigosUsuarios);
        return result as UserBranchRow[];
    }

    async findByFilial(dbName: string, codigoFilial: number): Promise<{ usuario: number }[]> {
        const sql = `
            SELECT uf.usuario FROM ${dbName}.usuarios_filiais uf
            WHERE uf.filial = ?
        `;
        const [result] = await conn.query(sql, [codigoFilial]);
        return result as { usuario: number }[];
    }
}
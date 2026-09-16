import { conn } from "../../database/databaseConfig.ts"
import { type typeBranchesCompany } from "./types/typ-branches-company.ts"


type inputGetByParams= {

codigo?:number
nome_fantasia?:string
razao_social?:string
cnpj?:string
ativo?: 'S' | 'N'

}

export class SelectBranchesCampany {

    async findByCode(dbName: string, codigo: number): Promise<typeBranchesCompany[]> {
        const sql = `SELECT * FROM ${dbName}.filiais WHERE codigo = ?`;
        const [result] = await conn.query(sql, [codigo]);
        return result as typeBranchesCompany[];
    }

    async exists(dbName: string, codigo: number): Promise<boolean> {
        const sql = `SELECT COUNT(*) as count FROM ${dbName}.filiais WHERE codigo = ?`;
        const [result] = await conn.query(sql, [codigo]);
        return (result as any)[0].count > 0;
    }

    async getByParams( dbName:string , query:inputGetByParams ):Promise<typeBranchesCompany[]>{
            const { ativo, cnpj, codigo,nome_fantasia, razao_social} = query;
    
    
        const baseSql  = `SELECT * FROM ${dbName}.filiais `
        const valuesQuery = [];
        const params=[]

        if(codigo != undefined){
            params.push(` codigo = ? `)
            valuesQuery.push(Number(codigo));
        }
        if(nome_fantasia){
            params.push(` nome_fantasia LIKE ? `)
            valuesQuery.push(`%${nome_fantasia}%` );
        }

        if(razao_social){
            params.push(` razao_social LIKE ? `)
            valuesQuery.push(`%${razao_social}%` );
        }
        if(cnpj){
            params.push(` cnpj = ? `)
            valuesQuery.push(String(cnpj));
        }

        if(ativo){
            params.push(` ativo = ? `)
            valuesQuery.push(ativo);
        }

        const whereClause = params.length > 0 ? `WHERE ${params.join(' AND ')} ` : '';
        const finalSql = baseSql + whereClause;
        
         const  [ resultQuery ] = await conn.query(finalSql, valuesQuery) 
         return resultQuery as typeBranchesCompany[]; 
        }
}
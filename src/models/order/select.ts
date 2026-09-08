import { conn } from "../../database/databaseConfig.ts";
import { type OrderType } from "./types/order-type.ts";

export class SelectOrder {
    async findByCode(dbName: string, code: number): Promise<OrderType[]> {
        const sql = `SELECT p.*,
            DATE_FORMAT(p.data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(p.data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro,
            DATE_FORMAT(p.fim_separacao, '%Y-%m-%d %H:%i:%s') AS fim_separacao,
            DATE_FORMAT(p.inicio_separacao, '%Y-%m-%d %H:%i:%s') AS inicio_separacao,

            CONVERT(p.observacoes USING utf8) AS observacoes
        FROM ${dbName}.pedidos p 
        left JOIN ${dbName}.clientes c ON c.codigo = p.cliente 
        
        WHERE p.codigo = ?`;

        const [result] = await conn.query(sql, [code]);
        return result as OrderType[];
    }

    async findByExternalId(dbName: string, externalId: string, operation: 'V' | 'C'): Promise<OrderType[]> {
        const sql = `SELECT p.*, c.id as cliente_id, c.nome as cliente_nome,
            DATE_FORMAT(p.data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(p.data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro,
              DATE_FORMAT(p.fim_separacao, '%Y-%m-%d %H:%i:%s') AS fim_separacao,
            DATE_FORMAT(p.inicio_separacao, '%Y-%m-%d %H:%i:%s') AS inicio_separacao,
            CONVERT(p.observacoes USING utf8) AS observacoes
        FROM ${dbName}.pedidos p 
        left JOIN ${dbName}.clientes c ON c.codigo = p.cliente 
        WHERE p.id = ? AND p.operacao = ?`;

        const [result] = await conn.query(sql, [externalId, operation]);
        return result as OrderType[];
    }

    async exists(dbName: string, code: number): Promise<boolean> {
        const sql = `SELECT COUNT(*) as count
        FROM ${dbName}.pedidos
        WHERE codigo = ?`;

        const [result] = await conn.query(sql, [code]);
        return (result as any)[0].count > 0;
    }

    async existsByExternalId(dbName: string, externalId: string, operation: 'V' | 'C'): Promise<boolean> {
        const sql = `SELECT COUNT(*) as count
        FROM ${dbName}.pedidos
        WHERE id = ? AND operacao = ?`;

        const [result] = await conn.query(sql, [externalId, operation]);
        return (result as any)[0].count > 0;
    }

    async findByDate(dbName: string, queryDate?: string, seller?: number): Promise<OrderType[]> {
        const sql = `SELECT co.*, c.id as cliente_id,  c.nome as cliente_nome,
            DATE_FORMAT(co.data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(co.data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro,
              DATE_FORMAT(p.fim_separacao, '%Y-%m-%d %H:%i:%s') AS fim_separacao,
            DATE_FORMAT(p.inicio_separacao, '%Y-%m-%d %H:%i:%s') AS inicio_separacao,
            CONVERT(co.observacoes USING utf8) AS observacoes
        FROM ${dbName}.pedidos AS co
        JOIN ${dbName}.clientes c ON c.codigo = co.cliente`;

        const conditions: string[] = [];
        const values: any[] = [];

        if (queryDate) {
            conditions.push("co.data_recadastro >= ?");
            values.push(queryDate);
        }
        if (seller) {
            conditions.push("co.vendedor = ?");
            values.push(seller);
        }

        let finalSql = sql;
        if (conditions.length > 0) {
            finalSql += ' WHERE ' + conditions.join(' AND ');
        }

        const [result] = await conn.query(finalSql, values);
        return result as OrderType[];
    }

    async findByDateRange(
        dbName: string,
        startDate: string,
        endDate: string,
        filter: string | null,
        seller: number
    ): Promise<OrderType[]> {
        const sql = `SELECT co.*, c.id as cliente_id,  c.nome as cliente_nome,
            DATE_FORMAT(co.data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(co.data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro,
              DATE_FORMAT(co.fim_separacao, '%Y-%m-%d %H:%i:%s') AS fim_separacao,
            DATE_FORMAT(co.inicio_separacao, '%Y-%m-%d %H:%i:%s') AS inicio_separacao,
            CONVERT(co.observacoes USING utf8) AS observacoes
        FROM ${dbName}.pedidos AS co
        JOIN ${dbName}.clientes c ON c.codigo = co.cliente
        WHERE co.vendedor = ?
        AND co.data_cadastro BETWEEN ? AND ?
        ${filter !== '' ? 'AND (c.nome LIKE ? OR c.cnpj LIKE ?)' : ''}`;

        const values: any[] = [seller, startDate, endDate];
        if (filter) {
            values.push(`%${filter}%`, `%${filter}%`);
        }

        const [result] = await conn.query(sql, values);
        return result as OrderType[];
    }

    async findByParams(dbName: string, params: {
        startDate?: string;
        endDate?: string;
        seller?: number;
        client?: number;
        supplier?:number;
        cnpj?: string;
        limit?: number;
        name?: string;
        search?: string;
        type?: number;
        operation?: 'V' | 'C';
        codigo?: number;
        id_interno?: string;
        id_externo?: string;
        id?: string;
        situacao?: 'EA' | 'FI' | 'RE' | 'AI' | 'FP'| 'BM' | '*',
        situacao_separacao?: 'I' | 'P' | 'N',
        orderBy?: "id_externo" | "codigo" | "id_interno" | "id" | "nome" | "data_recadastro",
        usuario_separacao?:number,
        filial?:number,
        classificar_por?:'ASC' | 'DESC'
    }): Promise<OrderType[]> {
        const {
            startDate,
            endDate,
            seller,
            operation,
            client,
            cnpj,
            limit,
            search,
            situacao,
            situacao_separacao,
            type,
            codigo, id, id_interno, id_externo,
            orderBy,
            supplier,
            filial,
            usuario_separacao,
            classificar_por
        } = params;

        const sql = `SELECT pe.*, 
         -- c.id as cliente_id,  
         -- c.nome as cliente_nome,
         -- f.id as fornecedor_id,
         -- f.nome as fornecedor_nome,    
        DATE_FORMAT(pe.data_cadastro, '%Y-%m-%d') AS data_cadastro,
            DATE_FORMAT(pe.data_recadastro, '%Y-%m-%d %H:%i:%s') AS data_recadastro,
          DATE_FORMAT(pe.fim_separacao, '%Y-%m-%d %H:%i:%s') AS fim_separacao,
            DATE_FORMAT(pe.inicio_separacao, '%Y-%m-%d %H:%i:%s') AS inicio_separacao,

            CONVERT(pe.observacoes USING utf8) AS observacoes
        FROM ${dbName}.pedidos AS pe
        LEFT JOIN ${dbName}.clientes c ON c.codigo = pe.cliente
        LEFT JOIN ${dbName}.fornecedores f ON f.codigo = pe.fornecedor 
        `
        ;

        const conditions: string[] = [];
        const values: any[] = [];

        if (startDate && endDate) {
            conditions.push("pe.data_cadastro BETWEEN ? AND ?");
            values.push(startDate, endDate);
        }
        if (client) {
            conditions.push("pe.cliente = ?");
            values.push(Number(client));
        }
        if(supplier){
            conditions.push("pe.forncedor = ?");
            values.push(Number(supplier));
        }
        if(operation){
            conditions.push("pe.operacao = ?");
            values.push(operation);
        }
        if (seller) {
            conditions.push("pe.vendedor = ?");
            values.push(Number(seller));
        }
        if (cnpj) {
            conditions.push("c.cnpj = ?");
            values.push(Number(cnpj));
        }
        
        if(usuario_separacao && usuario_separacao> 0){
            conditions.push("( pe.usuario_separacao = ? OR pe.usuario_separacao = 0 ) ");
            values.push(Number(usuario_separacao));
        }

        if (situacao_separacao) {
            conditions.push("pe.situacao_separacao = ?");
            values.push(String(situacao_separacao));
        }
        if (type) {
            conditions.push("pe.tipo = ?");
            values.push(Number(type));
        }
        if (situacao && situacao != '*') {
            conditions.push("pe.situacao = ?");
            values.push(String(situacao));
        }
        if(filial){
            conditions.push("pe.filial = ?");
            values.push(Number(filial));
        }

        if (search) {
            conditions.push(" c.nome LIKE ? OR pe.id_externo LIKE ? OR  pe.codigo LIKE ? OR pe.id_interno LIKE ? OR pe.id LIKE ? OR pe.contato LIKE ?  ");
            values.push(`%${search.toLowerCase()}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%` );
        }

        if (codigo && codigo != 0) {
            conditions.push(" pe.codigo = ? ");
            values.push(codigo);
        }


        if (id_interno && id_interno != '0') {
            conditions.push(" pe.id_interno = ? ");
            values.push(id_interno);
        }

        if (id && id != '0') {
            conditions.push(" pe.id = ? ");
            values.push(id);
        }
        if (id_externo && id_externo != '0') {
            conditions.push(" pe.id_externo = ? ");
            values.push(id_externo);
        }

        let finalSql = sql;
        if (conditions.length > 0) {
            finalSql += ' WHERE ' + conditions.join(' AND ');
        }

        if (orderBy === "codigo") finalSql += ` ORDER BY pe.codigo ${classificar_por}`;
        if (orderBy === "data_recadastro") finalSql += ` ORDER BY pe.data_recadastro ${classificar_por}`;
        if (orderBy === "id") finalSql += ` ORDER BY pe.id ${classificar_por}`;
        if (orderBy === "id_externo") finalSql += ` ORDER BY pe.id_externo ${classificar_por}`;
        if (orderBy === "id_interno") finalSql += ` ORDER BY pe.id_interno ${classificar_por}`;
        if (limit) {
            finalSql += ' LIMIT ?';
            values.push(Number(limit));
        }

        const [result] = await conn.query(finalSql, values);
        return result as OrderType[];
    }

    async findTotalsByDate(dbName: string, seller: number): Promise<{ total: string; data_cadastro: string }[]> {
        const sql = `SELECT 
            SUM(total_geral) as total,
            DATE_FORMAT(data_cadastro, '%Y-%d-%m') as data_cadastro
        FROM ${dbName}.pedidos
        WHERE vendedor = ?
        GROUP BY data_cadastro`;

        const [result] = await conn.query(sql, [seller]);
        return result as { total: string; data_cadastro: string }[];
    }

    async findLastInserted(dbName: string, seller: number, limit: number): Promise<OrderType[]> {
        const sql = `SELECT 
            p.id, COALESCE(p.id_externo, 0) AS id_externo,
            p.total_geral, p.situacao, 
              c.id as cliente_id,  c.nome as cliente_nome,
            DATE_FORMAT(p.data_cadastro, '%Y-%m-%d') AS data_cadastro
        FROM ${dbName}.pedidos AS p
        JOIN ${dbName}.clientes as c ON c.codigo = p.cliente
        WHERE p.vendedor = ?
        ORDER BY p.data_cadastro DESC
        LIMIT ?`;

        const [result] = await conn.query(sql, [seller, limit]);
        return result as OrderType[];
    }

    async findStats(dbName: string, seller: number): Promise<{
        total_faturado: string;
        total_pedidos: string;
        media_pedidos: string;
        quantidade_pedidos: number;
        novos_clientes: number;
        total_clientes: number;
    }[]> {
        const sql = `SELECT  
                (SELECT COALESCE( SUM(pf.total_geral),0) AS total_faturado 
                FROM ${dbName}.pedidos pf 
                WHERE pf.situacao = 'FI' AND pf.vendedor = ?) AS total_faturado,
                (SELECT COALESCE(SUM(total_geral), 0 ) 
                FROM ${dbName}.pedidos 
                WHERE vendedor = ?) AS total_pedidos,
                (SELECT AVG(total_geral) 
                FROM ${dbName}.pedidos 
                WHERE vendedor = ?) AS media_pedidos,
                (SELECT COUNT(codigo) 
                FROM ${dbName}.pedidos 
                WHERE vendedor = ?) AS quantidade_pedidos,
                (SELECT COUNT(codigo) 
                FROM ${dbName}.clientes 
                WHERE ativo = 'S' 
                AND data_cadastro >= DATE_FORMAT(NOW(), '%Y-%m-01')
                AND vendedor = ?) AS novos_clientes,
                (SELECT COUNT(codigo) 
                FROM ${dbName}.clientes 
                WHERE ativo = 'S' 
                AND (vendedor = ? OR vendedor = 0)) AS total_clientes
            FROM DUAL`;

        const [result] = await conn.query(sql, [seller, seller, seller, seller, seller, seller]);
        return result as {
            total_faturado: string;
            total_pedidos: string;
            media_pedidos: string;
            quantidade_pedidos: number;
            novos_clientes: number;
            total_clientes: number;
        }[];
    }

    getCurrentDateWithoutTime(): string {
        const current = new Date();
        const day = String(current.getDate()).padStart(2, '0');
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const year = current.getFullYear();
        return `${year}-${month}-${day} 00:00:00`;
    }

    formatDate(data: string): string | null {
        const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        if (!regex.test(data)) {
            return null;
        }
        return data;
    }
}

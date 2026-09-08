import { conn } from "../../database/databaseConfig.ts";
import { type OrderSeriesType } from "./types/order-type.ts";

export type OrderItemProduct = {
    pedido: number;
    codigo: number;
    sequencia:number
    desconto: number;
    quantidade: number;
    preco: number;
    frete: number;
    total: number;
    quantidade_separada: number;
    quantidade_faturada: number;
    descricao?: string;
    id?: string;
    controle_lote_serie: 'S' | 'N';
    lote_serie?: number;
     sku:string,
     num_original:string,
     num_fabricante:string,

    series?: OrderSeriesType[];
    dados_setor?:dados_setor[]
};
   type dados_setor =
         {
            setor: string,
            local_produto: string,
            local1_produto:string,
            local2_produto:string,
            local3_produto:string,
            local4_produto:string,
            estoque: number,
        } 

export type OrderItemService = {
    pedido: number;
    codigo: number;
    desconto: number;
    quantidade: number;
    valor: number;
    total: number;
    aplicacao?: string;
    id?: string;
};

export type OrderInstallment = {
    pedido: number;
    parcela: number;
    valor: number;
    vencimento: string;
};

export class SelectOrderItems {
    async findProductsWithSeriesByOrder(dbName: string, orderCode: number): Promise<OrderItemProduct[]> {
        const products = await this.findProductsByOrder(dbName, orderCode);
        if (products.length === 0) return products;

        const sqlSeries = `SELECT ps.produto, ps.lote_serie, ps.quantidade, ls.serie, ls.lote 
        FROM ${dbName}.pedido_series ps
        JOIN ${dbName}.produtos p on p.codigo = ps.produto
        JOIN ${dbName}.lotes_series ls ON ls.codigo = ps.lote_serie
        WHERE ps.pedido = ?`;

        
        const [seriesResult] = await conn.query(sqlSeries, [orderCode]);
        const seriesList = seriesResult as { produto: number; lote_serie: number; quantidade: number; serie: string; lote: string }[];

        const seriesByProduct = new Map<number, OrderSeriesType[]>();
        for (const s of seriesList) {
            if (!seriesByProduct.has(s.produto)) {
                seriesByProduct.set(s.produto, []);
            }
            seriesByProduct.get(s.produto)!.push({
                lote_serie: s.lote_serie,
                quantidade: s.quantidade,
                serie: s.serie,
                lote: s.lote
            });
        }

        return products.map(p => ({
            ...p,
            series: seriesByProduct.get(p.codigo) || []
        }));
    }


    async findProductsByOrder(dbName: string, orderCode: number): Promise<OrderItemProduct[]> {
        const sql = `SELECT pp.*, p.descricao, p.id, p.controle_lote_serie,
         p.descricao, p.sku, p.num_original, p.num_fabricante

        FROM ${dbName}.produtos_pedido pp 
        JOIN ${dbName}.produtos p ON pp.codigo = p.codigo
        WHERE pp.pedido = ?`;

        const [result] = await conn.query(sql, [orderCode]);
        return result as OrderItemProduct[];
    }

    async findServicesByOrder(dbName: string, orderCode: number): Promise<OrderItemService[]> {
        const sql = `SELECT sp.*, s.aplicacao, s.id
        FROM ${dbName}.servicos_pedido sp 
        JOIN ${dbName}.servicos s ON s.codigo = sp.codigo
        WHERE sp.pedido = ?`;

        const [result] = await conn.query(sql, [orderCode]);
        return result as OrderItemService[];
    }

    async findInstallmentsByOrder(dbName: string, orderCode: number): Promise<OrderInstallment[]> {
        const sql = `SELECT *, DATE_FORMAT(vencimento, '%Y-%m-%d') AS vencimento
        FROM ${dbName}.parcelas
        WHERE pedido = ?`;

        const [result] = await conn.query(sql, [orderCode]);
        return result as OrderInstallment[];
    }

    async countProductsByOrder(dbName: string, orderCode: number): Promise<number> {
        const sql = `SELECT COUNT(*) as count
        FROM ${dbName}.produtos_pedido
        WHERE pedido = ?`;

        const [result] = await conn.query(sql, [orderCode]);
        return (result as any)[0].count;
    }

    async countServicesByOrder(dbName: string, orderCode: number): Promise<number> {
        const sql = `SELECT COUNT(*) as count
        FROM ${dbName}.servicos_pedido
        WHERE pedido = ?`;

        const [result] = await conn.query(sql, [orderCode]);
        return (result as any)[0].count;
    }

    async countInstallmentsByOrder(dbName: string, orderCode: number): Promise<number> {
        const sql = `SELECT COUNT(*) as count
        FROM ${dbName}.parcelas
        WHERE pedido = ?`;

        const [result] = await conn.query(sql, [orderCode]);
        return (result as any)[0].count;
    }
}

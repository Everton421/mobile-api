import { conn } from "../../database/databaseConfig.ts";
import { type ProductOrderType, type ServiceOrderType, type ParcelOrderType } from "./types/order-type.ts";

export class InsertOrderItems {
    async insertProducts(
        products: ProductOrderType[],
        dbName: string,
        orderCode: number,
        totalProducts: number,
        totalFreight: number
    ): Promise<void> {

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            const {
                codigo,
                preco = 0,
                quantidade = 0,
                desconto = 0,
                total = 0,
                sequencia,
                quantidade_separada = 0,
                quantidade_faturada = 0
                  
            } = p;
            const series = products[i].series

            if(series && series.length > 0 ){
                for( const s of series ){

                const sqlInsertSerie = ` INSERT INTO ${dbName}.pedido_series
                set pedido = ?,
                    produto = ?,
                    lote_serie = ?,
                    quantidade =?
                    ON DUPLICATE KEY UPDATE 
                    produto = VALUES(produto),
                    lote_serie = VALUES(lote_serie),
                    quantidade =VALUES(quantidade)
                 `  
                    const valuesSeries = [orderCode, codigo, s.lote_serie, s.quantidade]
                 await conn.query(sqlInsertSerie,valuesSeries )
                }
            }

            const productValue = quantidade * preco;
            const factor = productValue / totalProducts;
            const freight = factor * totalFreight;

            const sql = `INSERT INTO ${dbName}.produtos_pedido (
                pedido,
                codigo,
                sequencia,
                desconto,
                quantidade,
                preco,
                frete,
                total,
                quantidade_separada,
                quantidade_faturada
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            codigo=VALUES(codigo),
            sequencia=VALUES(sequencia),
            desconto=VALUES(desconto),
            quantidade=VALUES(quantidade),
            preco=VALUES(preco),
            frete=VALUES(frete),
            total=VALUES(total),
            quantidade_separada=VALUES(quantidade_separada),
            quantidade_faturada=VALUES(quantidade_faturada)

            `;

            const values = [orderCode, codigo, sequencia, desconto, quantidade, preco, freight, total, quantidade_separada, quantidade_faturada];
            
            await conn.query(sql, values);

        }
    }

    async insertInstallments(
        installments: ParcelOrderType[],
        dbName: string,
        orderCode: number
    ): Promise<void> {
        for (const p of installments) {
            const { parcela, valor, vencimento } = p;
            const sql = `INSERT INTO ${dbName}.parcelas (
                pedido,
                parcela,
                valor,
                vencimento
            ) VALUES (?, ?, ?, ?)`;
            const values = [orderCode, parcela, valor, vencimento];
            await conn.query(sql, values);
        }
    }

    async insertServices(
        services: ServiceOrderType[],
        orderCode: number,
        dbName: string
    ): Promise<void> {
        for (let i = 0; i < services.length; i++) {
            const s = services[i];
            const {
                codigo,
                quantidade = 0,
                desconto = 0,
                total = 0,
                valor = 0
            } = s;

            const sql = `INSERT INTO ${dbName}.servicos_pedido (
                pedido,
                codigo,
                desconto,
                quantidade,
                valor,
                total
            ) VALUES (?, ?, ?, ?, ?, ?)`;

            const values = [orderCode, codigo, desconto, quantidade, valor, total];
            await conn.query(sql, values);
        }
    }
}

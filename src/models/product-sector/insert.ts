import { conn } from "../../database/databaseConfig.ts";
import { DateService } from "../../utils/dateService.ts";
import { type ProductSectorType } from "./types/product-sector-type.ts";

type ProductSectorWithoutIds = Omit<ProductSectorType, 'id_produto' | 'id_setor'>;

export class InsertProductSector {
    async insert(dbName: string, productSector: ProductSectorWithoutIds): Promise<{ insertId: number }> {
        const sql = `INSERT INTO ${dbName}.produto_setor 
            (setor, produto, estoque, local_produto, local1_produto, local2_produto, local3_produto, local4_produto, data_recadastro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            productSector.setor,
            productSector.produto,
            productSector.estoque,
            productSector.local_produto,
            productSector.local1_produto,
            productSector.local2_produto,
            productSector.local3_produto,
            productSector.local4_produto,
            productSector.data_recadastro
        ];

        const [result] = await conn.query(sql, values);
        return { insertId: (result as any).insertId };
    }

    async insertOrUpdate(dbName: string, productSector: ProductSectorWithoutIds): Promise<{ affectedRows: number }> {
        const sql = `INSERT INTO ${dbName}.produto_setor 
            (setor, produto, estoque, local_produto, local1_produto, local2_produto, local3_produto, local4_produto, data_recadastro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE  
                estoque = VALUES(estoque),
                setor = VALUES(setor),
                local_produto = VALUES(local_produto),
                local1_produto = VALUES(local1_produto),
                local2_produto = VALUES(local2_produto),
                local3_produto = VALUES(local3_produto),
                local4_produto = VALUES(local4_produto),
                data_recadastro = VALUES(data_recadastro)`;

        const values = [
            productSector.setor,
            productSector.produto,
            productSector.estoque,
            productSector.local_produto,
            productSector.local1_produto,
            productSector.local2_produto,
            productSector.local3_produto,
            productSector.local4_produto,
            productSector.data_recadastro
        ];

        const [result] = await conn.query(sql, values);
        return { affectedRows: (result as any).affectedRows };
    }
    async bulkInsertOrUpdate(dbName: string, dataProductSector: ProductSectorWithoutIds[] ): Promise<{ affectedRows: number }> {

        const params =[];
        const values =[];

        
        if( dataProductSector.length > 0 ){
            for(const productSector of dataProductSector){
                params.push("(?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    const data_recadastro = productSector.data_recadastro ? productSector.data_recadastro : new DateService().obterDataHoraAtual();  

                values.push(  productSector.setor, productSector.produto, productSector.estoque, 
                    productSector.local_produto, productSector.local1_produto, productSector.local2_produto, productSector.local3_produto, productSector.local4_produto, 
                   data_recadastro )
            }
         }  

        const sql = `INSERT INTO ${dbName}.produto_setor 
            (setor, produto, estoque, local_produto, local1_produto, local2_produto, local3_produto, local4_produto, data_recadastro)
            VALUES ${params.join(' ,')}
            ON DUPLICATE KEY UPDATE  
                estoque = VALUES(estoque),
                setor = VALUES(setor),
                local_produto = VALUES(local_produto),
                local1_produto = VALUES(local1_produto),
                local2_produto = VALUES(local2_produto),
                local3_produto = VALUES(local3_produto),
                local4_produto = VALUES(local4_produto),
                data_recadastro = VALUES(data_recadastro)`;


        const [result] = await conn.query(sql, values);
        return { affectedRows: (result as any).affectedRows };
    }
    async upsertIncrementStock(dbName: string, setor: number, produto: number, quantidade: number): Promise<void> {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const sql = `INSERT INTO ${dbName}.produto_setor 
            (setor, produto, estoque, local_produto, local1_produto, local2_produto, local3_produto, local4_produto, data_recadastro)
            VALUES (?, ?, ?, '', '', '', '', '', ?)
            ON DUPLICATE KEY UPDATE  
                estoque = estoque + VALUES(estoque)`;
        await conn.query(sql, [setor, produto, quantidade, now]);
    }
}
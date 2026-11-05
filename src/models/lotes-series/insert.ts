import { conn } from "../../database/databaseConfig.ts";
import { DateService } from "../../utils/dateService.ts";
import { type LotesSeriesInput } from "./types/lotes-series-type.ts";

export class InsertLotesSeries {
    async insert(dbName: string, data: LotesSeriesInput): Promise<{ insertId: number }> {
        const columns = ['produto', 'lote', 'serie', 'data_cadastro', 'data_recadastro'];
        const values = [data.produto, data.lote ?? null, data.serie ?? null, data.data_cadastro, data.data_recadastro];

        if (data.codigo != null) {
            columns.unshift('codigo');
            values.unshift(data.codigo);
        }

        const placeholders = values.map(() => '?').join(', ');
        const sql = `INSERT INTO ${dbName}.lotes_series (${columns.join(', ')}) VALUES (${placeholders})`;

        const [result] = await conn.query(sql, values);
        return { insertId: (result as any).insertId };
    }

    async bulkInsertOrUpdate(dbName: string,data: LotesSeriesInput[]){
        const dateService = new DateService();

            const params = [];
            const values = [];

            if(data.length > 0 ){
                for(const i of data){
                    const data_recadastro = i.data_recadastro ? i.data_recadastro :  dateService.obterDataHoraAtual();
                    const data_cadastro =  i.data_cadastro ? i.data_cadastro :  dateService.obterDataAtual();   
                    params.push(" ( ?, ?, ?, ?, ?, ? ) ")
                    values.push(i.codigo, i.produto, i.lote ?? null, i.serie ?? null, data_cadastro, data_recadastro)
                }
            }
            const sql = `INSERT INTO ${dbName}.lotes_series 
            (codigo, produto ,  lote ,  serie ,  data_cadastro , data_recadastro )
            VALUES ${params.join(', ')}
                ON DUPLICATE KEY UPDATE
                produto = VALUES(produto),
                lote = VALUES(lote),
                serie = VALUES(serie),
                data_recadastro=VALUES(data_recadastro)
            `;
        const [result] = await conn.query(sql, values);
            return { affectedRows: (result as any).affectedRows };

    }
}

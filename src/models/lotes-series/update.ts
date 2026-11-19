import { conn } from "../../database/databaseConfig.ts";
import { type LotesSeriesType } from "./types/lotes-series-type.ts";

type LotesSeriesUpdate = Partial<Omit<LotesSeriesType, 'codigo'>> & { codigo: number };

export class UpdateLotesSeries {
    async update(dbName: string, data: LotesSeriesUpdate): Promise<{ affectedRows: number }> {
        const fields: string[] = [];
        const values: any[] = [];

        if (data.id !== undefined) {
            fields.push("id = ?");
            values.push(data.id);
        }
        if (data.produto !== undefined) {
            fields.push("produto = ?");
            values.push(data.produto);
        }
        if (data.lote !== undefined) {
            fields.push("lote = ?");
            values.push(data.lote);
        }
        if (data.serie !== undefined) {
            fields.push("serie = ?");
            values.push(data.serie);
        }
        if (data.data_cadastro !== undefined) {
            fields.push("data_cadastro = ?");
            values.push(data.data_cadastro);
        }
        if (data.data_recadastro !== undefined) {
            fields.push("data_recadastro = ?");
            values.push(data.data_recadastro);
        }

        if (fields.length === 0) {
            throw new Error("No fields provided for update.");
        }

        values.push(data.codigo);

        const sql = `UPDATE ${dbName}.lotes_series SET ${fields.join(', ')} WHERE codigo = ?`;

        const [result] = await conn.query(sql, values);
        return { affectedRows: (result as any).affectedRows };
    }
}

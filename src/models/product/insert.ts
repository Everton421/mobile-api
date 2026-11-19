import { type ResultSetHeader } from "mysql2";
import { conn } from "../../database/databaseConfig.ts";
import { DateService } from "../../utils/dateService.ts";
import { type ProductType } from "./types/product-type.ts";

export class InsertProduct {
    private dateService:DateService = new DateService();

    async insert(dbName: string, data: ProductType): Promise<{ insertId: number }> {
        const columns = [
            'id',
            'estoque',
            'preco',
            'unidade_medida',
            'grupo',
            'origem',
            'descricao',
            'num_fabricante',
            'num_original',
            'sku',
            'marca',
            'class_fiscal',
            'data_cadastro',
            'data_recadastro',
            'tipo',
            'observacoes1',
            'observacoes2',
            'observacoes3',
            'caracteristica',
            'controle_lote_serie',
            'ativo'
        ];

        const values = [
            data.id,
            data.estoque,
            data.preco,
            data.unidade_medida,
            data.grupo,
            data.origem,
            data.descricao,
            data.num_fabricante,
            data.num_original,
            data.sku,
            data.marca,
            data.class_fiscal,
            data.data_cadastro,
            data.data_recadastro,
            data.tipo,
            data.observacoes1,
            data.observacoes2,
            data.observacoes3,
            data.caracteristica,
            data.controle_lote_serie,
            data.ativo
        ];

        if (data.codigo != null) {
            columns.unshift('codigo');
            values.unshift(data.codigo);
        }

        const placeholders = values.map(() => '?').join(', ');
        const sql = `INSERT INTO ${dbName}.produtos (${columns.join(', ')}) VALUES (${placeholders})`;

        const [result] = await conn.query(sql, values);
        return { insertId: (result as any).insertId };
    }

    async insertOrUpdate(dbName: string, data: ProductType): Promise<ResultSetHeader> {
        const fields = [
            'id',
            'estoque',
            'preco',
            'unidade_medida',
            'grupo',
            'origem',
            'descricao',
            'num_fabricante',
            'num_original',
            'sku',
            'marca',
            'class_fiscal',
            'data_cadastro',
            'data_recadastro',
            'tipo',
            'observacoes1',
            'observacoes2',
            'observacoes3',
            'caracteristica',
            'controle_lote_serie',
            'ativo'

        ];

        const values = [
            data.id,
            data.estoque,
            data.preco,
            data.unidade_medida,
            data.grupo,
            data.origem,
            data.descricao,
            data.num_fabricante,
            data.num_original,
            data.sku,
            data.marca,
            data.class_fiscal,
            data.data_cadastro,
            data.data_recadastro,
            data.tipo,
            data.observacoes1,
            data.observacoes2,
            data.observacoes3,
            data.caracteristica,
            data.controle_lote_serie,
            data.ativo

        ];

        if (data.codigo != null) {
            fields.unshift('codigo');
            values.unshift(data.codigo);
        }

        const placeholders = values.map(() => '?').join(', ');
        const sql = `INSERT INTO ${dbName}.produtos (${fields.join(', ')}) VALUES (${placeholders})
            ON DUPLICATE KEY UPDATE
                id = VALUES(id),
                estoque = VALUES(estoque),
                preco = VALUES(preco),
                unidade_medida = VALUES(unidade_medida),
                grupo = VALUES(grupo),
                origem = VALUES(origem),
                descricao = VALUES(descricao),
                num_fabricante = VALUES(num_fabricante),
                num_original = VALUES(num_original),
                sku = VALUES(sku),
                marca = VALUES(marca),
                class_fiscal = VALUES(class_fiscal),
                data_recadastro = VALUES(data_recadastro),
                tipo = VALUES(tipo),
                observacoes1 = VALUES(observacoes1),
                observacoes2 = VALUES(observacoes2),
                observacoes3 = VALUES(observacoes3),
                caracteristica = VALUES(caracteristica),
                controle_lote_serie = VALUES(controle_lote_serie),
                   ativo = VALUES(ativo)

        `;

        const [result] = await conn.query(sql, values);
        return result as ResultSetHeader;
    }


     async bulkInsertOrUpdate(dbName: string, data: ProductType[]): Promise<{ affectedRows: number }> {
        const columns = [
            'codigo',
            'id',
            'estoque',
            'preco',
            'unidade_medida',
            'grupo',
            'origem',
            'descricao',
            'num_fabricante',
            'num_original',
            'sku',
            'marca',
            'class_fiscal',
            'data_cadastro',
            'data_recadastro',
            'tipo',
            'observacoes1',
            'observacoes2',
            'observacoes3',
            'caracteristica',
            'controle_lote_serie',
            'ativo'
        ];

        if (data.length === 0) {
            return { affectedRows: 0 };
        }

        const values = [
        ];
        for( const i of data ){
             
            const data_cadastro = i.data_cadastro ? i.data_cadastro  : this.dateService.obterDataAtual();
            const data_recadastro = i.data_recadastro ? i.data_recadastro : this.dateService.obterDataHoraAtual();

            values.push( 
                i.codigo,
                i.id,
                i.estoque,
                i.preco,
                i.unidade_medida,
                i.grupo,
                i.origem,
                i.descricao,
                i.num_fabricante,
                i.num_original,
                i.sku,
                i.marca,
                i.class_fiscal,
                data_cadastro,
                data_recadastro,
                i.tipo,
                i.observacoes1,
                i.observacoes2,
                i.observacoes3,
                i.caracteristica,
                i.controle_lote_serie,
                i.ativo
            )
          
        }
        

        const rowPlaceholder = `(${columns.map(() => '?').join(', ')})`;
        const placeholders = data.map(() => rowPlaceholder).join(', ');

        const sql = `INSERT INTO ${dbName}.produtos (${columns.join(', ')}) VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE  
              id =  VALUES(id),
              estoque =  VALUES(estoque),
              preco =  VALUES(preco),
              unidade_medida =  VALUES(unidade_medida),
              grupo =  VALUES(grupo),
              origem =  VALUES(origem),
              descricao =  VALUES(descricao),
              num_fabricante =  VALUES(num_fabricante),
              num_original =  VALUES(num_original),
              sku =  VALUES(sku),
              marca =  VALUES(marca),
              class_fiscal =  VALUES(class_fiscal),
              data_cadastro =  VALUES(data_cadastro),
              data_recadastro =  VALUES(data_recadastro),
              tipo =  VALUES(tipo),
              observacoes1 =  VALUES(observacoes1),
              observacoes2 =  VALUES(observacoes2),
              observacoes3 =  VALUES(observacoes3),
              caracteristica =  VALUES(caracteristica),
              controle_lote_serie =  VALUES(controle_lote_serie),
              ativo = VALUES(ativo)
       
        `;
        // console.log(sql)
        // console.log(values)

        const [result] = await conn.query(sql, values);
         return { affectedRows: (result as any).affectedRows };
    }
}

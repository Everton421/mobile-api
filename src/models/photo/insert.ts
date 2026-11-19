import { conn } from "../../database/databaseConfig.ts";
import { DateService } from "../../utils/dateService.ts";
import { type PhotoType } from "./types/photo-type.ts";

type photoForUpInsert = Omit<PhotoType, 'codigo'>;

export class InsertPhoto {
    async insert(dbName: string, photo: Omit<PhotoType, 'codigo'>): Promise<{ insertId: number }> {
        const sql = `INSERT INTO ${dbName}.fotos_produtos 
            (produto, sequencia, descricao, link, foto, data_cadastro, data_recadastro)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            photo.produto,
            photo.sequencia,
            photo.descricao,
            photo.link,
            photo.foto,
            photo.data_cadastro,
            photo.data_recadastro
        ];

        const [result] = await conn.query(sql, values);
        return { insertId: (result as any).insertId };
    }

    async insertOrUpdate(dbName: string, photo: Omit<PhotoType, 'codigo'>): Promise<{ affectedRows: number }> {

        const sql = `INSERT INTO ${dbName}.fotos_produtos 
            (produto, sequencia, descricao, link, foto, data_cadastro, data_recadastro)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                sequencia = VALUES(sequencia),
                descricao = VALUES(descricao),
                link = VALUES(link),
                foto = VALUES(foto),
                data_recadastro = VALUES(data_recadastro)`;

        const values = [
            photo.produto,
            photo.sequencia,
            photo.descricao,
            photo.link,
            photo.foto,
            photo.data_cadastro,
            photo.data_recadastro
        ];

        const [result] = await conn.query(sql, values);
        return { affectedRows: (result as any).affectedRows };
    }


        async bulkInsertOrUpdate(dbName: string, photos : photoForUpInsert[]): Promise<{ affectedRows: number }> {
                    const dateService = new DateService();
            
             const params = [];
             const values = [];

            if(photos.length > 0 ){
                for(const photo of photos){
                     const data_recadastro = photo.data_recadastro ? photo.data_recadastro :  dateService.obterDataHoraAtual();
                    const data_cadastro =  photo.data_cadastro ? photo.data_cadastro :  dateService.obterDataAtual();  
                    params.push("(?, ?, ?, ?, ?, ?, ?)");
                    values.push( photo.produto,
                            photo.sequencia,
                            photo.descricao,
                            photo.link,
                            photo.foto,
                            data_cadastro,
                            data_recadastro);
                }
            }
            
        const sql = `INSERT INTO ${dbName}.fotos_produtos 
            (produto, sequencia, descricao, link, foto, data_cadastro, data_recadastro)
            VALUES  ${params.join(', ')}
            ON DUPLICATE KEY UPDATE 
                sequencia = VALUES(sequencia),
                descricao = VALUES(descricao),
                link = VALUES(link),
                foto = VALUES(foto),
                data_recadastro = VALUES(data_recadastro)`;


        const [result] = await conn.query(sql, values);
        return { affectedRows: (result as any).affectedRows };
    }
}
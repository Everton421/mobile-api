import { InsertLoteSerieSetor } from "../../models/lote-serie-setor/insert.ts";
import { InsertProductSector } from "../../models/product-sector/insert.ts";
import { publishMessage } from "./publish-message.ts";
import { type IProcessBulkOperation } from "./types/IProcess-bulk-operation.ts";

export class ProcessBulkLoteSerieSetor implements IProcessBulkOperation {
    async execute(database: string, data: any): Promise<number> {
             const db = `\`${database}\``;
             const insertLoteSerieSetor = new InsertLoteSerieSetor();
             const result = await insertLoteSerieSetor.insertOrUpdateBulk(db, data);
        return result.affectedRows;    
    }
}

 
export class ProcessBulkProdSector  implements IProcessBulkOperation {
    async execute(database: string, data: any): Promise<number> {
             const db = `\`${database}\``;
             const insertProductSector = new InsertProductSector();
             const result = await insertProductSector.bulkInsertOrUpdate(db, data);

            //  for(const i of data ){
            //     await publishMessage(database, 'produtosetor.atualizado', i );
            //    }

        return result.affectedRows;    
    }
   }

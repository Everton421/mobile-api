import { InsertLoteSerieSetor } from "../../models/lote-serie-setor/insert.ts";
import { InsertLotesSeries } from "../../models/lotes-series/insert.ts";
import { InsertProductSector } from "../../models/product-sector/insert.ts";
import { InsertProduct } from "../../models/product/insert.ts";
import { InsertSector } from "../../models/sector/insert.ts";
import { type IProcessBulkOperation } from "./types/IProcess-bulk-operation.ts";
import { type typeProductBulkInsert } from "../../routes/product/product.ts";
import { InsertPhoto } from "../../models/photo/insert.ts";


 
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
        return result.affectedRows;    
    }
   }

   export class ProcessBulkloteSerie  implements IProcessBulkOperation {
    async execute(database: string, data: any): Promise<number> {
             const db = `\`${database}\``;
             const insertLotesSeries = new InsertLotesSeries();
            const result = await insertLotesSeries.bulkInsertOrUpdate(db, data);
            return result.affectedRows;    
       
        }
   }

   export class ProcessBulkSectors implements IProcessBulkOperation {
    async execute(database: string, data: any): Promise<number> {
             const db = `\`${database}\``;
             const insertSector = new InsertSector();
            const result = await insertSector.bulkInsertOrUpdate(db, data);
            return result.affectedRows;
        }
   }


export class ProcessBulkProducts implements IProcessBulkOperation {
    async execute(database: string, data: typeProductBulkInsert, source?: string): Promise<number> {
                const insert = new InsertProduct();
                const insertPhoto = new InsertPhoto();

             const db = `\`${database}\``;

             let photos:any[] = [];
                for(const product of data ){
                       product.fotos.map((i)=> { photos.push( { ...i, produto:product.codigo } ) })
                }
                
                const result = await insert.bulkInsertOrUpdate(db, data as any);

                if(photos.length > 0 ){ 
                     await insertPhoto.bulkInsertOrUpdate(db, photos);
                }

            return result.affectedRows
    }
}   




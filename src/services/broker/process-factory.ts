import { ProcessBulkLoteSerieSetor, ProcessBulkProdSector } from "./process-bulk-operation.ts";
import { type IProcessBulkOperation } from "./types/IProcess-bulk-operation.ts";
import { type modulesBulkProcess } from "./types/module-bulk-process.ts";
 
 export class ProcessFactory{
    static getProcess(  process : modulesBulkProcess): IProcessBulkOperation{
        switch (process) {
         case 'loteseriesetor':
            return new ProcessBulkLoteSerieSetor()
        case 'prodsetor': 
            return new ProcessBulkProdSector()
        }
    } 
 }

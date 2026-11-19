import { ProcessBulkloteSerie, ProcessBulkLoteSerieSetor, ProcessBulkProdSector, ProcessBulkProducts, ProcessBulkSectors } from "./process-bulk-operation.ts";
import { type IProcessBulkOperation } from "./types/IProcess-bulk-operation.ts";
import { type modulesBulkProcess } from "./types/module-bulk-process.ts";
 
 export class ProcessFactory{
    static getProcess(  process : modulesBulkProcess): IProcessBulkOperation{
        switch (process) {
         case 'loteseriesetor':
            return new ProcessBulkLoteSerieSetor();
        case 'prodsetor': 
            return new ProcessBulkProdSector();
        case 'loteserie':
            return new ProcessBulkloteSerie();
        case 'produtos': 
        return  new ProcessBulkProducts()
        case 'setores':
        return new ProcessBulkSectors()
        }
    } 
 }
